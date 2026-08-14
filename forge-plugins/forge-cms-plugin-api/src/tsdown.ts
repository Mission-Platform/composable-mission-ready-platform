/**
 * tsdown build wiring for CMS targets.
 *
 * `defineTsdownForgeCms` runs the driver into a per-target cache directory,
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

import { generateCmsArtifacts } from "./driver.js";

import type { CmsArtifact, CmsArtifactKind, CmsOutputPlugin } from "./cms.js";
import type { TsdownPlugin, UserConfig } from "tsdown";

/* eslint-disable unicorn/prevent-abbreviations -- tsdown mirrors the repository's public rootDir/outDir config names. */

/** Options for {@link defineTsdownForgeCms}. */
export interface TsdownForgeCmsOptions {
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
  overrides?: UserConfig;
}

/** Options for {@link defineTsdownForgeCmsAll}. */
export interface TsdownForgeCmsAllOptions {
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Every CMS target to build, in order. */
  targets: readonly CmsOutputPlugin[];
  componentsModule?: string;
  componentsImport?: string;
  external?: readonly string[];
  artifactMode?: "all" | "shared" | "framework";
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
          outDir: resolveTsdownOutputDirectory(
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
): string {
  const cacheName = `${path.basename(rootDir)}-cms-${target.id}-${target.framework.id}`;
  return path.join(rootDir, "node_modules/.cache", cacheName);
}

/** The distribution directory a target's per-framework modules are emitted to. */
export function cmsOutputDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
): string {
  return path.resolve(rootDir, `dist/cms/${target.id}/${target.framework.id}`);
}

function cmsSharedAssetsBundleDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
): string {
  return path.join(
    rootDir,
    "node_modules/.cache",
    `${path.basename(rootDir)}-cms-${target.id}-assets`,
  );
}

function cmsBuildOutputDirectory(
  rootDir: string,
  target: CmsOutputPlugin,
  artifactMode: TsdownForgeCmsOptions["artifactMode"],
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
  mode: TsdownForgeCmsOptions["artifactMode"],
): readonly CmsArtifactKind[] | undefined {
  if (mode === "shared") return ["schema", "manifest"];
  if (mode === "framework") return ["template", "entry", "declaration"];
  return undefined;
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
      const declarations = path.join(cacheDirectory, "index.d.ts");
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
  targetId: string,
  assets: readonly CmsArtifact[],
  outputRoot: string | undefined,
): TsdownPlugin {
  return {
    name: "mission-platform:cms-assets",
    writeBundle() {
      if (assets.length === 0) {
        return;
      }
      const destinationRoot = resolveTsdownOutputDirectory(
        rootDir,
        path.resolve(rootDir, `dist/cms/${targetId}`),
        outputRoot,
      );
      for (const asset of assets) {
        const source = path.join(cacheDirectory, asset.fileName);
        if (!fs.existsSync(source)) {
          continue;
        }
        const destination = path.join(destinationRoot, asset.fileName);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);
      }
    },
  } as TsdownPlugin;
}

/** Create a tsdown config for one CMS target. */
export function defineTsdownForgeCms(
  options: TsdownForgeCmsOptions,
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
  const cacheDirectory = cmsCacheDirectory(rootDir, target);
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
  const componentsImport = options.componentsImport ?? target.packageName;

  const generated = generateCmsArtifacts({
    plugin: target,
    componentsModule: resolveComponentsModule(
      rootDir,
      options.componentsModule,
    ),
    outDir: cacheDirectory,
    componentsImport,
    stripPrefix: "",
    rootDir,
    artifactKinds: artifactKindsForMode(artifactMode),
  });

  const buildContext = {
    rootDir,
    generatedDirectory: cacheDirectory,
    outputDirectory: stagedOutDir,
  };
  const stagePlugins = [
    ...(target.framework.build.tsdown?.(buildContext) ?? []),
    ...(target.build.tsdown?.(buildContext) ?? []),
  ];

  const base = defineTsdownLibrary({
    rootDir,
    entry: generated.entry,
    dts: false,
    unbundle: true,
    outDir,
    outputRoot,
    clean: true,
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
        ...stagePlugins,
        cmsEntryDeclarationsTsdownPlugin(cacheDirectory),
        cmsAssetsTsdownPlugin(
          rootDir,
          cacheDirectory,
          target.id,
          generated.artifacts.filter((artifact) => artifact.asset === true),
          outputRoot,
        ),
      ],
    },
  });
  return mergeTsdownConfig(base, overrides, rootDir, outputRoot);
}

/** Create tsdown configs for every requested CMS target. */
export function defineTsdownForgeCmsAll(
  options: TsdownForgeCmsAllOptions,
): UserConfig[] {
  const {
    rootDir,
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    targets,
    componentsModule,
    componentsImport,
    external,
    artifactMode,
    overrides,
  } = options;
  return targets.map((target) =>
    defineTsdownForgeCms({
      rootDir,
      outputRoot,
      target,
      componentsModule,
      componentsImport,
      external,
      artifactMode,
      overrides,
    }),
  );
}
