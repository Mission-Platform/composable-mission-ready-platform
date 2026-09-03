/**
 * `@mission-platform/forge-cms-plugin-api`
 *
 * The shared layer every Forge **CMS target** is built on. It owns three
 * things:
 *
 * 1. the platform-neutral **content model** — `analyzeContentComponent` turns a
 *    neutral component module into ordered {@link ContentField}s with a kind, a
 *    description, a default, and slot metadata;
 * 2. the **target contract** — `defineForgeCmsPlugin` validates a
 *    {@link CmsOutputPlugin}, which composes an existing
 *    `FrameworkOutputPlugin` rather than replacing it;
 * 3. the generic **driver and build helpers** that discover components, obtain
 *    the neutral IR once per component, call the target's emitters, and write
 *    the resulting artifacts under `dist/cms/<cms>/<framework>/`.
 *
 * A new platform is therefore an additive package: implement the contract, pass
 * an instance to `defineTsdownForgeCms`, and the driver does the rest.
 */
export {
  contentFields,
  slotFields,
  type ContentComponent,
  type ContentComponentMetadata,
  type ContentComponentNames,
  type ContentComponentNamesInput,
  type ContentDefaultValue,
  type ContentField,
  type ContentFieldKind,
  type ContentFieldKindName,
} from "./content-model.js";

export {
  ASSET_TYPE_REFERENCES,
  LINK_TYPE_REFERENCES,
  RICHTEXT_TYPE_REFERENCES,
  SLOT_TYPE_REFERENCES,
  classifyType,
  collectTypeAliases,
  type ClassifiedFieldKind,
} from "./classify.js";

export {
  CMS_COLOR_TAG,
  CMS_COLOUR_TAG,
  CMS_ICON_TAG,
  CMS_SETTING_TAG,
  CMS_TAB_TAG,
  DEFAULT_SLOT_FIELD,
  analyzeContentComponent,
  deriveContentComponentNames,
  isInteractiveModule,
} from "./analyze.js";

export { toDisplayName, toKebabName, toTechnicalName } from "./names.js";

export {
  cmsTargetDirectory,
  defineForgeCmsPlugin,
  type CmsArtifact,
  type CmsArtifactKind,
  type CmsIslandStrategy,
  type CmsOutputPlugin,
  type CmsTargetContext,
  type CmsTargetId,
} from "./cms.js";

export {
  ISLAND_DIRECTORY,
  generateIsland,
  type GeneratedIsland,
  type GenerateIslandOptions,
} from "./island.js";

export {
  generateCmsArtifacts,
  type GeneratedCmsTree,
  type GenerateCmsArtifactsOptions,
} from "./driver.js";

export {
  cmsCacheDirectory,
  cmsOutputDirectory,
  defineTsdownForgeCms,
  defineTsdownForgeCmsAll,
  resolveComponentsModule,
  type TsdownForgeCmsAllOptions,
  type TsdownForgeCmsOptions,
} from "./tsdown.js";

export {
  defineViteForgeCmsLibrary,
  type ViteForgeCmsLibraryOptions,
} from "./config.js";
