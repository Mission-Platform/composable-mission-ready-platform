/**
 * Web-Components hook-module emitter for the Stage-1 compiler.
 *
 * A neutral hook library — a plain composable, or a plain context module such
 * as a `createContext`/`useContext` pair — carries no markup and no
 * custom-element class, so it is emitted as a plain, importable `.ts` module
 * rather than a `ForgeElement` subclass. The neutral React-style hooks
 * (`useState`/`useRef`/`useEffect`/…) and the context primitives
 * (`createContext`/`useContext`) are the framework-neutral runtime baseline —
 * deliberately render-once, side-effect-free implementations (see
 * `@mission-platform/forge-jsx`'s `runtime/hooks.ts` / `runtime/context.ts`) — which
 * stay perfectly valid, non-throwing glue for a plain `.ts` composable/context
 * module, so they are kept against the neutral package rather than remapped to
 * a bespoke Web-Components mechanism, mirroring how the React target needs no
 * bespoke hook emitter either (a neutral hook module already *is* a React one).
 *
 * Like the component emitter, this pass reads only the generic AST records, so
 * what it rewrites is limited to imports:
 * - a pure compile-time marker (`Slot`/`Dynamic`/`hasSlot`) is dropped — a hook
 *   module carries no markup, so one can never legitimately appear, but it must
 *   never be forwarded to a target with no matching import either;
 * - the render type primitives (`MpRenderProperty`) redirect to the co-located
 *   per-framework `./mp-jsx-types` module, mirroring the component emitter;
 * - a relative **sibling** import (a fellow composable/context module, e.g.
 *   `import { MapContext } from '../components/map-context'`) is flattened to
 *   the generated tree's flat layout (`./map-context`), exactly like the
 *   component emitter's sibling imports.
 *
 * Every other statement (interfaces, type aliases, the composable/context
 * declarations themselves) is carried over verbatim from its source text.
 */
import {
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_MODULE,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import type {
  GenericImport,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`). */
function flattenSiblingSpecifier(specifier: string): string {
  const segments = specifier
    .split("/")
    .filter(
      (segment) => segment !== "." && segment !== ".." && segment.length > 0,
    );
  return `./${segments.at(-1) ?? specifier}`;
}

/** An import statement's source text, terminated so it can be joined with the rest of the module. */
function importStatementText(entry: GenericImport): string {
  const text = entry.text.trim();
  return text.endsWith(";") ? text : `${text};`;
}

/**
 * Swap an import statement's module specifier while preserving its clause
 * verbatim — aliases (`{ a as b }`) and inline `type` markers survive, which a
 * clause rebuilt from the generic name lists could not express.
 */
function withSpecifier(entry: GenericImport, specifier: string): string {
  const text = importStatementText(entry);
  return text.replace(/(['"])(?:[^'"]*)\1(\s*;)$/, `'${specifier}'$2`);
}

/**
 * Build the replacement for the neutral `@mission-platform/forge-jsx` import: the
 * pure compile-time markers are dropped, every other value (hooks, context
 * primitives, runtime utilities) stays imported from the neutral package,
 * `MpRenderProperty` redirects to the co-located
 * {@link LOCAL_JSX_TYPES_MODULE}, and any remaining neutral type stays imported
 * neutrally.
 */
function rewriteNeutralImport(entry: GenericImport): string[] {
  const lines: string[] = [];
  const values = entry.valueNames.filter(
    (name) => !NEUTRAL_COMPILE_TIME_MARKERS.has(name),
  );
  if (values.length > 0) {
    lines.push(`import { ${values.join(", ")} } from '${NEUTRAL_MODULE}';`);
  }
  const localTypes = entry.typeNames.filter((name) =>
    LOCAL_JSX_TYPE_NAMES.has(name),
  );
  if (localTypes.length > 0) {
    lines.push(
      `import type { ${localTypes.join(", ")} } from '${LOCAL_JSX_TYPES_MODULE}';`,
    );
  }
  const neutralTypes = entry.typeNames.filter(
    (name) => !LOCAL_JSX_TYPE_NAMES.has(name),
  );
  if (neutralTypes.length > 0) {
    lines.push(
      `import type { ${neutralTypes.join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  return lines;
}

/** Transform a neutral hook module into its Web-Components source. */
export function emitWebComponentHookModule(module: SemanticModule): string {
  const { ast } = module;
  const lines: string[] = [];

  for (const entry of ast.imports) {
    if (entry.source === NEUTRAL_MODULE) {
      lines.push(...rewriteNeutralImport(entry));
      continue;
    }
    lines.push(
      entry.source.startsWith(".")
        ? withSpecifier(entry, flattenSiblingSpecifier(entry.source))
        : importStatementText(entry),
    );
  }

  for (const declaration of ast.declarations) {
    lines.push("", declaration.text.text);
  }

  return `${lines.join("\n")}\n`;
}
