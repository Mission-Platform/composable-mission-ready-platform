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
 * `className={…}` (the `class` attribute is reserved for static strings),
 * passing the same arguments the `classNames` runtime helper accepts — most
 * commonly an **array** of class values (`className={['base', { active }]}`),
 * but any single {@link import('@mission-platform/jsx').ClassValue} works too.
 * The attribute is spelled the same as React's own `className` (unlike the
 * runtime helper, which stays `classNames`) so a component can merge its own
 * computed classes with a forwarded `properties.className` without a naming
 * mismatch: `className={[classNames('base', …), properties.className]}`. The
 * React emitter collapses an array form to a `className={classNames(…)}` string
 * call (re-injecting the neutral `classNames` import), while the Vue emitter
 * maps it straight onto Vue's native `class` binding, which already understands
 * the array/object forms.
 */
export const CLASS_NAME_ATTRIBUTE = 'className';

/**
 * Native JSX attributes whose author-facing camelCase spelling must be lowered
 * to the HTML spelling Vue's JSX intrinsic-element types expect. Vue types the
 * `<td>`/`<th>` span attributes as `colspan`/`rowspan` (not React's `colSpan`/
 * `rowSpan`), so the render-closure JSX would otherwise fail to type-check.
 */
export const JSX_ATTRIBUTE_RENAMES: ReadonlyMap<string, string> = new Map([
  ['colSpan', 'colspan'],
  ['rowSpan', 'rowspan'],
]);

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
 * Neutral **value** hooks that have an identically-named native counterpart in
 * each framework's runtime, so they are neither translated (like `useState`/
 * `useEffect`) nor kept as a neutral import. `useId` is React's own hook (it
 * falls through to the `react` value import automatically), and Vue exposes the
 * same `useId` from its runtime — so the Vue emitter imports it straight from
 * `vue` and leaves the `const id = useId()` call untouched in `setup`.
 */
export const NEUTRAL_VUE_RUNTIME_HOOKS: ReadonlySet<string> = new Set(['useId']);

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

/**
 * Neutral **type** imports that have a first-class React equivalent shipped by
 * `react` itself. On the React target these are rewritten to their React name
 * (imported `import type { … } from 'react'`) rather than kept as a neutral
 * `@mission-platform/jsx` type, so React authors see the idiomatic type. Every
 * reference to the neutral name in the emitted source is renamed to the mapped
 * React name (see the React emitter). The neutral hook/render primitives each
 * have an exact React counterpart:
 *
 * - `MpChild` (the "anything that may render as a child" union) ⇒ React's
 *   `ReactNode`.
 * - `MpElement` (a node in the neutral virtual tree, the return type of a
 *   neutral component) ⇒ React's `ReactElement`, so a compiled component reads
 *   as a genuine `(props) => ReactElement` — a valid React function component,
 *   which the neutral `MpElement` return type is not.
 * - `MpRef<T>` (the `{ current: T }` container returned by `useRef`) ⇒ React's
 *   `RefObject<T>`.
 * - `MpDependencyList` (an effect/memo dependency array) ⇒ React's
 *   `DependencyList`.
 */
export const REACT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  MpChild: 'ReactNode',
  MpElement: 'ReactElement',
  MpRef: 'RefObject',
  MpDependencyList: 'DependencyList',
};

/**
 * Neutral **type** imports that have no single first-class framework equivalent
 * to alias to (unlike {@link REACT_TYPE_ALIASES}), yet are trivially expressible
 * in each framework's own vocabulary — the render/props primitives:
 *
 * - `MpProperties` — the bag of attributes/props a component accepts (the base
 *   every component's props interface `extends`), and
 * - `MpRenderProperty<S>` — a scoped-slot / render-prop function returning a
 *   slot's content for a given scope.
 *
 * Rather than keep these as an `@mission-platform/jsx` import in the generated
 * code, each framework build emits a tiny co-located module
 * ({@link LOCAL_JSX_TYPES_MODULE}) that defines **framework-specific variants**
 * of them — React's over `ReactNode`, Vue's over `VNodeChild` — and both
 * emitters redirect these two type imports there (see the React and Vue
 * `imports` builders). So the generated React/Vue sources carry no neutral
 * `@mission-platform/jsx` render/props **type** import at all.
 */
export const LOCAL_JSX_TYPE_NAMES: ReadonlySet<string> = new Set(['MpProperties', 'MpRenderProperty']);

/**
 * The neutral render/props type names the **Vue** build redirects to its
 * co-located {@link LOCAL_JSX_TYPES_MODULE}. It is a superset of
 * {@link LOCAL_JSX_TYPE_NAMES}: besides `MpProperties`/`MpRenderProperty`, the
 * Vue variant also re-declares the neutral **element** primitives `MpChild` and
 * `MpElement` as Vue's `VNodeChild` / `VNode`. Under `jsxImportSource: 'vue'` a
 * JSX expression in a generated SFC has type `JSX.Element` (i.e. Vue's `VNode`);
 * keeping the neutral `@mission-platform/jsx` definitions (branded with
 * `__mpElement`) would make every `const x: MpElement = <div/>` /
 * `MpChild[] = items.map(() => <li/>)` fail to type-check under `vue-tsc`. React
 * instead renames these to `ReactNode`/`ReactElement` (see
 * {@link REACT_TYPE_ALIASES}); Vue keeps the `Mp*` names but resolves them to
 * the Vue-native types via the local module, so no reference rewriting is needed.
 */
export const VUE_LOCAL_JSX_TYPE_NAMES: ReadonlySet<string> = new Set([
  'MpProperties',
  'MpRenderProperty',
  'MpChild',
  'MpElement',
]);

/** The relative specifier the generated per-framework {@link LOCAL_JSX_TYPES_MODULE} is imported under. */
export const LOCAL_JSX_TYPES_MODULE = './mp-jsx-types';

/** The file name (with extension) the local JSX types module is written as in the flat generated tree. */
export const LOCAL_JSX_TYPES_FILE = 'mp-jsx-types.ts';

/**
 * The source of the co-located {@link LOCAL_JSX_TYPES_MODULE} for a target
 * framework: framework-specific variants of the neutral render/props primitives
 * named in {@link LOCAL_JSX_TYPE_NAMES}, so the generated components import
 * `MpProperties` / `MpRenderProperty` from this local module instead of the
 * neutral `@mission-platform/jsx` package. The definitions differ per framework:
 * the "renderable content" position is React's `ReactNode` and Vue's
 * `VNodeChild`, so each build's declarations read idiomatically for its runtime.
 */
