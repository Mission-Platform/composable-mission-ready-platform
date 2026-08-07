/**
 * Vue **hook-module** emitter for the Stage-1 compiler.
 *
 * A hook library (e.g. `@mission-platform/rxjs`, `@mission-platform/d3`) is a set
 * of write-once composables authored against `@mission-platform/forge`'s
 * React-style hooks (`useState`/`useRef`/`useEffect`/…) — not UI components. This
 * emitter compiles such a module to an idiomatic Vue composable module:
 *
 * - `useState(x)` → a reactive `ref(x)` (its setter calls become `state.value = …`);
 * - `useRef(x)`   → a Vue `ref(x)` (`.current` reads collapse to `.value`), usable
 *   directly as a template ref;
 * - `useMemo(fn)` → a `computed(fn)`;
 * - `useEffect(fn, deps)` → a single `mpEffect(fn, () => [deps])` call routed
 *   through the generated Vue-only `./mp-effect` helper (native `watch`/lifecycle),
 *   shared with the component emitter.
 *
 * Because a composable runs **once** (unlike a re-rendering React component), the
 * hook translation and every other body statement are emitted in source order as
 * the composable body; a hook whose neutral form returns a plain value (a
 * `useState`/`useMemo` result) returns the underlying **ref** on Vue, so the
 * value stays reactive for the caller. A ref-returning composable is annotated
 * with an explicit `Ref<…>` return type (derived from the neutral return type,
 * `MpRef<X>` mapped to `Ref<X>`) so the emitted declarations stay portable —
 * left to inference, Vue's `Ref` unwrapping references `@vue/shared`'s internal
 * `IfAny`, which `tsc` cannot name in the output `.d.ts`.
 *
 * The React counterpart needs no bespoke emitter: a neutral hook module already
 * *is* a React hook module (the neutral hooks share React's signatures), so the
 * generic {@link emitReactModule} import rewrite handles it.
 */
import ts from 'typescript';

import {
  ensureI18nHookInComponent,
  LOCAL_EFFECT_MODULE,
  NEUTRAL_CONTEXT_VALUES,
  printNode,
  readExternalImports,
  readNeutralImports,
  type RewriteScope,
} from '../../compiler/ast.js';

import { analyseBody } from './body.js';
import { analyseScope } from './scope.js';
import { rewrite } from './shared.js';

/** The subset of Vue's API the hook translation can reference, imported from `vue`. */
const VUE_RUNTIME_IMPORTS: readonly string[] = [
  'ref',
  'shallowRef',
  'computed',
  'watch',
  'onMounted',
  'onUnmounted',
  'onUpdated',
];

/** The Vue **type** imports a composable's annotated return type may reference (imported `type`-only from `vue`). */
const VUE_TYPE_IMPORTS: readonly string[] = ['Ref', 'ComputedRef'];

/** The neutral ref type whose Vue equivalent is `Ref` (`MpRef<X>` → `Ref<X>`). */
const NEUTRAL_REF_TYPE = 'MpRef';

/** Print a flattened relative import (`../x` → `./x`) or any non-neutral import verbatim. */
function carriedImport(statement: ts.ImportDeclaration, sourceFile: ts.SourceFile): string {
  const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
  if (!specifier.startsWith('.')) {
    return printNode(statement, sourceFile);
  }
  const base = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  const flattened = ts.factory.updateImportDeclaration(
    statement,
    statement.modifiers,
    statement.importClause,
    ts.factory.createStringLiteral(`./${base.at(-1) ?? specifier}`),
    statement.attributes,
  );
  return printNode(flattened, sourceFile);
}

/**
 * Build the `export function` header (`export function name<T>(a: A, b?: B): R`).
 * The `returnType` is the explicit Vue return annotation (or `undefined` to leave
 * it inferred, e.g. a `void` composable).
 */
function functionHeader(
  function_: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  returnType: string | undefined,
): string {
  const exported = function_.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ? 'export '
    : '';
  const name = function_.name?.text ?? '';
  const typeParameters =
    function_.typeParameters === undefined
      ? ''
      : `<${function_.typeParameters.map((parameter) => printNode(parameter, sourceFile)).join(', ')}>`;
  const parameters = function_.parameters.map((parameter) => printNode(parameter, sourceFile)).join(', ');
  const annotation = returnType === undefined ? '' : `: ${returnType}`;
  return `${exported}function ${name}${typeParameters}(${parameters})${annotation}`;
}

