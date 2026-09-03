/**
 * `@mission-platform/forge-cms-jekyll`
 *
 * The Jekyll (Liquid) CMS target for Forge components. Bind it to whichever
 * framework plugin the surrounding build compiles the components with:
 *
 * ```ts
 * defineTsdownForgeCms({
 *   rootDir: import.meta.dirname,
 *   target: forgeJekyllCms({ packageName: '@acme/components', plugin: forgeVueFramework() }),
 * });
 * ```
 *
 * Every component becomes one `_includes/<namespace>/<name>.html` partial whose
 * defaults are bound with Liquid's `default:` filter, plus two aggregates —
 * `_data/forge-components.yml` (the schema a site reads from `site.data`) and a
 * `_config.yml` fragment registering the namespace and those same defaults.
 */
export {
  COMPONENTS_DATA_FILE,
  CONFIG_FILE,
  forgeJekyllCms,
  type ForgeJekyllCmsOptions,
} from "./jekyll.js";

export {
  emitComponentsData,
  emitJekyllConfig,
  fieldToJekyllType,
  yamlScalar,
  type JekyllFieldType,
} from "./manifest.js";

export {
  DEFAULT_INCLUDE_NAMESPACE,
  emitLiquidInclude,
  includeFileName,
  includePath,
  jekyllDiagnostics,
  liquidLiteral,
} from "./template.js";
