/**
 * tsdown build wiring for CMS targets.
 *
 * `tsdownForgeCmsPlugins` runs the driver into a per-target cache directory,
 * then builds that generated tree with the bound framework plugin's own tsdown
 * stage plugins — the same mechanism the framework builds use — and emits to
 * `dist/cms/<cmsId>/<frameworkId>`. Artifacts a target marked `asset: true`
 * (manifests, schema sidecars, Handlebars/Liquid templates) are mirrored into
 * `dist/cms/<cmsId>/` so a platform can consume them without unpacking the
 * per-framework bundle.
 */
import fs from "node:fs";
import path from "node:path";

import {
  defineTsdownLibrary,
  resolveTsdownOutputDirectory,
} from "@mission-platform/tsdown-config";
import {
  assertForgeArtifactRoot,
  createForgeBuildSession,
  forgeArtifactAttemptDirectory,
  forgeArtifactPublishPlugin,
  forgeBuildLifecyclePlugin,
  forgeVirtualEntry,
  resolveForgeArtifactPath,
  validateForgeArtifactSegment,
} from "@mission-platform/vite-plugin-forge";

import { copyAndPruneAssets } from "./assets.js";
import { generateCmsArtifacts } from "./driver.js";

import type { CmsArtifact, CmsArtifactKind, CmsOutputPlugin } from "./cms.js";
import type { ForgeTargetGenerationContext } from "@mission-platform/vite-plugin-forge";
import type { TsdownPlugin, UserConfig } from "tsdown";

/* eslint-disable unicorn/prevent-abbreviations -- tsdown mirrors the repository's public rootDir/outDir config names. */

/** Options for one CMS target, used internally by the native adapter. */
interface TsdownForgeCmsTargetOptions {
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** The CMS target to build. */
  target: CmsOutputPlugin;
  /** Absolute path of the neutral components barrel; auto-detected when omitted. */
  componentsModule?: string;
  /** Import specifier the generated templates use; defaults to the target's package name. */
  componentsImport?: string;
  external?: readonly string[];
  artifactMode?: "all" | "shared" | "framework";
  session?: import("@mission-platform/vite-plugin-forge").ForgeBuildSession;
  disposeSession?: boolean;
  overrides?: UserConfig;
}

/** Options accepted by {@link tsdownForgeCmsPlugins}. */
export interface TsdownForgeCmsPluginsOptions {
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Every CMS target to build, in order. */
  targets: readonly CmsOutputPlugin[];
  componentsModule?: string;
  componentsImport?: string;
  external?: readonly string[];
  artifactMode?: "all" | "shared" | "framework";
  session?: import("@mission-platform/vite-plugin-forge").ForgeBuildSession;
  overrides?: UserConfig;
}

function mergeTsdownConfig(
  base: UserConfig,
  overrides?: UserConfig,
  rootDir?: string,
  outputRoot?: string,
): UserConfig {
  if (!overrides) return base;
  const resolvedOverrides =
    rootDir !== undefined &&
    outputRoot !== undefined &&
    typeof overrides.outDir === "string"
      ? {
          ...overrides,
          outDir: resolveMergedOutputDirectory(
            rootDir,
            overrides.outDir,
            outputRoot,
          ),
        }
      : overrides;
  const basePlugins = Array.isArray(base.plugins)
    ? base.plugins
    : base.plugins
      ? [base.plugins]
      : [];
  const overridePlugins = Array.isArray(resolvedOverrides.plugins)
    ? resolvedOverrides.plugins
    : resolvedOverrides.plugins
      ? [resolvedOverrides.plugins]
      : [];
  return {
    ...base,
    ...resolvedOverrides,
    plugins: [...basePlugins, ...overridePlugins],
  };
}

