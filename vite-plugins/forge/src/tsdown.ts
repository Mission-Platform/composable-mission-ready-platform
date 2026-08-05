import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import Vue from 'unplugin-vue/rolldown';


import { reactJsxPlugin, stagePluginsForTsdown } from './config.js';
import { generateHookLibrarySources, hookLibraryDtsPlugin } from './generate-hooks.js';
import {
  generateFrameworkSources,
  generateStoryblokBloks,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  jsxComponentsEntryDtsPlugin,
} from './generate.js';

import type { JsxFramework } from './compiler/compile.js';
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

/** Framework runtimes externalised for forge multi-framework builds. */
const FRAMEWORK_EXTERNALS: Readonly<Record<JsxFramework, readonly string[]>> = {
  react: ['react', 'react-dom'],
  vue: ['vue'],
  solid: ['solid-js'],
  svelte: ['svelte'],
  // Native Web Components import the runtime from the forge package (no Lit).
  'web-components': ['@mission-platform/forge', '@mission-platform/forge/web-components'],
};

const DEFAULT_FORGE_FRAMEWORKS: readonly JsxFramework[] = ['react', 'vue', 'solid', 'svelte', 'web-components'];

export interface TsdownForgeHooksOptions {
  /** Absolute root directory of the package (e.g. `import.meta.dirname`). */
  rootDir: string;
  /** Target framework for this single forge hooks build. */
  framework: JsxFramework;
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
  const { rootDir, framework, entryModule, external = [], overrides } = options;
  const resolvedEntry = entryModule ?? path.resolve(rootDir, 'src/index.ts');
  const cacheName = `${path.basename(rootDir)}-${framework}`;
  const generatedDirectory = path.join(rootDir, 'node_modules/.cache', cacheName);
  const outDir = path.resolve(rootDir, `dist/${framework}`);

  const entry = generateHookLibrarySources({
    framework,
    entryModule: resolvedEntry,
    outDir: generatedDirectory,
  });

  // Hook libraries emit plain `.ts`/`.tsx` (no `.svelte` SFCs). Only React
  // needs a JSX transform for `.tsx` entry files; Solid/Svelte hooks stay plain
  // TS and skip the heavier stage-2 compilers.
  const stagePlugins: TsdownPlugin[] = framework === 'react' ? [reactJsxPlugin() as TsdownPlugin] : [];

