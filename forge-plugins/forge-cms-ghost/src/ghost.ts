/**
 * The Ghost CMS target.
 *
 * Ghost is the first Forge target with no JavaScript component model at all: a
 * theme is a folder of Handlebars templates, so there is nothing for a
 * framework runtime to hydrate and nothing to import. That shapes the whole
 * plugin — `island: 'none'`, no `emitSchema` (Ghost has no per-component schema;
 * the closest equivalent is the theme-wide `config.custom` block), and no
 * `emitEntry` (Handlebars has no module entry, so the shared driver's
 * placeholder `index.ts` is the honest answer).
 *
 * A framework plugin is still bound, because the CMS contract requires one and
 * because the same build keeps producing the framework components for every
 * other consumer. Ghost simply does not render through it, which is also why
 * `supportedFrameworks` is left unset: Handlebars output is identical whichever
 * plugin the caller passes.
 */
import { defineForgeCmsPlugin } from "@mission-platform/forge-cms-plugin-api";

import {
  DEFAULT_GHOST_THEME_NAME,
  GHOST_COMPONENTS_MANIFEST,
  GHOST_THEME_CONFIG_MANIFEST,
  emitGhostComponentsManifest,
  emitGhostThemeConfig,
} from "./manifest.js";
import {
  emitGhostPartial,
  ghostPartialFileName,
  ghostTemplateDiagnostics,
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

/** Options for {@link forgeGhostCms}. */
export interface ForgeGhostCmsOptions {
  /** The package the emitted theme fragment is generated for. */
  packageName: string;
  /** The framework plugin the surrounding build keeps compiling components with. */
  plugin: FrameworkOutputPlugin;
  /** The Ghost theme the `config.custom` fragment belongs to. */
  themeName?: string;
}

/** Bind Ghost theme projection to a caller-owned framework output plugin. */
export function forgeGhostCms(options: ForgeGhostCmsOptions): CmsOutputPlugin {
  const { packageName, plugin, themeName } = options;

  return defineForgeCmsPlugin({
    id: "ghost",
    framework: plugin,
    packageName,
    island: "none",

    emitTemplate(
      component: ContentComponent,
      ir: SemanticModule,
      context: CmsTargetContext,
    ): CmsArtifact {
      context.diagnostics.push(
        ...ghostTemplateDiagnostics(component, ir.fileName),
      );
      return {
        fileName: ghostPartialFileName(component),
        contents: emitGhostPartial(component),
        artifactKind: "template",
        asset: true,
      };
    },

    emitManifest(
      components: readonly ContentComponent[],
      context: CmsTargetContext,
    ): readonly CmsArtifact[] {
      return [
        {
          fileName: GHOST_COMPONENTS_MANIFEST,
          contents: emitGhostComponentsManifest(components),
          artifactKind: "manifest",
          asset: true,
        },
        {
          fileName: GHOST_THEME_CONFIG_MANIFEST,
          contents: emitGhostThemeConfig(
            components,
            themeName ?? DEFAULT_GHOST_THEME_NAME,
            context.diagnostics,
          ),
          artifactKind: "manifest",
          asset: true,
        },
      ];
    },

    build: {},
  });
}
