/**
 * Import construction for the React target.
 *
 * The neutral `@mission-platform/forge` import is split into the imports the
 * generated module actually needs, exactly as the lowering plan resolved them:
 * a value import from `react` (`h` → `createElement`, `Fragment`, the hooks,
 * which *are* React's own), the React adapter import for the per-framework
 * components (`Teleport`), the retained neutral import for framework-agnostic
 * helpers (`classNames`), and the type imports — React's own (`ReactNode`), the
 * co-located per-framework variants (`MpRenderProperty`) and whatever neutral
 * type has neither.
 */
import {
  LOCAL_JSX_TYPES_MODULE,
  NEUTRAL_MODULE,
  REACT_ADAPTER_MODULE,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import {
  I18N_HOOK,
  I18N_MODULE,
  REACT_MODULE,
  type ReactImportPlan,
} from "../lower.js";
import { quoteString } from "../transformers/source-text.js";

/** React's own name for the neutral render factory, aliased back to `h` on import. */
const CREATE_ELEMENT = "createElement";

/** The neutral render factory the emitted `h(…)` calls keep using. */
const FACTORY_NAME = "h";

/** `import { a, b } from "source";`, or nothing when there is no name to import. */
function importLine(
  names: readonly string[],
  source: string,
  typeOnly = false,
): string | undefined {
  if (names.length === 0) {
    return undefined;
  }
  const specifiers = names.map((name) =>
    name === CREATE_ELEMENT ? `${CREATE_ELEMENT} as ${FACTORY_NAME}` : name,
  );
  return `import ${typeOnly ? "type " : ""}{ ${specifiers.join(", ")} } from ${quoteString(source)};`;
}

/** The import statements replacing the neutral one, in the plan's resolved order. */
export function buildReactImports(plan: ReactImportPlan): string[] {
  return [
    importLine(plan.values, REACT_MODULE),
    importLine(plan.adapterComponents, REACT_ADAPTER_MODULE),
    importLine(plan.runtimeValues, NEUTRAL_MODULE),
    importLine(plan.types, REACT_MODULE, true),
    importLine(plan.localTypes, LOCAL_JSX_TYPES_MODULE, true),
    importLine(plan.neutralTypes, NEUTRAL_MODULE, true),
  ].filter((line): line is string => line !== undefined);
}

/** The `useI18n` import a translating module needs beside its `i18next` import. */
export function buildI18nImport(): string {
  return `import { ${I18N_HOOK} } from ${quoteString(I18N_MODULE)};`;
}
