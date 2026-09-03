import fs from 'node:fs';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mergeConfig, type Plugin, type UserConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

import { forgeServiceLifecyclePlugin, validateForgeBuildPlugin } from './build-integration.js';
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

export function reactJsxPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:react',
    enforce: 'pre',
    // Vite path: configure Oxc JSX via Vite's `oxc` config namespace.
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
    // Rolldown/tsdown path: Vite's `config()` hook is ignored, so also set the
    // Rolldown `transform.jsx` input option when the bundler supports it.
    options(inputOptions) {
      const current =
        inputOptions.transform && typeof inputOptions.transform === 'object' ? inputOptions.transform : {};
      inputOptions.transform = {
        ...current,
        jsx: {
          runtime: 'automatic',
          importSource: 'react',
        },
      };
      return inputOptions;
    },
  };
}

/** Vite plugin for compiling generated Svelte components. */
export function sveltePlugin(): Plugin[] {
  return [svelte() as unknown as Plugin];
}

/**
 * Rolldown/tsdown-compatible Svelte compiler plugin. Compiles `.svelte` SFCs via
 * `svelte/compiler` in a plain `transform` hook — no Vite resolved-config APIs.
 * Prefer this (or {@link stagePluginsForTsdown}) when building with tsdown.
 */
export function svelteTsdownPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:svelte-tsdown',
    enforce: 'pre',
    async transform(code, id) {
      const filename = id.split('?')[0] ?? id;
      if (!filename.endsWith('.svelte')) {
        return null;
      }

      const svelteCompiler = createRequire(import.meta.url)('svelte/compiler') as {
        compile: (
          source: string,
          options: { filename: string; css?: 'injected' | 'external' },
        ) => { js: { code: string; map?: object }; warnings?: unknown[] };
      };

      const result = svelteCompiler.compile(code, {
        filename,
        css: 'injected',
      });
      return {
        code: result.js.code,
        map: result.js.map as never,
      };
    },
  };
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
 *
 * **Vite only** — under tsdown/Rolldown use {@link solidJsxTsdownPlugin} instead.
 */
export function solidJsxPlugin(): Plugin[] {
  return [solidPlugin() as unknown as Plugin];
}

/**
 * Rolldown/tsdown-compatible Solid JSX plugin. Delegates to `vite-plugin-solid`'s
 * `transform` hook only (skipping Vite-only `config`/`configResolved` setup) and
 * sets Rolldown `transform.jsx = 'preserve'` via the `options` hook so Oxc does
 * not rewrite Solid JSX as React.
 */
