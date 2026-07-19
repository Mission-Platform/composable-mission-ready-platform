import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  reactJsxPlugin,
} from '@mission-platform/vite-plugin-jsx';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * The package ships **only** framework-specific builds (no neutral artifact),
 * produced by the two-stage compiler in `@mission-platform/vite-plugin-jsx`:
 *
 * - **Stage 1** — `generateFrameworkSources` reads the neutral components barrel
 *   (`src/components/index.ts`) and emits a per-framework source tree into a
 *   build-cache directory: React `.tsx` modules / real Vue `.vue` SFCs, plus the
 *   package's composables/context/store carried alongside (the neutral
 *   composables and `map-context` are compiled per framework; the agnostic
 *   `drawing-store`/`to-map-color` helpers are copied verbatim).
 * - **Stage 2** — the framework's own toolchain compiles that tree natively
 *   (the classic-`h` React JSX transform / `@vitejs/plugin-vue` + `plugin-vue-jsx`).
 *
 * The two frameworks are emitted into separate `dist/<framework>/` subtrees and
 * exposed through the `./react` and `./vue` subpath exports. Each build runs
 * `preserveModules` + `cssCodeSplit` so every component keeps its own JS chunk +
 * CSS asset, and gets its own genuine declarations from
 * {@link jsxComponentsDtsPlugin} (the TS compiler API over the React tree,
 * `vue-tsc` over the Vue tree). `tsc` also emits the neutral components' own
 * declarations into `dist/components/**` for the package's neutral `.` entry.
 */
const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/**
 * The `vue-tsc` CLI used to emit the Vue build's declarations. It ships as a
 * dependency of `@mission-platform/jsx`, so it is resolved from the jsx package
 * directory rather than assumed hoisted.
 */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/jsx')],
});

/** Build the per-framework library config (shared between the Vue and React modes). */
function defineFrameworkConfig(framework: 'react' | 'vue'): UserConfig {
  const cacheName = `map-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: framework === 'react' ? 'MissionPlatformJsxMapReact' : 'MissionPlatformJsxMapVue',
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: framework === 'react' ? ['react', 'react-dom'] : ['vue'],
    overrides: {
      build: {
        // Per-framework subtree, so the identically-named chunks never collide.
        outDir: `dist/${framework}`,
        // Emit one CSS asset per component module rather than one combined file.
        cssCodeSplit: true,
      },
      plugins: [
        ...stagePlugins,
        jsxComponentsCssImportPlugin(),
        jsxComponentsDtsPlugin({
          framework,
          generatedDir,
          outDir: path.resolve(__dirname, `dist/${framework}`),
          vueTscBin,
        }),
      ],
    },
  });
}

export default defineConfig(({ mode }): UserConfig => {
  switch (mode) {
    case 'react': {
      return defineFrameworkConfig('react');
    }
    default: {
      return defineFrameworkConfig('vue');
    }
  }
});