/**
 * Compute the explicit Vue return type for a composable, recording any Vue type
 * imports it needs.
 *
 * A composable that returns a `useState`/`useMemo` value hands back the
 * underlying ref on Vue, so its return type is `Ref<neutralReturnType>`; a
 * `useRef` return is already the ref, whose neutral type `MpRef<X>` maps to
 * `Ref<X>`. Anything else (a `void` composable, a non-ref value) is left to
 * inference. Returning an explicit `Ref<…>` keeps the emitted declaration
 * portable (see the module docblock).
 */
function vueReturnType(
  function_: ts.FunctionDeclaration,
  returnExpression: ts.Expression | undefined,
  scope: { stateNames: Set<string>; memoNames: Set<string>; refNames: Set<string> },
  sourceFile: ts.SourceFile,
  vueTypeImports: Set<string>,
): string | undefined {
  const declared = function_.type;
  if (declared === undefined) {
    return undefined;
  }

  // A `void` composable (no return expression) or an object-bundle return
  // (`useMarker`/`usePopup`/`useDrawing` returning `{ … }`) keeps its authored
  // return type verbatim. Left to inference, `tsc` serialises the body's inferred
  // return (or the getter object's structural type) into the emitted `.d.ts`;
  // when that type is drawn from a third-party module (e.g. maplibre's `Marker`)
  // it drags in the module's un-nameable internals and fails declaration emit
  // (TS2883/TS4058/TS7056), and a large discriminated union can even exceed the
  // serializer's depth (TS2589). The authored interface is carried over verbatim,
  // so naming it keeps the emitted declaration portable.
  if (returnExpression === undefined || ts.isObjectLiteralExpression(returnExpression)) {
    return printNode(declared, sourceFile);
  }

  // A non-identifier return (a helper's computed expression, e.g.
  // `layerSourceKey`/`specValuesEqual`) is not a reactive ref, so its Vue value
  // matches the neutral one — the authored type is carried over verbatim. This
  // is essential, not cosmetic: dropping it would let `tsc` re-infer the return,
  // and an inferred type that narrows a large maplibre union (`LayerSpecification`)
  // exceeds the declaration emitter's instantiation depth (TS2589).
  if (!ts.isIdentifier(returnExpression)) {
    return printNode(declared, sourceFile);
  }
  const name = returnExpression.text;

  // A `useState`/`useMemo` value → the underlying ref: `Ref<neutralReturnType>`.
  if (scope.stateNames.has(name) || scope.memoNames.has(name)) {
    vueTypeImports.add('Ref');
    return `Ref<${printNode(declared, sourceFile)}>`;
  }

  // A `useRef` return → the ref itself; its neutral `MpRef<X>` becomes `Ref<X>`.
  if (scope.refNames.has(name)) {
    vueTypeImports.add('Ref');
    if (
      ts.isTypeReferenceNode(declared) &&
      ts.isIdentifier(declared.typeName) &&
      declared.typeName.text === NEUTRAL_REF_TYPE &&
      declared.typeArguments !== undefined
    ) {
      return `Ref<${declared.typeArguments.map((argument) => printNode(argument, sourceFile)).join(', ')}>`;
    }
    return printNode(declared, sourceFile);
  }

  // A returned plain local/parameter (not a reactive ref) keeps its authored
  // type: its Vue value is unchanged, and preserving the annotation avoids the
  // re-inference pitfalls noted above.
  return printNode(declared, sourceFile);
}

/**
 * Emit an object-literal `return` as Vue-reactive source.
 *
 * A composable that returns a **bundle** of reactive values (e.g. `useDrawing`
 * returns `{ mode, features, ghostFeature, …, startDrawing }`) cannot hand each
 * one back as a plain `ref.value`: a composable's `setup` runs **once**, so
 * `{ ghostFeature: ghostFeature.value }` snapshots the ref's value at mount and
 * never updates — the caller's render reads a frozen field and loses reactivity
 * (unlike React, whose hook re-runs every render). Each property whose value is
 * a reactive `useState`/`useMemo`/hoisted-`computed` identifier is therefore
 * emitted as a **getter** (`get ghostFeature() { return ghostFeature.value; }`),
 * so every caller read re-evaluates the ref and is tracked by Vue's reactivity.
 * Non-reactive properties (store methods like `startDrawing: store.startDrawing`,
 * literals, spreads) are rewritten unchanged.
 *
 * When the composable declares an object return type (`returnTypeName`, e.g.
 * `UseMarkerReturn`), each reactive getter asserts its `.value` back to that
 * type's matching property (`get marker() { return marker.value as
 * UseMarkerReturn['marker']; }`). A `ref<T>` whose `T` is a class instance
 * (maplibre's `Marker`/`Popup`) surfaces `.value` as Vue's `UnwrapRef<T>` — a
 * deep structural expansion of the class rather than the nominal type — which
 * (a) is not assignable to the declared nominal property and (b) drags the
 * class's un-nameable module internals into the emitted `.d.ts`. Re-asserting to
 * the declared property type restores the nominal, portable type while leaving
 * the reactive `.value` read (and its tracking) intact.
 */
