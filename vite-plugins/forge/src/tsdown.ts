import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineTsdownLibrary, resolveTsdownOutputDirectory } from '@mission-platform/tsdown-config';

import {
  forgeServiceLifecyclePlugin,
  validateForgeBuildPlugin,
  validateForgeBuildSelection,
} from './build-integration.js';
import { createForgeCompilerService, type ForgeCompilerService } from './compiler/service.js';
import { generateHookLibrarySources, hookLibraryDtsPlugin } from './generate-hooks.js';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  jsxComponentsEntryDtsPlugin,
} from './generate.js';

import type { FrameworkOutputPlugin, JsxFramework } from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';
import type { TsdownPlugin, UserConfig } from 'tsdown';

/** Flatten tsdown's recursive `plugins` option into a plain array for merging. */
function flattenPlugins(plugins: UserConfig['plugins']): TsdownPlugin[] {
  if (plugins == null || plugins === false) {
    return [];
  }
  if (Array.isArray(plugins)) {
    return plugins.flatMap((entry) => flattenPlugins(entry as UserConfig['plugins']));
  }
  // Promises are resolved by tsdown itself — keep them as opaque plugin slots.
  return [plugins as TsdownPlugin];
}

/** Deep-merge a base tsdown config with caller overrides (shallow for top-level, concat plugins). */
function mergeTsdownConfig(
  base: UserConfig,
  overrides?: UserConfig,
  rootDir?: string,
  outputRoot?: string,
): UserConfig {
  if (!overrides) {
    return base;
  }

  const resolvedOverrides =
    rootDir !== undefined && outputRoot !== undefined && typeof overrides.outDir === 'string'
      ? {
          ...overrides,
          outDir: resolveTsdownOutputDirectory(rootDir, overrides.outDir, outputRoot),
        }
      : overrides;

  const mergedPlugins = [...flattenPlugins(base.plugins), ...flattenPlugins(resolvedOverrides.plugins)];

  return {
    ...base,
    ...resolvedOverrides,
    deps: {
      ...base.deps,
      ...resolvedOverrides.deps,
    },
    dts: resolvedOverrides.dts === undefined ? base.dts : resolvedOverrides.dts,
    hooks: resolvedOverrides.hooks ?? base.hooks,
    inputOptions:
      typeof resolvedOverrides.inputOptions === 'function' || typeof base.inputOptions === 'function'
        ? (resolvedOverrides.inputOptions ?? base.inputOptions)
        : {
            ...(typeof base.inputOptions === 'object' ? base.inputOptions : {}),
            ...(typeof resolvedOverrides.inputOptions === 'object' ? resolvedOverrides.inputOptions : {}),
          },
    outputOptions:
      typeof resolvedOverrides.outputOptions === 'function' || typeof base.outputOptions === 'function'
        ? (resolvedOverrides.outputOptions ?? base.outputOptions)
        : {
            ...(typeof base.outputOptions === 'object' ? base.outputOptions : {}),
            ...(typeof resolvedOverrides.outputOptions === 'object' ? resolvedOverrides.outputOptions : {}),
          },
    plugins: mergedPlugins.length > 0 ? mergedPlugins : undefined,
  };
}

export interface TsdownForgeHooksOptions {
  /** Absolute root directory of the package (e.g. `import.meta.dirname`). */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Explicit output plugin for this forge hooks build. */
  plugin: FrameworkOutputPlugin;
  /** Path to the neutral hook entry module (defaults to `<rootDir>/src/index.ts`). */
  entryModule?: string;
  /** Base display name (informational; unused by tsdown but kept for parity). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
  /** Persistent service shared by component and hook helpers in one build session. */
  service?: ForgeCompilerService;
  /** Dispose an internally shared service after this config finishes. */
  disposeService?: boolean;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output; disable only for tests using fixture plugins. */
  rejectFixturePlaceholder?: boolean;
}

/**
 * Reproduce one Archetype-C **hook** framework build under tsdown:
 * Stage 1 (`generateHookLibrarySources`) + Stage 2 plugins + `hookLibraryDtsPlugin`,
 * emitting into `dist/<framework>/`.
 */
