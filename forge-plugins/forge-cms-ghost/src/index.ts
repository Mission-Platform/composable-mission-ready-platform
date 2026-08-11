/**
 * `@mission-platform/forge-cms-ghost`
 *
 * The **Ghost** CMS target for Forge components: every neutral component is
 * projected onto a Handlebars partial under `partials/forge/`, documented by a
 * `forge-components.json` parameter contract, and any `@cmsSetting`-tagged prop
 * is surfaced in Ghost Admin through a `ghost-theme-config.json` fragment.
 */
export { forgeGhostCms, type ForgeGhostCmsOptions } from "./ghost.js";

export {
  FORGE_GHOST_FIELD_UNSUPPORTED,
  FORGE_GHOST_SETTING_LIMIT,
  ghostWarning,
} from "./diagnostics.js";

export {
  DEFAULT_GHOST_THEME_NAME,
  GHOST_COMPONENTS_MANIFEST,
  GHOST_SETTING_LIMIT,
  GHOST_THEME_CONFIG_MANIFEST,
  buildGhostThemeConfig,
  emitGhostComponentsManifest,
  emitGhostThemeConfig,
  ghostSettingType,
  toGhostComponentEntry,
  type GhostComponentEntry,
  type GhostComponentsManifest,
  type GhostParameter,
  type GhostSetting,
  type GhostSettingType,
  type GhostSlot,
  type GhostThemeConfig,
} from "./manifest.js";

export {
  emitGhostPartial,
  ghostPartialFileName,
  ghostPartialName,
  ghostTemplateDiagnostics,
} from "./template.js";
