/**
 * Import rewriting for the SolidJS target.
 *
 * The generic AST carries every import as a record (`GenericImport`) plus its
 * exact source text, so the import block is rebuilt from those records rather
 * than by transforming import declarations. Four rules apply:
 *
 * - the neutral `@mission-platform/forge` import is **split**: the reactive
 *   primitives the lowered body now uses come from `solid-js`, an explicit `h`
 *   from `solid-js/h`, the framework-agnostic runtime helpers (`classNames`)
 *   stay on the neutral package, the per-framework marker components come from
 *   the Solid adapter subpath, the context primitives are remapped to Solid's
 *   own `createContext`/`useContext`, and the types are resolved
 *   (`MpChild`/`MpElement` → `JSX` from `solid-js`, `MpRenderProperty` → the
 *   co-located `./mp-jsx-types`, everything else kept neutral);
 * - an `i18next` import gains a preceding `useI18n` import from
 *   `@mission-platform/i18n`, because `i18next.t(…)` is lowered to that hook's
 *   `t` binding;
 * - a relative sibling-component import is flattened to the generated tree's
 *   flat layout (`../widgets/card` → `./card`);
 * - every other import is carried through verbatim — a write-once,
 *   framework-split workspace package resolves through its `mp:solid` export
 *   condition.
 */
