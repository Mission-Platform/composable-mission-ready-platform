/**
 * Import rewriting for the React target.
 *
 * The neutral `@mission-platform/jsx` import is split into a value import from
 * `react` (`h` → `createElement`, `Fragment`, and the hooks, which *are* React's
 * own) and a type-only import kept against the neutral package. Neutral types
 * with a first-class React equivalent (`MpChild` → `ReactNode`) are instead
 * imported from `react` under their React name. Framework-agnostic runtime
 * utilities (e.g. `classNames`) keep their neutral import.
 */
import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_FRAMEWORK_COMPONENTS,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
  REACT_ADAPTER_MODULE,
  REACT_TYPE_ALIASES,
  type NeutralImports,
} from '../../compiler/ast.js';

import type ts from 'typescript';

/** Build the `import … from 'react'` + `import type … from '@mission-platform/jsx'` replacements. */
export function buildReactImports(factory: ts.NodeFactory, neutral: NeutralImports): ts.ImportDeclaration[] {
  const imports: ts.ImportDeclaration[] = [];

  // Framework-agnostic runtime utilities (e.g. `classNames`) behave identically
  // on React, so their neutral-package import is preserved verbatim.
  const runtimeValues = neutral.values.filter((name) => NEUTRAL_RUNTIME_VALUES.has(name));
  // The remaining value imports (`h`, the hooks) are React's own — but compile-time
  // markers (`Slot`) are consumed by the rewrite and must not be imported at all,
  // and per-framework components (`Teleport`) are imported from the React adapter.
  const frameworkValues = neutral.values.filter(
    (name) =>
      !NEUTRAL_RUNTIME_VALUES.has(name) &&
      !NEUTRAL_COMPILE_TIME_MARKERS.has(name) &&
      !NEUTRAL_FRAMEWORK_COMPONENTS.has(name),
  );
  // Per-framework components (`Teleport`) are imported from `@mission-platform/jsx/react`.
  const adapterComponents = neutral.values.filter((name) => NEUTRAL_FRAMEWORK_COMPONENTS.has(name));

  if (frameworkValues.length > 0) {
    const specifiers = frameworkValues.map((name) =>
      name === 'h'
        ? factory.createImportSpecifier(false, factory.createIdentifier('createElement'), factory.createIdentifier('h'))
        : factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
    );
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral('react'),
      ),
    );
  }

  if (adapterComponents.length > 0) {
    const specifiers = adapterComponents.map((name) =>
      factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
    );
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral(REACT_ADAPTER_MODULE),
      ),
    );
  }

  if (runtimeValues.length > 0) {
    const specifiers = runtimeValues.map((name) =>
      factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
    );
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral(NEUTRAL_MODULE),
      ),
    );
  }

  // Neutral types with a first-class React equivalent (e.g. `MpChild` →
  // `ReactNode`) are imported from `react` under their React name; the emitter
  // renames every reference accordingly.
  const reactTypeNames = [
    ...new Set(
      neutral.types.filter((name) => REACT_TYPE_ALIASES[name] !== undefined).map((name) => REACT_TYPE_ALIASES[name]),
    ),
  ];
  // The render/props primitives (`MpProperties`, `MpRenderProperty`) have no
  // single React equivalent to alias to, but each build ships a co-located
  // module (`./mp-jsx-types`) defining their React variant, so they are imported
  // from there rather than from the neutral package — leaving no neutral
  // render/props type import in the generated source.
  const localTypeNames = neutral.types.filter((name) => LOCAL_JSX_TYPE_NAMES.has(name));
  // Anything else with neither a React alias nor a local variant stays a neutral type import.
  const neutralTypes = neutral.types.filter(
    (name) => REACT_TYPE_ALIASES[name] === undefined && !LOCAL_JSX_TYPE_NAMES.has(name),
  );

  if (reactTypeNames.length > 0) {
    const specifiers = reactTypeNames.map((name) =>
      factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
    );
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(true, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral('react'),
      ),
    );
  }

  if (localTypeNames.length > 0) {
    const specifiers = localTypeNames.map((name) =>
      factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
    );
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(true, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral(LOCAL_JSX_TYPES_MODULE),
      ),
    );
  }

  if (neutralTypes.length > 0) {
    const specifiers = neutralTypes.map((name) =>
      factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
    );
    imports.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(true, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral(NEUTRAL_MODULE),
      ),
    );
  }

  return imports;
}
