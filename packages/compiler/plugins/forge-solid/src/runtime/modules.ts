/**
 * Module specifiers the SolidJS target emits imports against.
 *
 * The neutral `@mission-platform/forge-jsx` import is split across these modules by
 * `../transformers/imports.ts`: the reactive primitives and the `JSX` namespace
 * type come from `solid-js`, the hyperscript factory from `solid-js/h`, the
 * per-framework marker components from the Solid adapter subpath, and the
 * framework-agnostic runtime helpers stay on the neutral package.
 */
import { frameworkAdapterModule } from "@mission-platform/forge-plugin-api/compiler/ast.js";

/** The SolidJS runtime the reactive primitives and the `JSX` types come from. */
export const SOLID_MODULE = "solid-js";

/**
 * The hyperscript entry point. `solid-js/h` ships `h` as its **default** export,
 * so a `<Dynamic>` lowered to `h(…)` must import it as a default binding.
 */
export const SOLID_HYPERSCRIPT_MODULE = "solid-js/h";

/** The Forge adapter subpath the Solid framework components are imported from. */
export const SOLID_ADAPTER_MODULE = frameworkAdapterModule("solid");

/** The i18n package providing the `useI18n()` hook injected for `i18next.t(…)` callers. */
export const I18N_MODULE = "@mission-platform/i18n";

/** The module whose presence marks a component as an `i18next` consumer. */
export const I18NEXT_MODULE = "i18next";
