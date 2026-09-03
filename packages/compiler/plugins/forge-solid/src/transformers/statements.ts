/**
 * Statement-level lowering for the SolidJS target.
 *
 * A `GenericStatement` carries its exact source text plus the JSX roots nested
 * inside it, which is everything needed to lower it: each root is re-printed as
 * Solid markup and substituted back into the text, then the remaining neutral
 * constructs and the reactive rewrites are applied. Module declarations and
 * component body statements go through the same path — only the `return`
 * statement is printed separately, from `component.returnNode`.
 */
import { lowerStatementWithRenderNodes } from "./jsx.js";

import type { SolidLoweringContext } from "./context.js";
import type { GenericStatement } from "@mission-platform/forge-plugin-api";

/** The `useI18n()` binding injected into components that translate. */
export const I18N_HOOK_STATEMENT = "const { t } = useI18n();";

/** Lower one statement, printed at `baseIndent` columns. */
export function lowerStatement(
  statement: GenericStatement,
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  return lowerStatementWithRenderNodes(
    statement.text.text,
    statement.renderNodes,
    context,
    baseIndent,
  );
}

/** Whether the source text already destructures the `useI18n()` hook. */
export function callsUseI18n(text: string): boolean {
  return /\buseI18n\s*\(/.test(text);
}
