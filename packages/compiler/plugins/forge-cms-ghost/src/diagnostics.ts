/**
 * The diagnostics the Ghost target reports.
 *
 * Ghost is the most constrained target Forge projects onto: its themes are
 * Handlebars, its only dynamic vocabulary is the `config.custom` settings block,
 * and that block accepts five types and at most twenty entries. None of those
 * limits is a compiler failure — a theme that renders a number as text or drops
 * the twenty-first setting is still a working theme — so every code below is
 * raised as a `warning`. The shared driver aborts a build on `error`, and
 * aborting because Ghost cannot express a numeric setting would make the target
 * unusable for exactly the component libraries it exists to serve.
 */
import type { CompilerDiagnostic } from "@mission-platform/forge-plugin-api";

/** A field kind Ghost cannot express natively; it degrades to rendered text. */
export const FORGE_GHOST_FIELD_UNSUPPORTED = "FORGE_GHOST_FIELD_UNSUPPORTED";

/** More `@cmsSetting` fields were projected than Ghost's `config.custom` allows. */
export const FORGE_GHOST_SETTING_LIMIT = "FORGE_GHOST_SETTING_LIMIT";

/** Build a generation-phase warning; the Ghost target never emits errors. */
export function ghostWarning(
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
