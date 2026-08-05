/**
 * Body analysis for the Vue emitter — splitting `setup` from the render closure.
 *
 * {@link analyseBody} walks the neutral component body and sorts each statement:
 * hook declarations (`useState`/`useRef`/`useMemo`/`useCallback`) and effects
 * (`useEffect`) are translated to Vue reactivity/lifecycle and emitted **once**
 * in `setup`; every other (derived) statement plus the final `return` move into
 * the per-render closure. Prop destructuring defaults are captured for the
 * runtime `props` declaration.
 *
 * One wrinkle: hooks and effects run in `setup` (`onMounted`/`watch`, the
 * `ref`/`computed` initialisers), but the derived `const`s/functions they close
 * over default to the per-render closure — so a hook initialiser or effect that
 * references one would resolve to an undefined name in `setup` (e.g.
 * `const initial = parseTime(modelValue); const [h] = useState(initial.h)`).
 * {@link collectSetupHoistedNames} finds the transitive set of derived
 * declarations any effect **or** hook initialiser depends on and
 * {@link analyseBody} lifts them into `setup` ahead of those constructs instead
 * (a derived **function** stays a plain `const`; a derived **value** becomes a
 * reactive `computed`, registered in the scope so every read — in the effect,
 * the render closure and the deps array — is rewritten to `<name>.value`).
 */
import ts from 'typescript';

import { printNode, type RewriteScope } from '../../compiler/ast.js';
import { isCompileTimeConstant } from '../../compiler/optimize.js';

import { emitEffect } from './effects.js';
import { rewrite, singleDeclaration, type VueAnalysis } from './shared.js';

/** The hook callees whose `const` declarations are translated as hooks (never derived). */
const HOOK_CALLEES: ReadonlySet<string> = new Set(['useState', 'useRef', 'useMemo', 'useCallback', 'useContext']);

/**
 * Whether a callee name is a React-style hook (`use` + an uppercase letter,
 * e.g. `useMap`, `useMarker`). Custom composables obey the rules of hooks — they
 * run **once, at the top level** of the component (React's model) — so, like the
 * primitive hooks and `useEffect`, they must be emitted in Vue's `setup` (where
 * their internal `onMounted`/`watch`/`inject` register) rather than deferred into
 * the per-render closure (where those lifecycle registrations would silently
 * never run).
 */