export function defineTsdownForgeHooks(options: TsdownForgeHooksOptions): UserConfig {
  const {
    rootDir,
    plugin,
    entryModule,
    external = [],
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    overrides,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder = true,
  } = options;
  validateForgeBuildPlugin(plugin, 'tsdown');
  const service = options.service ?? createForgeCompilerService();
  const framework = plugin.id as JsxFramework;
  const resolvedEntry = entryModule ?? path.resolve(rootDir, 'src/index.ts');
  const cacheName = `${path.basename(rootDir)}-${framework}`;
  const generatedDirectory = path.join(rootDir, 'node_modules/.cache', cacheName);
  const finalOutDir = path.resolve(rootDir, `dist/${framework}`);
  const outDir = resolveTsdownOutputDirectory(rootDir, finalOutDir, outputRoot);

  const entry = generateHookLibrarySources({
    plugin,
    entryModule: resolvedEntry,
    outDir: generatedDirectory,
    service,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder,
  });

  // Hook libraries emit plain `.ts`/`.tsx` (no `.svelte` SFCs). Only React
  // needs a JSX transform for `.tsx` entry files; Solid/Svelte hooks stay plain
  // TS and skip the heavier stage-2 compilers.
  const stagePlugins = (plugin.build.tsdown?.({
    rootDir,
    generatedDirectory,
    outputDirectory: outDir,
  }) ?? []) as TsdownPlugin[];

  const frameworkExternals = plugin.runtimeExternals ?? [];

  const base = defineTsdownLibrary({
    rootDir,
    entry,
    // Declaration emit is owned by hookLibraryDtsPlugin over the generated tree.
    dts: false,
    unbundle: true,
    outDir: finalOutDir,
    outputRoot,
    // Only wipe this framework's subtree — sibling framework builds must survive.
    clean: true,
    external: [...frameworkExternals, ...external],
    tsconfigPathsRoot: generatedDirectory,
    overrides: {
      // Generated tree lives outside `src/`; pin the preserve-modules root so
      // `composables/` + `utils/` land directly under `dist/<framework>/`.
      outputOptions: {
        preserveModulesRoot: generatedDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      plugins: [
        forgeServiceLifecyclePlugin({
          service,
          disposeService: options.disposeService ?? options.service === undefined,
        }) as unknown as TsdownPlugin,
        ...stagePlugins,
        hookLibraryDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir,
        }) as TsdownPlugin,
      ],
    },
  });

  return mergeTsdownConfig(base, overrides, rootDir, outputRoot);
}

export interface TsdownForgeHooksAllOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Explicit output plugins to emit. */
  frameworks: readonly FrameworkOutputPlugin[];
  /** Path to the neutral hook entry module (defaults to `<rootDir>/src/index.ts`). */
  entryModule?: string;
  /** Base display name (parity with Vite helper). */
  name?: string;
  /** Additional package names to externalise on every framework build. */
  external?: readonly string[];
  /**
   * When `true` (default), also include a neutral `dist/` build via
   * {@link defineTsdownLibrary} as the first config in the returned array.
   */
  includeNeutral?: boolean;
  /** Override applied to the neutral build only. */
  neutralOverrides?: UserConfig;
  /** Override applied to every framework build. */
  frameworkOverrides?: UserConfig;
  /** Persistent service shared by the neutral and framework generation session. */
  service?: ForgeCompilerService;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output; disable only for tests using fixture plugins. */
  rejectFixturePlaceholder?: boolean;
}

/**
 * Build an array of tsdown configs for every requested forge hooks framework
 * (plus the neutral root entry by default). A package's `tsdown.config.ts` can
 * `export default defineTsdownForgeHooksAll(...)`.
 */
