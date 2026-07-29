/**
 * Import rewriting for the SolidJS target.
 *
 * The neutral `@mission-platform/jsx` import is replaced by:
 * - a value import from `solid-js` of the reactive primitives the body now uses
 *   (`createSignal`, `createMemo`, `createEffect`, `onMount`, `createUniqueId`),
 * - a `solid-js/h` import for the hyperscript `h` when the author used explicit
 *   `h(…)` calls,
 * - the framework-agnostic runtime utilities kept against the neutral package
 *   (`classNames`),
 * - the per-framework marker components (`Teleport`, …) from the Solid adapter,
 * - the context primitives (`createContext`/`useContext`) remapped to Solid's
 *   own exports of the same names (Solid's `createContext` returns a real
 *   `Context` whose `.Provider` compiles to a genuine Solid component, unlike
 *   the neutral baseline's throw-on-call stub),
 * - and the type imports: `MpChild`/`MpElement` resolved to Solid's `JSX.Element`
 *   (imported as `import type { JSX } from 'solid-js'`), `MpProperties`/
 *   `MpRenderProperty` redirected to the co-located `./mp-jsx-types` module, and
 *   any remaining neutral types kept against `@mission-platform/jsx`.
 */

import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_CONTEXT_VALUES,
  NEUTRAL_FRAMEWORK_COMPONENTS,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
  type NeutralImports,
} from '../../compiler/ast.js';

import type { SolidPrimitiveUsage } from './signals.js';
import type ts from 'typescript';

/** The `@mission-platform/jsx/solid` subpath the Solid framework components are imported from. */
const SOLID_ADAPTER_MODULE = '@mission-platform/jsx/solid';

/** Neutral element type names resolved to Solid's `JSX.Element`. */
export const SOLID_ELEMENT_TYPE_NAMES: ReadonlySet<string> = new Set(['MpChild', 'MpElement']);

/** Build the `solid-js` value import + type imports that replace the neutral import. */
export function buildSolidImports(
  factory: ts.NodeFactory,
  neutral: NeutralImports,
  usage: SolidPrimitiveUsage,
): ts.ImportDeclaration[] {
  const imports: ts.ImportDeclaration[] = [];

  // SolidJS reactive primitives the rewritten body now references.
  const primitiveNames: string[] = [];
  if (usage.createSignal) primitiveNames.push('createSignal');
  if (usage.createMemo) primitiveNames.push('createMemo');
  if (usage.createEffect) primitiveNames.push('createEffect');
  if (usage.onMount) primitiveNames.push('onMount');
  if (usage.createUniqueId) primitiveNames.push('createUniqueId');
  if (usage.mergeProps) primitiveNames.push('mergeProps');
  if (primitiveNames.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            primitiveNames.map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
          ),
        ),
        factory.createStringLiteral('solid-js'),
      ),
    );
  }

  // Explicit hyperscript `h(…)` calls resolve to Solid's runtime hyperscript.
  // `solid-js/h` ships `h` as its **default** export (`export default h`), so it
  // must be imported as a default binding — a named `{ h }` import fails with
  // `Module '"solid-js/h"' has no exported member 'h'`.
  if (neutral.values.includes('h')) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(false, factory.createIdentifier('h'), undefined),
        factory.createStringLiteral('solid-js/h'),
      ),
    );
  }

  // Framework-agnostic runtime utilities (`classNames`) keep their neutral import.
  const runtimeValues = neutral.values.filter((name) => NEUTRAL_RUNTIME_VALUES.has(name));
  if (runtimeValues.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            runtimeValues.map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
          ),
        ),
        factory.createStringLiteral(NEUTRAL_MODULE),
      ),
    );
  }

  // Per-framework marker components (`Teleport`, `Transition`, …) from the Solid adapter.
  const adapterComponents = neutral.values.filter((name) => NEUTRAL_FRAMEWORK_COMPONENTS.has(name));
  if (adapterComponents.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            adapterComponents.map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
          ),
        ),
        factory.createStringLiteral(SOLID_ADAPTER_MODULE),
      ),
    );
  }

  // Context primitives (`createContext`/`useContext`) are remapped to Solid's
  // own exports of the same names — mirroring the component emitter, a
  // composable/context module may create or read a context just like a
  // component. Unlike Vue (whose neutral pair is remapped to a bespoke
  // `provide`/`inject` adapter), Solid's own `createContext`/`useContext`
  // already have the exact neutral signatures, so no adapter is needed.
  const contextValues = neutral.values.filter((name) => NEUTRAL_CONTEXT_VALUES.has(name));
  if (contextValues.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            contextValues.map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
          ),
        ),
        factory.createStringLiteral('solid-js'),
      ),
    );
  }

  // `MpChild` / `MpElement` → Solid's `JSX.Element` (references rewritten in the
  // body pass); import the `JSX` namespace type from `solid-js`.
  const usesSolidElementType = neutral.types.some((name) => SOLID_ELEMENT_TYPE_NAMES.has(name));
  if (usesSolidElementType) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          true,
          undefined,
          factory.createNamedImports([
            factory.createImportSpecifier(false, undefined, factory.createIdentifier('JSX')),
          ]),
        ),
        factory.createStringLiteral('solid-js'),
      ),
    );
  }

  // Render/props primitives resolve to the co-located per-framework module.
  const localTypeNames = neutral.types.filter((name) => LOCAL_JSX_TYPE_NAMES.has(name));
  if (localTypeNames.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          true,
          undefined,
          factory.createNamedImports(
            localTypeNames.map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
          ),
        ),
        factory.createStringLiteral(LOCAL_JSX_TYPES_MODULE),
      ),
    );
  }

  // Any remaining neutral type import (neither an element type nor a local
  // render/props primitive, and not a compile-time marker) stays neutral.
  const neutralTypes = neutral.types.filter(
    (name) =>
      !SOLID_ELEMENT_TYPE_NAMES.has(name) && !LOCAL_JSX_TYPE_NAMES.has(name) && !NEUTRAL_COMPILE_TIME_MARKERS.has(name),
  );
  if (neutralTypes.length > 0) {
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          true,
          undefined,
          factory.createNamedImports(
            neutralTypes.map((name) => factory.createImportSpecifier(false, undefined, factory.createIdentifier(name))),
          ),
        ),
        factory.createStringLiteral(NEUTRAL_MODULE),
      ),
    );
  }

  return imports;
}
