/**
 * Shared AST utilities for the Stage-1 source-to-source compiler.
 *
 * The neutral components are authored as ordinary TypeScript functions in the
 * classic-`h` JSX dialect against `@mission-platform/jsx`. Stage 1 parses that
 * source with the TypeScript compiler API and rewrites it into a per-framework
 * **source module** (a React `.tsx` or a Vue `.vue` SFC); Stage 2 then compiles
 * that module with the framework's own toolchain (React JSX / `@vitejs/plugin-vue`),
 * so neither runtime pays for a generic adapter.
 *
 * This module holds the framework-agnostic pieces: parsing, printing, neutral
 * import inspection, component-function discovery, props extraction, and the
 * scope-aware reference rewriter the Vue emitter uses to turn React-style hook
 * usage into Vue reactivity.
 */
import ts from 'typescript';

/** The neutral package the components import their primitives from. */
export const NEUTRAL_MODULE = '@mission-platform/jsx';

/**
 * Neutral **value** imports that are framework-agnostic runtime utilities — they
 * behave identically on every target, so (unlike `h` and the hooks, which are
 * translated/aliased per framework) their `import { … } from '@mission-platform/jsx'`
 * must be preserved verbatim in the generated React and Vue sources.
 */
export const NEUTRAL_RUNTIME_VALUES: ReadonlySet<string> = new Set(['classNames']);

/**
 * The neutral JSX attribute that drives class-name management. Authors write
 * `classNames={…}` (the `class` attribute is reserved for static strings),
 * passing the same arguments the `classNames` runtime helper accepts — most
 * commonly an **array** of class values (`classNames={['base', { active }]}`),
 * but any single {@link import('@mission-platform/jsx').ClassValue} works too.
 * The plugin *owns* this attribute (`classNames` itself is never imported by the
 * author): the React emitter collapses an array form to a `className={classNames(…)}`
 * string call (and re-injects the neutral `classNames` import), while the Vue
 * emitter maps it straight onto Vue's native `class` binding, which already
 * understands the array/object forms.
 */
export const CLASS_NAMES_ATTRIBUTE = 'classNames';

/**
 * Neutral **value** imports that are pure compile-time markers — they exist only
 * so the authored JSX type-checks and are *consumed* by the emitters (their JSX
 * usages are rewritten to each framework's own mechanism), so they must never be
 * carried into the generated React or Vue source as a real import. `Slot`
 * (`<Slot name="…" />`) is the named-slot marker, `Dynamic`
 * (`<Dynamic is={…} />`) is the dynamic-component marker (rewritten to an
 * `h(is, …)` call, which each framework's JSX transform / `<component :is>` then
 * compiles natively), and `hasSlot` (`hasSlot('x')`) is the slot-presence marker
 * (rewritten to Vue's `!!slots.x` / `$slots.x` and React's `properties.x != null`).
 */
export const NEUTRAL_COMPILE_TIME_MARKERS: ReadonlySet<string> = new Set(['Slot', 'Dynamic', 'hasSlot']);

/**
 * Neutral **value** imports that are real, per-framework **components** rather
 * than markers, runtime utilities, or React's own primitives. Their JSX usage
 * is left untouched (they stay a component tag), but their
 * `import { … } from '@mission-platform/jsx'` is remapped to the target
 * framework's native implementation: `Teleport` (the portal primitive) becomes
 * `import { Teleport } from '@mission-platform/jsx/react'` (a `createPortal`
 * wrapper) for React and `import { Teleport } from 'vue'` (the built-in) for Vue;
 * `Transition` (the enter/leave primitive) becomes the
 * `@mission-platform/jsx/react` CSS-class driver for React and the built-in
 * `import { Transition } from 'vue'` for Vue; `TransitionGroup` (the list
 * enter/leave/move primitive) is remapped the same way (the
 * `@mission-platform/jsx/react` group driver for React, the built-in
 * `import { TransitionGroup } from 'vue'` for Vue).
 */
export const NEUTRAL_FRAMEWORK_COMPONENTS: ReadonlySet<string> = new Set(['Teleport', 'Transition', 'TransitionGroup']);

/** The neutral framework-component imports Vue resolves straight from the `vue` runtime. */
export const VUE_BUILTIN_COMPONENTS: ReadonlySet<string> = new Set(['Teleport', 'Transition', 'TransitionGroup']);

/**
 * Neutral **value** imports that are the context primitives. On React they *are*
 * React's own (`createContext`/`useContext`), so they fall through to the
 * `react` value import; on Vue their import is remapped to the
 * `@mission-platform/jsx/vue` adapter (a `provide`/`inject`-backed
 * `createContext`/`useContext`).
 */
export const NEUTRAL_CONTEXT_VALUES: ReadonlySet<string> = new Set(['createContext', 'useContext']);

/** The `@mission-platform/jsx/react` subpath the React framework components are imported from. */
export const REACT_ADAPTER_MODULE = '@mission-platform/jsx/react';

/** The `@mission-platform/jsx/vue` subpath the Vue context primitives are imported from. */
export const VUE_ADAPTER_MODULE = '@mission-platform/jsx/vue';

/**
 * The bare specifier of the write-once icon library `@mission-platform/icons`.
 * Neutral authors import their icons from this root (which type-checks against the
 * neutral icon source and renders through the `@mission-platform/jsx` adapters in
 * unit tests), but the package ships **only** the compiled `./react` / `./vue`
 * builds — so the emitters remap the bare specifier to the matching per-framework
 * subpath (see {@link iconsJsxFrameworkModule}), exactly like the
 * {@link NEUTRAL_FRAMEWORK_COMPONENTS} `Teleport`/`Transition` remap.
 */
export const ICONS_JSX_MODULE = '@mission-platform/icons';

/** The per-framework subpath the compiled `@mission-platform/icons` icons are imported from. */
export function iconsJsxFrameworkModule(framework: 'react' | 'vue'): string {
  return `${ICONS_JSX_MODULE}/${framework}`;
}

/**
 * The write-once **component-library** workspace packages: like
 * `@mission-platform/icons`, neutral authors import their components from these
 * packages (e.g. `BaseDrawer` from `@mission-platform/components/base-drawer`, or
 * `BaseVerticalLayout` from `@mission-platform/layouts`), which type-check
 * against the neutral source and render through the `@mission-platform/jsx`
 * adapters in unit tests — but each package ships **only** the compiled
 * `./react` / `./vue` builds, so the emitters remap the neutral import to the
 * matching per-framework entry. (The built entry re-exports each component under
 * **both** its public and neutral `Base*` name, so the `Base*` imports resolve.)
 */
export const COMPONENTS_JSX_MODULES = ['@mission-platform/components', '@mission-platform/layouts'] as const;

