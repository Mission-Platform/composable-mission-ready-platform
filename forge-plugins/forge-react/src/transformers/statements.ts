/**
 * Statement-level lowering for the React target.
 *
 * A `GenericStatement` carries its exact source text plus the JSX roots nested
 * inside it, which is everything needed to lower it: each root is re-printed as
 * React markup and substituted back into the text, then the remaining neutral
 * expression constructs are rewritten. Module declarations and component body
 * statements go through the same path.
 */
import { lowerTextWithRenderNodes } from "./jsx.js";

import type { ReactLoweringContext } from "./context.js";
import type { GenericStatement } from "@mission-platform/forge-plugin-api";

/** The `useI18n()` binding injected into components that translate. */
export const I18N_HOOK_STATEMENT = "const { t } = useI18n();";

/** Lower one statement, printed at `baseIndent` columns. */
export function lowerStatement(
  statement: GenericStatement,
  context: ReactLoweringContext,
  baseIndent: number,
): string {
  return lowerTextWithRenderNodes(
    statement.text.text,
    statement.renderNodes,
    context,
    baseIndent,
  );
}

/** Whether the neutral source text calls `i18next.t(…)`. */
export function usesTranslation(text: string): boolean {
  return /\bi18next\s*\.\s*t\s*\(/.test(text);
}

/** Whether the source text already destructures the `useI18n()` hook. */
export function callsUseI18n(text: string): boolean {
  return /\buseI18n\s*\(/.test(text);
}
