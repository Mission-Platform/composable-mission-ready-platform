/**
 * `@mission-platform/forge-cms-astro`
 *
 * The Astro CMS target for Forge components. Bind it to whichever framework
 * plugin should hydrate the interactive components:
 *
 * ```ts
 * defineTsdownForgeCms({
 *   rootDir: import.meta.dirname,
 *   target: forgeAstroCms({ packageName: '@acme/components', plugin: forgeVueFramework() }),
 * });
 * ```
 *
 * Presentational components become static `.astro` templates; components whose
 * neutral IR carries state, refs, effects, or events import the co-generated
 * island and render it with `client:load`.
 */
export { forgeAstroCms, type ForgeAstroCmsOptions } from "./astro.js";

export { emitContentConfig, fieldToZod } from "./collections.js";

export {
  astroDiagnostics,
  astroMarkup,
  emitIslandAstroTemplate,
  emitStaticAstroTemplate,
} from "./template.js";