/**
 * For a write-once, framework-split workspace package import, return the
 * per-framework subpath the emitters remap it to — or `undefined` when the
 * specifier is not a framework-split package and should be carried verbatim.
 *
 * The framework-split packages publish only their compiled `./react` / `./vue`
 * builds yet are authored against neutrally: `@mission-platform/icons` (imported
 * from its root) and the {@link COMPONENTS_JSX_MODULES} component libraries
 * (imported from their root or a neutral subpath such as
 * `@mission-platform/components/base-drawer`). Each is remapped to the matching
 * `…/<framework>` entry; an already-framework subpath is left untouched.
 */
export function frameworkSplitModule(specifier: string, framework: 'react' | 'vue'): string | undefined {
  if (specifier === ICONS_JSX_MODULE) {
    return iconsJsxFrameworkModule(framework);
  }
  for (const base of COMPONENTS_JSX_MODULES) {
    if (specifier === `${base}/react` || specifier === `${base}/vue`) {
      return undefined;
    }
    if (specifier === base || specifier.startsWith(`${base}/`)) {
      return `${base}/${framework}`;
    }
  }
  return undefined;
}

/** The JSX tag name of the neutral named-slot marker element. */
const SLOT_TAG = 'Slot';

/** The JSX tag name of the neutral dynamic-component marker element. */
const DYNAMIC_TAG = 'Dynamic';

/** The callee name of the neutral slot-presence marker (`hasSlot('x')`). */
const HAS_SLOT_CALLEE = 'hasSlot';

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

/** Parse a `.tsx` source string into a (parented) TSX source file. */
export function parseTsx(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Print a single node back to source text, anchored to its source file. */
export function printNode(node: ts.Node, sourceFile: ts.SourceFile): string {
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
}

/** Print a whole (possibly transformed) source file back to source text. */
export function printSourceFile(sourceFile: ts.SourceFile): string {
  return printer.printFile(sourceFile);
}

/** The recognised `"use <framework>";` module directives → the framework they pin a module to. */
const FRAMEWORK_DIRECTIVES: Readonly<Record<string, 'react' | 'vue'>> = {
  'use react': 'react',
  'use vue': 'vue',
};

/**
 * Read a module's `"use <framework>";` directive, if any.
 *
 * A module may opt into a **framework-specific** implementation by opening with
 * a `"use react";` or `"use vue";` directive (mirroring `"use strict"` /
 * `"use client"`). This returns the framework the directive pins the module to,
 * or `undefined` when the module is framework-neutral (no such directive).
 *
 * Only the leading **directive prologue** — the run of consecutive
 * string-literal expression statements at the very top of the module — is
 * inspected, matching JavaScript's directive semantics; other prologue
 * directives (e.g. `"use strict"`) are ignored.
 */
export function readFrameworkDirective(sourceFile: ts.SourceFile): 'react' | 'vue' | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteralLike(statement.expression)) {
      // The directive prologue ends at the first non-string-literal statement.
      break;
    }
    const framework = FRAMEWORK_DIRECTIVES[statement.expression.text];
    if (framework !== undefined) {
      return framework;
    }
  }
  return undefined;
}

/**
 * Whether a module should be emitted for `framework`. A framework-neutral module
 * (no `"use <framework>"` directive) is emitted for every target; a gated module
 * is emitted **only** for the framework its directive names.
 */
export function moduleTargetsFramework(sourceFile: ts.SourceFile, framework: 'react' | 'vue'): boolean {
  const directive = readFrameworkDirective(sourceFile);
  return directive === undefined || directive === framework;
}

/**
 * Return the source file with any leading `"use react"` / `"use vue"` directive
 * removed, so the compile-time gating marker never leaks into the emitted
 * per-framework source. Other prologue directives are preserved.
 */
export function stripFrameworkDirective(sourceFile: ts.SourceFile): ts.SourceFile {
  let inPrologue = true;
  const statements = sourceFile.statements.filter((statement) => {
    if (!inPrologue) {
      return true;
    }
    if (ts.isExpressionStatement(statement) && ts.isStringLiteralLike(statement.expression)) {
      return FRAMEWORK_DIRECTIVES[statement.expression.text] === undefined;
    }
    inPrologue = false;
    return true;
  });
  return ts.factory.updateSourceFile(sourceFile, statements);
}

/** The names a module imports from the neutral package, split by binding kind. */
export interface NeutralImports {
  /** Value imports (e.g. `h`, `useState`). */
  values: string[];
  /** Type-only imports (e.g. `MpProperties`). */
  types: string[];
}

/** Inspect a module's `import … from '@mission-platform/jsx'` bindings. */
export function readNeutralImports(sourceFile: ts.SourceFile): NeutralImports {
  const values: string[] = [];
  const types: string[] = [];
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== NEUTRAL_MODULE
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      continue;
    }
    for (const element of bindings.elements) {
      if (element.isTypeOnly) {
        types.push(element.name.text);
      } else {
        values.push(element.name.text);
      }
    }
  }
  return { values, types };
}

/** Whether the module references `h` as a call expression (an explicit `h(...)`). */
export function usesHFactoryCall(sourceFile: ts.SourceFile): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h') {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}

/**
 * Collapse a `classNames={…}` attribute value into the **React** `className`
 * value. React's `className` only accepts a string, so the conditional/array/
 * object forms must be reduced *before* they reach the element. An **array
 * literal** (the canonical form — `classNames={['base', { active }]}`) is
 * spread into a `classNames(…)` runtime call (`classNames('base', { active })`),
 * matching the variadic helper signature; any other expression is already a
 * single class value (a CSS-Module read, a precomputed string, a `… .join(' ')`,
 * a ternary) and is passed straight through as the `className` value.
 */
export function reactClassNameValue(factory: ts.NodeFactory, value: ts.Expression): ts.Expression {
  if (!ts.isArrayLiteralExpression(value)) {
    return value;
  }
  return factory.createCallExpression(factory.createIdentifier('classNames'), undefined, [...value.elements]);
}

/**
 * Whether the module carries a `classNames={[…]}` attribute whose value is an
 * **array literal** — the only form that compiles to a `classNames(…)` runtime
 * call on the React target, so the emitter must (re-)inject the neutral
 * `classNames` import for it (the author never imports the helper themselves).
 */
export function usesClassNamesArrayAttribute(sourceFile: ts.SourceFile): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === CLASS_NAMES_ATTRIBUTE &&
      node.initializer !== undefined &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression !== undefined &&
      ts.isArrayLiteralExpression(node.initializer.expression)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}

/**
 * Whether a node is a neutral named-slot element — `<Slot … />` or
 * `<Slot …>fallback</Slot>` — produced from the `Slot` marker.
 */
export function isSlotElement(node: ts.Node): node is ts.JsxSelfClosingElement | ts.JsxElement {
  if (ts.isJsxSelfClosingElement(node)) {
    return ts.isIdentifier(node.tagName) && node.tagName.text === SLOT_TAG;
  }
  if (ts.isJsxElement(node)) {
    return ts.isIdentifier(node.openingElement.tagName) && node.openingElement.tagName.text === SLOT_TAG;
  }
  return false;
}