function emitReactiveReturnObject(
  object: ts.ObjectLiteralExpression,
  scope: RewriteScope,
  sourceFile: ts.SourceFile,
  returnTypeName: string | undefined,
): string {
  const isReactive = (name: string): boolean => scope.stateNames.has(name) || scope.memoNames.has(name);
  const assertion = (key: string): string => (returnTypeName === undefined ? '' : ` as ${returnTypeName}['${key}']`);
  const properties = object.properties.map((property) => {
    // `{ ghostFeature }` — shorthand of a reactive local → reactive getter.
    if (ts.isShorthandPropertyAssignment(property)) {
      const name = property.name.text;
      return isReactive(name)
        ? `get ${name}() { return ${name}.value${assertion(name)}; }`
        : `${name}: ${rewrite(property.name, scope, sourceFile)}`;
    }
    // `{ ghostFeature: ghostFeature }` — a bare reactive identifier value → getter.
    if (ts.isPropertyAssignment(property)) {
      const key = printNode(property.name, sourceFile);
      const value = property.initializer;
      if (ts.isIdentifier(value) && isReactive(value.text)) {
        return `get ${key}() { return ${value.text}.value${assertion(key)}; }`;
      }
      return `${key}: ${rewrite(value, scope, sourceFile)}`;
    }
    // Spreads, methods, accessors: keep the property as authored (rewritten).
    return rewrite(property, scope, sourceFile);
  });
  return `{\n    ${properties.join(',\n    ')},\n  }`;
}

/** Translate one neutral hook function to its Vue composable body + collect the Vue imports it needs. */
function emitHookFunction(
  function_: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  vueImports: Set<string>,
  vueTypeImports: Set<string>,
): string {
  const body = function_.body;
  if (body === undefined) {
    return '';
  }

  const scope = analyseScope(body, '', new Set());
  const analysis = analyseBody(body, scope, sourceFile);
  for (const name of analysis.vueImports) {
    vueImports.add(name);
  }

  // A composable runs once, top-to-bottom: the hook/effect setup and the
  // remaining (per-render, in a component) statements all execute in **source
  // order**. `orderedLines` preserves that authored interleaving — concatenating
  // `setupLines` then `renderLines` (the component split) would move a
  // destructured local (e.g. `const { lngLat } = options`) below an effect that
  // reads it, tripping a temporal-dead-zone `ReferenceError` at runtime.
  const lines = [...analysis.orderedLines];

  const returnType = vueReturnType(function_, analysis.returnExpression, scope, sourceFile, vueTypeImports);

  // A hook whose neutral form returns a `useState`/`useMemo` value returns the
  // underlying ref on Vue (so the caller keeps reactivity); a `useRef` return is
  // already the ref (`analysis.returnText` leaves it un-unwrapped), and any other
  // expression falls back to the rewritten text. Only a **reactive** identifier
  // return is asserted to its annotated `Ref<…>` type: Vue's `ref()` widens its
  // element type through `UnwrapRef`, which does not match the annotation for a
  // generic parameter, so the assertion keeps the generated composable
  // type-clean. A non-reactive return (a helper's computed expression) is emitted
  // verbatim — asserting it would bind `as` to the wrong operand of a comparison
  // (`a === b as T` parses as `a === (b as T)`); its type is carried solely by
  // the function header annotation instead.
  if (analysis.returnExpression !== undefined) {
    const returned = analysis.returnExpression;
    const returnedName = ts.isIdentifier(returned) ? returned.text : undefined;
    const returnsRef =
      returnedName !== undefined && (scope.stateNames.has(returnedName) || scope.memoNames.has(returnedName));
    const returnsReactiveRef = returnedName !== undefined && (returnsRef || scope.refNames.has(returnedName));
    if (ts.isObjectLiteralExpression(returned)) {
      // A bundle of reactive values (`useDrawing`) — each reactive field is
      // handed back as a getter so the caller's render stays reactive. A simple
      // named object return type (`UseMarkerReturn`) lets each reactive getter
      // re-assert its `.value` to the declared property type, keeping the
      // emitted declaration portable (see `emitReactiveReturnObject`).
      const objectReturnTypeName =
        function_.type !== undefined &&
        ts.isTypeReferenceNode(function_.type) &&
        ts.isIdentifier(function_.type.typeName) &&
        function_.type.typeArguments === undefined
          ? function_.type.typeName.text
          : undefined;
      lines.push(`return ${emitReactiveReturnObject(returned, scope, sourceFile, objectReturnTypeName)};`);
    } else if (returnsReactiveRef && returnType !== undefined) {
      // A reactive `useState`/`useMemo`/`useRef` identifier → assert to its
      // `Ref<…>` annotation (offsets Vue's `UnwrapRef` widening). Safe to append
      // `as`: the returned expression is a bare identifier.
      const expression = returnsRef ? (returnedName as string) : analysis.returnText;
      lines.push(`return ${expression} as ${returnType};`);
    } else {
      lines.push(`return ${analysis.returnText};`);
    }
  }

  return `${functionHeader(function_, sourceFile, returnType)} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}`;
}

