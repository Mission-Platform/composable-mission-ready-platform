import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

import { generateHookLibrarySources, hookLibraryDtsPlugin } from './generate-hooks.js';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  jsxComponentsEntryDtsPlugin,
} from './generate.js';

import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
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
function mergeTsdownConfig(base: UserConfig, overrides?: UserConfig): UserConfig {
  if (!overrides) {
    return base;
  }

  const mergedPlugins = [...flattenPlugins(base.plugins), ...flattenPlugins(overrides.plugins)];

  return {
    ...base,
    ...overrides,
    deps: {
      ...base.deps,
      ...overrides.deps,
    },
    dts: overrides.dts === undefined ? base.dts : overrides.dts,
    hooks: overrides.hooks ?? base.hooks,
    inputOptions:
      typeof overrides.inputOptions === 'function' || typeof base.inputOptions === 'function'
        ? (overrides.inputOptions ?? base.inputOptions)
        : {
            ...(typeof base.inputOptions === 'object' ? base.inputOptions : {}),
            ...(typeof overrides.inputOptions === 'object' ? overrides.inputOptions : {}),
          },
    outputOptions:
      typeof overrides.outputOptions === 'function' || typeof base.outputOptions === 'function'
        ? (overrides.outputOptions ?? base.outputOptions)
        : {
            ...(typeof base.outputOptions === 'object' ? base.outputOptions : {}),
            ...(typeof overrides.outputOptions === 'object' ? overrides.outputOptions : {}),
          },
    plugins: mergedPlugins.length > 0 ? mergedPlugins : undefined,
  };
}

export interface TsdownForgeHooksOptions {
  /** Absolute root directory of the package (e.g. `import.meta.dirname`). */
  rootDir: string;
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
}

/**
 * Reproduce one Archetype-C **hook** framework build under tsdown:
 * Stage 1 (`generateHookLibrarySources`) + Stage 2 plugins + `hookLibraryDtsPlugin`,
 * emitting into `dist/<framework>/`.
 */
export function defineTsdownForgeHooks(options: TsdownForgeHooksOptions): UserConfig {
  const { rootDir, plugin, entryModule, external = [], overrides } = options;
  const framework = plugin.id;
  const resolvedEntry = entryModule ?? path.resolve(rootDir, 'src/index.ts');
  const cacheName = `${path.basename(rootDir)}-${framework}`;
  const generatedDirectory = path.join(rootDir, 'node_modules/.cache', cacheName);
  const outDir = path.resolve(rootDir, `dist/${framework}`);

  const entry = generateHookLibrarySources({
    plugin,
    entryModule: resolvedEntry,
    outDir: generatedDirectory,
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
    outDir,
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
        ...stagePlugins,
        hookLibraryDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir,
        }) as TsdownPlugin,
      ],
    },
  });

  return mergeTsdownConfig(base, overrides);
}

export interface TsdownForgeHooksAllOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
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
}

/**
 * Build an array of tsdown configs for every requested forge hooks framework
 * (plus the neutral root entry by default). A package's `tsdown.config.ts` can
 * `export default defineTsdownForgeHooksAll(...)`.
 */
export function defineTsdownForgeHooksAll(options: TsdownForgeHooksAllOptions): UserConfig[] {
  const {
    rootDir,
    frameworks,
    entryModule,
    name,
    external,
    includeNeutral = true,
    neutralOverrides,
    frameworkOverrides,
  } = options;

  const configs: UserConfig[] = [];

  if (includeNeutral) {
    configs.push(
      defineTsdownLibrary({
        rootDir,
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

  for (const plugin of frameworks) {
    configs.push(
      defineTsdownForgeHooks({
        rootDir,
        plugin,
        entryModule,
        name,
        external,
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
}

/**
 * Reproduce one Archetype-C **component** framework build under tsdown:
 * Stage 1 (`generateFrameworkSources`) + Stage 2 plugins + css-import + dts plugins,
 * emitting into `dist/<framework>/`.
 */
export function defineTsdownForgeComponents(options: TsdownForgeComponentsOptions): UserConfig[] {
  return options.frameworks.map((plugin) => defineTsdownForgeComponent({ ...options, plugin }));
}

function defineTsdownForgeComponent(
  options: Readonly<Omit<TsdownForgeComponentsOptions, 'frameworks'> & { plugin: FrameworkOutputPlugin }>,
): UserConfig {
  const { rootDir, plugin, componentsModule, useEntryDts, declarationModule, external = [], overrides } = options;
  const framework = plugin.id;

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

  const entry = generateFrameworkSources({
    plugin,
    componentsModule: resolvedComponentsModule,
    sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
    outDir: generatedDirectory,
    // Keep the neutral `Forge` prefix on the public API (do not strip it).
    stripPrefix: '',
  });

  // Component packages need real Svelte/Solid compilers. Use the tsdown-safe
  // adapters (`stagePluginsForTsdown`) — Vite's svelte/solid plugins crash here.
  const stagePlugins = (plugin.build.tsdown?.({
    rootDir,
    generatedDirectory,
    outputDirectory: path.resolve(rootDir, `dist/${framework}`),
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
          outDir: path.resolve(rootDir, `dist/${framework}`),
          vueTscBin,
          componentsModule: resolvedComponentsModule,
          sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
        });

  const frameworkExternals = plugin.runtimeExternals ?? [];
  const outDir = path.resolve(rootDir, `dist/${framework}`);

  const base = defineTsdownLibrary({
    rootDir,
    entry,
    dts: false,
    unbundle: true,
    outDir,
    clean: true,
    external: [...frameworkExternals, ...external],
    tsconfigPathsRoot: generatedDirectory,
    overrides: {
      outputOptions: {
        preserveModulesRoot: generatedDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      plugins: [...stagePlugins, jsxComponentsCssImportPlugin() as TsdownPlugin, dtsPlugin as TsdownPlugin],
    },
  });

  return mergeTsdownConfig(base, overrides);
}

export interface TsdownForgeEmailComponentsOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
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
  const { rootDir, componentsModule, external = [], overrides } = options;
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
    dts: true,
    clean: false,
    overrides: {
      outDir: path.resolve(rootDir, 'dist/email'),
      ...overrides,
    },
  });
}
