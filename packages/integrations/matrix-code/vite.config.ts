import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  type JsxFramework,
  reactJsxPlugin,
  solidJsxPlugin,
  sveltePlugin,
} from '@mission-platform/vite-plugin-forge';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * `@mission-platform/matrix-code` ships **three** distinct build artifacts from
 * a single Vite config, selected by `--mode`:
 *
 * - **default** — the dependency-free package-local FWS **encoder + decoder**
 *   (`src/index.ts`), emitted as the self-contained `dist/index.js`. This is
 *   the package's `.` export.
 * - **`vue` / `react`** — the write-once `ForgeMatrixCode` **component** compiled
 *   to native Vue 3 / React by the two-stage compiler in
 *   `@mission-platform/vite-plugin-forge` (Stage 1 generates the per-framework
 *   source tree from the neutral barrel `src/component/index.ts`; Stage 2 is the
 *   framework's own toolchain). These are the package's `./vue` / `./react`
 *   exports. The component imports the encoder from the package's own `.` entry
 *   (`@mission-platform/matrix-code`, kept external), reuses `ForgeButton` from
 *   `@mission-platform/components`; typography is supplied by the dedicated
 *   `@mission-platform/typography` package.
 */

const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/**
 * The `vue-tsc` CLI used to emit the Vue build's declarations. It ships as a
 * dependency of `@mission-platform/forge-jsx` (a transitive dependency here), so it is
 * resolved from the jsx package directory rather than assumed hoisted.
 */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/forge-jsx')],
});

/** The self-contained encoder/decoder bundle (`dist/index.js`, the `.` export). */
function defineEncoderConfig(): UserConfig {
  return defineLibraryConfig({
    rootDir: __dirname,
    entry: {
      index: 'src/index.ts',
    },
    name: 'MissionPlatformMatrixCode',
    // Keep the package-local FWS loaders self-contained rather than emitting a
    // separate module graph.
    preserveModules: false,
    overrides: {
      plugins: [forgeWebScriptPlugin({ root: __dirname, requireExports: false, selfHostedVmMode: 'aot' })],
    },
  });
}

/** The per-framework `ForgeMatrixCode` component build (`dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `matrix-code-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
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
    name: `MissionPlatformMatrixCode${frameworkSuffix}`,
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    // The encoder is consumed through the package's own `.` entry, kept external
    // so the shipped component references it rather than re-inlining the wasm.
    external: [...frameworkExternals, '@mission-platform/matrix-code'],
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
        // Emit each framework's own genuine declarations from its generated tree
        // (React via the TS compiler API, Vue via `vue-tsc`).
        jsxComponentsDtsPlugin({
          framework,
          generatedDir,
          outDir: path.resolve(__dirname, `dist/${framework}`),
          vueTscBin,
          componentsModule,
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
      return defineEncoderConfig();
    }
  }
});