/** Keep an already stage-resolved caller output unchanged when merging hooks. */
function resolveMergedOutputDirectory(
  rootDir: string,
  outputDirectory: string,
  outputRoot: string,
): string {
  const resolvedOutput = path.isAbsolute(outputDirectory)
    ? outputDirectory
    : path.resolve(rootDir, outputDirectory);
  const resolvedOutputRoot = path.resolve(outputRoot);
  if (
    resolvedOutput === resolvedOutputRoot ||
    resolvedOutput.startsWith(`${resolvedOutputRoot}${path.sep}`)
  ) {
    return outputDirectory;
  }
  return resolveTsdownOutputDirectory(rootDir, outputDirectory, outputRoot);
}

/** Flatten tsdown's recursive `plugins` option into a plain array for merging. */
function flattenPlugins(plugins: UserConfig["plugins"]): TsdownPlugin[] {
  if (plugins === undefined || plugins === false) {
    return [];
  }
  if (Array.isArray(plugins)) {
    return plugins.flatMap((entry) =>
      flattenPlugins(entry as UserConfig["plugins"]),
    );
  }
  return [plugins as TsdownPlugin];
}

/** Locate the neutral components barrel of a package. */
export function resolveComponentsModule(
  rootDir: string,
  explicit?: string,
): string {
  return (
    explicit ??
    [
      path.resolve(rootDir, "src/components/index.ts"),
      path.resolve(rootDir, "src/component/index.ts"),
      path.resolve(rootDir, "src/index.ts"),
    ].find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(rootDir, "src/index.ts")
  );
}

/** The cache directory a target's generated tree is written to. */
export function cmsCacheDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
  cacheRoot = path.join(rootDir, "node_modules/.cache"),
): string {
  validateForgeArtifactSegment(target.id);
  validateForgeArtifactSegment(target.framework.id);
  const cacheName = `${path.basename(rootDir)}-cms-${target.id}-${target.framework.id}`;
  return path.join(cacheRoot, cacheName);
}

/** The distribution directory a target's per-framework modules are emitted to. */
export function cmsOutputDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
): string {
  validateForgeArtifactSegment(target.id);
  validateForgeArtifactSegment(target.framework.id);
  return path.resolve(rootDir, `dist/cms/${target.id}/${target.framework.id}`);
}

function cmsSharedAssetsBundleDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
): string {
  validateForgeArtifactSegment(target.id);
  validateForgeArtifactSegment(target.framework.id);
  return path.join(
    rootDir,
    "node_modules/.cache",
    `${path.basename(rootDir)}-cms-${target.id}-assets`,
  );
}

function cmsBuildOutputDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
  artifactMode: TsdownForgeCmsTargetOptions["artifactMode"],
  outputRoot: string | undefined,
): string {
  if (artifactMode === "shared" && outputRoot === undefined) {
    return cmsSharedAssetsBundleDirectory(rootDir, target);
  }
  return path.resolve(
    rootDir,
    `dist/cms/${target.id}` +
      (artifactMode === "shared" ? "" : `/${target.framework.id}`),
  );
}

function artifactKindsForMode(
  mode: TsdownForgeCmsTargetOptions["artifactMode"],
): readonly CmsArtifactKind[] | undefined {
  if (mode === "shared") return ["schema", "manifest"];
  if (mode === "framework") return ["template", "entry", "declaration"];
  return undefined;
}

function resolveForgeTsconfig(rootDir: string): string | undefined {
  return ["tsconfig.build.json", "tsconfig.json"]
    .map((fileName) => path.resolve(rootDir, fileName))
    .find((fileName) => fs.existsSync(fileName));
}

/**
 * Emit the generated `index.d.ts` — targets that produce typed entries write it
 * into the cache, and tsdown would otherwise never see it because the entry is
 * not a `tsc`-visible source file.
 */
function cmsEntryDeclarationsTsdownPlugin(
  cacheDirectory: string,
): TsdownPlugin {
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
  } as TsdownPlugin;
}

