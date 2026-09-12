/**
 * Vite build wiring for CMS targets.
 *
 * The tsdown path in `tsdown.ts` is the one the repository's packages use;
 * this Vite equivalent exists for consumers that bundle their CMS output with
 * Vite's library mode instead, and keeps the two paths behaviourally identical.
 */
import fs from "node:fs";
import path from "node:path";

import { defineLibraryConfig } from "@mission-platform/vite-config";
import {
  assertForgeArtifactRoot,
  forgeArtifactAttemptDirectory,
  forgeArtifactPublishPlugin,
  forgeBuildLifecyclePlugin,
  createForgeBuildSession,
  forgeVirtualEntry,
  resolveForgeArtifactPath,
} from "@mission-platform/vite-plugin-forge";
import { mergeConfig } from "vite";

import { copyAndPruneAssets } from "./assets.js";
import { generateCmsArtifacts } from "./driver.js";
import { cmsCacheDirectory, resolveComponentsModule } from "./tsdown.js";

import type { CmsArtifact, CmsOutputPlugin } from "./cms.js";
import type { ForgeTargetGenerationContext } from "@mission-platform/vite-plugin-forge";
import type { Plugin, UserConfig } from "vite";

/* eslint-disable unicorn/prevent-abbreviations -- Vite's public config uses the established rootDir/outDir names. */

/** Options for {@link defineViteForgeCmsLibrary}. */
export interface ViteForgeCmsLibraryOptions {
  rootDir: string;
  target: CmsOutputPlugin;
  name: string;
  componentsModule?: string;
  componentsImport?: string;
  external?: readonly string[];
  session?: import("@mission-platform/vite-plugin-forge").ForgeBuildSession;
  overrides?: UserConfig;
}

function cmsEntryDeclarationsPlugin(cacheDirectory: string): Plugin {
  return {
    name: "mission-platform:cms-entry-dts",
    generateBundle() {
      const declarations = resolveForgeArtifactPath(
        cacheDirectory,
        "index.d.ts",
      );
      if (!fs.existsSync(declarations)) {
        return;
      }
      this.emitFile({
        type: "asset",
        fileName: "index.d.ts",
        source: fs.readFileSync(declarations, "utf8"),
      });
    },
  };
}

export interface CmsAssetsPluginOptions {
  readonly frameworkId?: string;
  readonly supportedFrameworks?: readonly string[];
}

export function cmsAssetsPlugin(
  rootDir: string,
  cacheDirectory: string,
  targetOrTargetId: string | CmsOutputPlugin,
  getAssets: () => readonly CmsArtifact[],
  options?: CmsAssetsPluginOptions,
): Plugin {
  const targetId =
    typeof targetOrTargetId === "string"
      ? targetOrTargetId
      : targetOrTargetId.id;
  const frameworkId =
    options?.frameworkId ??
    (typeof targetOrTargetId === "object"
      ? targetOrTargetId.framework.id
      : undefined);
  const supportedFrameworks =
    options?.supportedFrameworks ??
    (typeof targetOrTargetId === "object"
      ? targetOrTargetId.supportedFrameworks
      : undefined);

  const preservedDirectories = new Set<string>();
  if (frameworkId) preservedDirectories.add(frameworkId);
  if (supportedFrameworks) {
    for (const fw of supportedFrameworks) {
      preservedDirectories.add(fw);
    }
  }

  return {
    name: "mission-platform:cms-assets",
    closeBundle() {
      const safeCacheDirectory = assertForgeArtifactRoot(cacheDirectory);
      const destinationRoot = assertForgeArtifactRoot(
        path.resolve(rootDir, `dist/cms/${targetId}`),
      );
      copyAndPruneAssets(
        safeCacheDirectory,
        destinationRoot,
        getAssets(),
        preservedDirectories,
      );
    },
  };
}

function resolveForgeTsconfig(rootDir: string): string | undefined {
  return ["tsconfig.build.json", "tsconfig.json"]
    .map((fileName) => path.resolve(rootDir, fileName))
    .find((fileName) => fs.existsSync(fileName));
}

/** Create a Vite library config for one CMS target. */
export function defineViteForgeCmsLibrary(
  options: ViteForgeCmsLibraryOptions,
): UserConfig {
  const { rootDir, target, name, external = [], overrides } = options;
  const cacheDirectory = cmsCacheDirectory(rootDir, target);
  const componentsImport = options.componentsImport ?? target.packageName;
  const componentsModule = resolveComponentsModule(
    rootDir,
    options.componentsModule,
  );
  const targetId = `${target.id}-${target.framework.id}`;
  const generatedDirectory = cmsCacheDirectory(rootDir, target);
  const generatedOutput = assertForgeArtifactRoot(
    path.resolve(rootDir, `dist/cms/${target.id}/${target.framework.id}`),
  );
  const attemptDirectory = forgeArtifactAttemptDirectory(
    generatedOutput,
    targetId,
  );
  const session = options.session ?? createForgeBuildSession();
  let generated: ReturnType<typeof generateCmsArtifacts> | undefined;

  const targetPlan = {
    targetId,
    kind: "cms-island" as const,
    entryModule: componentsModule,
    sourceRoot: path.dirname(componentsModule),
    tsconfig: resolveForgeTsconfig(rootDir),
    generate: ({ service, project }: ForgeTargetGenerationContext) => {
      generated = generateCmsArtifacts({
        plugin: target,
        componentsModule,
        outDir: generatedDirectory,
        componentsImport,
        stripPrefix: "",
        rootDir,
        service,
        project,
      });
      return generated.entry;
    },
  };

  const stagePlugins =
    target.framework.build.vite?.({
      rootDir,
      generatedDirectory,
    }) ?? [];
  const targetPlugins =
    target.build.vite?.({ rootDir, generatedDirectory }) ?? [];
  const suffix = target.framework.displayNameSuffix ?? target.framework.id;

  return defineLibraryConfig({
    rootDir,
    name: name.endsWith(suffix) ? name : `${name}${suffix}`,
    entry: forgeVirtualEntry(targetId),
    preserveModules: true,
    preserveModulesRoot: path.relative(rootDir, generatedDirectory),
    external: [
      ...(target.framework.runtimeExternals ?? []),
      ...(target.runtimeExternals ?? []),
      componentsImport,
      ...external,
    ],
    overrides: mergeConfig(
      {
        build: { outDir: attemptDirectory },
        plugins: [
          forgeBuildLifecyclePlugin({
            session,
            plan: { rootDir, targets: [targetPlan] },
            target: targetPlan,
            adapter: "vite",
            disposeSession: options.session === undefined,
          }),
          ...stagePlugins,
          ...targetPlugins,
          cmsEntryDeclarationsPlugin(cacheDirectory),
          cmsAssetsPlugin(
            rootDir,
            cacheDirectory,
            target,
            () =>
              generated?.artifacts.filter(
                (artifact) => artifact.asset === true,
              ) ?? [],
          ),
          forgeArtifactPublishPlugin({
            publishedDirectory: generatedOutput,
            attemptDirectory,
            targetId,
          }),
        ],
      },
      overrides ?? {},
    ),
  });
}
