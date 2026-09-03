/**
 * The Jekyll CMS target.
 *
 * Jekyll is the odd target in the family: it has no client runtime to hydrate
 * into, so `island` is `'none'` and no `supportedFrameworks` restriction is
 * declared — the emitted artifacts are Liquid, which is framework-agnostic, and
 * the bound `FrameworkOutputPlugin` only decides which per-framework directory
 * the build writes alongside them. The target therefore contributes no build
 * adapters of its own: the shared helpers already apply the bound plugin's
 * stage plugins, and Liquid needs nothing bundled.
 *
 * Two emitters carry the whole projection — one include per component, and the
 * pair of aggregates (`_data/forge-components.yml`, `_config.yml`) that make
 * those includes discoverable. There is deliberately no `emitSchema` (Jekyll
 * has no per-component schema file) and no `emitEntry` (Liquid has no module
 * entry, so the shared driver writes its placeholder instead).
 */
import { defineForgeCmsPlugin } from "@mission-platform/forge-cms-plugin-api";

import { emitComponentsData, emitJekyllConfig } from "./manifest.js";
import {
  DEFAULT_INCLUDE_NAMESPACE,
  emitLiquidInclude,
  includeFileName,
  jekyllDiagnostics,
} from "./template.js";

import type {
  CmsArtifact,
  CmsOutputPlugin,
  CmsTargetContext,
  ContentComponent,
} from "@mission-platform/forge-cms-plugin-api";
import type {
  FrameworkOutputPlugin,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The aggregate schema every generated site reads from `site.data`. */
export const COMPONENTS_DATA_FILE = "_data/forge-components.yml";

/** The configuration fragment a site merges into its own `_config.yml`. */
export const CONFIG_FILE = "_config.yml";

/** Options for {@link forgeJekyllCms}. */
export interface ForgeJekyllCmsOptions {
  /** The package the emitted includes are generated for. */
  packageName: string;
  /** The framework plugin the surrounding build compiles the components with. */
  plugin: FrameworkOutputPlugin;
  /**
   * The `_includes` sub-directory the partials live in, defaulting to `forge`.
   *
   * Jekyll's `_includes` is a single flat namespace shared with the site's own
   * partials, so generated files are kept behind a prefix a site owner can
   * change when it would otherwise collide.
   */
  includeNamespace?: string;
}

/** Bind Jekyll (Liquid) projection to a caller-owned framework output plugin. */
export function forgeJekyllCms(
  options: ForgeJekyllCmsOptions,
): CmsOutputPlugin {
  const {
    packageName,
    plugin,
    includeNamespace = DEFAULT_INCLUDE_NAMESPACE,
  } = options;

  return defineForgeCmsPlugin({
    id: "jekyll",
    framework: plugin,
    packageName,
    island: "none",

    emitTemplate(
      component: ContentComponent,
      ir: SemanticModule,
      context: CmsTargetContext,
    ): CmsArtifact {
      context.diagnostics.push(...jekyllDiagnostics(ir, component));
      return {
        fileName: includeFileName(component, includeNamespace),
        contents: emitLiquidInclude(component, includeNamespace),
        artifactKind: "template",
        asset: true,
      };
    },

    emitManifest(
      components: readonly ContentComponent[],
    ): readonly CmsArtifact[] {
      return [
        {
          fileName: COMPONENTS_DATA_FILE,
          contents: emitComponentsData(components, includeNamespace),
          artifactKind: "manifest",
          asset: true,
        },
        {
          fileName: CONFIG_FILE,
          contents: emitJekyllConfig(components, includeNamespace),
          artifactKind: "manifest",
          asset: true,
        },
      ];
    },

    build: {},
  });
}
