/**
 * Svelte 5 module emitter for the Stage-1 compiler.
 *
 * Produces a `.svelte` single-file component: a `<script lang="ts">` runes block
 * assembled from the neutral component function, followed by the markup
 * transpiled from its returned JSX (see `./template`). All analysis is AST-based
 * (the function is parsed and its statements/expressions are walked/rewritten):
 * - props destructure from `$props()` (`let { a, children }: Props = $props()`),
 *   with every captured destructuring/`?? `default folded straight into the
 *   destructure (Svelte has no reactive `properties` object to keep reading
 *   defaults off of, unlike the Vue target),
 * - named slots (`<Slot name="x">` / `hasSlot('x')`) become snippet props,
 *   rendered with `{@render x?.()}`, presence-checked with `x != null`,
 * - `useState` → `$state`, its setter an assignment (`setX(v)` → `x = v`),
 * - `useRef` → `$state` holding the element directly (`ref={x}` → `bind:this`,
 *   `x.current` reads → bare `x`),
 * - `useMemo` → `$derived.by`, `useEffect` → `$effect`,
 * - a local computed **from** JSX (directly, through a ternary/`&&`, or a
 *   `.map()`) has no script-side form, so it is never printed as a script
 *   `const` — every read of it in the template substitutes (and converts) its
 *   original initializer instead (see `./template`'s `jsxConstants`),
 * - remaining setup statements are carried into the script head,
 * - sibling component imports resolve to `./<base>.svelte`, bound under the
 *   PascalCase component name actually used in the template.
 */
import ts from 'typescript';

import {
  collectSlotNames,
  findComponentFunction,
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
  readNeutralImports,
} from '../../compiler/ast.js';
import { isCompileTimeConstant } from '../../compiler/optimize.js';