/** Mirror every `asset: true` artifact into `dist/cms/<cmsId>/`. */
function cmsAssetsTsdownPlugin(
  rootDir: string,
  cacheDirectory: string,
  targetOrTargetId: string | CmsOutputPlugin,
  getAssets: () => readonly CmsArtifact[],
  outputRoot: string | undefined,
): TsdownPlugin {
  const targetId =
    typeof targetOrTargetId === "string"
      ? targetOrTargetId
      : targetOrTargetId.id;
  const frameworkId =
    typeof targetOrTargetId === "object"
      ? targetOrTargetId.framework.id
      : undefined;
  const supportedFrameworks =
    typeof targetOrTargetId === "object"
      ? targetOrTargetId.supportedFrameworks
      : undefined;

  const preservedDirectories = new Set<string>();
  if (frameworkId) preservedDirectories.add(frameworkId);
  if (supportedFrameworks) {
    for (const fw of supportedFrameworks) {
      preservedDirectories.add(fw);
    }
  }

  return {
    name: "mission-platform:cms-assets",
    writeBundle() {
      const safeCacheDirectory = assertForgeArtifactRoot(cacheDirectory);
      const destinationRoot = assertForgeArtifactRoot(
        resolveTsdownOutputDirectory(
          rootDir,
          path.resolve(rootDir, `dist/cms/${targetId}`),
          outputRoot,
        ),
      );
      copyAndPruneAssets(
        safeCacheDirectory,
        destinationRoot,
        getAssets(),
        preservedDirectories,
      );
    },
  } as TsdownPlugin;
}

function cmsCleanupTsdownPlugin(cacheDirectory: string): TsdownPlugin {
  return {
    name: "mission-platform:cms-cache-cleanup",
    closeBundle() {
      fs.rmSync(assertForgeArtifactRoot(cacheDirectory), {
        recursive: true,
        force: true,
      });
    },
  } as TsdownPlugin;
}

/** Create a tsdown config for one CMS target for the native plugin adapter. */
function createTsdownForgeCmsConfig(
  options: TsdownForgeCmsTargetOptions,
): UserConfig {
  const {
    rootDir,
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    target,
    external = [],
    artifactMode = (process.env.FORGE_CMS_ARTIFACT_MODE as
      "all" | "shared" | "framework" | undefined) ?? "all",
    overrides,
  } = options;
  const cacheDirectory = cmsCacheDirectory(rootDir, target, outputRoot);
  const outDir = cmsBuildOutputDirectory(
    rootDir,
    target,
    artifactMode,
    outputRoot,
  );
  const stagedOutDir =
    outputRoot === undefined
      ? outDir
      : resolveTsdownOutputDirectory(rootDir, outDir, outputRoot);
  assertForgeArtifactRoot(outDir);
  assertForgeArtifactRoot(stagedOutDir);
  const componentsImport = options.componentsImport ?? target.packageName;
  const componentsModule = resolveComponentsModule(
    rootDir,
    options.componentsModule,
  );
  const targetId = `${target.id}-${target.framework.id}`;
  const attemptFinalOutDir = forgeArtifactAttemptDirectory(outDir, targetId);
  const attemptOutDir =
    outputRoot === undefined
      ? attemptFinalOutDir
      : resolveTsdownOutputDirectory(rootDir, attemptFinalOutDir, outputRoot);
  const publishedOutDir = outputRoot === undefined ? outDir : stagedOutDir;
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
        outDir: cacheDirectory,
        componentsImport,
        stripPrefix: "",
        rootDir,
        artifactKinds: artifactKindsForMode(artifactMode),
        service,
        project,
      });
      return generated.entry;
    },
  };

  const buildContext = {
    rootDir,
    generatedDirectory: cacheDirectory,
    outputDirectory: attemptOutDir,
  };
  const stagePlugins = [
    ...(target.framework.build.tsdown?.(buildContext) ?? []),
    ...(target.build.tsdown?.(buildContext) ?? []),
  ];

  const base = defineTsdownLibrary({
    rootDir,
    entry: forgeVirtualEntry(targetId),
    dts: false,
    unbundle: true,
    outDir: attemptFinalOutDir,
    outputRoot,
    clean: true,
    tsconfigPathsRoot: cacheDirectory,
    external: [
      ...(target.framework.runtimeExternals ?? []),
      ...(target.runtimeExternals ?? []),
      componentsImport,
      ...external,
    ],
    overrides: {
      outputOptions: {
        preserveModulesRoot: cacheDirectory,
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
      },
      plugins: [
        forgeBuildLifecyclePlugin({
          session,
          plan: { rootDir, targets: [targetPlan] },
          target: targetPlan,
          adapter: "tsdown",
          disposeSession:
            options.disposeSession ?? options.session === undefined,
        }) as unknown as TsdownPlugin,
        ...stagePlugins,
        cmsEntryDeclarationsTsdownPlugin(cacheDirectory),
        cmsAssetsTsdownPlugin(
          rootDir,
          cacheDirectory,
          target,
          () =>
            generated?.artifacts.filter(
              (artifact) => artifact.asset === true,
            ) ?? [],
          outputRoot,
        ),
        cmsCleanupTsdownPlugin(cacheDirectory),
        forgeArtifactPublishPlugin({
          publishedDirectory: publishedOutDir,
          attemptDirectory: attemptOutDir,
          targetId,
        }) as unknown as TsdownPlugin,
      ],
    },
  });
  return mergeTsdownConfig(base, overrides, rootDir, outputRoot);
}