/** The opening element (carrying the attributes) of a `<Slot>` node. */
function slotOpening(node: ts.JsxSelfClosingElement | ts.JsxElement): ts.JsxSelfClosingElement | ts.JsxOpeningElement {
  return ts.isJsxSelfClosingElement(node) ? node : node.openingElement;
}

/** Read the static `name="…"` of a `<Slot>` element (`undefined` → the default slot). */
export function readSlotName(node: ts.JsxSelfClosingElement | ts.JsxElement): string | undefined {
  for (const attribute of slotOpening(node).attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name) || attribute.name.text !== 'name') {
      continue;
    }
    const initializer = attribute.initializer;
    if (initializer !== undefined && ts.isStringLiteral(initializer)) {
      return initializer.text;
    }
    if (
      initializer !== undefined &&
      ts.isJsxExpression(initializer) &&
      initializer.expression !== undefined &&
      ts.isStringLiteralLike(initializer.expression)
    ) {
      return initializer.expression.text;
    }
  }
  return undefined;
}

/** The fallback children of a `<Slot>…</Slot>` (empty for a self-closing slot). */
export function slotFallbackChildren(node: ts.JsxSelfClosingElement | ts.JsxElement): ts.JsxChild[] {
  return ts.isJsxElement(node) ? [...node.children] : [];
}

/**
 * Whether a node is a `hasSlot('name')` / `hasSlot()` call — the neutral
 * slot-presence marker. The compiler rewrites it to each framework's native
 * presence check, so it is never emitted as a runtime call.
 */
export function isHasSlotCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === HAS_SLOT_CALLEE;
}

/** Read the static slot name of a `hasSlot('name')` call (`undefined` → the default slot). */
export function readHasSlotName(call: ts.CallExpression): string | undefined {
  const argument = call.arguments[0];
  if (argument !== undefined && ts.isStringLiteralLike(argument)) {
    return argument.text;
  }
  return undefined;
}

/**
 * Whether a node is the **call form** of the named-slot marker — `h(Slot, …)` —
 * the `h()` factory counterpart of the `<Slot … />` JSX element. Some neutral
 * components compose slots with `h(Slot, { name: 'x' }, …fallback)` (e.g. inside
 * `const column = … ? h(BaseDrawer, …, h(Slot, { name: 'start' })) : undefined`)
 * rather than JSX; both forms must rewrite to each framework's native slot read.
 */
export function isSlotHCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'h') {
    return false;
  }
  const callee = node.arguments[0];
  return callee !== undefined && ts.isIdentifier(callee) && callee.text === SLOT_TAG;
}

/** Read the static `name` from an `h(Slot, { name: 'x' }, …)` call (`undefined` → the default slot). */
export function readSlotHCallName(call: ts.CallExpression): string | undefined {
  const properties = call.arguments[1];
  if (properties === undefined || !ts.isObjectLiteralExpression(properties)) {
    return undefined;
  }
  for (const property of properties.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'name' &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      return property.initializer.text;
    }
  }
  return undefined;
}

/**
 * Read the **scope** (every prop other than `name`) of an `h(Slot, props, …)`
 * call into an object-literal expression, or `undefined` when no scope is
 * passed. Mirrors {@link readSlotScope} for the JSX form. The prop value
 * expressions are rewritten with the supplied `visit` so reads resolve in the
 * target framework.
 */
export function readSlotHCallScope(
  factory: ts.NodeFactory,
  call: ts.CallExpression,
  visit: ts.Visitor,
): ts.ObjectLiteralExpression | undefined {
  const properties = call.arguments[1];
  if (properties === undefined || !ts.isObjectLiteralExpression(properties)) {
    return undefined;
  }
  const rest = properties.properties.filter(
    (property) =>
      !(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === 'name'),
  );
  if (rest.length === 0) {
    return undefined;
  }
  const visited = rest.map((property) => ts.visitNode(property, visit) as ts.ObjectLiteralElementLike);
  return factory.createObjectLiteralExpression(visited, false);
}

/** The fallback children (arguments after the props) of an `h(Slot, props, …fallback)` call. */
export function slotHCallFallback(call: ts.CallExpression): ts.Expression[] {
  return call.arguments.slice(2);
}

/** Whether a string is a plain JS identifier (so it can use dot member access). */
function isPlainIdentifier(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}

/**
 * `<object>.<name>` for plain identifiers, `<object>['kebab-name']` otherwise — a
 * slot member access that is safe for non-identifier slot names (e.g. the kebab
 * `start-header`/`end-footer` slots), which dot access would mis-parse as a
 * subtraction (`slots.start-header` → `slots.start - header`).
 */
function createSlotMemberAccess(factory: ts.NodeFactory, object: string, key: string): ts.Expression {
  return isPlainIdentifier(key)
    ? factory.createPropertyAccessExpression(factory.createIdentifier(object), key)
    : factory.createElementAccessExpression(factory.createIdentifier(object), factory.createStringLiteral(key));
}

/** `slots.<name>` — Vue's `useSlots()` presence read for `hasSlot('name')` (`!!slots.x`). */
export function createVueHasSlotExpression(factory: ts.NodeFactory, name: string | undefined): ts.Expression {
  return factory.createPrefixUnaryExpression(
    ts.SyntaxKind.ExclamationToken,
    factory.createPrefixUnaryExpression(
      ts.SyntaxKind.ExclamationToken,
      createSlotMemberAccess(factory, 'slots', name ?? 'default'),
    ),
  );
}

/** `<props>.<name> != null` — React's presence read for `hasSlot('name')`. */
export function createReactHasSlotExpression(
  factory: ts.NodeFactory,
  propsParamName: string,
  name: string | undefined,
): ts.Expression {
  return factory.createBinaryExpression(
    createSlotMemberAccess(factory, propsParamName, name ?? 'children'),
    factory.createToken(ts.SyntaxKind.ExclamationEqualsToken),
    factory.createNull(),
  );
}

/**
 * Read the **scope** of a `<Slot>` element — every attribute other than `name`
 * — into an object-literal expression (`<Slot name="row" item={item} index={i}/>`
 * → `{ item: item, index: i }`), or `undefined` when the slot passes no scope.
 * The attribute value expressions are rewritten with the supplied `visit`
 * (so e.g. a destructured-prop or state read resolves correctly in the Vue
 * target). This is what lets a write-once component drive a **scoped slot**:
 * the compiler emits Vue `slots.x?.(scope)` and React `properties.x?.(scope)`.
 */
export function readSlotScope(
  factory: ts.NodeFactory,
  node: ts.JsxSelfClosingElement | ts.JsxElement,
  visit: ts.Visitor,
): ts.ObjectLiteralExpression | undefined {
  const properties: ts.ObjectLiteralElementLike[] = [];
  for (const attribute of slotOpening(node).attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      properties.push(factory.createSpreadAssignment(ts.visitNode(attribute.expression, visit) as ts.Expression));
      continue;
    }
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name) || attribute.name.text === 'name') {
      continue;
    }
    const initializer = attribute.initializer;
    let value: ts.Expression;
    if (initializer === undefined) {
      value = factory.createTrue();
    } else if (ts.isStringLiteral(initializer)) {
      value = initializer;
    } else if (ts.isJsxExpression(initializer) && initializer.expression !== undefined) {
      value = ts.visitNode(initializer.expression, visit) as ts.Expression;
    } else {
      continue;
    }
    properties.push(factory.createPropertyAssignment(attribute.name.text, value));
  }
  return properties.length === 0 ? undefined : factory.createObjectLiteralExpression(properties, false);
}

