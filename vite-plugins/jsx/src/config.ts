import fs, { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { mergeConfig, type Plugin, type UserConfig } from 'vite';

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
            runtime: 'classic',
            pragma: 'h',
            pragmaFrag: 'Fragment',
          },
        },
      };
    },
  };
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

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  const displayName = name.endsWith(framework === 'react' ? 'React' : 'Vue')
    ? name
    : `${name}${framework === 'react' ? 'React' : 'Vue'}`;

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
        });

  return defineLibraryConfig({
    rootDir,
    name: displayName,
    entry,
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: [...(framework === 'react' ? ['react', 'react-dom'] : ['vue']), ...external],
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

  if (mode === 'react') {
    const cacheName = `${path.basename(rootDir)}-react`;
    const generatedDir = path.join(rootDir, 'node_modules/.cache', cacheName);
    const entry = generateHookLibrarySources({
      framework: 'react',
      entryModule: resolvedEntry,
      outDir: generatedDir,
    });
    return defineLibraryConfig({
      rootDir,
      name: name.endsWith('React') ? name : `${name}React`,
      entry,
      preserveModules: true,
      preserveModulesRoot: path.join('node_modules/.cache', cacheName),
      external,
      overrides: mergeConfig(
        {
          build: { outDir: 'dist/react' },
          plugins: [
            reactJsxPlugin(),
            hookLibraryDtsPlugin({ framework: 'react', generatedDir, outDir: path.resolve(rootDir, 'dist/react') }),
          ],
        },
        overrides ?? {},
      ),
    });
  }

  if (mode === 'vue') {
    const cacheName = `${path.basename(rootDir)}-vue`;
    const generatedDir = path.join(rootDir, 'node_modules/.cache', cacheName);
    const entry = generateHookLibrarySources({
      framework: 'vue',
      entryModule: resolvedEntry,
      outDir: generatedDir,
    });
    return defineLibraryConfig({
      rootDir,
      name: name.endsWith('Vue') ? name : `${name}Vue`,
      entry,
      preserveModules: true,
      preserveModulesRoot: path.join('node_modules/.cache', cacheName),
      external,
      overrides: mergeConfig(
        {
          build: { outDir: 'dist/vue' },
          plugins: [
            hookLibraryDtsPlugin({ framework: 'vue', generatedDir, outDir: path.resolve(rootDir, 'dist/vue') }),
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