function selectedCmsTargets(
  options: TsdownForgeCmsPluginsOptions,
): readonly CmsOutputPlugin[] {
  const requestedCms = process.env.FORGE_CMS_STORYBLOK_TARGET;
  const requestedFramework = process.env.FORGE_FRAMEWORK_TARGET;
  if (requestedFramework === "none") {
    return [];
  }
  return options.targets.filter((target) => {
    const cmsMatches =
      requestedCms === undefined ||
      target.id === requestedCms ||
      target.framework.id === requestedCms;
    const frameworkMatches =
      requestedFramework === undefined ||
      target.framework.id === requestedFramework;
    return cmsMatches && frameworkMatches;
  });
}

const CMS_TSDOWN_PLUGIN_NAME = "@mission-platform/forge-cms-plugin-api:tsdown";
const CMS_TSDOWN_NESTED_RUNNER_NAME =
  "@mission-platform/forge-cms-plugin-api:tsdown-nested";

/** Plugin returned by {@link tsdownForgeCmsPlugins}, including target configs for tests. */
export type ForgeCmsTsdownPlugin = TsdownPlugin & {
  tsdownConfig?: (config: UserConfig) => void | Promise<void>;
  /** One resolved tsdown config per selected CMS/framework target. */
  readonly cmsTargetConfigs: readonly UserConfig[];
};

function isOrchestratorPlugin(plugin: TsdownPlugin): boolean {
  return (
    plugin.name === CMS_TSDOWN_PLUGIN_NAME ||
    plugin.name === CMS_TSDOWN_NESTED_RUNNER_NAME
  );
}

/** Inject a single CMS target into the caller-owned `defineTsdownLibrary` config. */
function applyCmsConfigToHost(
  config: UserConfig,
  forgeConfig: UserConfig,
  callerPlugins: TsdownPlugin[],
  rootDir: string,
  outputRoot: string | undefined,
): void {
  const forgePlugins = flattenPlugins(forgeConfig.plugins);
  const merged = mergeTsdownConfig(
    forgeConfig,
    { ...config, plugins: [] },
    rootDir,
    outputRoot,
  );
  Object.assign(merged, {
    dts: forgeConfig.dts,
    entry: forgeConfig.entry,
    outDir: forgeConfig.outDir,
    ...(forgeConfig.external === undefined
      ? {}
      : { external: forgeConfig.external }),
    ...(forgeConfig.outputOptions === undefined
      ? {}
      : { outputOptions: forgeConfig.outputOptions }),
    ...(forgeConfig.tsconfig === undefined
      ? {}
      : { tsconfig: forgeConfig.tsconfig }),
  });
  Object.assign(config, merged);
  config.plugins = [...forgePlugins, ...callerPlugins];
}