/**
 * Whether a JSX tag name refers to a **component** (a capitalised identifier such
 * as `BaseDropdown`, or a member/`this` expression like `Ctx.Provider`) rather
 * than an intrinsic element (`div`, `button`). Named-slot **passing**
 * (`slot="…"`) is only meaningful onto a component, so the slot routing below is
 * gated on this — exactly mirroring the runtime adapters, which fold slotted
 * children only when expanding a component (`typeof type === 'function'`).
 */
export function isComponentTagName(tagName: ts.JsxTagNameExpression): boolean {
  if (ts.isIdentifier(tagName)) {
    const first = tagName.text.charAt(0);
    return first !== '' && first === first.toUpperCase() && first !== first.toLowerCase();
  }
  return ts.isPropertyAccessExpression(tagName) || tagName.kind === ts.SyntaxKind.ThisKeyword;
}

/**
 * Read the static `slot="…"` marker of a JSX **child** element — the attribute
 * that routes the child into a parent component's named slot. Returns the slot
 * name (a non-empty string other than `"default"`), or `undefined` when the
 * child carries no usable `slot` marker (so it belongs to the default slot).
 */
export function readChildSlotName(child: ts.JsxChild): string | undefined {
  let opening: ts.JsxSelfClosingElement | ts.JsxOpeningElement;
  if (ts.isJsxSelfClosingElement(child)) {
    opening = child;
  } else if (ts.isJsxElement(child)) {
    opening = child.openingElement;
  } else {
    return undefined;
  }
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name) || attribute.name.text !== 'slot') {
      continue;
    }
    const initializer = attribute.initializer;
    let name: string | undefined;
    if (initializer !== undefined && ts.isStringLiteral(initializer)) {
      name = initializer.text;
    } else if (
      initializer !== undefined &&
      ts.isJsxExpression(initializer) &&
      initializer.expression !== undefined &&
      ts.isStringLiteralLike(initializer.expression)
    ) {
      name = initializer.expression.text;
    }
    return name === undefined || name === '' || name === 'default' ? undefined : name;
  }
  return undefined;
}

/** A component element's children partitioned by their `slot="…"` marker. */
export interface PartitionedSlots {
  /** Children with no (or `slot="default"`) marker — the default slot content. */
  defaultChildren: ts.JsxChild[];
  /** Named-slot content keyed by slot name, in first-seen order. */
  namedSlots: Map<string, ts.JsxChild[]>;
}

/** Partition a component element's children into named-slot groups + the default children. */
export function partitionSlottedChildren(children: readonly ts.JsxChild[]): PartitionedSlots {
  const defaultChildren: ts.JsxChild[] = [];
  const namedSlots = new Map<string, ts.JsxChild[]>();
  for (const child of children) {
    const name = readChildSlotName(child);
    if (name === undefined) {
      defaultChildren.push(child);
    } else {
      const group = namedSlots.get(name) ?? [];
      group.push(child);
      namedSlots.set(name, group);
    }
  }
  return { defaultChildren, namedSlots };
}

/** Whether any of a parent's children carries a `slot="…"` marker. */
export function hasSlottedChildren(children: readonly ts.JsxChild[]): boolean {
  return children.some((child) => readChildSlotName(child) !== undefined);
}

/** A copy of a JSX element / self-closing element with its `slot="…"` marker attribute removed. */
export function stripSlotAttribute<T extends ts.JsxElement | ts.JsxSelfClosingElement>(
  factory: ts.NodeFactory,
  element: T,
): T {
  const without = (attributes: ts.JsxAttributes): ts.JsxAttributes =>
    factory.updateJsxAttributes(
      attributes,
      attributes.properties.filter(
        (property) => !(ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === 'slot'),
      ),
    );
  if (ts.isJsxSelfClosingElement(element)) {
    return factory.updateJsxSelfClosingElement(
      element,
      element.tagName,
      element.typeArguments,
      without(element.attributes),
    ) as T;
  }
  return factory.updateJsxElement(
    element,
    factory.updateJsxOpeningElement(
      element.openingElement,
      element.openingElement.tagName,
      element.openingElement.typeArguments,
      without(element.openingElement.attributes),
    ),
    element.children,
    element.closingElement,
  ) as T;
}

/** Drop whitespace-only JSX text children (used when a slot group becomes a render function). */
function withoutBlankText(children: readonly ts.JsxChild[]): ts.JsxChild[] {
  return children.filter((child) => !(ts.isJsxText(child) && child.text.trim() === ''));
}

/**
 * Vue-target transformer that rewrites the named-slot **passing** form — a
 * component element whose children carry `slot="…"` markers — into the
 * `@vitejs/plugin-vue-jsx` object-children syntax. For example
 * `<BaseDropdown><button slot="trigger">…</button><ul>…</ul></BaseDropdown>`
 * becomes `<BaseDropdown>{{ trigger: () => <><button>…</button></>, default: () => <><ul>…</ul></> }}</BaseDropdown>`,
 * which `@vue/babel-plugin-jsx` compiles to native named slots. A component
 * without slotted children is left untouched (its children stay the default
 * slot). This is composed **before** the reference rewriter on the
 * render-closure path, so identifiers inside the generated slot functions are
 * still rewritten to Vue reactivity (`.value`, etc.).
 */