  const frameworkExternals = FRAMEWORK_EXTERNALS[framework];

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
    overrides: {
      // Generated tree lives outside `src/`; pin the preserve-modules root so
      // `composables/` + `utils/` land directly under `dist/<framework>/`.
      outputOptions: {
        preserveModulesRoot: generatedDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      // React JSX: also set Rolldown transform options because Vite's `config()`
      // hook inside `reactJsxPlugin` is ignored by tsdown.
      ...(framework === 'react'
        ? {
            inputOptions: {
              transform: {
                jsx: {
                  runtime: 'automatic',
                  importSource: 'react',
                },
              },
            },
          }
        : framework === 'solid'
          ? {
              // Generated solid hooks may use `.tsx`; keep JSX as preserve so
              // Solid's runtime (not React) owns any future JSX in the tree.
              inputOptions: {
                transform: {
                  jsx: 'preserve',
                },
              },
            }
          : {}),
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
  /** Frameworks to emit. Defaults to all five forge targets. */
  frameworks?: readonly JsxFramework[];
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
    frameworks = DEFAULT_FORGE_FRAMEWORKS,
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

  for (const framework of frameworks) {
    configs.push(
      defineTsdownForgeHooks({
        rootDir,
        framework,
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
  /** Target framework. */
  framework: JsxFramework;
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
export function defineTsdownForgeComponents(options: TsdownForgeComponentsOptions): UserConfig {
  const { rootDir, framework, componentsModule, useEntryDts, declarationModule, external = [], overrides } = options;

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
    framework,
    componentsModule: resolvedComponentsModule,
    outDir: generatedDirectory,
  });

  // Component packages need real Svelte/Solid compilers. Use the tsdown-safe
  // adapters (`stagePluginsForTsdown`) — Vite's svelte/solid plugins crash here.
  const stagePlugins = stagePluginsForTsdown(framework) as TsdownPlugin[];

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
          declarationFileName: 'index',
          declarationModule: declarationModule ?? '../components',
        })
      : jsxComponentsDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir: path.resolve(rootDir, `dist/${framework}`),
          vueTscBin,
          componentsModule: resolvedComponentsModule,
        });

  const frameworkExternals = FRAMEWORK_EXTERNALS[framework];
  const outDir = path.resolve(rootDir, `dist/${framework}`);

  // Vue component packages need unplugin-vue for generated `.vue` SFCs.
  const vuePlugins: TsdownPlugin[] = framework === 'vue' ? [Vue({ isProduction: true }) as TsdownPlugin] : [];

  const base = defineTsdownLibrary({
    rootDir,
    entry,
    dts: false,
    unbundle: true,
    outDir,
    clean: true,
    external: [...frameworkExternals, ...external],
    overrides: {
      outputOptions: {
        preserveModulesRoot: generatedDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      ...(framework === 'react'
        ? {
            inputOptions: {
              transform: {
                jsx: {
                  runtime: 'automatic',
                  importSource: 'react',
                },
              },
            },
          }
        : framework === 'solid'
          ? {
              inputOptions: {
                transform: {
                  jsx: 'preserve',
                },
              },
            }
          : {}),
      plugins: [
        ...vuePlugins,
        ...stagePlugins,
        jsxComponentsCssImportPlugin() as TsdownPlugin,
        dtsPlugin as TsdownPlugin,
      ],
    },
  });

  return mergeTsdownConfig(base, overrides);
}

export interface TsdownForgeComponentsAllOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Frameworks to emit. Defaults to all five forge targets. */
  frameworks?: readonly JsxFramework[];
  /** Path to the neutral components entry module. */
  componentsModule?: string;
  /** Base display name (parity with Vite helper). */
  name?: string;
  /** Use synthesised entry declaration for every framework build. */
  useEntryDts?: boolean;
  /** Relative import path for declaration types when `useEntryDts` is enabled. */
  declarationModule?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override applied to every framework build. */
  overrides?: UserConfig;
}

/**
 * Build an array of tsdown configs for every requested forge **component**
 * framework. A package's `tsdown.config.ts` can
 * `export default defineTsdownForgeComponentsAll(...)`.
 */
export function defineTsdownForgeComponentsAll(options: TsdownForgeComponentsAllOptions): UserConfig[] {
  const {
    rootDir,
    frameworks = DEFAULT_FORGE_FRAMEWORKS,
    componentsModule,
    name,
    useEntryDts,
    declarationModule,
    external,
    overrides,
  } = options;

  return frameworks.map((framework) =>
    defineTsdownForgeComponents({
      rootDir,
      framework,
      componentsModule,
      name,
      useEntryDts,
      declarationModule,
      external,
      overrides,
    }),
  );
}

/** Storyblok frameworks currently shipped by the Archetype-C component packages. */
export type TsdownForgeStoryblokFramework = 'react' | 'vue';

export interface TsdownForgeStoryblokOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /** Target Storyblok framework (`react` | `vue`). */
  framework: TsdownForgeStoryblokFramework;
  /**
   * Package import name used by the generated wrappers, e.g.
   * `@mission-platform/components` → wrappers import `@mission-platform/components/vue`.
   */
  packageName: string;
  /**
   * Path to the neutral components entry module. Auto-detected from
   * `src/components/index.ts`, `src/component/index.ts`, or `src/index.ts` if omitted.
   */
  componentsModule?: string;
  /** Base display name (parity with Vite helper; informational). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override or extend the generated config. */
  overrides?: UserConfig;
}

export interface TsdownForgeStoryblokAllOptions {
  /** Absolute root directory of the package. */
  rootDir: string;
  /**
   * Package import name used by the generated wrappers, e.g.
   * `@mission-platform/components`.
   */
  packageName: string;
  /** Storyblok frameworks to emit. Defaults to `react` + `vue`. */
  frameworks?: readonly TsdownForgeStoryblokFramework[];
  /** Path to the neutral components entry module. */
  componentsModule?: string;
  /** Base display name (parity with Vite helper; informational). */
  name?: string;
  /** Additional package names to externalise. */
  external?: readonly string[];
  /** Override applied to every Storyblok framework build. */
  overrides?: UserConfig;
}

/**
 * Emit the synthesised Storyblok entry `index.d.ts` into the framework outDir
 * (mirrors the Vite `storyblokEntryDeclarationsPlugin`).
 */