import {
  frameworkAdapterModule,
  LOCAL_JSX_TYPE_NAMES,
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_COMPILE_TIME_MARKERS,
  NEUTRAL_CONTEXT_VALUES,
  NEUTRAL_FRAMEWORK_COMPONENTS,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import { SOLID_ELEMENT_TYPE_NAMES } from "../runtime/aliases.js";
import { CLASS_NAMES_HELPER } from "../runtime/markers.js";
import {
  I18N_MODULE,
  I18NEXT_MODULE,
  SOLID_HYPERSCRIPT_MODULE,
  SOLID_MODULE,
} from "../runtime/modules.js";

import type { SolidLoweringContext } from "./context.js";
import type {
  GenericImport,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The hyperscript binding a `<Dynamic>` lowers to. */
const HYPERSCRIPT_NAME = "h";

/**
 * Quote a module specifier the emitter synthesizes.
 *
 * Synthesized imports are double-quoted — the form the previous printer-based
 * emitter produced — while an import carried through verbatim keeps whatever
 * quotes its author wrote.
 */
function quoteSpecifier(source: string): string {
  return `"${source}"`;
}

/** The value and type names a module imports from the neutral package. */
export interface NeutralImportNames {
  readonly values: readonly string[];
  readonly types: readonly string[];
}

/** Read the value/type names imported from `@mission-platform/forge`. */
export function readNeutralImportNames(
  module: SemanticModule,
): NeutralImportNames {
  const values: string[] = [];
  const types: string[] = [];
  for (const entry of module.ast.imports) {
    if (entry.source !== NEUTRAL_MODULE) {
      continue;
    }
    if (entry.typeOnly) {
      types.push(...entry.valueNames, ...entry.typeNames);
      continue;
    }
    values.push(...entry.valueNames);
    types.push(...entry.typeNames);
  }
  return { values, types };
}

/** `import { a, b } from "source";`, or `undefined` when there is nothing to import. */
function namedImport(
  names: readonly string[],
  source: string,
  typeOnly = false,
): string | undefined {
  if (names.length === 0) {
    return undefined;
  }
  return `import ${typeOnly ? "type " : ""}{ ${names.join(", ")} } from ${quoteSpecifier(source)};`;
}

/** The `solid-js` primitives the lowered body references, in a stable order. */
function solidPrimitiveNames(context: SolidLoweringContext): string[] {
  const { usage } = context;
  const names: string[] = [];
  if (usage.createSignal) names.push("createSignal");
  if (usage.createMemo) names.push("createMemo");
  if (usage.createEffect) names.push("createEffect");
  if (usage.onMount) names.push("onMount");
  if (usage.onCleanup) names.push("onCleanup");
  if (usage.createUniqueId) names.push("createUniqueId");
  if (usage.mergeProps) names.push("mergeProps");
  return names;
}

/**
 * Build the import lines that replace the neutral import.
 *
 * The neutral names are filtered through the shared tables so a name the target
 * has no mapping for is never silently dropped: it stays on the neutral package.
 */
export function buildSolidImports(
  neutral: NeutralImportNames,
  context: SolidLoweringContext,
): string[] {
  const lines: string[] = [];
  const values = new Set(neutral.values);
  if (context.runtime.classNames) {
    values.add(CLASS_NAMES_HELPER);
  }
  if (context.runtime.dynamic) {
    values.add(HYPERSCRIPT_NAME);
  }

  const primitives = namedImport(solidPrimitiveNames(context), SOLID_MODULE);
  if (primitives !== undefined) {
    lines.push(primitives);
  }

  // `solid-js/h` ships `h` as its **default** export, so a named `{ h }` import
  // would fail to resolve.
  if (values.has(HYPERSCRIPT_NAME)) {
    lines.push(
      `import ${HYPERSCRIPT_NAME} from ${quoteSpecifier(SOLID_HYPERSCRIPT_MODULE)};`,
    );
  }

  const runtimeValues = [...values].filter((name) =>
    NEUTRAL_RUNTIME_VALUES.has(name),
  );
  const runtime = namedImport(runtimeValues, NEUTRAL_MODULE);
  if (runtime !== undefined) {
    lines.push(runtime);
  }

  const adapterComponents = [...values].filter((name) =>
    NEUTRAL_FRAMEWORK_COMPONENTS.has(name),
  );
  const adapter = namedImport(
    adapterComponents,
    frameworkAdapterModule("solid"),
  );
  if (adapter !== undefined) {
    lines.push(adapter);
  }

  // Solid's own `createContext`/`useContext` already have the neutral
  // signatures, so the pair is remapped rather than adapted.
  const contextValues = [...values].filter((name) =>
    NEUTRAL_CONTEXT_VALUES.has(name),
  );
  const contexts = namedImport(contextValues, SOLID_MODULE);
  if (contexts !== undefined) {
    lines.push(contexts);
  }

  if (neutral.types.some((name) => SOLID_ELEMENT_TYPE_NAMES.has(name))) {
    lines.push(`import type { JSX } from ${quoteSpecifier(SOLID_MODULE)};`);
  }

  const localTypes = namedImport(
    neutral.types.filter((name) => LOCAL_JSX_TYPE_NAMES.has(name)),
    LOCAL_JSX_TYPES_MODULE,
    true,
  );
  if (localTypes !== undefined) {
    lines.push(localTypes);
  }

  const neutralTypes = namedImport(
    neutral.types.filter(
      (name) =>
        !SOLID_ELEMENT_TYPE_NAMES.has(name) &&
        !LOCAL_JSX_TYPE_NAMES.has(name) &&
        !NEUTRAL_COMPILE_TIME_MARKERS.has(name),
    ),
    NEUTRAL_MODULE,
    true,
  );
  if (neutralTypes !== undefined) {
    lines.push(neutralTypes);
  }

  return lines;
}

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`). */
export function flattenSiblingSpecifier(specifier: string): string {
  const segments = specifier
    .split("/")
    .filter(
      (segment) => segment !== "." && segment !== ".." && segment.length > 0,
    );
  return `./${segments.at(-1) ?? specifier}`;
}

/** Re-point an import's source without touching the rest of its source text. */
function withSource(entry: GenericImport, source: string): string {
  const quoted = new RegExp(
    `(['"\`])${entry.source.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\1`,
  );
  return entry.text.replace(quoted, quoteSpecifier(source));
}

/**
 * Print the whole import block for a lowered module: the neutral import split,
 * the i18n hook injection, sibling flattening and every other import verbatim.
 */
export function printSolidImports(
  module: SemanticModule,
  context: SolidLoweringContext,
): string[] {
  const neutral = readNeutralImportNames(module);
  const lines: string[] = [];
  let neutralEmitted = false;
  for (const entry of module.ast.imports) {
    if (entry.source === NEUTRAL_MODULE) {
      if (!neutralEmitted) {
        lines.push(...buildSolidImports(neutral, context));
        neutralEmitted = true;
      }
      continue;
    }
    if (entry.source === I18NEXT_MODULE) {
      lines.push(
        `import { useI18n } from ${quoteSpecifier(I18N_MODULE)};`,
        entry.text,
      );
      continue;
    }
    lines.push(
      entry.source.startsWith(".")
        ? withSource(entry, flattenSiblingSpecifier(entry.source))
        : entry.text,
    );
  }
  // A module that never imported the neutral package may still need Solid
  // primitives — a `useState` reached it through a sibling module's re-export,
  // or the lowering itself introduced `classNames` / `h`.
  if (!neutralEmitted) {
    lines.unshift(...buildSolidImports(neutral, context));
  }
  return lines;
}