export function localJsxTypesModuleSource(framework: 'react' | 'vue'): string {
  const renderable = framework === 'react' ? 'ReactNode' : 'VNodeChild';
  const imported =
    framework === 'react' ? "import type { ReactNode } from 'react';" : "import type { VNode, VNodeChild } from 'vue';";
  const lines = [
    '/**',
    ` * Framework-specific variants of the neutral \`@mission-platform/jsx\` render/props`,
    ' * primitives, generated for the ' + framework + ' build so the compiled components',
    ' * carry no neutral-package type import (see `LOCAL_JSX_TYPE_NAMES`).',
    ' */',
    imported,
    '',
    '/** The bag of attributes/props a component accepts — the ' +
      framework +
      ' variant of the neutral `MpProperties`. */',
    'export type MpProperties = {',
    '  [key: string]: unknown;',
    `  children?: ${renderable};`,
    '  slot?: string;',
    '};',
    '',
    '/** A scoped-slot / render-prop function — the ' + framework + ' variant of the neutral `MpRenderProperty`. */',
    `export type MpRenderProperty<S = MpProperties> = (scope: S) => ${renderable};`,
    '',
  ];
  // Under `jsxImportSource: 'vue'` a JSX expression in a generated SFC is typed
  // as Vue's `VNode` (`JSX.Element`); re-declaring the neutral element primitives
  // over the Vue-native types lets `const x: MpElement = <div/>` and
  // `MpChild[] = items.map(() => <li/>)` type-check under `vue-tsc` without any
  // reference rewriting (React instead renames these — see `REACT_TYPE_ALIASES`).
  if (framework === 'vue') {
    lines.push(
      '/** Anything that may render as a child — the Vue variant of the neutral `MpChild`. */',
      'export type MpChild = VNodeChild;',
      '',
      '/** A node in the rendered tree — the Vue variant of the neutral `MpElement`. */',
      'export type MpElement = VNode;',
      '',
    );
  }
  return lines.join('\n');
}

/** The relative specifier the generated Vue {@link LOCAL_EFFECT_MODULE} is imported under. */
export const LOCAL_EFFECT_MODULE = './mp-effect';

/** The file name (with extension) the local effect helper module is written as in the flat generated tree. */
export const LOCAL_EFFECT_FILE = 'mp-effect.ts';

/**
 * The source of the co-located {@link LOCAL_EFFECT_MODULE} for a target
 * framework, generated once per output tree exactly like the local JSX-types
 * module (see {@link localJsxTypesModuleSource}).
 *
 * It centralises the Vue emitter's `useEffect` → lifecycle translation in a
 * single generalised watcher (`mpEffect`) built on Vue's native
 * `watch`/`onMounted`/`onUpdated`/`onUnmounted`, so each component's `setup`
 * shrinks to a single `mpEffect(callback, () => [deps])` call instead of the
 * inlined per-effect lifecycle block. The semantics mirror React's
 * `useEffect(callback, deps?)`: run once after mount, re-run when a dependency
 * changes (or after every update when deps are omitted), and run the returned
 * cleanup before each re-run and on unmount.
 *
 * The helper is **Vue-only**: the React emitter keeps emitting `useEffect(…)`
 * verbatim (React's native form), so for `framework === 'react'` this returns an
 * empty string and the writer skips it.
 */
export function localEffectModuleSource(framework: 'react' | 'vue'): string {
  if (framework === 'react') {
    return '';
  }
  return [
    '/**',
    ' * Vue-native generalised effect watcher — the mirror of React\u2019s',
    ' * `useEffect(callback, deps?)`, generated once per output tree so the compiled',
    ' * components share one lifecycle helper instead of inlining the wiring per',
    ' * effect.',
    ' *',
    ' * - runs once after mount;',
    ' * - re-runs when any dependency changes (when `deps` is provided);',
    ' * - runs after every update when `deps` is omitted;',
    ' * - runs the returned cleanup before each re-run and on unmount.',
    ' */',
    "import { onMounted, onUnmounted, onUpdated, watch } from 'vue';",
    '',
    'export function mpEffect(',
    '  effect: () => void | (() => void),',
    '  deps?: () => readonly unknown[],',
    '): void {',
    '  let cleanup: (() => void) | undefined;',
    '  const run = () => {',
    '    cleanup?.();',
    '    const result = effect();',
    "    cleanup = typeof result === 'function' ? result : undefined;",
    '  };',
    '  onMounted(run);',
    '  if (deps) {',
    '    watch(deps, run);',
    '  } else {',
    '    onUpdated(run);',
    '  }',
    '  onUnmounted(() => cleanup?.());',
    '}',
    '',
  ].join('\n');
}

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
export const COMPONENTS_JSX_MODULES = [
  '@mission-platform/components',
  '@mission-platform/layouts',
  '@mission-platform/i18n',
] as const;

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

/** The JSX tag name of the neutral fragment element (`<Fragment>`). */
const FRAGMENT_TAG = 'Fragment';

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
 * Collapse a `className={…}` attribute value into the **React** `className`
 * value. React's `className` only accepts a string, so the conditional/array/
 * object forms must be reduced *before* they reach the element. An **array
 * literal** (the canonical form — `className={['base', { active }]}`) is
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
 * Whether the module carries a `className={[…]}` attribute whose value is an
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
      (node.name.text === CLASS_NAME_ATTRIBUTE || node.name.text === 'classNames') &&
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

/**
 * Whether a node is a neutral `<Fragment>` element — either the self-closing
 * `<Fragment />` (empty) or `<Fragment>…</Fragment>` (with children) form.
 */