function storyblokEntryDeclarationsTsdownPlugin(cacheDirectory: string): TsdownPlugin {
  return {
    name: 'mission-platform:storyblok-entry-dts',
    generateBundle() {
      const source = fs.readFileSync(path.join(cacheDirectory, 'index.d.ts'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'index.d.ts',
        source,
      });
    },
  } as TsdownPlugin;
}

/**
 * Copy framework-agnostic Storyblok JSON assets (`components.json` + per-blok
 * create-shape files) into `dist/storyblok/` (mirrors the Vite
 * `storyblokConfigAssetsPlugin`).
 */
function storyblokConfigAssetsTsdownPlugin(rootDir: string, cacheDirectory: string): TsdownPlugin {
  return {
    name: 'mission-platform:storyblok-config-assets',
    writeBundle() {
      const destination = path.resolve(rootDir, 'dist/storyblok');
      fs.mkdirSync(destination, { recursive: true });
      for (const file of fs.readdirSync(cacheDirectory)) {
        if (file.endsWith('.json')) {
          fs.copyFileSync(path.join(cacheDirectory, file), path.join(destination, file));
        }
      }
    },
  } as TsdownPlugin;
}

/**
 * Reproduce one Archetype-C **Storyblok** framework build under tsdown:
 * Stage 1 (`generateStoryblokBloks`) + Stage 2 plugins + entry dts + JSON
 * asset copy, emitting into `dist/storyblok/<framework>/` and
 * `dist/storyblok/components.json`.
 */
export function defineTsdownForgeStoryblok(options: TsdownForgeStoryblokOptions): UserConfig {
  const { rootDir, framework, packageName, componentsModule, external = [], overrides } = options;

  const cacheName = `${path.basename(rootDir)}-storyblok-${framework}`;
  const cacheDirectory = path.join(rootDir, 'node_modules/.cache', cacheName);
  const outDir = path.resolve(rootDir, `dist/storyblok/${framework}`);

  const resolvedComponentsModule =
    componentsModule ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(rootDir, 'src/index.ts');

  const entry = generateStoryblokBloks({
    framework,
    componentsModule: resolvedComponentsModule,
    outDir: cacheDirectory,
    componentsImport: `${packageName}/${framework}`,
  });

  // React uses the classic-h transform plugin; Vue wrappers are real SFCs.
  const stagePlugins = stagePluginsForTsdown(framework) as TsdownPlugin[];
  const vuePlugins: TsdownPlugin[] = framework === 'vue' ? [Vue({ isProduction: true }) as TsdownPlugin] : [];

  const frameworkExternals =
    framework === 'react'
      ? (['react', 'react-dom', '@storyblok/react'] as const)
      : (['vue', '@storyblok/vue'] as const);

  const base = defineTsdownLibrary({
    rootDir,
    entry,
    dts: false,
    unbundle: true,
    outDir,
    clean: true,
    external: [...frameworkExternals, packageName, ...external],
    overrides: {
      outputOptions: {
        preserveModulesRoot: cacheDirectory,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      ...(framework === 'react'
        ? {
            inputOptions: {
              transform: {
                jsx: {
                  runtime: 'automatic',
                  importSource: 'react',
                },
              },
            },
          }
        : {}),
      plugins: [
        ...vuePlugins,
        ...stagePlugins,
        storyblokEntryDeclarationsTsdownPlugin(cacheDirectory),
        storyblokConfigAssetsTsdownPlugin(rootDir, cacheDirectory),
      ],
    },
  });

  return mergeTsdownConfig(base, overrides);
}

/**
 * Build an array of tsdown configs for every requested Storyblok framework.
 * A package's `tsdown.config.ts` can spread
 * `...defineTsdownForgeStoryblokAll({ rootDir, packageName })`.
 */
export function defineTsdownForgeStoryblokAll(options: TsdownForgeStoryblokAllOptions): UserConfig[] {
  const {
    rootDir,
    packageName,
    frameworks = ['react', 'vue'] as const,
    componentsModule,
    name,
    external,
    overrides,
  } = options;

  return frameworks.map((framework) =>
    defineTsdownForgeStoryblok({
      rootDir,
      framework,
      packageName,
      componentsModule,
      name,
      external,
      overrides,
    }),
  );
}
