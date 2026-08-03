import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  reactJsxPlugin,
  type JsxFramework,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * `@mission-platform/wysiwyg` ships **only** framework-specific builds (no
 * neutral artifact), produced by the two-stage compiler in
 * `@mission-platform/vite-plugin-forge` — mirroring `@mission-platform/components`:
 *
 * - **Stage 1** — {@link generateFrameworkSources} reads the neutral components
 *   barrel (`src/components/index.ts`) and emits a per-framework source tree
 *   into a build-cache directory (React `.tsx` modules, or real Vue `.vue`
 *   SFCs). The cross-package write-once imports (`@mission-platform/components`,
 *   `@mission-platform/icons`) are re-pointed to each framework's built subpath.
 * - **Stage 2** — the framework's own toolchain compiles that tree natively
 *   (`@vitejs/plugin-vue-jsx` for Vue, the classic-`h` React JSX transform for
 *   React).
 *
 * Each build runs with `preserveModules` + `cssCodeSplit`, so every component is
 * emitted as its own JS chunk **and** its own CSS asset (from the co-located
 * `.module.scss`), and each framework gets its own genuine declarations from
 * {@link jsxComponentsDtsPlugin}. The two frameworks are emitted into separate
 * `dist/<framework>/` subtrees exposed through the `./react` and `./vue` exports.
 */
const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/**
 * The `vue-tsc` CLI used to emit the Vue build's declarations. It ships as a
 * dependency of `@mission-platform/forge` (this package's direct dependency), so
 * it is resolved from the jsx package directory rather than assumed hoisted.
 */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/forge')],
});

/** Build the per-framework library config (shared between all framework modes). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `wysiwyg-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] = framework === 'vue' ? [vueJsx()] : framework === 'react' ? [reactJsxPlugin()] : [];

  const frameworkSuffix = framework === 'react' ? 'React' : 'Vue';

  const frameworkExternals = framework === 'react' ? ['react', 'react-dom'] : ['vue'];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: `MissionPlatformWysiwyg${frameworkSuffix}`,
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
        // Re-attach each component's extracted CSS to its JS chunk.
        jsxComponentsCssImportPlugin(),
        // Emit each framework's own genuine declarations from its generated tree.
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
    case 'vue': {
      return defineFrameworkConfig(mode);
    }
    default: {
      return defineFrameworkConfig('vue');
    }
  }
});
