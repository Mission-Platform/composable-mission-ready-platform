import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsEntryDtsPlugin,
  type JsxFramework,
  reactJsxPlugin,
  solidJsxPlugin,
  sveltePlugin,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * The package ships **only** framework-specific builds (no neutral artifact),
 * produced by the two-stage compiler in `@mission-platform/vite-plugin-forge`:
 *
 * - **Stage 1** — `generateFrameworkSources` reads the neutral icons barrel
 *   (`src/components/index.ts`) and emits a per-framework source tree into a
 *   build-cache directory: React `.tsx` modules, or real Vue `.vue` SFCs. It
 *   returns the generated entry path.
 * - **Stage 2** — the framework's own toolchain compiles that tree natively:
 *   the classic-`h` React JSX transform (`reactJsxPlugin`) or
 *   `@vitejs/plugin-vue` (from `defineLibraryConfig`) + `@vitejs/plugin-vue-jsx`.
 *
 * Each build runs with **`preserveModules` + `cssCodeSplit`**, so every icon is
 * emitted as its own JS chunk **and** its own CSS asset (from the icon's
 * co-located `.module.scss`). Combined with `sideEffects` in `package.json`
 * (CSS only), consumers importing a single icon pull just that icon's JS + CSS
 * and tree-shake the rest of the library away.
 *
 * The two frameworks are emitted into separate `dist/<framework>/` subtrees and
 * exposed through the package's `./react` and `./vue` subpath exports.
 *
 * `tsc` then emits the neutral icons' own declarations into `dist/components/**`,
 * which the synthesised entry `.d.ts` files import from.
 */
const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/** Build the per-framework library config (shared between all framework modes). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `icons-${framework}`;
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: path.join(cacheRoot, cacheName),
  });

  const stagePlugins: Plugin[] =
    framework === 'vue'
      ? [vueJsx()]
      : framework === 'react'
        ? [reactJsxPlugin()]
        : framework === 'solid'
          ? solidJsxPlugin()
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

  const frameworkExternals =
    framework === 'react'
      ? ['react', 'react-dom']
      : framework === 'vue'
        ? ['vue']
        : framework === 'solid'
          ? ['solid-js']
          : framework === 'svelte'
            ? ['svelte']
            : framework === 'web-components'
              ? ['lit']
              : [];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: `MissionPlatformIconsJsx${frameworkSuffix}`,
    entry,
    // Each icon keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: frameworkExternals,
    overrides: {
      build: {
        // Per-framework subtree, so the identically-named chunks never collide.
        outDir: `dist/${framework}`,
        // Emit one CSS asset per icon module rather than one combined file.
        cssCodeSplit: true,
      },
      plugins: [
        ...stagePlugins,
        // Re-attach each icon's extracted CSS to its JS chunk (Vite lib mode
        // emits the CSS asset but does not import it), so per-icon styles load.
        jsxComponentsCssImportPlugin(),
        jsxComponentsEntryDtsPlugin({
          framework,
          componentsModule,
          declarationFileName: 'index',
          // `dist/<framework>/index.d.ts` imports the neutral props types from `dist/components`.
          declarationModule: '../components',
        }),
      ],
    },
  });
}

export default defineConfig(({ mode }): UserConfig => {
  switch (mode) {
    case 'react':
    case 'vue':
    case 'solid':
    case 'svelte':
    case 'web-components': {
      return defineFrameworkConfig(mode);
    }
    default: {
      return defineFrameworkConfig('vue');
    }
  }
});