import {
  isHyperscriptCall,
  renderReturnValue,
  rewriteScopedNode,
  scopeExpression,
  type SvelteTemplateContext,
} from './template.js';

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`). */
function flatten(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/** The last path segment of a relative import specifier. */
function importBase(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return segments.at(-1) ?? specifier;
}

/** `forge-icon-button` → `ForgeIconButton` — the PascalCase fallback for a sibling import with no usable binding. */
function toPascalCase(base: string): string {
  return base
    .split('-')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

/**
 * The default-import binding a flattened `.svelte` sibling import uses — the
 * PascalCase component name actually referenced in the template. Neutral
 * components import their siblings by **name** (`import { ForgeTypography }
 * from '../forge-typography'`), not as a default import, so the binding is
 * read off that named import (falling back to a default-import's own name, or
 * finally the PascalCase of the file base when neither shape is present).
 */
function siblingComponentBinding(statement: ts.ImportDeclaration, base: string): string {
  const clause = statement.importClause;
  if (clause?.name !== undefined) {
    return clause.name.text;
  }
  const bindings = clause?.namedBindings;
  if (bindings !== undefined && ts.isNamedImports(bindings)) {
    const valueElement = bindings.elements.find((element) => !element.isTypeOnly);
    if (valueElement !== undefined) {
      return valueElement.name.text;
    }
  }
  return toPascalCase(base);
}

/** The type-only named-import members of a sibling component import (e.g. `type TypographyVariant`). */
function siblingTypeNames(statement: ts.ImportDeclaration): string[] {
  const bindings = statement.importClause?.namedBindings;
  if (bindings === undefined || !ts.isNamedImports(bindings)) {
    return [];
  }
  const statementIsTypeOnly = statement.importClause?.isTypeOnly === true;
  return bindings.elements
    .filter((element) => statementIsTypeOnly || element.isTypeOnly)
    .map((element) => element.name.text);
}

/**
 * Whether a sibling import statement carries any runtime **value** binding at
 * all — `false` for a wholly `import type { … }` statement (e.g. `import type
 * { MenuNode } from '../forge-menu'`, which pulls in only a type, never the
 * component itself). Such a statement must not also emit a default `.svelte`
 * value import (there would be nothing to bind it to, and Svelte's script
 * parser doesn't erase `import type` early enough to tolerate the resulting
 * duplicate identifier).
 */
function siblingHasValueBinding(statement: ts.ImportDeclaration): boolean {
  const clause = statement.importClause;
  if (clause === undefined || clause.isTypeOnly) {
    return false;
  }
  if (clause.name !== undefined) {
    return true;
  }
  const bindings = clause.namedBindings;
  return (
    bindings !== undefined && ts.isNamedImports(bindings) && bindings.elements.some((element) => !element.isTypeOnly)
  );
}

/**
 * The element type of a `useRef<T>` type argument, with any `| null` / `|
 * undefined` union member stripped — a `$state<T>()` ref is always nullable
 * until the element mounts, so it takes the bare element type. Returns
 * `undefined` for an untyped ref (or one typed only `null`/`undefined`).
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
  return kept.map((member) => member.getText(sourceFile)).join(' | ');
}

/**
 * Whether a `const <localName> = …;` initializer merely re-reads the local's
 * **own** prop (`properties.<localName>`, optionally `?? `/`||`-defaulted) —
 * the shape a normalising statement like `const children = properties.children;`
 * or `const variant = properties.variant ?? 'neutral';` takes. Printing either
 * verbatim after prop-access scoping would redeclare `<localName>` (the
 * `$props()` destructure already binds it), so the caller folds the default (if
 * any) into that destructure entry and drops the statement instead. Returns
 * `undefined` when `initializer` isn't one of these two shapes.
 */
function sameNamePropDefault(
  localName: string,
  initializer: ts.Expression,
  propsParam: string,
): { propName: string; fallback: ts.Expression | undefined } | undefined {
  if (
    ts.isPropertyAccessExpression(initializer) &&
    ts.isIdentifier(initializer.expression) &&
    initializer.expression.text === propsParam &&
    initializer.name.text === localName
  ) {
    return { propName: localName, fallback: undefined };
  }
  if (
    ts.isBinaryExpression(initializer) &&
    (initializer.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      initializer.operatorToken.kind === ts.SyntaxKind.BarBarToken) &&
    ts.isPropertyAccessExpression(initializer.left) &&
    ts.isIdentifier(initializer.left.expression) &&
    initializer.left.expression.text === propsParam &&
    initializer.left.name.text === localName
  ) {
    return { propName: localName, fallback: initializer.right };
  }
  return undefined;
}

/**
 * Whether a `const <name> = (…) => { … };` initializer is a **wrapper**
 * closing over its own same-named prop — `const onLocaleChange = (value) => {
 * properties.onLocaleChange?.(value); };` — the shape a component takes when
 * it deliberately avoids destructuring an event prop so it can wrap it. Once
 * `properties.onLocaleChange` collapses to the bare prop name, this would
 * redeclare `onLocaleChange` (the `$props()` destructure already binds it),
 * so the caller aliases the **prop**'s destructure entry instead, leaving the
 * wrapper's own declared name free.
 */
function isSelfShadowingWrapper(name: string, initializer: ts.Expression, propsParam: string): boolean {
  if (!(ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
    return false;
  }
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      !found &&
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === propsParam &&
      node.name.text === name
    ) {
      found = true;
      return;
    }
    if (!found) {
      ts.forEachChild(node, visit);
    }
  };
  visit(initializer.body);
  return found;
}

/** Whether a node's subtree contains any literal JSX (element/self-closing/fragment) anywhere. */
function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
    return true;
  }
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && containsJsx(child)) {
      found = true;
    }
  });
  return found;
}

/** Whether a node's subtree references the component's `children` prop (`properties.children` or bare `children`). */
function referencesChildren(node: ts.Node, propsParam: string): boolean {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === propsParam &&
    node.name.text === 'children'
  ) {
    return true;
  }
  if (ts.isIdentifier(node) && node.text === 'children') {
    return true;
  }
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && referencesChildren(child, propsParam)) {
      found = true;
    }
  });
  return found;
}

/**
 * Whether a `const <name> = …;` initializer normalises the component's
 * `children` into a variadic array — the `children === undefined ? [] :
 * Array.isArray(children) ? [...children] : [children]` shape a component
 * takes when it must forward its slot to a hyperscript `h(tag, props,
 * ...childList)` render. Svelte has no such array (`children` is a snippet
 * prop), so the caller registers `<name>` as a `children` alias (rendered as
 * `{@render children?.()}`) and drops the declaration rather than printing it
 * into the `<script>`.
 */
function isChildrenListNormalization(initializer: ts.Expression, propsParam: string): boolean {
  if (!ts.isConditionalExpression(initializer) || !referencesChildren(initializer, propsParam)) {
    return false;
  }
  let usesArrayIsArray = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Array' &&
      node.expression.name.text === 'isArray'
    ) {
      usesArrayIsArray = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(initializer);
  return usesArrayIsArray;
}

/**
 * Read an early-return guard — `if (cond) return <value>;` (the `then` a bare
 * `return`, a single-statement block wrapping one, or a block whose leading
 * statements are JSX-yielding `const` locals followed by a `return`), with no
 * `else` — into its condition and returned expression. These fold into the
 * template as a leading `{#if cond}…` branch (with the component's final bare
 * `return` as the `{:else}`), so an early return never leaks a bare `return`
 * into the `<script>`.
 *
 * A leading local computed **from** JSX (e.g. `const wizardSteps =
 * indices.map((i) => ({ …, content: cond ? <jsx/> : undefined }))` ahead of
 * `return <ForgeFormWizard steps={wizardSteps} … />;`) has no script-side form
 * regardless of which branch declares it — same as a top-level one (see the
 * module doc comment's `jsxConstants` note) — so it is registered into
 * `jsxConstants` here exactly as a top-level declaration would be, and the
 * whole statement is otherwise dropped (never printed) rather than leaking
 * its raw JSX into the `<script>`. Any other leading statement shape falls
 * back to `undefined` (the caller then carries the whole `if` as an ordinary,
 * unconverted setup statement, as before).
 */
function readEarlyReturn(
  statement: ts.Statement,
  jsxConstants: Map<string, ts.Expression>,
): { condition: ts.Expression; value: ts.Expression } | undefined {
  if (!ts.isIfStatement(statement) || statement.elseStatement !== undefined) {
    return undefined;
  }
  const then = statement.thenStatement;
  if (!ts.isBlock(then)) {
    return ts.isReturnStatement(then) && then.expression !== undefined
      ? { condition: statement.expression, value: then.expression }
      : undefined;
  }
  const last = then.statements.at(-1);
  if (last === undefined || !ts.isReturnStatement(last) || last.expression === undefined) {
    return undefined;
  }
  for (const leading of then.statements.slice(0, -1)) {
    if (!ts.isVariableStatement(leading) || leading.declarationList.declarations.length !== 1) {
      return undefined;
    }
    const declaration = leading.declarationList.declarations[0];
    if (
      declaration === undefined ||
      !ts.isIdentifier(declaration.name) ||
      declaration.initializer === undefined ||
      !containsJsx(declaration.initializer)
    ) {
      return undefined;
    }
    jsxConstants.set(declaration.name.text, declaration.initializer);
  }
  return { condition: statement.expression, value: last.expression };
}

interface StateField {
  getter: string;
  setter: string;
  init: string;
}

interface RefField {
  name: string;
  type: string | undefined;
  init: string | undefined;
}

/** Transform the whole module into a Svelte 5 SFC. */
export function emitSvelteModule(
  rawSourceFile: ts.SourceFile,
  componentName: string = 'Component',
  componentFolders: ReadonlySet<string> = new Set(),
): { code: string; extraModules?: { name: string; code: string; lang: 'svelte' | 'ts' | 'tsx' | 'vue' }[] } {
  const factory = ts.factory;
  const printer = ts.createPrinter();
  const neutral = readNeutralImports(rawSourceFile);
  const keptRuntimeValues = neutral.values.filter((name) => NEUTRAL_RUNTIME_VALUES.has(name));

  const fn = findComponentFunction(rawSourceFile, componentName);
  const parameter = fn?.parameters[0];
  const propsParam = parameter && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';
  // Printed verbatim (not just the outer identifier), so a generic reference
  // like `Readonly<BadgeProperties>` survives whole rather than collapsing to
  // a bare (type-argument-less) `Readonly`.
  const propsType =
    parameter?.type !== undefined && ts.isTypeReferenceNode(parameter.type)
      ? parameter.type.getText(rawSourceFile)
      : undefined;

  const jsxConstants = new Map<string, ts.Expression>();
  const propAliasMap = new Map<string, string>();
  const childrenAliases = new Set<string>();
  const context: SvelteTemplateContext = {
    factory,
    propsParam,
    componentFolders,
    refNames: new Set<string>(),
    jsxConstants,
    propAliasMap,
    childrenAliases,
  };

  // Collect props (`properties.x` reads), state, and the head/return statements.
  const propNames = new Set<string>();
  const stateFields: StateField[] = [];
  const refFields: RefField[] = [];
  const setterToGetter = new Map<string, string>();
  const derived: { name: string; expression: string }[] = [];
  const effects: string[] = [];

  if (fn?.body) {
    const walkProps = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === propsParam
      ) {
        propNames.add(node.name.text);
      }
      ts.forEachChild(node, walkProps);
    };
    walkProps(fn.body);
  }
  propNames.delete('children');

  // Named slots (`<Slot name="…" />`) are rendered through `slots.<name>`
  // equivalents (`{@render <name>?.()}`) and presence-checked through
  // `hasSlot('name')`, so a slot never appears as a `properties.<name>` read —
  // it still needs to exist as a runtime (snippet) prop, though.
  const slotNames = collectSlotNames(rawSourceFile);

  // Pre-scan `useRef` declarations (so every `.current` read in the body
  // resolves to the bare `$state` name regardless of where it is encountered
  // in the pass below) and self-shadowing wrapper declarations (so every
  // `properties.<name>` read aliases to a non-colliding prop binding).
  if (fn?.body) {
    for (const statement of fn.body.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }
      const declaration = statement.declarationList.declarations[0];
      const initializer = declaration?.initializer;
      if (declaration === undefined || !ts.isIdentifier(declaration.name) || initializer === undefined) {
        continue;
      }
      if (
        ts.isCallExpression(initializer) &&
        ts.isIdentifier(initializer.expression) &&
        initializer.expression.text === 'useRef'
      ) {
        context.refNames.add(declaration.name.text);
        continue;
      }
      if (isSelfShadowingWrapper(declaration.name.text, initializer, propsParam)) {
        propAliasMap.set(declaration.name.text, `${declaration.name.text}Prop`);
      }
    }
  }

  // The `$props()` destructure entries, keyed by real prop name — seeded from
  // every `properties.x` read and every named slot, then refined below as
  // destructuring/inline defaults are folded in (a later `.set` for the same
  // key overwrites the entry text in place, preserving its original position).
  const propEntries = new Map<string, string>();
  const seedEntry = (name: string): string => {
    const alias = propAliasMap.get(name) ?? name;
    return alias === name ? name : `${name}: ${alias}`;
  };
  for (const name of propNames) {
    propEntries.set(name, seedEntry(name));
  }
  for (const name of slotNames) {
    if (!propEntries.has(name)) {
      propEntries.set(name, seedEntry(name));
    }
  }

  // Head statements (setup) scoped: `properties.x` → `x`, `setX(v)` → `x = v`.
  const headStatements: string[] = [];
  // Return handling: an early-return guard (`if (cond) return A;`) folds into a
  // leading `{#if cond}A…` branch; the component's final bare `return B;`
  // becomes the (`{:else}`) fallback. Collected here so no `return`/`h(...)`
  // ever leaks into the `<script>` (see the template assembly below).
  const returnBranches: { condition: ts.Expression; value: ts.Expression }[] = [];
  let finalReturn: ts.Expression | undefined;
  if (fn?.body) {
    for (const statement of fn.body.statements) {
      if (ts.isReturnStatement(statement)) {
        if (statement.expression !== undefined) {
          finalReturn = statement.expression;
        }
        continue;
      }

      // `if (cond) return <value>;` — an early/conditional return: collect it
      // as a `{#if}` branch instead of carrying the (bare `return`) statement
      // into the script.
      const earlyReturn = readEarlyReturn(statement, jsxConstants);
      if (earlyReturn !== undefined) {
        returnBranches.push(earlyReturn);
        continue;
      }

      // `if (cond) { list.push(<jsx>, …); }` immediately conditionally
      // extending an already-lifted JSX-yielding array local (e.g. an
      // "empty state" row appended only when the mapped list is empty) has no
      // script-side form either (see the `containsJsx` lift above): fold it
      // into that local's stored initializer as `cond ? [<jsx>, …] :
      // <original>` — correct whenever, as observed here, the original array
      // is guaranteed empty exactly when `cond` holds (a `.map()` over the
      // same guard) — and drop the statement.
      if (
        ts.isIfStatement(statement) &&
        statement.elseStatement === undefined &&
        ts.isBlock(statement.thenStatement) &&
        statement.thenStatement.statements.length === 1
      ) {
        const inner = statement.thenStatement.statements[0];
        if (
          inner !== undefined &&
          ts.isExpressionStatement(inner) &&
          ts.isCallExpression(inner.expression) &&
          ts.isPropertyAccessExpression(inner.expression.expression) &&
          ts.isIdentifier(inner.expression.expression.expression) &&
          inner.expression.expression.name.text === 'push' &&
          jsxConstants.has(inner.expression.expression.expression.text)
        ) {
          const arrayName = inner.expression.expression.expression.text;
          const original = jsxConstants.get(arrayName)!;
          const replacement = factory.createConditionalExpression(
            statement.expression,
            undefined,
            factory.createArrayLiteralExpression([...inner.expression.arguments]),
            undefined,
            original,
          );
          jsxConstants.set(arrayName, replacement);
          continue;
        }
      }

      // `list.push(<jsx>, …);` unconditionally extending an already-lifted
      // JSX-yielding array local (e.g. `tagChips.push(<input …/>)` after
      // `const tagChips = selectedOptions.map(…)`) has no script-side form
      // either — fold the pushed element(s) into that local's stored
      // initializer as `[...<original>, <jsx>, …]` (the template emitter
      // unwraps the leading spread back into the original `.map()`/array) and
      // drop the statement.
      if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        ts.isPropertyAccessExpression(statement.expression.expression) &&
        ts.isIdentifier(statement.expression.expression.expression) &&
        statement.expression.expression.name.text === 'push' &&
        jsxConstants.has(statement.expression.expression.expression.text)
      ) {
        const arrayName = statement.expression.expression.expression.text;
        const original = jsxConstants.get(arrayName)!;
        const replacement = factory.createArrayLiteralExpression([
          factory.createSpreadElement(original),
          ...statement.expression.arguments,
        ]);
        jsxConstants.set(arrayName, replacement);
        continue;
      }

      if (ts.isVariableStatement(statement)) {
        const declaration = statement.declarationList.declarations[0];
        const initializer = declaration?.initializer;

        // `const { a = 'x', b, c: alias = 'y' } = properties;` — Svelte has no
        // reactive `properties` object to keep reading defaults off of (unlike
        // the Vue target), so every member's default (and rename) folds
        // straight into the `$props()` destructure and the statement is
        // dropped whole.
        if (
          declaration !== undefined &&
          ts.isObjectBindingPattern(declaration.name) &&
          initializer !== undefined &&
          ts.isIdentifier(initializer) &&
          initializer.text === propsParam
        ) {
          for (const element of declaration.name.elements) {
            if (element.dotDotDotToken !== undefined || !ts.isIdentifier(element.name)) {
              continue;
            }
            const propName =
              element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
                ? element.propertyName.text
                : element.name.text;
            const localName = element.name.text;
            const alias = localName === propName ? propName : `${propName}: ${localName}`;
            const fallback =
              element.initializer !== undefined ? ` = ${scopeExpression(element.initializer, context)}` : '';
            propEntries.set(propName, `${alias}${fallback}`);
          }
          continue;
        }

        // `const x = properties.x;` / `const x = properties.x ?? 'default';`
        // (the local merely re-reads its own prop under the same name) —
        // printing either verbatim after scoping would redeclare `x` (the
        // destructure already binds it), so any default folds into the
        // `$props()` entry and the statement is dropped either way.
        if (declaration !== undefined && ts.isIdentifier(declaration.name) && initializer !== undefined) {
          const sameName = sameNamePropDefault(declaration.name.text, initializer, propsParam);
          if (sameName !== undefined) {
            if (sameName.fallback !== undefined) {
              propEntries.set(
                sameName.propName,
                `${sameName.propName} = ${scopeExpression(sameName.fallback, context)}`,
              );
            }
            continue;
          }
        }

        // `const childList = children === undefined ? [] : Array.isArray(...)
        // ? [...children] : [children];` — a variadic `children` normalisation
        // for a hyperscript render: register the local as a `children` alias
        // (every read renders the children snippet) and drop the declaration.
        if (
          declaration !== undefined &&
          ts.isIdentifier(declaration.name) &&
          initializer !== undefined &&
          isChildrenListNormalization(initializer, propsParam)
        ) {
          childrenAliases.add(declaration.name.text);
          continue;
        }

        if (initializer !== undefined && ts.isCallExpression(initializer) && ts.isIdentifier(initializer.expression)) {
          const hook = initializer.expression.text;
          if (hook === 'useState' && ts.isArrayBindingPattern(declaration.name)) {
            const [first, second] = declaration.name.elements;
            if (first && ts.isBindingElement(first) && ts.isIdentifier(first.name)) {
              const getter = first.name.text;
              const setter =
                second && ts.isBindingElement(second) && ts.isIdentifier(second.name)
                  ? second.name.text
                  : `set${getter}`;
              const initArgument = initializer.arguments[0];
              // `useState(properties.title ?? '')` seeds the state from its
              // own same-named prop (`const [title, setTitle] = …`) — printing
              // `properties.title` scoped straight to bare `title` would make
              // the emitted `let title = $state(title ?? '')` self-referential
              // (and collide with the `$props()` destructure, which also binds
              // `title`). Alias the PROP's destructure entry instead
              // (`title: titleProp`), so the initializer resolves to the
              // incoming prop while the `$state` declaration keeps the plain
              // name — the same per-prop rename `propAliasMap` already applies
              // to a same-named wrapper local (see its doc comment).
              if (initArgument !== undefined && sameNamePropDefault(getter, initArgument, propsParam) !== undefined) {
                propAliasMap.set(getter, `${getter}Prop`);
                propEntries.set(getter, seedEntry(getter));
              }
              const init = initArgument !== undefined ? scopeExpression(initArgument, context) : 'undefined';
              stateFields.push({ getter, setter, init });
              setterToGetter.set(setter, getter);
            }
            continue;
          }
          // `useRef<T>(initial)` → a `$state<T>()` declaration holding the
          // element directly (see `context.refNames` / `./template`'s
          // `bind:this` + `.current` rewrites).
          if (hook === 'useRef' && ts.isIdentifier(declaration.name)) {
            const elementType = elementRefType(initializer.typeArguments?.[0], rawSourceFile);
            const initialArgument = initializer.arguments[0];
            const init =
              initialArgument === undefined ||
              initialArgument.kind === ts.SyntaxKind.NullKeyword ||
              (ts.isIdentifier(initialArgument) && initialArgument.text === 'undefined')
                ? undefined
                : scopeExpression(initialArgument, context);
            refFields.push({ name: declaration.name.text, type: elementType, init });
            continue;
          }
          if (hook === 'useMemo' && ts.isIdentifier(declaration.name)) {
            const fnArg = initializer.arguments[0];
            if (fnArg) {
              // Stage-2 quality: a constant memo factory needs no `$derived` —
              // emit a plain `const` so the value is never tracked reactively.
              const constantBody = constantMemoFactoryBody(fnArg);
              if (constantBody !== undefined) {
                headStatements.push(`const ${declaration.name.text} = ${scopeExpression(constantBody, context)};`);
              } else {
                derived.push({ name: declaration.name.text, expression: scopeExpression(fnArg, context) });
              }
            }
            continue;
          }
        }

        // A local computed **from** JSX (directly, through a ternary/`&&`, or
        // a `.map()` yielding elements) has no script-side form — Svelte
        // markup only exists in the template — so it is never printed as a
        // script `const`; every bare read of it in the template substitutes
        // (and converts) this original initializer instead.
        if (
          declaration !== undefined &&
          ts.isIdentifier(declaration.name) &&
          initializer !== undefined &&
          containsJsx(initializer)
        ) {
          jsxConstants.set(declaration.name.text, initializer);
          continue;
        }
      }
      if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        ts.isIdentifier(statement.expression.expression) &&
        statement.expression.expression.text === 'useEffect'
      ) {
        const fnArg = statement.expression.arguments[0];
        if (fnArg) {
          effects.push(scopeExpression(fnArg, context));
        }
        continue;
      }
      // Ordinary setup statement — scope props/state/refs and carry it over.
      headStatements.push(scopeStatement(statement, context, setterToGetter, printer));
    }
  }

  // Imports for the script block.
  const scriptImports: string[] = [];
  for (const statement of rawSourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      if (specifier === NEUTRAL_MODULE) {
        if (keptRuntimeValues.length > 0) {
          scriptImports.push(`import { ${keptRuntimeValues.join(', ')} } from '${NEUTRAL_MODULE}';`);
        }
        // Render/props primitives resolve to the co-located per-framework module;
        // the neutral element types (`MpChild`/`MpElement`) are only used in the
        // dropped return annotation, so no neutral import survives.
        const localTypes = neutral.types.filter((name) => LOCAL_JSX_TYPE_NAMES.has(name));
        if (localTypes.length > 0) {
          scriptImports.push(`import type { ${localTypes.join(', ')} } from '${LOCAL_JSX_TYPES_MODULE}';`);
        }
        continue;
      }
      if (specifier.startsWith('.')) {
        const base = importBase(specifier);
        if (componentFolders.has(base)) {
          const hasValueBinding = siblingHasValueBinding(statement);
          const binding = hasValueBinding ? siblingComponentBinding(statement, base) : undefined;
          if (binding !== undefined) {
            scriptImports.push(`import ${binding} from '${flatten(specifier)}.svelte';`);
          }
          // A type carried alongside (or, for a wholly `import type { … }`
          // statement, in place of) the component's own value import — dropped
          // when it shares the value binding's identifier (an `import type`
          // sharing a name with the value import isn't erased early enough by
          // Svelte's script parser to avoid a duplicate-identifier error).
          const typeNames = siblingTypeNames(statement).filter((name) => name !== binding);
          if (typeNames.length > 0) {
            scriptImports.push(`import type { ${typeNames.join(', ')} } from '${flatten(specifier)}.svelte';`);
          }
        } else {
          const clause = statement.importClause ? `${statement.importClause.getText(rawSourceFile)} from ` : '';
          scriptImports.push(`import ${clause}'${flatten(specifier)}';`);
        }
        continue;
      }
      scriptImports.push(statement.getText(rawSourceFile));
    }
  }

  // Public type declarations (interfaces/type aliases) carried into the script.
  const typeDeclarations: string[] = [];
  for (const statement of rawSourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      typeDeclarations.push(statement.getText(rawSourceFile));
    }
  }

  // Props destructure from `$props()`.
  if (!propEntries.has('children')) {
    propEntries.set('children', 'children');
  }
  const propsAnnotation = propsType !== undefined ? `: ${propsType}` : '';
  const propsLine = `  let { ${[...propEntries.values()].join(', ')} }${propsAnnotation} = $props();`;

  const stateLines = stateFields.map((field) => `  let ${field.getter} = $state(${field.init});`);
  const refLines = refFields.map((field) => {
    const typeArgument = field.type !== undefined ? `<${field.type}>` : '';
    return `  let ${field.name} = $state${typeArgument}(${field.init ?? ''});`;
  });
  const derivedLines = derived.map((entry) => `  const ${entry.name} = $derived.by(${entry.expression});`);
  const effectLines = effects.map((effect) => `  $effect(${effect});`);

  // Template from the component's return(s): the final bare `return` as the
  // markup body, with any early-return guard(s) folded in ahead of it as an
  // `{#if}/{:else if}/{:else}` chain. Rendered only for a returnable shape
  // (JSX, a hyperscript `h(...)` call, or a lifted JSX-yielding/`children`
  // local); anything else degrades to an empty template rather than leaking a
  // stray `{expr}` — never a bare `return` — into the output.
  const isRenderableReturn = (expression: ts.Expression): boolean => {
    const inner = ts.isParenthesizedExpression(expression) ? expression.expression : expression;
    return (
      containsJsx(inner) ||
      isHyperscriptCall(inner) ||
      (ts.isIdentifier(inner) && (jsxConstants.has(inner.text) || childrenAliases.has(inner.text)))
    );
  };
  const elseMarkup =
    finalReturn !== undefined && isRenderableReturn(finalReturn) ? renderReturnValue(finalReturn, context) : '';
  let template = '';
  if (returnBranches.length > 0) {
    const clauses = returnBranches.map((branch, index) => {
      const keyword = index === 0 ? '#if' : ':else if';
      return `{${keyword} ${scopeExpression(branch.condition, context)}}${renderReturnValue(branch.value, context)}`;
    });
    template = `${clauses.join('')}{:else}${elseMarkup}{/if}`;
  } else {
    template = elseMarkup;
  }

  const scriptBody = [
    ...scriptImports.map((line) => `  ${line}`),
    ...typeDeclarations.map((declaration) => `  ${declaration}`),
    propsLine,
    ...stateLines,
    ...refLines,
    ...derivedLines,
    ...headStatements.map((line) => `  ${line}`),
    ...effectLines,
  ].join('\n');

  const code = `<script lang="ts">\n${scriptBody}\n</script>\n\n${template}\n`;
  return { code };
}

