/**
 * The Astro CMS target.
 *
 * Astro used to be a `FrameworkOutputPlugin` sibling of React/Vue/Solid/Svelte
 * that shipped a hand-rolled vanilla-DOM island runtime re-implementing state,
 * refs, effects, and events from the neutral IR. It is now a **CMS target** that
 * composes one of those plugins instead: presentational components are emitted
 * as static `.astro`, and interactive ones are hydrated with `client:load` on a
 * component the bound plugin co-generated from the very same IR.
 */
import { cpSync } from "node:fs";

import { defineForgeCmsPlugin } from "@mission-platform/forge-cms-plugin-api";

import { emitContentConfig } from "./collections.js";
import {
  astroDiagnostics,
  emitIslandAstroTemplate,
  emitStaticAstroTemplate,
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
import type { TsdownPlugin } from "tsdown";

/**
 * Keep `.astro` specifiers external (no bundler understands them) and mirror
 * the generated tree into the output directory, since the `.astro` files are
 * the deliverable rather than an input to a JavaScript bundle.
 */
function astroTsdownPlugin(
  generatedDirectory?: string,
  outputDirectory?: string,
): TsdownPlugin {
  return {
    name: "forge-cms-astro-source-tree",
    resolveId(source: string) {
      if (source.split("?", 1)[0]?.endsWith(".astro") === true) {
        return { id: source, external: true };
      }
      // eslint-disable-next-line unicorn/no-null -- Rollup's resolveId contract requires `null` to defer to the next plugin.
      return null;
    },
    writeBundle() {
      if (generatedDirectory === undefined || outputDirectory === undefined) {
        return;
      }
      cpSync(generatedDirectory, outputDirectory, {
        recursive: true,
        force: true,
      });
    },
  } as TsdownPlugin;
}

/** Options for {@link forgeAstroCms}. */
export interface ForgeAstroCmsOptions {
  /** The package the emitted templates are generated for. */
  packageName: string;
  /** The framework plugin that compiles the interactive islands. */
  plugin: FrameworkOutputPlugin;
}

/** Bind Astro projection to a caller-owned framework output plugin. */
export function forgeAstroCms(options: ForgeAstroCmsOptions): CmsOutputPlugin {
  const { packageName, plugin } = options;

  return defineForgeCmsPlugin({
    id: "astro",
    framework: plugin,
    packageName,
    island: "framework",
    supportedFrameworks: ["react", "vue", "solid", "svelte", "web-components"],

    emitTemplate(
      component: ContentComponent,
      ir: SemanticModule,
      context: CmsTargetContext,
    ): CmsArtifact {
      context.diagnostics.push(...astroDiagnostics(ir, component));
      const useIsland =
        component.interactive && context.islandEntry !== undefined;
      return {
        fileName: `${component.names.folder}.astro`,
        contents: useIsland
          ? emitIslandAstroTemplate(component, context.islandEntry as string)
          : emitStaticAstroTemplate(ir),
        artifactKind: "template",
        asset: true,
      };
    },

    emitManifest(
      components: readonly ContentComponent[],
    ): readonly CmsArtifact[] {
      return [
        {
          fileName: "content.config.ts",
          contents: emitContentConfig(components),
          artifactKind: "manifest",
          asset: true,
        },
      ];
    },

    emitEntry(components: readonly ContentComponent[]): readonly CmsArtifact[] {
      const lines = components.map(
        (component) =>
          `export { default as ${component.names.publicName} } from './${component.names.folder}.astro';`,
      );
      return [
        {
          fileName: "index.ts",
          contents: `${lines.join("\n")}\n`,
          artifactKind: "entry",
        },
      ];
    },

    build: {
      vite: () => [],
      tsdown: ({ generatedDirectory, outputDirectory }) => [
        astroTsdownPlugin(generatedDirectory, outputDirectory),
      ],
    },
  });
}
