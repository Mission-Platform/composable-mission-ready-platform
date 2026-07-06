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

import { emitEffect } from './effects.js';
import { rewrite, singleDeclaration, type VueAnalysis } from './shared.js';

/** The hook callees whose `const` declarations are translated as hooks (never derived). */
const HOOK_CALLEES: ReadonlySet<string> = new Set(['useState', 'useRef', 'useMemo', 'useCallback', 'useContext']);

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
      HOOK_CALLEES.has(declaration.initializer.expression.text)
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
    // `useEffect(…)` runs in `setup`, so its derived references must too.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      ts.isIdentifier(statement.expression.expression) &&
      statement.expression.expression.text === 'useEffect'
    ) {
      seed(statement.expression);
      continue;
    }
    // A hook declaration's initialiser is emitted in `setup` too, so a derived
    // local it reads (e.g. `useState(initial.h)`) must be hoisted alongside it.
    const declaration = singleDeclaration(statement);
    if (
      declaration !== undefined &&
      declaration.initializer !== undefined &&
      ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.expression) &&
      HOOK_CALLEES.has(declaration.initializer.expression.text)
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
    returnText: 'null',
    propDefaults: new Map(),
    // `defineProps`/`defineOptions`/`defineSlots` are `<script setup>` compiler
    // macros (no import); only real runtime values are collected here.
    vueImports: new Set<string>(),
    renderStatements: [],
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

  let effectIndex = 0;

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
          analysis.propDefaults.set(element.name.text, printNode(element.initializer, sourceFile));
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
          analysis.setupLines.push(
            `const ${(valueName as ts.Identifier).text} = ref(${initial === undefined ? '' : rewrite(initial, scope, sourceFile)});`,
          );
          continue;
        }
        if (callee.text === 'useRef' && ts.isIdentifier(declaration.name)) {
          const typeArguments =
            callExpression.typeArguments === undefined
              ? ''
              : `<${callExpression.typeArguments.map((argument) => printNode(argument, sourceFile)).join(', ')}>`;
          const initial = callExpression.arguments[0];
          analysis.vueImports.add('ref');
          analysis.setupLines.push(
            `const ${declaration.name.text} = ref${typeArguments}(${initial === undefined ? '' : rewrite(initial, scope, sourceFile)});`,
          );
          continue;
        }
        if (callee.text === 'useMemo' && ts.isIdentifier(declaration.name)) {
          const factory = callExpression.arguments[0];
          analysis.vueImports.add('computed');
          analysis.setupLines.push(
            `const ${declaration.name.text} = computed(${rewrite(factory, scope, sourceFile)});`,
          );
          continue;
        }
        if (callee.text === 'useCallback' && ts.isIdentifier(declaration.name)) {
          const function_ = callExpression.arguments[0];
          analysis.setupLines.push(`const ${declaration.name.text} = ${rewrite(function_, scope, sourceFile)};`);
          continue;
        }
        // `useContext(ctx)` → `inject(...)` must run **synchronously in setup**,
        // so it is emitted as a plain setup const (never lifted to a `computed`,
        // which would call `inject()` outside setup).
        if (callee.text === 'useContext' && ts.isIdentifier(declaration.name)) {
          analysis.setupLines.push(`const ${declaration.name.text} = ${rewrite(callExpression, scope, sourceFile)};`);
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
      analysis.setupLines.push(
        ...emitEffect(statement.expression, effectIndex, scope, sourceFile, analysis.vueImports),
      );
      effectIndex += 1;
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
        analysis.setupLines.push(`const ${declaration.name.text} = ${rewritten};`);
      } else {
        analysis.vueImports.add('computed');
        analysis.setupLines.push(`const ${declaration.name.text} = computed(() => ${rewritten});`);
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
    analysis.renderLines.push(rewrite(statement, scope, sourceFile));
  }

  return analysis;
}