export function solidJsxTsdownPlugin(): Plugin {
  // `vite-plugin-solid` is typed against Vite's Plugin; under tsdown we only
  // need its transform implementation. Cast through `unknown` to avoid
  // fighting Rolldown vs Vite `TransformResult` / `this` incompatibilities.
  const solid = solidPlugin() as unknown as {
    transform?:
      | ((this: unknown, code: string, id: string, options?: unknown) => unknown)
      | { handler?: (this: unknown, code: string, id: string, options?: unknown) => unknown };
  };

  const transformHook =
    typeof solid.transform === 'function'
      ? solid.transform
      : solid.transform && typeof solid.transform.handler === 'function'
        ? solid.transform.handler
        : undefined;

  return {
    name: '@mission-platform/vite-plugin-forge:solid-tsdown',
    enforce: 'pre',
    options(inputOptions) {
      const current =
        inputOptions.transform && typeof inputOptions.transform === 'object' ? inputOptions.transform : {};
      inputOptions.transform = {
        ...current,
        jsx: 'preserve',
      };
      return inputOptions;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Rolldown/Vite TransformResult diverge
    async transform(this: unknown, code: string, id: string): Promise<any> {
      if (!transformHook) {
        return null;
      }
      return transformHook.call(this, code, id);
    },
  } as Plugin;
}

/**
 * Stage-2 plugins for a forge framework build under **tsdown** (Rolldown).
 * Prefer this over {@link reactJsxPlugin}/{@link solidJsxPlugin}/{@link sveltePlugin}
 * when the bundler is not Vite — the Vite-only Svelte/Solid plugins crash because
 * they require Vite's resolved config.
 */
export function stagePluginsForTsdown(plugin: FrameworkOutputPlugin): Plugin[] {
  return (plugin.build.tsdown?.({}) ?? []) as Plugin[];
}

export interface JsxLibraryConfigOptions {
  /** Absolute root directory of the package (e.g. `__dirname`). */
  rootDir: string;
  /** Explicit output plugin for this framework build. */
  plugin: FrameworkOutputPlugin;
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
  /**
   * Path to the package public entry module used to preserve neutral exports.
   * Defaults to `<rootDir>/src/index.ts` when it exists, otherwise the component entry.
   */
  publicEntryModule?: string;
  /** Use synthesised entry declaration file instead of running `vue-tsc`/`tsc` on generated tree. */
  useEntryDts?: boolean;
  /** Relative import path for declaration types when `useEntryDts` is enabled (defaults to `'../components'`). */
  declarationModule?: string;
  /** Additional Rollup externals for the framework build. */
  external?: string[];
  /** Extra Vite configuration overrides to merge. */
  overrides?: UserConfig;
  /** Persistent service shared by component and hook helpers in one build session. */
  service?: ForgeCompilerService;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
}

export function defineJsxLibraryConfig(options: JsxLibraryConfigOptions): UserConfig {
  const {
    rootDir,
    plugin,
    name,
    componentsModule,
    publicEntryModule,
    useEntryDts,
    declarationModule,
    external = [],
    overrides,
    router,
    routerPlugins,
    routerConditions,
  } = options;
  validateForgeBuildPlugin(plugin, 'vite');
  const service = options.service ?? createForgeCompilerService();

  const framework = plugin.id as JsxFramework;
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
  const resolvedPublicEntryModule =
    publicEntryModule ??
    (fs.existsSync(path.resolve(rootDir, 'src/index.ts'))
      ? path.resolve(rootDir, 'src/index.ts')
      : resolvedComponentsModule);

  const entry = generateFrameworkSources({
    plugin,
    componentsModule: resolvedComponentsModule,
    publicEntryModule: resolvedPublicEntryModule,
    sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
    outDir: generatedDir,
    // Keep the neutral `Forge` prefix on the public API (do not strip it).
    stripPrefix: '',
    service,
    router,
    routerPlugins,
    routerConditions,
    rejectFixturePlaceholder: true,
  });

  const stagePlugins =
    plugin.build.vite?.({
      rootDir,
      generatedDirectory: generatedDir,
    }) ?? [];

  const frameworkSuffix = plugin.displayNameSuffix ?? plugin.id;

  const displayName = name.endsWith(frameworkSuffix) ? name : `${name}${frameworkSuffix}`;

  const frameworkExternals = plugin.runtimeExternals ?? [];

  // `useEntryDts`/`declarationModule` are deliberate caller opt-outs (a
  // synthesised entry declaration whose props types are re-imported from the
  // shared neutral declarations, rather than each framework's own genuine
  // types); react, solid, svelte, web-components get their own native `.d.ts`
  // from {@link jsxComponentsDtsPlugin}.
  //
  // `vue-tsc` cannot run under TypeScript 7: it `require()`s the CommonJS
  // `typescript/lib/tsc` entry point directly, and TypeScript 7's restricted
  // `exports` map no longer exposes that subpath (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
  // There is no genuinely TypeScript-7-backed Vue declaration compiler yet
  // (upstream `@vue/language-tools` tracks a future stable TS7 API), so the
  // Vue target always falls back to the synthesised entry declaration —
  // never to a TypeScript 6 `vue-tsc` lane.
  const useSynthesisedDts = useEntryDts || declarationModule !== undefined || framework === 'vue';

  const dtsPlugin = useSynthesisedDts
    ? jsxComponentsEntryDtsPlugin({
        framework,
        componentsModule: resolvedComponentsModule,
        publicEntryModule: resolvedPublicEntryModule,
        sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
        declarationFileName: 'index',
        declarationModule: declarationModule ?? '../components',
        // Keep the neutral `Forge` prefix on the public API (do not strip it).
        stripPrefix: '',
      })
    : jsxComponentsDtsPlugin({
        framework,
        generatedDir,
        outDir: path.resolve(rootDir, `dist/${framework}`),
        componentsModule: resolvedComponentsModule,
        publicEntryModule: resolvedPublicEntryModule,
        sourceRoot: path.dirname(path.dirname(resolvedComponentsModule)),
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
        plugins: [
          forgeServiceLifecyclePlugin({ service, disposeService: options.service === undefined }),
          ...stagePlugins,
          jsxComponentsCssImportPlugin(),
          dtsPlugin,
        ],
      },
      overrides ?? {},
    ),
  });
}

export interface JsxHookLibraryConfigOptions {
  /** Absolute root directory of the package (e.g. `__dirname`). */
  rootDir: string;
  /** Explicit output plugin; omit it only for a neutral hook build. */
  plugin?: FrameworkOutputPlugin;
  /** Base global/UMD name of the library (e.g. `'MissionPlatformD3'`). */
  name: string;
  /** Path to the neutral hook entry module (defaults to `src/index.ts`). */
  entryModule?: string;
  /** Additional Rollup externals. */
  external?: string[];
  /** Extra Vite configuration overrides to merge. */
  overrides?: UserConfig;
  /** Persistent service shared by component and hook helpers in one build session. */
  service?: ForgeCompilerService;
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
}

export function defineJsxHookLibraryConfig(options: JsxHookLibraryConfigOptions): UserConfig {
  const {
    rootDir,
    plugin,
    name,
    entryModule,
    external = [],
    overrides,
    router,
    routerPlugins,
    routerConditions,
  } = options;
  const resolvedEntry = entryModule ?? path.resolve(rootDir, 'src/index.ts');

  if (plugin !== undefined) {
    validateForgeBuildPlugin(plugin, 'vite');
    const service = options.service ?? createForgeCompilerService();
    const framework = plugin.id as JsxFramework;
    const cacheName = `${path.basename(rootDir)}-${framework}`;
    const generatedDir = path.join(rootDir, 'node_modules/.cache', cacheName);
    const entry = generateHookLibrarySources({
      plugin,
      entryModule: resolvedEntry,
      outDir: generatedDir,
      service,
      router,
      routerPlugins,
      routerConditions,
      rejectFixturePlaceholder: true,
    });
    const frameworkSuffix = plugin.displayNameSuffix ?? plugin.id;
    const frameworkExternals = plugin.runtimeExternals ?? [];

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
            forgeServiceLifecyclePlugin({ service, disposeService: options.service === undefined }),
            ...(plugin.build.vite?.({
              rootDir,
              generatedDirectory: generatedDir,
              outputDirectory: path.resolve(rootDir, `dist/${framework}`),
            }) ?? []),
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
