/**
 * The diagnostics the Webflow target reports.
 *
 * Webflow's authoring vocabulary is a closed set of prop types, and exactly one
 * neutral kind has no counterpart in it: there is no numeric prop, so a
 * `number` field has to be authored as text. That is a *degradation*, not a
 * failure — the component still renders and the Designer still exposes the prop
 * — so it is raised as a `warning`. The shared driver aborts a build on
 * `error`, and refusing to build a component library because one prop counts
 * things would make the target unusable for the very libraries it exists to
 * publish.
 *
 * The React-only restriction is deliberately *not* a diagnostic: it is enforced
 * by `defineForgeCmsPlugin`, which throws a `TypeError` at configuration time
 * because binding Webflow to a Vue plugin cannot be degraded into anything
 * useful.
 */
import type { CompilerDiagnostic } from "@mission-platform/forge-plugin-api";

/** A numeric field was authored as a Webflow text prop; Webflow has no numeric type. */
export const FORGE_WEBFLOW_NUMBER_AS_TEXT = "FORGE_WEBFLOW_NUMBER_AS_TEXT";

/** Build a generation-phase warning; the Webflow target never emits errors. */
export function webflowWarning(
  code: string,
  message: string,
  fileName: string,
): CompilerDiagnostic {
  return {
    phase: "generation",
    severity: "warning",
    code,
    message,
    fileName,
  };
}
