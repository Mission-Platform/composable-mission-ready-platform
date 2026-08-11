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

import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

import { generateCmsArtifacts } from "./driver.js";

import type { CmsArtifact, CmsOutputPlugin } from "./cms.js";
import type { TsdownPlugin, UserConfig } from "tsdown";

/* eslint-disable unicorn/prevent-abbreviations -- tsdown mirrors the repository's public rootDir/outDir config names. */

/** Options for {@link defineTsdownForgeCms}. */
export interface TsdownForgeCmsOptions {
  rootDir: string;
  /** The CMS target to build. */
  target: CmsOutputPlugin;
  /** Absolute path of the neutral components barrel; auto-detected when omitted. */
  componentsModule?: string;
  /** Import specifier the generated templates use; defaults to the target's package name. */
  componentsImport?: string;
  external?: readonly string[];
  overrides?: UserConfig;
}

/** Options for {@link defineTsdownForgeCmsAll}. */
export interface TsdownForgeCmsAllOptions {
  rootDir: string;
  /** Every CMS target to build, in order. */
  targets: readonly CmsOutputPlugin[];
  componentsModule?: string;
  componentsImport?: string;
  external?: readonly string[];
  overrides?: UserConfig;
}

function mergeTsdownConfig(
  base: UserConfig,
  overrides?: UserConfig,
): UserConfig {
  if (!overrides) return base;
  const basePlugins = Array.isArray(base.plugins)
    ? base.plugins
    : base.plugins
      ? [base.plugins]
      : [];
  const overridePlugins = Array.isArray(overrides.plugins)
    ? overrides.plugins
    : overrides.plugins
      ? [overrides.plugins]
      : [];
  return {
    ...base,
    ...overrides,
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
): TsdownPlugin {
  return {
    name: "mission-platform:cms-assets",
    writeBundle() {
      if (assets.length === 0) {
        return;
      }
      const destinationRoot = path.resolve(rootDir, `dist/cms/${targetId}`);
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
  const { rootDir, target, external = [], overrides } = options;
  const cacheDirectory = cmsCacheDirectory(rootDir, target);
  const outDir = cmsOutputDirectory(rootDir, target);
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
  });

  const buildContext = {
    rootDir,
    generatedDirectory: cacheDirectory,
    outputDirectory: outDir,
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
        ),
      ],
    },
  });
  return mergeTsdownConfig(base, overrides);
}

/** Create tsdown configs for every requested CMS target. */
export function defineTsdownForgeCmsAll(
  options: TsdownForgeCmsAllOptions,
): UserConfig[] {
  const {
    rootDir,
    targets,
    componentsModule,
    componentsImport,
    external,
    overrides,
  } = options;
  return targets.map((target) =>
    defineTsdownForgeCms({
      rootDir,
      target,
      componentsModule,
      componentsImport,
      external,
      overrides,
    }),
  );
}