function isHookCallee(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/**
 * Make the object-literal arguments of a **custom composable** call reactive for
 * the Vue target.
 *
 * In React a component body re-runs on every render, so an argument object built
 * inline — `useSource(map, { id: properties.id, source: properties.source })` —
 * is rebuilt each render and the composable's `useEffect` deps observe the fresh
 * values. Vue's `setup` runs **once**, so the same object literal would snapshot
 * each `properties.*` read at construction time and never update: the
 * composable's internal `watch(() => [.., options.source])` would compare an
 * unchanging value and never re-run (e.g. `GeoJSONSource.setData` would fire only
 * on mount).
 *
 * Rewriting each property into a **getter** — `{ get source() { return
 * properties.source; } }` — restores React's semantics: every read of
 * `options.source` inside the composable re-evaluates the (reactive) prop, so the
 * dependency getter sees the live value and the effect re-runs on change.
 *
 * Applied only to custom composables (`use[A-Z]`, excluding the primitive hooks
 * such as `useState`/`useRef`, whose object arguments are one-time state
 * snapshots that must **not** be re-evaluated).
 */
function reactiveHookCall(call: ts.CallExpression): ts.CallExpression {
  const { factory } = ts;
  let changed = false;
  const rewrittenArguments = call.arguments.map((argument) => {
    if (!ts.isObjectLiteralExpression(argument)) {
      return argument;
    }
    const properties = argument.properties.map((property) => {
      if (
        ts.isPropertyAssignment(property) &&
        !ts.isComputedPropertyName(property.name) &&
        // Event-handler props are not reactive data: an inline handler already
        // reads live state via its closure, and an `on…` prop is rewritten into a
        // Vue `emit(…)` arrow by the pipeline that runs after this. Wrapping
        // either in a getter is pointless and strips the handler parameter's
        // contextual typing (`(lngLat) => …` → an implicit-`any` param), so leave
        // them as plain assignments.
        !ts.isArrowFunction(property.initializer) &&
        !ts.isFunctionExpression(property.initializer) &&
        !(ts.isIdentifier(property.name) && /^on[A-Z]/.test(property.name.text))
      ) {
        changed = true;
        return factory.createGetAccessorDeclaration(
          undefined,
          property.name,
          [],
          undefined,
          factory.createBlock([factory.createReturnStatement(property.initializer)], true),
        );
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        changed = true;
        return factory.createGetAccessorDeclaration(
          undefined,
          property.name,
          [],
          undefined,
          factory.createBlock([factory.createReturnStatement(factory.createIdentifier(property.name.text))], true),
        );
      }
      // Spreads, methods and existing accessors are already lazy (or cannot be
      // expressed as a simple getter) — leave them untouched.
      return property;
    });
    return factory.createObjectLiteralExpression(properties, true);
  });
  return changed ? factory.createCallExpression(call.expression, call.typeArguments, rewrittenArguments) : call;
}

/**
 * The element type of a `useRef<T>` type argument, with any `| null` / `|
 * undefined` union member stripped — Vue's `useTemplateRef<Element>('name')`
 * takes the bare element type (it is always nullable until mounted). Returns
 * `undefined` for an untyped ref or a type that is only `null`/`undefined`.
 */
function elementRefType(typeArgument: ts.TypeNode | undefined, sourceFile: ts.SourceFile): string | undefined {
  if (typeArgument === undefined) {
    return undefined;
  }
  const members = ts.isUnionTypeNode(typeArgument) ? [...typeArgument.types] : [typeArgument];
  const kept = members.filter(
    (member) =>
      member.kind !== ts.SyntaxKind.UndefinedKeyword &&
      !(ts.isLiteralTypeNode(member) && member.literal.kind === ts.SyntaxKind.NullKeyword),
  );
  if (kept.length === 0) {
    return undefined;
  }
  return kept.map((member) => printNode(member, sourceFile)).join(' | ');
}

/** A derived (non-hook) `const <id> = …` declaration in the component body. */
interface DerivedDeclaration {
  /** The declared identifier name. */
  name: string;
  /** The declaration node (its `initializer` is always defined). */
  declaration: ts.VariableDeclaration;
  /** Whether the initializer is a function (safe to keep as a plain `const`). */
  isFunction: boolean;
}

/**
 * Collect the identifier names **read** within a node, best-effort: the member
 * name of a `a.b` property access is skipped (only the object `a` is a read), so
 * the result can be intersected with the set of derived declaration names to
 * find genuine references.
 */
function collectReadIdentifiers(node: ts.Node): Set<string> {
  const names = new Set<string>();
  const visit = (current: ts.Node): void => {
    if (ts.isPropertyAccessExpression(current)) {
      visit(current.expression);
      return;
    }
    if (ts.isIdentifier(current)) {
      names.add(current.text);
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return names;
}

/** Index every derived (non-hook) `const <id> = …` declaration in the body by name. */
function collectDerivedDeclarations(body: ts.Block): Map<string, DerivedDeclaration> {
  const derived = new Map<string, DerivedDeclaration>();
  for (const statement of body.statements) {
    const declaration = singleDeclaration(statement);
    if (declaration === undefined || !ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
      continue;
    }
    if (
      ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.expression) &&
      (HOOK_CALLEES.has(declaration.initializer.expression.text) ||
        isHookCallee(declaration.initializer.expression.text))
    ) {
      continue;
    }
    const isFunction = ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer);
    derived.set(declaration.name.text, { name: declaration.name.text, declaration, isFunction });
  }
  return derived;
}

/**
 * The transitive set of derived-declaration names that the body's `useEffect`
 * calls **and** hook declarations (`useState`/`useRef`/`useMemo`/`useCallback`/
 * `useContext`) depend on — the declarations that must be hoisted into `setup`
 * so those constructs (which themselves run in `setup`) can reference them.
 */
function collectSetupHoistedNames(body: ts.Block, derived: Map<string, DerivedDeclaration>): Set<string> {
  const queue: string[] = [];
  const seed = (node: ts.Node): void => {
    for (const name of collectReadIdentifiers(node)) {
      if (derived.has(name)) {
        queue.push(name);
      }
    }
  };
  for (const statement of body.statements) {
    // `useEffect(…)` and bare custom-hook calls (`useMarker(…)`) run in `setup`,
    // so their derived references must too.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      ts.isIdentifier(statement.expression.expression) &&
      (statement.expression.expression.text === 'useEffect' || isHookCallee(statement.expression.expression.text))
    ) {
      seed(statement.expression);
      continue;
    }
    // A hook declaration's initialiser is emitted in `setup` too, so a derived
    // local it reads (e.g. `useState(initial.h)`, `useMarker(map, …)`) must be
    // hoisted alongside it.
    const declaration = singleDeclaration(statement);
    if (
      declaration !== undefined &&
      declaration.initializer !== undefined &&
      ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.expression) &&
      (HOOK_CALLEES.has(declaration.initializer.expression.text) ||
        isHookCallee(declaration.initializer.expression.text))
    ) {
      for (const argument of declaration.initializer.arguments) {
        seed(argument);
      }
    }
  }

  const hoisted = new Set<string>();
  while (queue.length > 0) {
    const name = queue.pop() as string;
    if (hoisted.has(name)) {
      continue;
    }
    hoisted.add(name);
    const initializer = derived.get(name)?.declaration.initializer;
    if (initializer !== undefined) {
      for (const reference of collectReadIdentifiers(initializer)) {
        if (derived.has(reference) && !hoisted.has(reference)) {
          queue.push(reference);
        }
      }
    }
  }
  return hoisted;
}

