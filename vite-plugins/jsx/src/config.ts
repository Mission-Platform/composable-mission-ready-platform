import fs, { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { mergeConfig, type Plugin, type UserConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

import { generateHookLibrarySources, hookLibraryDtsPlugin } from './generate-hooks.js';
import {
  generateFrameworkSources,
  generateStoryblokBloks,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  jsxComponentsEntryDtsPlugin,
} from './generate.js';

import type { JsxFramework } from './compiler/compile.js';

export function reactJsxPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-jsx:react',
    enforce: 'pre',
    config() {
      return {
        oxc: {
          jsx: {
            runtime: 'automatic',
            importSource: 'react',
          },
        },
      };
    },
  };
}

/**
 * The `@sveltejs/vite-plugin-svelte` plugin set that compiles the generated
 * `.svelte` sources natively. Re-exported (rather than requiring every
 * `svelte`-target consumer to depend on `@sveltejs/vite-plugin-svelte`/`svelte`
 * themselves) so a hand-rolled `vite.config.ts` — one that assembles its own
 * `stagePlugins` instead of calling {@link defineJsxLibraryConfig} — can wire
 * Svelte compilation the same way {@link reactJsxPlugin} lets it wire the
 * React JSX transform, without pulling in a new direct dependency.
 */
export function sveltePlugin(): Plugin[] {
  return svelte();
}

/**
 * The `vite-plugin-solid` plugin that compiles the generated Solid `.tsx`
 * sources natively (Babel `babel-preset-solid`), turning the neutral JSX into
 * SolidJS fine-grained DOM operations. Re-exported so a hand-rolled
 * `vite.config.ts` — one that assembles its own `stagePlugins` instead of
 * calling {@link defineJsxLibraryConfig} — can wire the Solid transform the
 * same way {@link reactJsxPlugin}/{@link sveltePlugin} let it wire React/Svelte,
 * without pulling in a new direct dependency. **Required** for the `solid`
 * target: without it, Vite's default Oxc JSX transform compiles the Solid
 * sources against `react/jsx-runtime`, producing non-functional output.
 */
export function solidJsxPlugin(): Plugin[] {
  return [solidPlugin() as unknown as Plugin];
}

export interface JsxLibraryConfigOptions {
  /** Absolute root directory of the package (e.g. `__dirname`). */
  rootDir: string;
  /** Target framework for dual-framework builds (`'react' | 'vue'`). */
  framework: JsxFramework;
  /**
   * Base global/UMD name of the library (e.g. `'MissionPlatformBreakpoints'`).
   * `'React'` or `'Vue'` will be appended automatically if missing.
   */
  name: string;
  /**
   * Path to the neutral components entry module.
   * Auto-detected from `src/components/index.ts`, `src/component/index.ts`, or `src/index.ts` if omitted.
   */
  componentsModule?: string;
  /** Use synthesised entry declaration file instead of running `vue-tsc`/`tsc` on generated tree. */
  useEntryDts?: boolean;
  /** Relative import path for declaration types when `useEntryDts` is enabled (defaults to `'../components'`). */
  declarationModule?: string;
  /** Additional Rollup externals for the framework build. */
  external?: string[];
  /** Extra Vite configuration overrides to merge. */
  overrides?: UserConfig;
}