export function vueJsxSlotTransformer(): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const slotFunction = (children: ts.JsxChild[]): ts.Expression => {
      const stripped = children.map((child) =>
        ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) ? stripSlotAttribute(factory, child) : child,
      );
      const fragment = factory.createJsxFragment(
        factory.createJsxOpeningFragment(),
        stripped,
        factory.createJsxJsxClosingFragment(),
      );
      return factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        fragment,
      );
    };
    const visit = (node: ts.Node): ts.Node => {
      if (
        ts.isJsxElement(node) &&
        isComponentTagName(node.openingElement.tagName) &&
        hasSlottedChildren(node.children)
      ) {
        const { defaultChildren, namedSlots } = partitionSlottedChildren(node.children);
        const properties: ts.PropertyAssignment[] = [];
        for (const [name, group] of namedSlots) {
          properties.push(factory.createPropertyAssignment(factory.createIdentifier(name), slotFunction(group)));
        }
        const meaningfulDefault = withoutBlankText(defaultChildren);
        if (meaningfulDefault.length > 0) {
          properties.push(factory.createPropertyAssignment('default', slotFunction(meaningfulDefault)));
        }
        const slotsChild = factory.createJsxExpression(
          undefined,
          factory.createObjectLiteralExpression(properties, true),
        );
        const replaced = factory.updateJsxElement(node, node.openingElement, [slotsChild], node.closingElement);
        return ts.visitEachChild(replaced, visit, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * Vue derives a DOM listener's event name by stripping the `on` prefix from the
 * prop key and **hyphenating** the remainder (`onDragOver` → `drag-over`), so a
 * React-style multi-word listener like `onDragOver` would bind to the
 * non-existent `drag-over` event — the element drags, but `dragover`/`drop`
 * never fire. Native DOM event names are all-lowercase (`dragover`,
 * `mouseenter`, `pointerdown`), so the listener key has to be `on<Event>` with
 * the event part already lowercased (`onDragover`, which Vue hyphenates back to
 * the real `dragover`). Returns the name unchanged when it is not an `on<Event>`
 * listener (or is already single-word, e.g. `onClick`).
 */
function lowercaseNativeEventName(name: string): string {
  return /^on[A-Z]/.test(name) ? `on${name.charAt(2)}${name.slice(3).toLowerCase()}` : name;
}

/**
 * Vue-target transformer that fixes the casing of React-style multi-word DOM
 * event listeners (`onDragOver`, `onMouseEnter`, `onPointerDown`, …) on
 * **native** (intrinsic, lowercase-tagged) elements — both JSX attributes and
 * `h('tag', { … })` props — using {@link lowercaseNativeEventName}, so the
 * render-closure compiled by `@vitejs/plugin-vue-jsx` binds the real native
 * event. Listeners on **component** elements (capitalised tags / dynamic
 * components) are left untouched so they keep matching the child's camelCase
 * emit names. Idempotent and a no-op for components, so it is safe to apply
 * universally on the render-closure path.
 */
export function vueNativeEventTransformer(): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const rewriteAttributes = (attributes: ts.JsxAttributes): ts.JsxAttributes =>
      factory.updateJsxAttributes(
        attributes,
        attributes.properties.map((property) => {
          if (ts.isJsxAttribute(property) && ts.isIdentifier(property.name)) {
            const renamed = lowercaseNativeEventName(property.name.text);
            if (renamed !== property.name.text) {
              return factory.updateJsxAttribute(property, factory.createIdentifier(renamed), property.initializer);
            }
          }
          return property;
        }),
      );
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isJsxSelfClosingElement(node) && !isComponentTagName(node.tagName)) {
        const updated = factory.updateJsxSelfClosingElement(
          node,
          node.tagName,
          node.typeArguments,
          rewriteAttributes(node.attributes),
        );
        return ts.visitEachChild(updated, visit, context);
      }
      if (ts.isJsxElement(node) && !isComponentTagName(node.openingElement.tagName)) {
        const opening = factory.updateJsxOpeningElement(
          node.openingElement,
          node.openingElement.tagName,
          node.openingElement.typeArguments,
          rewriteAttributes(node.openingElement.attributes),
        );
        const updated = factory.updateJsxElement(node, opening, node.children, node.closingElement);
        return ts.visitEachChild(updated, visit, context);
      }
      // `h('tag', { onDragOver: … })` with a string-literal (native) tag.
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'h' &&
        node.arguments.length >= 2 &&
        node.arguments[0] !== undefined &&
        ts.isStringLiteral(node.arguments[0]) &&
        node.arguments[1] !== undefined &&
        ts.isObjectLiteralExpression(node.arguments[1])
      ) {
        const props = node.arguments[1];
        const rewrittenProps = factory.updateObjectLiteralExpression(
          props,
          props.properties.map((property) => {
            if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
              const renamed = lowercaseNativeEventName(property.name.text);
              if (renamed !== property.name.text) {
                return factory.updatePropertyAssignment(
                  property,
                  factory.createIdentifier(renamed),
                  property.initializer,
                );
              }
            }
            return property;
          }),
        );
        const updated = factory.updateCallExpression(node, node.expression, node.typeArguments, [
          node.arguments[0],
          rewrittenProps,
          ...node.arguments.slice(2),
        ]);
        return ts.visitEachChild(updated, visit, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/** Collect every static slot name declared by `<Slot name="…" />` elements in the module. */
export function collectSlotNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (isSlotElement(node)) {
      const name = readSlotName(node);
      if (name !== undefined) {
        names.add(name);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return names;
}

/**
 * Whether a node is a neutral dynamic-component element — `<Dynamic is={…} />`
 * or `<Dynamic is={…}>…</Dynamic>` — produced from the `Dynamic` marker.
 */
export function isDynamicElement(node: ts.Node): node is ts.JsxSelfClosingElement | ts.JsxElement {
  if (ts.isJsxSelfClosingElement(node)) {
    return ts.isIdentifier(node.tagName) && node.tagName.text === DYNAMIC_TAG;
  }
  if (ts.isJsxElement(node)) {
    return ts.isIdentifier(node.openingElement.tagName) && node.openingElement.tagName.text === DYNAMIC_TAG;
  }
  return false;
}

/** The opening element (carrying the attributes) of a `<Dynamic>` node. */
function dynamicOpening(
  node: ts.JsxSelfClosingElement | ts.JsxElement,
): ts.JsxSelfClosingElement | ts.JsxOpeningElement {
  return ts.isJsxSelfClosingElement(node) ? node : node.openingElement;
}

/** Convert one JSX child of a `<Dynamic>` to an `h(…)` argument expression (whitespace-only text dropped). */
function jsxChildToArgument(
  factory: ts.NodeFactory,
  child: ts.JsxChild,
  visitExpression: (expression: ts.Expression) => ts.Expression,
): ts.Expression | undefined {
  if (ts.isJsxText(child)) {
    const text = child.text.replaceAll(/\s+/g, ' ').trim();
    return text === '' ? undefined : factory.createStringLiteral(text);
  }
  if (ts.isJsxExpression(child)) {
    return child.expression === undefined ? undefined : visitExpression(child.expression);
  }
  // A child element (e.g. a `<Slot>` marker) is visited like an expression, but
  // the Slot rewrite yields a `{ … }` `JsxExpression` wrapper — valid in a JSX
  // child position but **not** as a bare `h(…)` call argument. Unwrap it so the
  // inner expression becomes the argument (a `<Dynamic>` may have slotted
  // children, e.g. `<Dynamic is={tag}><Slot/></Dynamic>`).
  const argument = visitExpression(child as ts.Expression);
  if (ts.isJsxExpression(argument)) {
    return argument.expression;
  }
  return argument;
}

/**
 * Rewrite a `<Dynamic is={X} a={…} …>children</Dynamic>` element into an
 * `h(X, { a: …, … }, ...children)` call — the dynamic-component form both
 * targets compile natively (React's classic-`h` JSX transform / Vue's
 * `<component :is>`). The `is` attribute becomes the element type, every other
 * attribute (and spread) becomes the props object, and the children become the
 * trailing arguments. Attribute value expressions and children are passed
 * through `visitExpression` (so prop/state/slot rewrites and React's
 * `class`→`className` aliasing still apply), and `aliasAttribute` renames the
 * prop keys for the target (identity on Vue, the DOM aliases on React).
 */
export function dynamicToHCall(
  factory: ts.NodeFactory,
  node: ts.JsxSelfClosingElement | ts.JsxElement,
  visitExpression: (expression: ts.Expression) => ts.Expression,
  aliasAttribute: (name: string) => string = (name) => name,
): ts.CallExpression {
  let isExpression: ts.Expression | undefined;
  const properties: ts.ObjectLiteralElementLike[] = [];
  for (const attribute of dynamicOpening(node).attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      properties.push(factory.createSpreadAssignment(visitExpression(attribute.expression)));
      continue;
    }
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name)) {
      continue;
    }
    const name = attribute.name.text;
    const initializer = attribute.initializer;
    let value: ts.Expression;
    if (initializer === undefined) {
      value = factory.createTrue();
    } else if (ts.isStringLiteral(initializer)) {
      value = initializer;
    } else if (ts.isJsxExpression(initializer) && initializer.expression !== undefined) {
      value = visitExpression(initializer.expression);
    } else {
      continue;
    }
    if (name === 'is') {
      isExpression = value;
      continue;
    }
    const key = aliasAttribute(name);
    // Attribute names like `aria-current`/`data-id` are not valid bare object
    // keys, so quote them as string-literal property names; plain identifiers
    // stay unquoted.
    const propertyName = /^[A-Za-z_$][\w$]*$/.test(key)
      ? factory.createIdentifier(key)
      : factory.createStringLiteral(key);
    properties.push(factory.createPropertyAssignment(propertyName, value));
  }

  const tag = isExpression ?? factory.createIdentifier('undefined');
  const propertiesArgument =
    properties.length === 0
      ? factory.createIdentifier('undefined')
      : factory.createObjectLiteralExpression(properties, false);
  const childArguments = (ts.isJsxElement(node) ? [...node.children] : [])
    .map((child) => jsxChildToArgument(factory, child, visitExpression))
    .filter((argument): argument is ts.Expression => argument !== undefined);

  return factory.createCallExpression(factory.createIdentifier('h'), undefined, [
    tag,
    propertiesArgument,
    ...childArguments,
  ]);
}