/**
 * If a `useMemo` factory is (or returns) a compile-time constant, yield that
 * constant expression so the emitter can skip `$derived.by`.
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

/** Print a setup statement with `properties.x` → `x`, `<ref>.current` → `<ref>`, `hasSlot(…)` → `… != null`, and `setX(v)` → `x = v` rewrites. */
function scopeStatement(
  statement: ts.Statement,
  context: SvelteTemplateContext,
  setterToGetter: ReadonlyMap<string, string>,
  printer: ts.Printer,
): string {
  const { factory } = context;
  const transform = (transformContext: ts.TransformationContext): ts.Transformer<ts.Node> => {
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && setterToGetter.has(node.expression.text)) {
        const getter = setterToGetter.get(node.expression.text)!;
        const argument = node.arguments[0]
          ? (ts.visitNode(node.arguments[0], visit) as ts.Expression)
          : factory.createIdentifier('undefined');
        return factory.createBinaryExpression(
          factory.createIdentifier(getter),
          factory.createToken(ts.SyntaxKind.EqualsToken),
          argument,
        );
      }
      const rewritten = rewriteScopedNode(node, context);
      if (rewritten !== undefined) {
        return rewritten;
      }
      return ts.visitEachChild(node, visit, transformContext);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
  const result = ts.transform(statement, [transform]);
  const out = printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], statement.getSourceFile());
  result.dispose();
  return out;
}
