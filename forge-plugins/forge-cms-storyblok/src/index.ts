/**
 * `@mission-platform/forge-cms-storyblok`
 *
 * The Storyblok CMS target for Forge components. Pass a framework output plugin
 * to {@link forgeStoryblokCms} and hand the result to `defineTsdownForgeCms`:
 *
 * ```ts
 * defineTsdownForgeCmsAll({
 *   rootDir,
 *   targets: [
 *     forgeStoryblokCms({ packageName, plugin: forgeReactFramework(), storyblokRuntime: '@storyblok/react' }),
 *     forgeStoryblokCms({ packageName, plugin: forgeVueFramework(), storyblokRuntime: '@storyblok/vue' }),
 *   ],
 *   componentsModule,
 * });
 * ```
 *
 * The output lands in `dist/cms/storyblok/<framework>/**` with the schema JSON
 * and `components.json` mirrored into `dist/cms/storyblok/`.
 */
export {
  forgeStoryblokCms,
  type ForgeStoryblokCmsOptions,
} from "./storyblok.js";

export {
  analyzeStoryblokComponent,
  contentFieldToStoryblokField,
  contentKindToStoryblokFieldType,
  emitStoryblokComponent,
  toStoryblokComponent,
} from "./fields.js";

export {
  emitBlokDataType,
  emitStoryblokBlokWrapper,
  type StoryblokBlokWrapperOptions,
} from "./wrappers.js";

export type {
  AnalyzedField,
  AnalyzedStoryblokComponent,
  StoryblokComponent,
  StoryblokComponentNames,
  StoryblokFieldType,
  StoryblokSchemaField,
} from "./types.js";