export function defineTsdownForgeHooksAll(options: TsdownForgeHooksAllOptions): UserConfig[] {
  const {
    rootDir,
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    frameworks,
    entryModule,
    name,
    external,
    includeNeutral = true,
    neutralOverrides,
    frameworkOverrides,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder = true,
  } = options;
  const selected = validateForgeBuildSelection(frameworks, 'tsdown');
  const service = options.service ?? createForgeCompilerService();

  const configs: UserConfig[] = [];

  if (includeNeutral) {
    configs.push(
      defineTsdownLibrary({
        rootDir,
        outputRoot,
        entry: entryModule ? path.relative(rootDir, entryModule) : 'src/index.ts',
        external,
        // Wipe the whole `dist/` once. Framework configs below set `clean: true`
        // only on their own `dist/<framework>/` outDir so parallel array builds
        // do not clobber sibling framework trees via a shared clean of `dist/`.
        clean: true,
        overrides: neutralOverrides,
      }),
    );
  }

  for (const [index, plugin] of selected.entries()) {
    configs.push(
      defineTsdownForgeHooks({
        rootDir,
        plugin,
        outputRoot,
        entryModule,
        name,
        external,
        service,
        disposeService: index === selected.length - 1 && options.service === undefined,
        router,
        routerPlugins,
        routerConditions,
        rejectFixturePlaceholder,
        // `defineTsdownForgeHooks` already scopes `clean` to `dist/<framework>/`.
        overrides: frameworkOverrides,
      }),
    );
  }

  return configs;
}

export interface TsdownForgeComponentsOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Framework output plugins to build together through the same façade. */
  frameworks: readonly FrameworkOutputPlugin[];
  /**
   * Path to the neutral components entry module. Auto-detected from
   * `src/components/index.ts`, `src/component/index.ts`, or `src/index.ts` if omitted.
   */
  componentsModule?: string;
  /** Base display name (parity with Vite helper). */
  name?: string;
  /** Use synthesised entry declaration instead of running vue-tsc/tsc on the generated tree. */
  useEntryDts?: boolean;
  /** Relative import path for declaration types when `useEntryDts` is enabled. */
  declarationModule?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
  /** Persistent service shared by all framework targets in one build session. */
  service?: ForgeCompilerService;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output; disable only for tests using fixture plugins. */
  rejectFixturePlaceholder?: boolean;
}

/**
 * Reproduce one Archetype-C **component** framework build under tsdown:
 * Stage 1 (`generateFrameworkSources`) + Stage 2 plugins + css-import + dts plugins,
 * emitting into `dist/<framework>/`.
 */
export function defineTsdownForgeComponents(options: TsdownForgeComponentsOptions): UserConfig[] {
  const selected = validateForgeBuildSelection(options.frameworks, 'tsdown');
  const requestedFramework = process.env.FORGE_FRAMEWORK_TARGET;
  const cmsOnlyBuild = process.env.FORGE_CMS_STORYBLOK_TARGET !== undefined;
  const frameworks =
    requestedFramework === undefined
      ? cmsOnlyBuild
        ? []
        : selected
      : selected.filter((plugin) => plugin.id === requestedFramework);
  if (frameworks.length === 0) {
    if (cmsOnlyBuild && requestedFramework === undefined) return [];
    throw new Error(`Forge build target "${requestedFramework}" is not available in the selected framework plugins.`);
  }
  const service = options.service ?? createForgeCompilerService();
  return frameworks.map((plugin, index) =>
    defineTsdownForgeComponent({
      ...options,
      plugin,
      service,
      disposeService: index === frameworks.length - 1 && options.service === undefined,
    }),
  );
}