/**
 * Whether a component references **itself** as a JSX tag (`<BaseTreeView …>`
 * inside `BaseTreeView`) — i.e. it is recursive. The Vue emitter uses this to
 * resolve the self-reference (`resolveComponent('<name>')`) in its render
 * closure, so a recursive component compiles natively on both frameworks.
 */
export function usesComponentSelfReference(sourceFile: ts.SourceFile, componentName: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === componentName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}

/** Wrap fallback children in a `<>…</>` fragment expression. */
function fragmentOf(factory: ts.NodeFactory, children: readonly ts.JsxChild[]): ts.JsxFragment {
  return factory.createJsxFragment(factory.createJsxOpeningFragment(), children, factory.createJsxJsxClosingFragment());
}

/**
 * `slots.<name>?.(scope)` (with `?? <fallback>` when the slot declares fallback
 * content). When `scope` is supplied the slot is invoked with it, emitting a
 * Vue **scoped** slot call.
 */
export function createVueSlotExpression(
  factory: ts.NodeFactory,
  name: string | undefined,
  fallback: readonly ts.JsxChild[],
  scope?: ts.Expression,
): ts.Expression {
  const call = factory.createCallChain(
    createSlotMemberAccess(factory, 'slots', name ?? 'default'),
    factory.createToken(ts.SyntaxKind.QuestionDotToken),
    undefined,
    scope === undefined ? [] : [scope],
  );
  if (fallback.length === 0) {
    return call;
  }
  return factory.createBinaryExpression(
    call,
    factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
    fragmentOf(factory, fallback),
  );
}

/**
 * `<props>.<name>` (with `?? <fallback>` when the slot declares fallback
 * content). When `scope` is supplied the slot prop is a render-prop function and
 * is invoked with it (`<props>.<name>?.(scope)`).
 */
export function createReactSlotExpression(
  factory: ts.NodeFactory,
  propsParamName: string,
  name: string | undefined,
  fallback: readonly ts.JsxChild[],
  scope?: ts.Expression,
): ts.Expression {
  const access = createSlotMemberAccess(factory, propsParamName, name ?? 'children');
  const read: ts.Expression =
    scope === undefined
      ? access
      : factory.createCallChain(access, factory.createToken(ts.SyntaxKind.QuestionDotToken), undefined, [scope]);
  if (fallback.length === 0) {
    return read;
  }
  return factory.createBinaryExpression(
    read,
    factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
    fragmentOf(factory, fallback),
  );
}

/** Append `?? <fallback>` to a slot read when the `h(Slot, …)` call carries fallback children. */
function appendExpressionFallback(
  factory: ts.NodeFactory,
  read: ts.Expression,
  fallback: readonly ts.Expression[],
): ts.Expression {
  if (fallback.length === 0) {
    return read;
  }
  const value = fallback.length === 1 ? fallback[0]! : factory.createArrayLiteralExpression([...fallback], false);
  return factory.createBinaryExpression(read, factory.createToken(ts.SyntaxKind.QuestionQuestionToken), value);
}

/**
 * `slots.<name>?.(scope) ?? <fallback>` — the Vue translation of the `h(Slot, …)`
 * call form (the `h()` counterpart of {@link createVueSlotExpression}). The
 * fallback here is the call's child **expressions** rather than JSX children.
 */
export function createVueSlotCallExpression(
  factory: ts.NodeFactory,
  name: string | undefined,
  fallback: readonly ts.Expression[],
  scope?: ts.Expression,
): ts.Expression {
  const call = factory.createCallChain(
    createSlotMemberAccess(factory, 'slots', name ?? 'default'),
    factory.createToken(ts.SyntaxKind.QuestionDotToken),
    undefined,
    scope === undefined ? [] : [scope],
  );
  return appendExpressionFallback(factory, call, fallback);
}

/**
 * `<props>.<name>?.(scope) ?? <fallback>` — the React translation of the
 * `h(Slot, …)` call form (the `h()` counterpart of {@link createReactSlotExpression}).
 */
export function createReactSlotCallExpression(
  factory: ts.NodeFactory,
  propsParamName: string,
  name: string | undefined,
  fallback: readonly ts.Expression[],
  scope?: ts.Expression,
): ts.Expression {
  const access = createSlotMemberAccess(factory, propsParamName, name ?? 'children');
  const read: ts.Expression =
    scope === undefined
      ? access
      : factory.createCallChain(access, factory.createToken(ts.SyntaxKind.QuestionDotToken), undefined, [scope]);
  return appendExpressionFallback(factory, read, fallback);
}

/** A relative import of a sibling component, e.g. `import { BaseBadge } from '../base-badge'`. */
export interface ComponentImport {
  /** The imported value names. */
  names: string[];
  /** The base name of the import path, e.g. `base-badge`. */
  base: string;
  /** The original (relative) module specifier, e.g. `../base-badge`. */
  specifier: string;
}