/** Walk the component body, producing setup lines, render lines and the return. */
export function analyseBody(body: ts.Block, scope: RewriteScope, sourceFile: ts.SourceFile): VueAnalysis {
  const analysis: VueAnalysis = {
    setupLines: [],
    renderLines: [],
    orderedLines: [],
    returnText: 'null',
    propDefaults: new Map(),
    // `defineProps`/`defineOptions`/`defineSlots` are `<script setup>` compiler
    // macros (no import); only real runtime values are collected here.
    vueImports: new Set<string>(),
    renderStatements: [],
    refElementTypes: new Map<string, string | undefined>(),
  };

  // Every emitted line is recorded both in its setup/render bucket (the
  // component path's setup-vs-render split) **and**, via these helpers, in
  // `orderedLines` — the interleaved source order the composable path replays.
  const pushSetup = (...emitted: string[]): void => {
    analysis.setupLines.push(...emitted);
    analysis.orderedLines.push(...emitted);
  };
  const pushRender = (emitted: string): void => {
    analysis.renderLines.push(emitted);
    analysis.orderedLines.push(emitted);
  };

  // Derived declarations an effect closes over must live in `setup` (where the
  // effect runs), not the per-render closure. Find them up front and register
  // the **value** ones (lifted to `computed`) in the scope so every read is
  // rewritten to `<name>.value` — including inside the effects and render
  // statements rewritten below.
  const derived = collectDerivedDeclarations(body);
  const hoistedNames = collectSetupHoistedNames(body, derived);
  for (const name of hoistedNames) {
    if (!(derived.get(name) as DerivedDeclaration).isFunction) {
      scope.memoNames.add(name);
    }
  }

  for (const statement of body.statements) {
    const declaration = singleDeclaration(statement);

    // Drop the `const { … } = properties` destructuring; capture defaults.
    if (
      declaration !== undefined &&
      ts.isObjectBindingPattern(declaration.name) &&
      declaration.initializer !== undefined &&
      ts.isIdentifier(declaration.initializer) &&
      declaration.initializer.text === scope.propsParamName
    ) {
      for (const element of declaration.name.elements) {
        if (ts.isIdentifier(element.name) && element.initializer !== undefined) {
          // `defineProps` declares the prop under its **real** name, so a renamed
          // binding (`const { format: formatProperty = 'dd' }`) must key its
          // default by the property name (`format`), not the local alias.
          const propName =
            element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
              ? element.propertyName.text
              : element.name.text;
          analysis.propDefaults.set(propName, printNode(element.initializer, sourceFile));
        }
      }
      continue;
    }

    // Hook declarations → setup, translated to Vue reactivity.
    if (
      declaration !== undefined &&
      declaration.initializer !== undefined &&
      ts.isCallExpression(declaration.initializer)
    ) {
      const callExpression = declaration.initializer;
      const callee = callExpression.expression;
      if (ts.isIdentifier(callee)) {
        if (callee.text === 'useState' && ts.isArrayBindingPattern(declaration.name)) {
          const valueName = (declaration.name.elements[0] as ts.BindingElement).name;
          const initial = callExpression.arguments[0];
          analysis.vueImports.add('ref');
          // Preserve the explicit `useState<T>(…)` type argument as `ref<T>(…)`.
          // Without it a `useState<string | undefined>(undefined)` collapses to
          // `ref(undefined)` (a `Ref<undefined>`), so every later read/assignment
          // of the state fails to type-check against its real element type.
          const typeArguments =
            callExpression.typeArguments === undefined
              ? ''
              : `<${callExpression.typeArguments.map((argument) => printNode(argument, sourceFile)).join(', ')}>`;
          pushSetup(
            `const ${(valueName as ts.Identifier).text} = ref${typeArguments}(${initial === undefined ? '' : rewrite(initial, scope, sourceFile)});`,
          );
          continue;
        }
        if (callee.text === 'useRef' && ts.isIdentifier(declaration.name)) {
          const typeArguments =
            callExpression.typeArguments === undefined
              ? ''
              : `<${callExpression.typeArguments.map((argument) => printNode(argument, sourceFile)).join(', ')}>`;
          const initial = callExpression.arguments[0];
          // `useRef` is a non-reactive, mutable container (React's `useRef`
          // semantics), so it maps to Vue's `shallowRef` — NOT a deep `ref`. A
          // deep `ref` reactive-proxies whatever is stored in `.current`, which
          // is catastrophic when a ref holds a large external instance (e.g. a
          // Monaco editor): every internal property access then goes through a
          // reactivity trap, and reads inside an effect subscribe the effect to
          // Monaco's internals — an unbounded pre-flush storm that silently
          // freezes the host. `shallowRef` keeps `.value`-reassignment reactive
          // (harmless) while leaving the stored object un-proxied.
          analysis.vueImports.add('shallowRef');
          // Record the ref's element type (its `useRef<T>` argument, `| null` /
          // `| undefined` stripped) so a ref bound to an element as a template
          // `ref="name"` can later be re-declared as `useTemplateRef<Element>(…)`.
          analysis.refElementTypes.set(
            declaration.name.text,
            elementRefType(callExpression.typeArguments?.[0], sourceFile),
          );
          pushSetup(
            `const ${declaration.name.text} = shallowRef${typeArguments}(${initial === undefined ? '' : rewrite(initial, scope, sourceFile)});`,
          );
          continue;
        }
        if (callee.text === 'useMemo' && ts.isIdentifier(declaration.name)) {
          const factoryArgument = callExpression.arguments[0];
          // Stage-2 quality: a `useMemo` whose factory is a constant expression
          // (or `() => <literal>`) needs no reactive `computed` — emit a plain
          // const so callers read a stable value with zero tracking cost. Drop
          // the name from `memoNames` so later rewrites do not append `.value`.
          const constantBody = constantMemoFactoryBody(factoryArgument);
          if (constantBody !== undefined) {
            scope.memoNames.delete(declaration.name.text);
            pushSetup(`const ${declaration.name.text} = ${rewrite(constantBody, scope, sourceFile)};`);
            continue;
          }
          analysis.vueImports.add('computed');
          pushSetup(`const ${declaration.name.text} = computed(${rewrite(factoryArgument, scope, sourceFile)});`);
          continue;
        }
        if (callee.text === 'useCallback' && ts.isIdentifier(declaration.name)) {
          const function_ = callExpression.arguments[0];
          pushSetup(`const ${declaration.name.text} = ${rewrite(function_, scope, sourceFile)};`);
          continue;
        }
        // `useContext(ctx)` → `inject(...)` must run **synchronously in setup**,
        // so it is emitted as a plain setup const (never lifted to a `computed`,
        // which would call `inject()` outside setup).
        if (callee.text === 'useContext' && ts.isIdentifier(declaration.name)) {
          pushSetup(`const ${declaration.name.text} = ${rewrite(callExpression, scope, sourceFile)};`);
          continue;
        }
        // A custom composable declaration (`const map = useMap()`, `const { marker }
        // = useMarker(…)`) obeys the rules of hooks: it runs once in `setup`, where
        // its internal `inject`/`onMounted`/`watch` register. Emit it verbatim as a
        // setup `const` (visible to the render closure, which shares the scope).
        if (isHookCallee(callee.text)) {
          pushSetup(
            `const ${printNode(declaration.name, sourceFile)} = ${rewrite(reactiveHookCall(callExpression), scope, sourceFile)};`,
          );
          continue;
        }
      }
    }

    // `useEffect(…)` → setup lifecycle.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      ts.isIdentifier(statement.expression.expression) &&
      statement.expression.expression.text === 'useEffect'
    ) {
      pushSetup(...emitEffect(statement.expression, scope, sourceFile));
      continue;
    }

    // A bare custom-hook call (`useMarker(map, …)`) runs once in `setup`, so its
    // internal lifecycle (`onMounted`/`watch`) registers. Left in the per-render
    // closure those registrations would silently never run.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      ts.isIdentifier(statement.expression.expression) &&
      isHookCallee(statement.expression.expression.text)
    ) {
      pushSetup(`${rewrite(reactiveHookCall(statement.expression), scope, sourceFile)};`);
      continue;
    }

    // A derived declaration an effect depends on → hoist into `setup` (ahead of
    // the effects, in source order) instead of the render closure. Functions
    // stay plain `const`s; values become reactive `computed`s.
    if (
      declaration !== undefined &&
      declaration.initializer !== undefined &&
      ts.isIdentifier(declaration.name) &&
      hoistedNames.has(declaration.name.text)
    ) {
      const rewritten = rewrite(declaration.initializer, scope, sourceFile);
      if ((derived.get(declaration.name.text) as DerivedDeclaration).isFunction) {
        pushSetup(`const ${declaration.name.text} = ${rewritten};`);
      } else {
        analysis.vueImports.add('computed');
        pushSetup(`const ${declaration.name.text} = computed(() => ${rewritten});`);
      }
      continue;
    }

    // The final `return …` → the render closure's returned expression.
    if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
      analysis.returnText = rewrite(statement.expression, scope, sourceFile);
      analysis.returnExpression = statement.expression;
      continue;
    }

    // Every other statement is per-render work → render closure body. The raw
    // node is kept too, so the `<template>` path can turn it into a `computed`.
    analysis.renderStatements.push(statement);
    pushRender(rewrite(statement, scope, sourceFile));
  }

  return analysis;
}

/**
 * If a `useMemo` factory is (or returns) a compile-time constant, yield that
 * constant expression so the emitter can skip `computed`. Handles:
 * - a bare constant expression (unusual but legal),
 * - `() => <literal>`,
 * - `() => { return <literal>; }`.
 */
function constantMemoFactoryBody(factory: ts.Expression | undefined): ts.Expression | undefined {
  if (factory === undefined) {
    return undefined;
  }
  if (isCompileTimeConstant(factory)) {
    return factory;
  }
  if (!(ts.isArrowFunction(factory) || ts.isFunctionExpression(factory))) {
    return undefined;
  }
  const body = factory.body;
  if (ts.isBlock(body)) {
    const statements = body.statements.filter((statement) => !ts.isEmptyStatement(statement));
    if (statements.length !== 1 || !ts.isReturnStatement(statements[0]) || statements[0].expression === undefined) {
      return undefined;
    }
    return isCompileTimeConstant(statements[0].expression) ? statements[0].expression : undefined;
  }
  return isCompileTimeConstant(body) ? body : undefined;
}