function defineTsdownForgeComponent(
  options: Readonly<
    Omit<TsdownForgeComponentsOptions, 'frameworks'> & {
      plugin: FrameworkOutputPlugin;
      disposeService?: boolean;
    }
  >,
): UserConfig {
  const {
    rootDir,
    plugin,
    componentsModule,
    useEntryDts,
    declarationModule,
    external = [],
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    overrides,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder = true,
    service,
    disposeService,
  } = options;
  const framework = plugin.id as JsxFramework;
  const watchMode = process.argv.some(
    (argument) => argument === '--watch' || argument === '-w' || argument.startsWith('--watch='),
  );

  const cacheName = `${path.basename(rootDir)}-${framework}`;
  const generatedDirectory = path.join(rootDir, 'node_modules/.cache', cacheName);

  const resolvedComponentsModule =
    componentsModule ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(rootDir, 'src/index.ts');

  validateForgeBuildPlugin(plugin, 'tsdown');
  const compilerService = service ?? createForgeCompilerService();
  const entry = generateFrameworkSources({
    plugin,
    componentsModule: resolvedComponentsModule,
    sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
    outDir: generatedDirectory,
    // Keep the neutral `Forge` prefix on the public API (do not strip it).
    stripPrefix: '',
    service: compilerService,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder,
  });

  // Component packages need real Svelte/Solid compilers. Use the tsdown-safe
  // adapters (`stagePluginsForTsdown`) — Vite's svelte/solid plugins crash here.
  const stagePlugins = (plugin.build.tsdown?.({
    rootDir,
    generatedDirectory,
    outputDirectory: resolveTsdownOutputDirectory(rootDir, path.resolve(rootDir, `dist/${framework}`), outputRoot),
  }) ?? []) as TsdownPlugin[];

  // vue-tsc is resolved from `@mission-platform/forge` the same way the Vite helper does.
  let vueTscBin: string | undefined;
  try {
    vueTscBin = createRequire(path.join(rootDir, 'package.json')).resolve('vue-tsc/bin/vue-tsc.js', {
      paths: [path.join(rootDir, 'node_modules/@mission-platform/forge')],
    });
  } catch {
    vueTscBin = undefined;
  }

  const dtsPlugin =
    useEntryDts || declarationModule
      ? jsxComponentsEntryDtsPlugin({
          framework,
          componentsModule: resolvedComponentsModule,
          sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
          declarationFileName: 'index',
          declarationModule: declarationModule ?? '../components',
          // Keep the neutral `Forge` prefix on the public API (do not strip it).
          stripPrefix: '',
        })
      : jsxComponentsDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir: resolveTsdownOutputDirectory(rootDir, path.resolve(rootDir, `dist/${framework}`), outputRoot),
          vueTscBin,
          componentsModule: resolvedComponentsModule,
          sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
        });

  const frameworkExternals = plugin.runtimeExternals ?? [];
  const finalOutDir = path.resolve(rootDir, `dist/${framework}`);

  const base = defineTsdownLibrary({
    rootDir,
    entry,
    dts: false,
    unbundle: true,
    outDir: finalOutDir,
    outputRoot,
    clean: !watchMode,
    external: [...frameworkExternals, ...external],
    tsconfigPathsRoot: generatedDirectory,
    overrides: {
      outputOptions: {
        preserveModulesRoot: generatedDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      plugins: [
        forgeServiceLifecyclePlugin({
          service: compilerService,
          disposeService: disposeService ?? service === undefined,
        }) as unknown as TsdownPlugin,
        ...stagePlugins,
        jsxComponentsCssImportPlugin() as TsdownPlugin,
        dtsPlugin as TsdownPlugin,
      ],
    },
  });

  return mergeTsdownConfig(base, overrides, rootDir, outputRoot);
}

export interface TsdownForgeEmailComponentsOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Optional isolated output mirror used by the shared Forge runner. */
  outputRoot?: string;
  /** Path to the neutral email components entry module. */
  componentsModule?: string;
  /** Base display name (informational; unused by tsdown but kept for parity). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
}

/**
 * Build the server-only neutral Forge email component entry.
 *
 *  It preserves the Forge tree so
 * `@mission-platform/email-renderer` can serialize it on the server.
 */
export function defineTsdownForgeEmailComponents(options: TsdownForgeEmailComponentsOptions): UserConfig {
  const {
    rootDir,
    componentsModule,
    external = [],
    outputRoot = process.env.FORGE_BUILD_STAGE_ROOT,
    overrides,
  } = options;
  const resolvedComponentsModule =
    componentsModule ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(rootDir, 'src/index.ts');

  return defineTsdownLibrary({
    rootDir,
    entry: { index: resolvedComponentsModule },
    external,
    outputRoot,
    dts: true,
    clean: false,
    overrides: {
      outDir: path.resolve(rootDir, 'dist/email'),
      ...overrides,
    },
  });
}