/**
 * Compile a neutral hook module to its Vue composable source (`.ts`).
 *
 * Imports are rebuilt: the needed Vue runtime bindings are imported from `vue`,
 * the still-referenced neutral **types** stay imported from `@mission-platform/forge`,
 * and every other import (external packages, relative helpers) is carried
 * verbatim (relative specifiers flattened to the generated tree's layout). Every
 * non-import, non-hook statement (interfaces, type aliases, plain consts) is
 * carried over unchanged.
 */
export function emitVueHookModule(rawSourceFile: ts.SourceFile): string {
  const sourceFile = ensureI18nHookInComponent(ts.factory, rawSourceFile);
  const vueImports = new Set<string>();
  const vueTypeImports = new Set<string>();
  const functionBlocks: string[] = [];
  const carriedStatements: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      continue;
    }
    if (ts.isFunctionDeclaration(statement)) {
      // Overload signatures (no body) are dropped; the implementation carries the
      // explicit Vue return type.
      const block = emitHookFunction(statement, sourceFile, vueImports, vueTypeImports);
      if (block.length > 0) {
        functionBlocks.push(block);
      }
      continue;
    }
    // Everything else (interfaces, type aliases, plain consts) is carried over
    // unchanged.
    carriedStatements.push(printNode(statement, sourceFile));
  }

  const emittedBody = [...carriedStatements, ...functionBlocks].join('\n\n');

  // Import assembly. Vue runtime values and any annotated return-type `Ref`/
  // `ComputedRef` types share a single `import … from 'vue'` (types inlined with
  // the `type` modifier).
  const importLines: string[] = [];
  const vueImportNames = [
    ...VUE_RUNTIME_IMPORTS.filter((name) => vueImports.has(name)),
    ...VUE_TYPE_IMPORTS.filter((name) => vueTypeImports.has(name)).map((name) => `type ${name}`),
  ];
  if (vueImportNames.length > 0) {
    importLines.push(`import { ${vueImportNames.join(', ')} } from 'vue';`);
  }
  // A composable whose effects were routed through the generalised watcher pulls
  // `mpEffect` from the generated Vue-only `./mp-effect` helper (native
  // `watch`/lifecycle), mirroring the component emitter.
  if (/\bmpEffect\(/.test(emittedBody)) {
    importLines.push(`import { mpEffect } from '${LOCAL_EFFECT_MODULE}';`);
  }
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      if (specifier.startsWith('.')) {
        importLines.push(carriedImport(statement, sourceFile));
      }
    }
  }
  importLines.push(...readExternalImports(sourceFile));
  // Keep only the neutral types still referenced in the emitted body (return
  // types are dropped, so a type used only there must not linger as an unused
  // import under `noUnusedLocals`).
  const neutralTypes = readNeutralImports(sourceFile).types.filter((type) =>
    new RegExp(String.raw`\b${type}\b`).test(emittedBody),
  );
  if (neutralTypes.length > 0) {
    importLines.push(`import type { ${neutralTypes.join(', ')} } from '@mission-platform/forge';`);
  }
  // Context primitives (`createContext`/`useContext`) are remapped to the Vue
  // adapter (a `provide`/`inject`-backed implementation matching the neutral
  // semantics), mirroring the component emitter — a composable/context module
  // may create or read a context just like a component.
  const contextValues = readNeutralImports(sourceFile).values.filter((name) => NEUTRAL_CONTEXT_VALUES.has(name));
  if (contextValues.length > 0) {
    importLines.push(`import { ${contextValues.join(', ')} } from '@mission-platform/forge/vue';`);
  }

  return `${importLines.join('\n')}\n\n${emittedBody}\n`;
}