export function isFragmentElement(node: ts.Node): node is ts.JsxSelfClosingElement | ts.JsxElement {
  if (ts.isJsxSelfClosingElement(node)) {
    return ts.isIdentifier(node.tagName) && node.tagName.text === FRAGMENT_TAG;
  }
  if (ts.isJsxElement(node)) {
    return ts.isIdentifier(node.openingElement.tagName) && node.openingElement.tagName.text === FRAGMENT_TAG;
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
  const slotsId = factory.createIdentifier('slots');
  const slotName = name ?? 'default';
  const access = /^[A-Za-z_$][\w$]*$/.test(slotName)
    ? factory.createPropertyAccessExpression(slotsId, slotName)
    : factory.createElementAccessExpression(slotsId, factory.createStringLiteral(slotName, true));
  return factory.createPrefixUnaryExpression(
    ts.SyntaxKind.ExclamationToken,
    factory.createPrefixUnaryExpression(ts.SyntaxKind.ExclamationToken, access),
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

/**
 * The local part of a Vue `update:<model>` listener for an `onUpdate<Name>`
 * callback prop, or `undefined` when the name is not an `onUpdate<Name>`
 * listener. Strips the `onUpdate` prefix and lower-cases the first remaining
 * letter, matching Vue's `defineModel('<name>')` → `update:<name>` convention:
 * `onUpdateModelValue` → `modelValue`, `onUpdateOpen` → `open`.
 */
function modelUpdateListenerLocalName(name: string): string | undefined {
  const match = /^onUpdate([A-Z].*)$/.exec(name);
  if (match === null || match[1] === undefined) {
    return undefined;
  }
  const rest = match[1];
  return `${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
}

/**
 * Vue's `v-model` update events are named `update:<model>`: a child compiled
 * from a `@model`-paired `onUpdate<Name>` callback prop declares
 * `defineModel('<name>')` and therefore **emits `update:<name>`**, whose
 * listener prop is the string-keyed `onUpdate:<name>` — not the camelCase
 * `onUpdate<Name>`. A **parent** that forwards the neutral `onUpdate<Name>`
 * callback down to that child must bind `onUpdate:<name>`, or Vue never wires
 * the two-way update (and `vue-tsc` reports the prop as unknown, suggesting
 * `"onUpdate:<name>"`). This transformer rewrites every `onUpdate<Name>`
 * listener on a **component** element — a JSX attribute (`<Child onUpdateOpen=…>`
 * → `<Child onUpdate:open=…>`) or an `h(Component, { onUpdateOpen: … })` prop
 * (→ the `'onUpdate:open'` string key) — into that `onUpdate:<name>` form.
 * Listeners on native elements and non-`onUpdate` listeners are left untouched,
 * so it is idempotent and safe to apply universally on the render-closure path.
 */
export function vueComponentModelListenerTransformer(): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const rewriteAttributes = (attributes: ts.JsxAttributes): ts.JsxAttributes =>
      factory.updateJsxAttributes(
        attributes,
        attributes.properties.map((property) => {
          if (ts.isJsxAttribute(property) && ts.isIdentifier(property.name)) {
            const local = modelUpdateListenerLocalName(property.name.text);
            if (local !== undefined) {
              return factory.updateJsxAttribute(
                property,
                factory.createJsxNamespacedName(factory.createIdentifier('onUpdate'), factory.createIdentifier(local)),
                property.initializer,
              );
            }
          }
          return property;
        }),
      );
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isJsxSelfClosingElement(node) && isComponentTagName(node.tagName)) {
        const updated = factory.updateJsxSelfClosingElement(
          node,
          node.tagName,
          node.typeArguments,
          rewriteAttributes(node.attributes),
        );
        return ts.visitEachChild(updated, visit, context);
      }
      if (ts.isJsxElement(node) && isComponentTagName(node.openingElement.tagName)) {
        const opening = factory.updateJsxOpeningElement(
          node.openingElement,
          node.openingElement.tagName,
          node.openingElement.typeArguments,
          rewriteAttributes(node.openingElement.attributes),
        );
        const updated = factory.updateJsxElement(node, opening, node.children, node.closingElement);
        return ts.visitEachChild(updated, visit, context);
      }
      // `h(Component, { onUpdateOpen: … })` — a component call has a non-string
      // first argument (a string-literal tag is an intrinsic element, handled by
      // `vueNativeEventTransformer`).
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'h' &&
        node.arguments.length >= 2 &&
        node.arguments[0] !== undefined &&
        !ts.isStringLiteral(node.arguments[0]) &&
        node.arguments[1] !== undefined &&
        ts.isObjectLiteralExpression(node.arguments[1])
      ) {
        const props = node.arguments[1];
        const rewrittenProps = factory.updateObjectLiteralExpression(
          props,
          props.properties.map((property) => {
            if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
              const local = modelUpdateListenerLocalName(property.name.text);
              if (local !== undefined) {
                return factory.updatePropertyAssignment(
                  property,
                  factory.createStringLiteral(`onUpdate:${local}`),
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
  variadicChildren = false,
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

  const finalChildren = variadicChildren
    ? childArguments
    : childArguments.length <= 1
      ? childArguments
      : [factory.createArrayLiteralExpression(childArguments, false)];

  return factory.createCallExpression(factory.createIdentifier('h'), undefined, [
    tag,
    propertiesArgument,
    ...finalChildren,
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
 * Safely invoke or forward a React slot when a scope object is provided:
 * `typeof <access> === 'function' ? <access>(scope) : <access>`.
 * Handles both render-prop functions (`(scope) => nodes`) and plain React nodes.
 */
function createReactScopedSlotRead(
  factory: ts.NodeFactory,
  access: ts.Expression,
  scope: ts.Expression,
): ts.Expression {
  return factory.createConditionalExpression(
    factory.createBinaryExpression(
      factory.createTypeOfExpression(access),
      factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
      factory.createStringLiteral('function'),
    ),
    factory.createToken(ts.SyntaxKind.QuestionToken),
    factory.createCallExpression(access, undefined, [scope]),
    factory.createToken(ts.SyntaxKind.ColonToken),
    access,
  );
}

/**
 * `<props>.<name>` (with `?? <fallback>` when the slot declares fallback
 * content). When `scope` is supplied the slot prop is invoked if it is a
 * render-prop function, or evaluated directly if it is a React node
 * (`typeof <props>.<name> === 'function' ? <props>.<name>(scope) : <props>.<name>`).
 */
export function createReactSlotExpression(
  factory: ts.NodeFactory,
  propsParamName: string,
  name: string | undefined,
  fallback: readonly ts.JsxChild[],
  scope?: ts.Expression,
): ts.Expression {
  const access = createSlotMemberAccess(factory, propsParamName, name ?? 'children');
  const read: ts.Expression = scope === undefined ? access : createReactScopedSlotRead(factory, access, scope);
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
 * `typeof <props>.<name> === 'function' ? <props>.<name>(scope) : <props>.<name>`
 * (with `?? <fallback>`) — the React translation of the `h(Slot, …)` call form
 * (the `h()` counterpart of {@link createReactSlotExpression}).
 */
export function createReactSlotCallExpression(
  factory: ts.NodeFactory,
  propsParamName: string,
  name: string | undefined,
  fallback: readonly ts.Expression[],
  scope?: ts.Expression,
): ts.Expression {
  const access = createSlotMemberAccess(factory, propsParamName, name ?? 'children');
  const read: ts.Expression = scope === undefined ? access : createReactScopedSlotRead(factory, access, scope);
  return appendExpressionFallback(factory, read, fallback);
}

/** A relative import of a sibling component, e.g. `import { BaseBadge } from '../base-badge'`. */
export interface ComponentImport {
  /** The imported value names. */
  names: string[];
  /**
   * The imported **type-only** names — either an `import type { … }` statement's
   * members or the `type`-prefixed members of a mixed
   * `import { value, type X } from './helper'`. Kept separate from {@link names}
   * so a helper import can be re-emitted with its type members preserved (the
   * Vue emitter would otherwise drop them, leaving those types unresolved).
   */
  typeNames: string[];
  /** The base name of the import path, e.g. `base-badge`. */
  base: string;
  /** The original (relative) module specifier, e.g. `../base-badge`. */
  specifier: string;
}

/** Collect relative (sibling-component) value + type imports from a module. */
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
    // A statement-level `import type { … }` marks every member type-only; a mixed
    // statement marks only the `type`-prefixed members. Either way the type
    // members are kept apart from the value names so they can be re-emitted.
    const statementIsTypeOnly = statement.importClause?.isTypeOnly === true;
    const names: string[] = [];
    const typeNames: string[] = [];
    for (const element of bindings.elements) {
      if (statementIsTypeOnly || element.isTypeOnly) {
        typeNames.push(element.name.text);
      } else {
        names.push(element.name.text);
      }
    }
    const segments = specifier
      .split('/')
      .filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
    imports.push({ names, typeNames, base: segments.at(-1) ?? specifier, specifier });
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
  let needsI18nImport = usesI18nextT(sourceFile);

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('.') || specifier === NEUTRAL_MODULE || STYLE_EXTENSIONS.test(specifier)) {
      continue;
    }
    if (specifier === 'i18next') {
      imports.push(printNode(statement, sourceFile));
      needsI18nImport = true;
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

  if (needsI18nImport) {
    const i18nModule = `@mission-platform/i18n/${framework}`;
    if (!imports.some((imp) => imp.includes(i18nModule))) {
      imports.push(`import { useI18n } from '${i18nModule}';`);
    }
  }

  return imports;
}

/** Whether a module or AST node calls `i18next.t(...)`. */
export function usesI18nextT(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (
      ts.isCallExpression(child) &&
      ts.isPropertyAccessExpression(child.expression) &&
      ts.isIdentifier(child.expression.expression) &&
      child.expression.expression.text === 'i18next' &&
      ts.isIdentifier(child.expression.name) &&
      child.expression.name.text === 't'
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

/** Check if a block statement or function body calls `useI18n()`. */
function bodyCallsUseI18n(body: ts.Block): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === 'useI18n') {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(body, visit);
  return found;
}

/**
 * Ensure component functions that call `i18next.t(...)` have a top-level `const { t } = useI18n();` statement.
 */
export function ensureI18nHookInComponent(factory: ts.NodeFactory, sourceFile: ts.SourceFile): ts.SourceFile {
  if (!usesI18nextT(sourceFile)) {
    return sourceFile;
  }

  const transformer: ts.TransformerFactory<ts.SourceFile> = () => {
    const visit = (node: ts.Node): ts.Node => {
      if (
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
        node.body !== undefined &&
        ts.isBlock(node.body) &&
        usesI18nextT(node.body) &&
        !bodyCallsUseI18n(node.body)
      ) {
        const useI18nStatement = factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                factory.createObjectBindingPattern([
                  factory.createBindingElement(undefined, undefined, factory.createIdentifier('t')),
                ]),
                undefined,
                undefined,
                factory.createCallExpression(factory.createIdentifier('useI18n'), undefined, []),
              ),
            ],
            ts.NodeFlags.Const,
          ),
        );
        const updatedBody = factory.updateBlock(node.body, [useI18nStatement, ...node.body.statements]);
        if (ts.isFunctionDeclaration(node)) {
          return factory.updateFunctionDeclaration(
            node,
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.typeParameters,
            node.parameters,
            node.type,
            updatedBody,
          );
        }
        if (ts.isFunctionExpression(node)) {
          return factory.updateFunctionExpression(
            node,
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.typeParameters,
            node.parameters,
            node.type,
            updatedBody,
          );
        }
        if (ts.isArrowFunction(node)) {
          return factory.updateArrowFunction(
            node,
            node.modifiers,
            node.typeParameters,
            node.parameters,
            node.type,
            node.equalsGreaterThanToken,
            updatedBody,
          );
        }
      }
      return ts.visitEachChild(node, visit, undefined);
    };
    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformed = result.transformed[0];
  result.dispose();
  return transformed;
}

/** Rewrite `i18next.t(...)` call expressions to `t(...)`. */
export function transformI18nextCalls(factory: ts.NodeFactory, node: ts.Node): ts.Node {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'i18next' &&
    ts.isIdentifier(node.expression.name) &&
    node.expression.name.text === 't'
  ) {
    return factory.createCallExpression(factory.createIdentifier('t'), node.typeArguments, node.arguments);
  }
  return node;
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

/** A single (own) property of a props interface — its name, declared type text, and optionality. */
export interface PropertySignature {
  /** The property name, e.g. `variant`. */
  name: string;
  /** The declared type as source text, e.g. `AccordionItem[]` or `(openIds: string[]) => void`. */
  typeText: string;
  /** Whether the property is optional (declared with `?`). */
  optional: boolean;
}

/**
 * Extract the (own) property signatures declared by a props interface, excluding
 * `children`. Each entry carries the property's declared type text and
 * optionality so the Vue emitter can render a **type-based** `defineProps<{ … }>()`
 * that preserves the interface's precise types (an untyped runtime `defineProps`
 * would collapse them to `{}` / `never[]`). Properties whose type cannot be read
 * fall back to `unknown`.
 */
export function extractPropertySignatures(sourceFile: ts.SourceFile, interfaceName: string): PropertySignature[] {
  const signatures: PropertySignature[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
      continue;
    }
    for (const member of statement.members) {
      if (ts.isPropertySignature(member) && ts.isIdentifier(member.name) && member.name.text !== 'children') {
        signatures.push({
          name: member.name.text,
          typeText: member.type === undefined ? 'unknown' : member.type.getText(sourceFile),
          optional: member.questionToken !== undefined,
        });
      }
    }
  }
  return signatures;
}

/**
 * A component **event** — a props-interface member named `on<Event>` whose
 * declared type is an inline function type (e.g. `onChange?: (openIds: string[])
 * => void`). The Vue emitter turns these into `defineEmits` declarations and
 * `emit('<event>', …)` calls instead of runtime props.
 */
export interface EventSignature {
  /** The prop name as authored, e.g. `onChange`. */
  propName: string;
  /**
   * The emitted Vue event name, e.g. `change`. Derived by stripping the `on`
   * prefix and lower-casing the first letter, which is exactly the inverse of
   * Vue's listener-prop convention (`emit('change')` ⇄ the `onChange` listener
   * prop) — so an existing consumer passing `onChange` keeps working, and
   * `onUpdateModelValue` maps to `updateModelValue` (⇄ `onUpdateModelValue`).
   */
  eventName: string;
  /**
   * The event handler's parameter list as source text, e.g. `openIds: string[]`
   * — used verbatim as the payload tuple of a typed `defineEmits<{ … }>()`
   * (`change: [openIds: string[]]`). Empty for a zero-argument event.
   */
  paramsText: string;
  /** The handler's parameter identifier names, e.g. `['openIds']` — used to build a forwarding arrow. */
  paramNames: string[];
}

/**
 * Derive the Vue event name for an `on<Event>` prop: strip the `on` prefix and
 * lower-case the first remaining letter (`onChange` → `change`,
 * `onUpdateModelValue` → `updateModelValue`).
 */
export function eventNameForProp(propName: string): string {
  const rest = propName.slice(2);
  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

/**
 * Extract the (own) **event** signatures declared by a props interface — members
 * named `on<Event>` (an uppercase letter after `on`) whose type is an inline
 * function type. These are the component's events: the Vue emitter declares them
 * with `defineEmits` and rewrites their calls/references to `emit(...)` rather
 * than carrying them as runtime props. A callback prop typed via a named alias
 * (a type reference rather than an inline function type) is left as a plain prop.
 */
export function extractEventSignatures(sourceFile: ts.SourceFile, interfaceName: string): EventSignature[] {
  const events: EventSignature[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
      continue;
    }
    for (const member of statement.members) {
      if (
        ts.isPropertySignature(member) &&
        ts.isIdentifier(member.name) &&
        /^on[A-Z]/.test(member.name.text) &&
        member.type !== undefined &&
        ts.isFunctionTypeNode(member.type)
      ) {
        events.push({
          propName: member.name.text,
          eventName: eventNameForProp(member.name.text),
          paramsText: member.type.parameters.map((parameter) => parameter.getText(sourceFile)).join(', '),
          paramNames: member.type.parameters.map((parameter, index) =>
            ts.isIdentifier(parameter.name) ? parameter.name.text : `argument${index}`,
          ),
        });
      }
    }
  }
  return events;
}

/**
 * A prop marked with a `@model <onEvent>` JSDoc tag: a two-way (v-model) binding
 * pairing an **input** prop with its **change event**. The Vue emitter collapses
 * the pair into a single `defineModel` declaration (dropping both the runtime
 * prop and the `defineEmits` entry) — a read of the prop becomes `<local>.value`
 * and a call of the paired event becomes `<local>.value = …`.
 */
export interface ModelSignature {
  /** The input prop name, e.g. `modelValue`, `geodesic`. Also the emitted ref's local name. */
  propName: string;
  /**
   * The `defineModel` model name — the prop name, except `modelValue`, which maps
   * to `undefined` (Vue's default, nameless `v-model` model). So `geodesic` →
   * `defineModel('geodesic')` and `modelValue` → `defineModel()`.
   */
  modelName: string | undefined;
  /** The prop's declared type text, e.g. `DrawnFeature[]` — used as `defineModel<T>()`. */
  typeText: string;
  /** Whether the source prop is optional (`modelValue?`). */
  optional: boolean;
  /** The paired change event's prop name from the `@model` tag, e.g. `onFeaturesChange`. */
  eventPropName: string;
}

/**
 * The value of a property signature's `@model <event>` JSDoc tag (the paired
 * change-event prop name), or `undefined` when the prop carries no such tag.
 */
function readModelTag(member: ts.PropertySignature): string | undefined {
  for (const tag of ts.getJSDocTags(member)) {
    if (tag.tagName.text !== 'model') {
      continue;
    }
    const comment = typeof tag.comment === 'string' ? tag.comment : ts.getTextOfJSDocComment(tag.comment);
    const trimmed = comment?.trim();
    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  }
  return undefined;
}

/**
 * Extract the props-interface members marked `@model <onEvent>` — a prop and its
 * paired change event that the Vue emitter fuses into a single `defineModel`
 * two-way binding. The model name is the prop name, except the canonical
 * `modelValue`, which becomes Vue's default (nameless) model.
 */
export function extractModelSignatures(sourceFile: ts.SourceFile, interfaceName: string): ModelSignature[] {
  const models: ModelSignature[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
      continue;
    }
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || !ts.isIdentifier(member.name)) {
        continue;
      }
      const eventPropName = readModelTag(member);
      if (eventPropName === undefined) {
        continue;
      }
      const propName = member.name.text;
      models.push({
        propName,
        modelName: propName === 'modelValue' ? undefined : propName,
        typeText: member.type === undefined ? 'unknown' : member.type.getText(sourceFile),
        optional: member.questionToken !== undefined,
        eventPropName,
      });
    }
  }
  return models;
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
  /**
   * Renamed destructuring bindings (`const { format: formatProperty } =
   * properties`) → their **local** alias mapped to the **real** prop name. A
   * reference to the alias must resolve to `<props>.<propName>` (the prop only
   * exists under its declared name on `defineProps`), so the rewriter looks the
   * alias up here before building the property access. Non-renamed bindings are
   * absent (their local name already is the prop name).
   */
  propAliases: Map<string, string>;
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
  /**
   * Event props (`on<Event>` callbacks) keyed by prop name → the emitted event
   * name and the handler's parameter names. A **call** of an event prop
   * (`properties.onChange?.(next)` / `onChange?.(next)`) is rewritten to
   * `emit('change', next)`; a **reference** (e.g. `onLoad` bound to a native
   * `<img onLoad={onLoad}>`) is rewritten to a forwarding arrow
   * `(event) => emit('load', event)`, since the callback no longer exists as a
   * prop. Populated only for the Vue target (empty on React).
   */
  eventProps: Map<string, { eventName: string; paramNames: string[] }>;
  /**
   * Model props (marked `@model <event>`) → the emitted `defineModel` ref's local
   * name (identical to the prop name). A **read** of a model prop (a destructured
   * `modelValue` or `properties.modelValue`) is rewritten to `<local>.value`, like
   * a `useState`/`useMemo` value. Populated only for the Vue target.
   */
  modelProps: Set<string>;
  /**
   * The paired change events of model props, keyed by the **event prop name**
   * (`onFeaturesChange`) → the model ref's local name (`modelValue`). A **call**
   * (`properties.onFeaturesChange?.(next)`) is rewritten to `<local>.value = next`
   * and a **reference** to a two-way `(value) => { <local>.value = value; }` arrow,
   * so the change event drives the model instead of a `defineEmits` emit.
   */
  modelEvents: Map<string, string>;
}

/**
 * Ensure a rewritten JSX child is a valid `JsxChild`. The reference rewriter
 * lowers an authored-in-child-position `<Slot>`/`<Dynamic>` to a **bare**
 * expression (so a top-level `return <Slot/>` stays unwrapped); when such an
 * expression ends up as an element/fragment child it must be re-wrapped in a
 * `{ … }` `JsxExpression`, otherwise it is not a valid `JsxChild` and the printer
 * would emit it as raw text (breaking the generated SFC). Already-valid children
 * (text, `{ … }` expressions, nested elements/fragments) pass through unchanged.
 */
function wrapAsJsxChild(factory: ts.NodeFactory, node: ts.Node): ts.JsxChild {
  if (
    ts.isJsxText(node) ||
    ts.isJsxExpression(node) ||
    ts.isJsxElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isJsxFragment(node)
  ) {
    return node;
  }
  return factory.createJsxExpression(undefined, node as ts.Expression);
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

    // `emit('<event>', …args)` — the replacement for a call of an event prop.
    const emitCall = (eventName: string, args: ts.Expression[]): ts.Expression =>
      factory.createCallExpression(factory.createIdentifier('emit'), undefined, [
        factory.createStringLiteral(eventName),
        ...args,
      ]);

    // `(p0, p1) => emit('<event>', p0, p1)` — the replacement for a *reference*
    // to an event prop (e.g. `<img onLoad={onLoad}>`), which can no longer read
    // the prop. Parameter types are omitted so they are inferred contextually
    // from the binding site (the native element's listener signature).
    const forwardingArrow = (eventName: string, paramNames: string[]): ts.Expression =>
      factory.createArrowFunction(
        undefined,
        undefined,
        paramNames.map((name) =>
          factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier(name)),
        ),
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        emitCall(
          eventName,
          paramNames.map((name) => factory.createIdentifier(name)),
        ),
      );

    // The event a call/reference targets, if it is an event prop: either
    // `properties.on<Event>` or a destructured `on<Event>` local.
    const eventFor = (expression: ts.Expression): { eventName: string; paramNames: string[] } | undefined => {
      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === scope.propsParamName
      ) {
        return scope.eventProps.get(expression.name.text);
      }
      if (ts.isIdentifier(expression) && scope.destructuredProps.has(expression.text)) {
        return scope.eventProps.get(expression.text);
      }
      return undefined;
    };

    // The model ref local a call/reference targets, if it is a model prop's
    // paired change event: either `properties.on<Event>` or a destructured
    // `on<Event>` local.
    const modelEventFor = (expression: ts.Expression): string | undefined => {
      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === scope.propsParamName
      ) {
        return scope.modelEvents.get(expression.name.text);
      }
      if (ts.isIdentifier(expression) && scope.destructuredProps.has(expression.text)) {
        return scope.modelEvents.get(expression.text);
      }
      return undefined;
    };

    // `<local>.value` — the reactive read/write target of a model ref.
    const modelValueAccess = (local: string): ts.Expression =>
      factory.createPropertyAccessExpression(factory.createIdentifier(local), 'value');

    // `(value) => { <local>.value = value; }` — the replacement for a *reference*
    // to a model prop's change event (a call is rewritten to the assignment
    // directly). The single parameter's type is inferred contextually.
    const modelWriteArrow = (local: string): ts.Expression =>
      factory.createArrowFunction(
        undefined,
        undefined,
        [factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier('value'))],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createBlock(
          [
            factory.createExpressionStatement(
              factory.createBinaryExpression(
                modelValueAccess(local),
                factory.createToken(ts.SyntaxKind.EqualsToken),
                factory.createIdentifier('value'),
              ),
            ),
          ],
          true,
        ),
      );

    const visit = (node: ts.Node): ts.Node => {
      // A concise-body arrow whose expression is a `useState` setter call
      // (`(value: number): void => setValue(value)`) is rewritten below to an
      // assignment (`value.value = value`). A concise body *is* the arrow's
      // return value, so under the source's explicit return-type annotation
      // (invariably `: void`, since a React setter returns `void`) the
      // assignment's value would violate the annotation. Emit a block body so
      // the assignment becomes a statement with no returned value.
      if (
        ts.isArrowFunction(node) &&
        node.type !== undefined &&
        !ts.isBlock(node.body) &&
        ts.isCallExpression(node.body) &&
        ts.isIdentifier(node.body.expression) &&
        scope.setterToState.has(node.body.expression.text)
      ) {
        const rewrittenBody = ts.visitNode(node.body, visit) as ts.Expression;
        return factory.updateArrowFunction(
          node,
          node.modifiers,
          node.typeParameters,
          node.parameters,
          node.type,
          node.equalsGreaterThanToken,
          factory.createBlock([factory.createExpressionStatement(rewrittenBody)], true),
        );
      }

      // A **call** of a model prop's change event (`properties.onFeaturesChange?.(next)`
      // / a destructured `onFeaturesChange?.(next)`) → `<local>.value = next`, so
      // the change event drives the two-way `defineModel` ref. Handled at the call
      // node (before the generic event case) so the callee is never visited alone.
      if (ts.isCallExpression(node)) {
        const modelLocal = modelEventFor(node.expression);
        if (modelLocal !== undefined) {
          const argument = node.arguments[0];
          const value =
            argument === undefined
              ? factory.createIdentifier('undefined')
              : (ts.visitNode(argument, visit) as ts.Expression);
          return factory.createBinaryExpression(
            modelValueAccess(modelLocal),
            factory.createToken(ts.SyntaxKind.EqualsToken),
            value,
          );
        }
      }
      // A **call** of an event prop (`properties.onChange?.(next)` / a
      // destructured `onChange?.(next)`) → `emit('change', next)`. Handled at the
      // call node so the callee is never visited on its own (which would
      // otherwise turn it into a forwarding arrow); only the arguments recurse.
      if (ts.isCallExpression(node)) {
        const event = eventFor(node.expression);
        if (event !== undefined) {
          return emitCall(
            event.eventName,
            node.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
          );
        }
      }
      // `<Slot name="x" />` → `slots.x?.()` (default slot → `slots.default?.()`);
      // any extra attributes become the scoped-slot argument `slots.x?.(scope)`.
      // Always lowered to the **bare** expression: as a top-level return / arrow
      // body / ternary branch it must stay unwrapped (otherwise the render closure
      // would emit an invalid `return {slots.default?.()};`), and in JSX **child**
      // position the enclosing `JsxElement`/`JsxFragment` branch below re-wraps it
      // in `{ … }`. (Parent-pointer inspection is unreliable here — the render
      // closure is re-synthesised, so `node.parent` is often unset.)
      if (isSlotElement(node)) {
        const name = readSlotName(node);
        const fallback = slotFallbackChildren(node).map((child) => ts.visitNode(child, visit) as ts.JsxChild);
        const slotScope = readSlotScope(factory, node, visit);
        return createVueSlotExpression(factory, name, fallback, slotScope);
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

      // `<Dynamic is={X} …>` → `h(X, { … }, …children)`. Always lowered to the
      // **bare** call: as a top-level return / arrow body / ternary branch it must
      // stay unwrapped, and in JSX **child** position the enclosing
      // `JsxElement`/`JsxFragment` branch below re-wraps it in `{ … }`. Vue's JSX
      // transform compiles `h(X, …)` to a native `<component :is>` render.
      if (isDynamicElement(node)) {
        return dynamicToHCall(factory, node, (expression) => ts.visitNode(expression, visit) as ts.Expression);
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

      // A **read** of a model prop via the props object (`properties.modelValue`) →
      // `<local>.value` (a destructured read is handled at the bare identifier
      // below). The two-way `defineModel` ref replaces the runtime prop.
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === scope.propsParamName &&
        scope.modelProps.has(node.name.text)
      ) {
        return modelValueAccess(node.name.text);
      }

      // A **reference** to a model prop's change event (`properties.onFeaturesChange`,
      // not a call) → the two-way write arrow `(value) => { <local>.value = value; }`
      // (a call is already rewritten to the assignment at the call node above).
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === scope.propsParamName &&
        scope.modelEvents.has(node.name.text)
      ) {
        return modelWriteArrow(scope.modelEvents.get(node.name.text) as string);
      }

      // A **reference** to an event prop (`properties.onLoad`, not a call) →
      // forwarding arrow `(event) => emit('load', event)`, since the callback is
      // no longer a prop (a call is already handled at the call node above).
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === scope.propsParamName &&
        scope.eventProps.has(node.name.text)
      ) {
        const event = scope.eventProps.get(node.name.text) as { eventName: string; paramNames: string[] };
        return forwardingArrow(event.eventName, event.paramNames);
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
          // `setState(updater)` → `state.value = updater(state.value)`. The
          // previous value is forwarded only when the updater actually declares a
          // parameter for it; a zero-parameter updater (`() => next`) is called
          // with no argument so the generated Vue stays type-correct.
          const forwardsPrevious = argument.parameters.length > 0;
          value = factory.createCallExpression(
            factory.createParenthesizedExpression(ts.visitNode(argument, visit) as ts.Expression),
            undefined,
            forwardsPrevious
              ? [factory.createPropertyAccessExpression(factory.createIdentifier(stateName), 'value')]
              : [],
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
      // The one deliberate name rewrite is the neutral `className` attribute →
      // Vue's native `class` binding: Vue understands the array/object forms
      // directly, so the attribute value (with its CSS-Module reads collapsed by
      // the rules above) passes straight through to `class={…}` in the
      // render-closure JSX.
      if (ts.isJsxAttribute(node)) {
        if (node.initializer === undefined) {
          return node;
        }
        let name = node.name;
        if (ts.isIdentifier(node.name)) {
          if (node.name.text === CLASS_NAME_ATTRIBUTE || node.name.text === 'classNames') {
            name = factory.createIdentifier('class');
          } else if (JSX_ATTRIBUTE_RENAMES.has(node.name.text)) {
            // Vue's JSX intrinsic elements type native attributes by their HTML
            // (lowercase) name, unlike React's camelCase aliases. Lower the few
            // camelCase attributes vue-tsc rejects (`colSpan` → `colspan`), so the
            // render-closure JSX type-checks against Vue's element definitions.
            name = factory.createIdentifier(JSX_ATTRIBUTE_RENAMES.get(node.name.text) as string);
          }
        }
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

      // A JSX element/fragment: rewrite its children, then re-wrap any child that
      // came back as a **bare expression** (e.g. a lowered `<Slot>`/`<Dynamic>`
      // that was authored in child position) in a `{ … }` `JsxExpression`, since a
      // bare expression is not a valid `JsxChild` and would otherwise be printed
      // as raw text. This makes the child-vs-return decision robust without
      // relying on the (unset) `node.parent` inside the transform.
      if (ts.isJsxElement(node)) {
        return factory.updateJsxElement(
          node,
          ts.visitNode(node.openingElement, visit) as ts.JsxOpeningElement,
          node.children.map((child) => wrapAsJsxChild(factory, ts.visitNode(child, visit) as ts.Node)),
          ts.visitNode(node.closingElement, visit) as ts.JsxClosingElement,
        );
      }
      if (ts.isJsxFragment(node)) {
        return factory.updateJsxFragment(
          node,
          node.openingFragment,
          node.children.map((child) => wrapAsJsxChild(factory, ts.visitNode(child, visit) as ts.Node)),
          node.closingFragment,
        );
      }

      // Bare identifier reads.
      if (ts.isIdentifier(node)) {
        // A model prop read (a destructured `modelValue`/`mode`/`geodesic`) reads
        // the two-way `defineModel` ref through `.value`, like `useState`/`useMemo`.
        if (scope.stateNames.has(node.text) || scope.memoNames.has(node.text) || scope.modelProps.has(node.text)) {
          return factory.createPropertyAccessExpression(node, 'value');
        }
        // A **reference** to a destructured model change event → the two-way write
        // arrow `(value) => { <local>.value = value; }`; a *call* was already
        // rewritten to the assignment at the call node above.
        if (scope.destructuredProps.has(node.text) && scope.modelEvents.has(node.text)) {
          return modelWriteArrow(scope.modelEvents.get(node.text) as string);
        }
        // A **reference** to a destructured event prop (e.g. `onLoad` bound to a
        // native `<img onLoad={onLoad}>`) → forwarding arrow; a *call* was
        // already rewritten to `emit(...)` at the call node above.
        if (scope.destructuredProps.has(node.text) && scope.eventProps.has(node.text)) {
          const event = scope.eventProps.get(node.text) as { eventName: string; paramNames: string[] };
          return forwardingArrow(event.eventName, event.paramNames);
        }
        if (scope.destructuredProps.has(node.text)) {
          // A renamed binding (`const { format: formatProperty } = properties`)
          // resolves to the real prop name; a plain binding uses its own name.
          const propName = scope.propAliases.get(node.text) ?? node.text;
          return factory.createPropertyAccessExpression(factory.createIdentifier(scope.propsParamName), propName);
        }
        return node;
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/** The assignment operators whose left-hand side is a *write* target. */
const ASSIGNMENT_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

/**
 * Preserve TypeScript control-flow narrowing of `useState` / `useMemo` values
 * across nested closures, which the `<name>` → `<name>.value` rewrite otherwise
 * breaks.
 *
 * In the neutral JSX a state value is a `const` local, so a guard that narrows
 * it (`if (sortKey === undefined) return; … rows.toSorted((a) => a[sortKey])`)
 * keeps the narrowing inside nested callbacks — `const`s are never reassigned,
 * so TypeScript trusts the narrowing through function boundaries. After the Vue
 * rewrite the read becomes `sortKey.value`, a **mutable property access**, whose
 * narrowing TypeScript discards on entering any nested function — so the guarded
 * `a[sortKey.value]` / `draft.value.uid` fails to type-check.
 *
 * For each block-bodied function this pass snapshots every such value read
 * *inside a nested closure* into a leading `const <name>$ = <name>.value;`, and
 * rewrites the value **reads** (not the `<name>.value = …` write targets) within
 * the function to that `const` alias. The snapshot restores the original `const`
 * semantics — narrowing flows into the nested closures again — while the `.value`
 * access at the top keeps the read reactive (a `computed` still re-tracks it).
 */
export function createStateSnapshotHoister(scope: RewriteScope): ts.TransformerFactory<ts.Node> {
  const candidates = new Set<string>([...scope.stateNames, ...scope.memoNames]);
  if (candidates.size === 0) {
    return () => (node) => node;
  }

  return (context) => {
    const { factory } = context;

    // A `<name>.value` access for a candidate state — the shape both reads and
    // write targets take after the reference rewrite.
    const valueAccessName = (node: ts.Node): string | undefined =>
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'value' &&
      ts.isIdentifier(node.expression) &&
      candidates.has(node.expression.text)
        ? node.expression.text
        : undefined;

    // Collect the `<name>.value` nodes that are assignment / update **targets**
    // (writes), so they are never rewritten to the read-only snapshot alias.
    const collectWriteTargets = (root: ts.Node): Set<ts.Node> => {
      const writes = new Set<ts.Node>();
      const walk = (node: ts.Node): void => {
        if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)) {
          writes.add(node.left);
        } else if (
          (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
          (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
        ) {
          writes.add(node.operand);
        }
        ts.forEachChild(node, walk);
      };
      walk(root);
      return writes;
    };

    // The candidate states whose value is **read inside a nested closure** of
    // this function body and is **never written inside a nested closure** (an
    // inner write would make a hoisted snapshot stale). These are exactly the
    // reads whose narrowing the snapshot must restore.
    const namesToHoist = (body: ts.Block, writeTargets: Set<ts.Node>): string[] => {
      const readInNested = new Set<string>();
      const writtenInNested = new Set<string>();
      const walk = (node: ts.Node, depth: number): void => {
        const name = valueAccessName(node);
        if (name !== undefined && depth > 0) {
          if (writeTargets.has(node)) {
            writtenInNested.add(name);
          } else {
            readInNested.add(name);
          }
        }
        const nextDepth =
          ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)
            ? depth + 1
            : depth;
        ts.forEachChild(node, (child) => walk(child, nextDepth));
      };
      // Depth 0 is the function's own statement scope; a read only needs a
      // snapshot once it is used one or more closures deep.
      for (const statement of body.statements) {
        walk(statement, 0);
      }
      return [...readInNested].filter((name) => !writtenInNested.has(name));
    };

    // Rewrite every read `<name>.value` (leaving write targets intact) to the
    // snapshot alias `<name>$`, throughout the given subtree.
    const aliasReads = (root: ts.Node, hoist: Set<string>, writeTargets: Set<ts.Node>): ts.Node => {
      const rewriteValue: ts.Visitor = (node) => {
        const name = valueAccessName(node);
        if (name !== undefined && hoist.has(name) && !writeTargets.has(node)) {
          return factory.createIdentifier(`${name}$`);
        }
        return ts.visitEachChild(node, rewriteValue, context);
      };
      return ts.visitNode(root, rewriteValue) as ts.Node;
    };

    const visit = (node: ts.Node): ts.Node => {
      if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isBlock(node.body)) {
        const writeTargets = collectWriteTargets(node.body);
        const hoist = namesToHoist(node.body, writeTargets);
        if (hoist.length > 0) {
          const hoistSet = new Set(hoist);
          const aliased = aliasReads(node.body, hoistSet, writeTargets) as ts.Block;
          const snapshots = hoist.map((name) =>
            factory.createVariableStatement(
              undefined,
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    factory.createIdentifier(`${name}$`),
                    undefined,
                    undefined,
                    factory.createPropertyAccessExpression(factory.createIdentifier(name), 'value'),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            ),
          );
          const body = factory.updateBlock(aliased, [...snapshots, ...aliased.statements]);
          // Recurse into the (already aliased) body so nested functions with
          // their own deeper narrowing get the same treatment.
          const visitedBody = ts.visitEachChild(body, visit, context);
          return ts.isArrowFunction(node)
            ? factory.updateArrowFunction(
                node,
                node.modifiers,
                node.typeParameters,
                node.parameters,
                node.type,
                node.equalsGreaterThanToken,
                visitedBody,
              )
            : factory.updateFunctionExpression(
                node,
                node.modifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                visitedBody,
              );
        }
      }
      return ts.visitEachChild(node, visit, context);
    };

    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}