/** Collect relative (sibling-component) value imports from a module. */
export function readComponentImports(sourceFile: ts.SourceFile): ComponentImport[] {
  const imports: ComponentImport[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith('.')) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      continue;
    }
    const names = bindings.elements.filter((element) => !element.isTypeOnly).map((element) => element.name.text);
    const segments = specifier
      .split('/')
      .filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
    imports.push({ names, base: segments.at(-1) ?? specifier, specifier });
  }
  return imports;
}

/** A stylesheet import in a neutral component, e.g. `import styles from './x.module.scss'`. */
export interface StyleImport {
  /** The default-import local name (e.g. `styles`), or `undefined` for a bare side-effect import. */
  name: string | undefined;
  /** The original (relative) module specifier, e.g. `./base-badge.module.scss`. */
  specifier: string;
  /** The flat specifier used in the generated tree, e.g. `./base-badge.module.scss`. */
  flatSpecifier: string;
  /** The final path segment of the specifier, e.g. `base-badge.module.scss`. */
  base: string;
}

/** File extensions treated as stylesheets carried through to the generated sources. */
const STYLE_EXTENSIONS = /\.(css|scss|sass|less|styl)$/;

/**
 * Collect the relative stylesheet imports of a module (CSS Modules and bare CSS
 * side-effect imports). The two-stage compiler copies these alongside the
 * generated per-framework source and re-points each import at the flat copy, so
 * a component can own (and ship) its own `.module.scss`.
 */
export function readStyleImports(sourceFile: ts.SourceFile): StyleImport[] {
  const imports: StyleImport[] = [];
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith('.') ||
      !STYLE_EXTENSIONS.test(statement.moduleSpecifier.text)
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    const base =
      specifier.split('/').findLast((segment) => segment !== '.' && segment !== '..' && segment.length > 0) ??
      specifier;
    const defaultName = statement.importClause?.name === undefined ? undefined : statement.importClause.name.text;
    imports.push({ name: defaultName, specifier, flatSpecifier: `./${base}`, base });
  }
  return imports;
}

/**
 * Collect the **external** (bare package) imports of a module — every
 * `import … from '<pkg>'` whose specifier is neither relative (`.`/`..`, handled
 * as a sibling-component or helper import), the neutral package (handled by
 * {@link readNeutralImports}), nor a stylesheet (handled by
 * {@link readStyleImports}). These are runtime dependencies the component pulls
 * from other workspace/third-party packages (e.g. `@mission-platform/forms-core`,
 * `luxon`), and they are carried **verbatim** into the generated per-framework
 * source so values referenced by the body, carried-over helpers, or prop
 * defaults resolve at runtime. Each entry is the printed `import` statement.
 *
 * The one bare specifier that is **not** carried verbatim is the write-once icon
 * library {@link ICONS_JSX_MODULE}: since it publishes only the per-framework
 * `./react` / `./vue` builds, its import is remapped to the target framework's
 * subpath ({@link iconsJsxFrameworkModule}) so the generated source imports the
 * matching native icon component (the React emitter does the same in its own
 * import pass).
 */
export function readExternalImports(sourceFile: ts.SourceFile, framework: 'react' | 'vue'): string[] {
  const imports: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('.') || specifier === NEUTRAL_MODULE || STYLE_EXTENSIONS.test(specifier)) {
      continue;
    }
    const frameworkModule = frameworkSplitModule(specifier, framework);
    if (frameworkModule !== undefined) {
      const remapped = ts.factory.updateImportDeclaration(
        statement,
        statement.modifiers,
        statement.importClause,
        ts.factory.createStringLiteral(frameworkModule),
        statement.attributes,
      );
      imports.push(printNode(remapped, sourceFile));
      continue;
    }
    imports.push(printNode(statement, sourceFile));
  }
  return imports;
}

/** Find the exported function declaration for a neutral component by name. */
export function findComponentFunction(sourceFile: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      return statement;
    }
  }
  return undefined;
}

/** Extract the (own) property names declared by a props interface, excluding `children`. */
export function extractPropertyNames(sourceFile: ts.SourceFile, interfaceName: string): string[] {
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
      continue;
    }
    for (const member of statement.members) {
      if (ts.isPropertySignature(member) && ts.isIdentifier(member.name) && member.name.text !== 'children') {
        names.push(member.name.text);
      }
    }
  }
  return names;
}

/** A binding pulled out of a `const { … } = properties` destructuring. */
export interface DestructuredProp {
  /** The local name bound, e.g. `threshold`. */
  name: string;
  /** The default expression text, if any, e.g. `0.15`. */
  defaultText: string | undefined;
}

/**
 * The scope describing how identifiers inside a component body must be rewritten
 * for the Vue target.
 */
export interface RewriteScope {
  /** Name of the props parameter (e.g. `properties`). */
  propsParamName: string;
  /** Names destructured from props → rewritten to `<props>.<name>` (reactive). */
  destructuredProps: Set<string>;
  /** `useState` value names → reads rewritten to `<name>.value`. */
  stateNames: Set<string>;
  /** `useState` setter name → its state name; calls become `<state>.value = …`. */
  setterToState: Map<string, string>;
  /** `useRef` names → `<ref>.current` rewritten to `<ref>.value`. */
  refNames: Set<string>;
  /** `useMemo` names → reads rewritten to `<name>.value`. */
  memoNames: Set<string>;
  /**
   * CSS-Module default-import names (e.g. `styles`). For the Vue target the
   * module is inlined as an SFC `<style>` block and class names are plain, so
   * `styles['x']` / `styles[`x`]` reads are rewritten to their key expression.
   */
  styleModuleNames: Set<string>;
}

/**
 * Build a TS transformer that rewrites references inside a component body for
 * the Vue target: `properties.children` → `slots.default?.()`, destructured prop
 * locals → live `properties.<name>` access, `useState` reads → `.value`, setter
 * calls → assignments, and `useRef`'s `.current` → `.value`.
 */