export function defineJsxLibraryConfig(options: JsxLibraryConfigOptions): UserConfig {
  const {
    rootDir,
    framework,
    name,
    componentsModule,
    useEntryDts,
    declarationModule,
    external = [],
    overrides,
  } = options;

  const cacheName = `${path.basename(rootDir)}-${framework}`;
  const generatedDir = path.join(rootDir, 'node_modules/.cache', cacheName);

  const resolvedComponentsModule =
    componentsModule ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((p) => fs.existsSync(p)) ??
    path.resolve(rootDir, 'src/index.ts');

  const vueTscBin = createRequire(path.join(rootDir, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
    paths: [path.join(rootDir, 'node_modules/@mission-platform/jsx')],
  });

  const entry = generateFrameworkSources({
    framework,
    componentsModule: resolvedComponentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] =
    framework === 'vue'
      ? [vueJsx()]
      : framework === 'react'
        ? [reactJsxPlugin()]
        : framework === 'solid'
          ? [solidPlugin()]
          : framework === 'svelte'
            ? sveltePlugin()
            : [];

  const frameworkSuffix =
    framework === 'react'
      ? 'React'
      : framework === 'vue'
        ? 'Vue'
        : framework === 'solid'
          ? 'Solid'
          : framework === 'svelte'
            ? 'Svelte'
            : 'WebComponents';

  const displayName = name.endsWith(frameworkSuffix) ? name : `${name}${frameworkSuffix}`;

  const frameworkExternals =
    framework === 'react'
      ? ['react', 'react-dom']
      : framework === 'vue'
        ? ['vue']
        : framework === 'solid'
          ? ['solid-js']
          : framework === 'svelte'
            ? ['svelte']
            : [];

  // `useEntryDts`/`declarationModule` are deliberate caller opt-outs (a
  // synthesised entry declaration whose props types are re-imported from the
  // shared neutral declarations, rather than each framework's own genuine
  // types); every other build — react, vue, solid, svelte, web-components —
  // gets its own native `.d.ts` from {@link jsxComponentsDtsPlugin}.
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
          generatedDir,
          outDir: path.resolve(rootDir, `dist/${framework}`),
          vueTscBin,
          componentsModule: resolvedComponentsModule,
        });

  return defineLibraryConfig({
    rootDir,
    name: displayName,
    entry,
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: [...frameworkExternals, ...external],
    overrides: mergeConfig(
      {
        build: {
          outDir: `dist/${framework}`,
          cssCodeSplit: true,
        },
        plugins: [...stagePlugins, jsxComponentsCssImportPlugin(), dtsPlugin],
      },
      overrides ?? {},
    ),
  });
}

export interface JsxHookLibraryConfigOptions {
  /** Absolute root directory of the package (e.g. `__dirname`). */
  rootDir: string;
  /** Build mode (`'react' | 'vue' | 'default'` / neutral). */
  mode?: string;
  /** Base global/UMD name of the library (e.g. `'MissionPlatformD3'`). */
  name: string;
  /** Path to the neutral hook entry module (defaults to `src/index.ts`). */
  entryModule?: string;
  /** Additional Rollup externals. */
  external?: string[];
  /** Extra Vite configuration overrides to merge. */
  overrides?: UserConfig;
}

export function defineJsxHookLibraryConfig(options: JsxHookLibraryConfigOptions): UserConfig {
  const { rootDir, mode, name, entryModule, external = [], overrides } = options;
  const resolvedEntry = entryModule ?? path.resolve(rootDir, 'src/index.ts');

  if (mode === 'react' || mode === 'vue' || mode === 'solid' || mode === 'svelte' || mode === 'web-components') {
    const framework = mode as JsxFramework;
    const cacheName = `${path.basename(rootDir)}-${framework}`;
    const generatedDir = path.join(rootDir, 'node_modules/.cache', cacheName);
    const entry = generateHookLibrarySources({
      framework,
      entryModule: resolvedEntry,
      outDir: generatedDir,
    });
    const frameworkSuffix =
      framework === 'react'
        ? 'React'
        : framework === 'vue'
          ? 'Vue'
          : framework === 'solid'
            ? 'Solid'
            : framework === 'svelte'
              ? 'Svelte'
              : 'WebComponents';

    const frameworkExternals =
      framework === 'react'
        ? ['react', 'react-dom']
        : framework === 'vue'
          ? ['vue']
          : framework === 'solid'
            ? ['solid-js']
            : framework === 'svelte'
              ? ['svelte']
              : [];

    return defineLibraryConfig({
      rootDir,
      name: name.endsWith(frameworkSuffix) ? name : `${name}${frameworkSuffix}`,
      entry,
      preserveModules: true,
      preserveModulesRoot: path.join('node_modules/.cache', cacheName),
      external: [...frameworkExternals, ...external],
      overrides: mergeConfig(
        {
          build: { outDir: `dist/${framework}` },
          plugins: [
            ...(framework === 'react'
              ? [reactJsxPlugin()]
              : framework === 'solid'
                ? [solidPlugin()]
                : framework === 'svelte'
                  ? sveltePlugin()
                  : []),
            hookLibraryDtsPlugin({ framework, generatedDir, outDir: path.resolve(rootDir, `dist/${framework}`) }),
          ],
        },
        overrides ?? {},
      ),
    });
  }

  return defineLibraryConfig({
    rootDir,
    name,
    entry: resolvedEntry,
    external,
    overrides,
  });
}

