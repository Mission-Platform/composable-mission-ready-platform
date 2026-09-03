/**
 * `@mission-platform/forge-cms-webflow`
 *
 * The **Webflow** CMS target for Forge components. Bind it to the React output
 * plugin — Webflow renders through `@webflow/react` and nothing else:
 *
 * ```ts
 * defineTsdownForgeCms({
 *   rootDir: import.meta.dirname,
 *   target: forgeWebflowCms({ packageName: '@acme/components', plugin: forgeReactFramework() }),
 * });
 * ```
 *
 * Every component becomes one `<PublicName>.webflow.tsx` **Code Component**
 * declaration wrapping the co-generated React island, plus a `webflow.json`
 * library fragment whose glob points at the built declarations. Code Components
 * are used rather than Designer-API definitions because the Designer API cannot
 * create component properties, and a component library without authorable props
 * is not a component library.
 */
export {
  WEBFLOW_RUNTIME_EXTERNALS,
  forgeWebflowCms,
  type ForgeWebflowCmsOptions,
} from "./webflow.js";

export {
  DEFAULT_ISLAND_ENTRY,
  DEFAULT_WEBFLOW_GROUP,
  declarationFileName,
  emitWebflowDeclaration,
  webflowDeclarationDiagnostics,
  webflowDescription,
  webflowDisplayName,
  webflowPropertyName,
  webflowPropertyType,
  type WebflowDeclarationOptions,
  type WebflowPropertyType,
} from "./declaration.js";

export { FORGE_WEBFLOW_NUMBER_AS_TEXT, webflowWarning } from "./diagnostics.js";

export { emitWebflowEntry, entryExportName } from "./entry.js";

export {
  DEFAULT_WEBFLOW_LIBRARY_NAME,
  WEBFLOW_LIBRARY_MANIFEST,
  buildWebflowManifest,
  emitWebflowManifest,
  webflowComponentsGlob,
  type WebflowLibrary,
  type WebflowManifest,
} from "./manifest.js";