/** Real on-disk noop entry used when the host config is demoted to a multi-target shell. */
function ensureCmsNoopEntry(rootDir: string): string {
  const directory = path.join(
    rootDir,
    "node_modules/.cache/forge-cms-tsdown-noop",
  );
  fs.mkdirSync(directory, { recursive: true });
  const entryPath = path.join(directory, "noop.ts");
  fs.writeFileSync(entryPath, "export {}\n");
  return entryPath;
}

/**
 * Demote the shared host config to a write-disabled shell so multi-target CMS
 * builds run as independent nested tsdown builds instead of last-wins merges.
 */
function neutralizeHostCmsConfig(config: UserConfig, rootDir: string): void {
  const noopEntry = ensureCmsNoopEntry(rootDir);
  const noopOutDir = path.join(
    rootDir,
    "node_modules/.cache/forge-cms-tsdown-noop/out",
  );
  Object.assign(config, {
    cwd: rootDir,
    entry: noopEntry,
    outDir: noopOutDir,
    dts: false,
    clean: false,
    write: false,
    unbundle: true,
    platform: "neutral",
    plugins: [],
  });
}

/**
 * Native tsdown-plugin form of the CMS adapter. The returned
 * plugins inject CMS lifecycle/config through `tsdownConfig`, matching the
 * Forge component/hook plugin adapters so callers compose one
 * `defineTsdownLibrary` configuration.
 *
 * Multi-framework compositions keep one caller-owned config: the adapter runs
 * one nested tsdown build per selected target so entry/outDir/lifecycle plugins
 * never last-wins collide on the shared host object.
 */
export function tsdownForgeCmsPlugins(
  options: TsdownForgeCmsPluginsOptions,
): TsdownPlugin[] {
  const targets = selectedCmsTargets(options);
  if (targets.length === 0) {
    return [];
  }
  const outputRoot = options.outputRoot ?? process.env.FORGE_BUILD_STAGE_ROOT;
  const session = options.session ?? createForgeBuildSession();
  const forgeConfigs = targets.map((target, index) =>
    createTsdownForgeCmsConfig({
      ...options,
      target,
      outputRoot,
      session,
      disposeSession:
        index === targets.length - 1 && options.session === undefined,
    }),
  );

  const plugin: ForgeCmsTsdownPlugin = {
    name: CMS_TSDOWN_PLUGIN_NAME,
    cmsTargetConfigs: forgeConfigs,
    async tsdownConfig(config: UserConfig) {
      const callerPlugins = flattenPlugins(config.plugins).filter(
        (entry) => !isOrchestratorPlugin(entry),
      );

      if (forgeConfigs.length === 1) {
        applyCmsConfigToHost(
          config,
          forgeConfigs[0]!,
          callerPlugins,
          options.rootDir,
          outputRoot,
        );
        return;
      }

      const nestedConfigs: UserConfig[] = forgeConfigs.map((forgeConfig) => ({
        ...forgeConfig,
        cwd:
          typeof forgeConfig.cwd === "string"
            ? forgeConfig.cwd
            : options.rootDir,
        plugins: [...flattenPlugins(forgeConfig.plugins), ...callerPlugins],
      }));

      neutralizeHostCmsConfig(config, options.rootDir);

      const nestedRunner = {
        name: CMS_TSDOWN_NESTED_RUNNER_NAME,
        async buildStart() {
          const { build } = await import("tsdown");
          for (const nestedConfig of nestedConfigs) {
            await build({
              config: false,
              ...nestedConfig,
            });
          }
        },
      } as TsdownPlugin;

      config.plugins = [nestedRunner];
    },
  };

  return [plugin];
}
