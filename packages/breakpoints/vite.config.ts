import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsEntryDtsPlugin,
  reactJsxPlugin,
  type JsxFramework,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * The breakpoint components ship as **framework-specific** builds (no neutral
 * artifact), produced by the two-stage compiler in
 * `@mission-platform/vite-plugin-forge`:
 *
 * - **Stage 1** — `generateFrameworkSources` reads the neutral components barrel
 *   (`src/components/index.ts`) and emits a per-framework source tree into a
 *   build-cache directory: React `.tsx` modules, or real Vue `.vue` SFCs. It
 *   returns the generated entry path.
 * - **Stage 2** — the framework's own toolchain compiles that tree natively: the
 *   classic-`h` React JSX transform (`reactJsxPlugin`) or `@vitejs/plugin-vue`
 *   (from `defineLibraryConfig`) + `@vitejs/plugin-vue-jsx`.
 *
 * Each build runs with **`preserveModules` + `cssCodeSplit`**, so each component
 * is emitted as its own JS chunk (and, for `BreakpointDebug`, its own CSS asset
 * from the co-located `.module.scss`). The two frameworks land in separate
 * `dist/<framework>/` subtrees, exposed through the `./react` and `./vue`
 * subpath exports.
 *
 * `tsc` then emits the neutral components' own declarations into
 * `dist/components/**`, which the synthesised entry `.d.ts` files import from.
 */
const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/** Build the per-framework library config (shared between all framework modes). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `breakpoints-${framework}`;
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: path.join(cacheRoot, cacheName),
  });

  const stagePlugins: Plugin[] = framework === 'vue' ? [vueJsx()] : framework === 'react' ? [reactJsxPlugin()] : [];

  const frameworkSuffix = framework === 'react' ? 'React' : 'Vue';

  // `@mission-platform/i18n/{react,vue}` (the injected `useI18n` import) and the
  // now-dead `i18next` import the compiler carries through are provided by the
  // consumer, so keep them external rather than bundling i18next's runtime.
  const sharedExternals = ['i18next', /^@mission-platform\/i18n(\/.*)?$/];
  const frameworkExternals =
    framework === 'react'
      ? ['react', 'react-dom', ...sharedExternals]
      : framework === 'vue'
        ? ['vue', ...sharedExternals]
        : sharedExternals;

  return defineLibraryConfig({
    rootDir: __dirname,
    name: `MissionPlatformBreakpoints${frameworkSuffix}`,
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: frameworkExternals,
    overrides: {
      build: {
        // Per-framework subtree, so the identically-named chunks never collide.
        outDir: `dist/${framework}`,
        // Emit one CSS asset per component module rather than one combined file.
        cssCodeSplit: true,
      },
      plugins: [
        ...stagePlugins,
        // Re-attach each component's extracted CSS to its JS chunk (Vite lib mode
        // emits the CSS asset but does not import it), so per-component styles load.
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
    case 'vue': {
      return defineFrameworkConfig(mode);
    }
    default: {
      return defineFrameworkConfig('vue');
    }
  }
});