export function createReferenceRewriter(scope: RewriteScope): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;

    const slotsDefaultCall = (): ts.Expression =>
      factory.createCallChain(
        factory.createPropertyAccessExpression(factory.createIdentifier('slots'), 'default'),
        factory.createToken(ts.SyntaxKind.QuestionDotToken),
        undefined,
        [],
      );

    const visit = (node: ts.Node): ts.Node => {
      // `<Slot name="x" />` → `{ slots.x?.() }` (default slot → `slots.default?.()`);
      // any extra attributes become the scoped-slot argument `slots.x?.(scope)`.
      if (isSlotElement(node)) {
        const name = readSlotName(node);
        const fallback = slotFallbackChildren(node).map((child) => ts.visitNode(child, visit) as ts.JsxChild);
        const slotScope = readSlotScope(factory, node, visit);
        return factory.createJsxExpression(undefined, createVueSlotExpression(factory, name, fallback, slotScope));
      }

      // `h(Slot, { name: 'x' }, …fallback)` — the call form of the marker — →
      // `slots.x?.() ?? …`, equivalently to the `<Slot name="x" />` JSX form
      // above. It appears in `h()` argument / arrow-body position, so the
      // replacement is the bare expression (no `{ … }` JSX wrapper).
      if (isSlotHCall(node)) {
        const name = readSlotHCallName(node);
        const slotScope = readSlotHCallScope(factory, node, visit);
        const fallback = slotHCallFallback(node).map((argument) => ts.visitNode(argument, visit) as ts.Expression);
        return createVueSlotCallExpression(factory, name, fallback, slotScope);
      }

      // `<Dynamic is={X} …>` → `h(X, { … }, …children)`. In JSX **child** position
      // the call is wrapped in `{ … }`; as a bare expression (arrow body, ternary
      // branch, return) it stays unwrapped. Vue's JSX transform compiles
      // `h(X, …)` to a native `<component :is>` render.
      if (isDynamicElement(node)) {
        const call = dynamicToHCall(factory, node, (expression) => ts.visitNode(expression, visit) as ts.Expression);
        const parent = node.parent;
        if (parent !== undefined && (ts.isJsxElement(parent) || ts.isJsxFragment(parent))) {
          return factory.createJsxExpression(undefined, call);
        }
        return call;
      }

      // `properties.children` → `slots.default?.()`
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === scope.propsParamName &&
        node.name.text === 'children'
      ) {
        return slotsDefaultCall();
      }

      // `hasSlot('x')` → `!!slots.x` (the slot-presence check; `!!slots.default`
      // for the default slot). The `slots.` read makes the emitter add the
      // `const slots = useSlots()` declaration.
      if (isHasSlotCall(node)) {
        return createVueHasSlotExpression(factory, readHasSlotName(node));
      }

      // `ref.current` → `ref.value`
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        scope.refNames.has(node.expression.text) &&
        node.name.text === 'current'
      ) {
        return factory.createPropertyAccessExpression(node.expression, 'value');
      }

      // `styles['x']` / `styles[`x`]` → its key expression (the inlined Vue
      // `<style>` uses plain class names, so the CSS-Module lookup collapses to
      // the literal name).
      if (
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        scope.styleModuleNames.has(node.expression.text)
      ) {
        return ts.visitNode(node.argumentExpression, visit) as ts.Expression;
      }

      // Generic property access: rewrite the object, keep the member name.
      if (ts.isPropertyAccessExpression(node)) {
        return factory.updatePropertyAccessExpression(
          node,
          ts.visitNode(node.expression, visit) as ts.Expression,
          node.name,
        );
      }

      // `setState(value)` → `state.value = value` (or `state.value = updater(state.value)`).
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        scope.setterToState.has(node.expression.text)
      ) {
        const stateName = scope.setterToState.get(node.expression.text) as string;
        const target = factory.createPropertyAccessExpression(factory.createIdentifier(stateName), 'value');
        const argument = node.arguments[0];
        let value: ts.Expression;
        if (argument !== undefined && (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))) {
          value = factory.createCallExpression(
            factory.createParenthesizedExpression(ts.visitNode(argument, visit) as ts.Expression),
            undefined,
            [factory.createPropertyAccessExpression(factory.createIdentifier(stateName), 'value')],
          );
        } else {
          value =
            argument === undefined
              ? factory.createIdentifier('undefined')
              : (ts.visitNode(argument, visit) as ts.Expression);
        }
        return factory.createBinaryExpression(target, factory.createToken(ts.SyntaxKind.EqualsToken), value);
      }

      // Property assignment: rewrite the value, and the key too when it is a
      // computed name (e.g. `{ [styles['x--mod']]: cond }` → `{ ['x--mod']: cond }`).
      if (ts.isPropertyAssignment(node)) {
        const name = ts.isComputedPropertyName(node.name)
          ? factory.updateComputedPropertyName(node.name, ts.visitNode(node.name.expression, visit) as ts.Expression)
          : node.name;
        return factory.updatePropertyAssignment(node, name, ts.visitNode(node.initializer, visit) as ts.Expression);
      }

      // Shorthand `{ threshold }` whose name is rewritten must expand to
      // `{ threshold: <rewritten> }` so the key stays but the value resolves.
      if (ts.isShorthandPropertyAssignment(node)) {
        const rewritten = ts.visitNode(node.name, visit) as ts.Expression;
        if (rewritten !== node.name) {
          return factory.createPropertyAssignment(node.name.text, rewritten);
        }
        return node;
      }

      // JSX attribute: rewrite only the value, never the attribute *name*. The
      // name is a plain identifier (e.g. `src`, `alt`, `type`) that can collide
      // with a destructured prop name; without this guard the bare-identifier
      // rule below would rewrite `src={src}` to `properties.src={properties.src}`.
      // The one deliberate name rewrite is `classNames` → Vue's native `class`
      // binding: Vue understands the array/object forms directly, so the
      // attribute value (with its CSS-Module reads collapsed by the rules above)
      // passes straight through to `class={…}` in the render-closure JSX.
      if (ts.isJsxAttribute(node)) {
        if (node.initializer === undefined) {
          return node;
        }
        const name =
          ts.isIdentifier(node.name) && node.name.text === CLASS_NAMES_ATTRIBUTE
            ? factory.createIdentifier('class')
            : node.name;
        return factory.updateJsxAttribute(node, name, ts.visitNode(node.initializer, visit) as ts.JsxAttributeValue);
      }

      // JSX element tag names must never be rewritten. A tag is always either an
      // intrinsic element (`caption`, `span`, …) or an imported component
      // (`BaseTypography`), never a prop — but a lowercase intrinsic tag can
      // collide with a destructured prop name (e.g. a `caption` prop alongside a
      // `<caption>` element), which the bare-identifier rule below would
      // otherwise rewrite to `properties.caption`, turning the element into a
      // dynamic component (`createVNode(properties.caption, …)`). Preserve the
      // tag name and rewrite only the attributes/children.
      if (ts.isJsxSelfClosingElement(node)) {
        return factory.updateJsxSelfClosingElement(
          node,
          node.tagName,
          node.typeArguments,
          ts.visitNode(node.attributes, visit) as ts.JsxAttributes,
        );
      }
      if (ts.isJsxOpeningElement(node)) {
        return factory.updateJsxOpeningElement(
          node,
          node.tagName,
          node.typeArguments,
          ts.visitNode(node.attributes, visit) as ts.JsxAttributes,
        );
      }
      if (ts.isJsxClosingElement(node)) {
        return node;
      }

      // Bare identifier reads.
      if (ts.isIdentifier(node)) {
        if (scope.stateNames.has(node.text) || scope.memoNames.has(node.text)) {
          return factory.createPropertyAccessExpression(node, 'value');
        }
        if (scope.destructuredProps.has(node.text)) {
          return factory.createPropertyAccessExpression(factory.createIdentifier(scope.propsParamName), node.text);
        }
        return node;
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}