function storyblokEntryDeclarationsPlugin(cacheDirectory: string): Plugin {
  return {
    name: 'mission-platform:storyblok-entry-dts',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.d.ts',
        source: readFileSync(path.join(cacheDirectory, 'index.d.ts'), 'utf8'),
      });
    },
  };
}

function storyblokConfigAssetsPlugin(rootDir: string, cacheDirectory: string): Plugin {
  return {
    name: 'mission-platform:storyblok-config-assets',
    closeBundle() {
      const destination = path.resolve(rootDir, 'dist/storyblok');
      mkdirSync(destination, { recursive: true });
      for (const file of readdirSync(cacheDirectory)) {
        if (file.endsWith('.json')) {
          copyFileSync(path.join(cacheDirectory, file), path.join(destination, file));
        }
      }
    },
  };
}

export interface JsxStoryblokLibraryConfigOptions {
  /** Absolute root directory of the package (e.g. `__dirname`). */
  rootDir: string;
  /** Target framework (`'react' | 'vue'`). */
  framework: JsxFramework;
  /** Base UMD/global name (e.g. `'MissionPlatformJsxComponentsStoryblok'`). */
  name: string;
  /** Package import name (e.g. `'@mission-platform/components'`). */
  packageName: string;
  /** Path to neutral components barrel module. Auto-resolved if omitted. */
  componentsModule?: string;
  /** Additional Rollup externals. */
  external?: string[];
  /** Extra Vite config overrides. */
  overrides?: UserConfig;
}

export function defineJsxStoryblokLibraryConfig(options: JsxStoryblokLibraryConfigOptions): UserConfig {
  const { rootDir, framework, name, packageName, componentsModule, external = [], overrides } = options;

  const cacheName = `${path.basename(rootDir)}-storyblok-${framework}`;
  const cacheDirectory = path.join(rootDir, 'node_modules/.cache', cacheName);

  const resolvedComponentsModule =
    componentsModule ??
    [
      path.resolve(rootDir, 'src/components/index.ts'),
      path.resolve(rootDir, 'src/component/index.ts'),
      path.resolve(rootDir, 'src/index.ts'),
    ].find((p) => fs.existsSync(p)) ??
    path.resolve(rootDir, 'src/index.ts');

  const entry = generateStoryblokBloks({
    framework,
    componentsModule: resolvedComponentsModule,
    outDir: cacheDirectory,
    componentsImport: `${packageName}/${framework}`,
  });

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  const displayName = name.endsWith(framework === 'react' ? 'React' : 'Vue')
    ? name
    : `${name}${framework === 'react' ? 'React' : 'Vue'}`;

  return defineLibraryConfig({
    rootDir,
    name: displayName,
    entry,
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: [
      ...(framework === 'react' ? ['react', 'react-dom', '@storyblok/react'] : ['vue', '@storyblok/vue']),
      packageName,
      ...external,
    ],
    overrides: mergeConfig(
      {
        build: {
          outDir: `dist/storyblok/${framework}`,
        },
        plugins: [
          ...stagePlugins,
          storyblokEntryDeclarationsPlugin(cacheDirectory),
          storyblokConfigAssetsPlugin(rootDir, cacheDirectory),
        ],
      },
      overrides ?? {},
    ),
  });
}
