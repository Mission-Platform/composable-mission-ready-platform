import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  generateStoryblokBloks,
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
 *   build-cache directory: React `.tsx` modules, or real Vue `.vue` SFCs
 *   (`<script setup lang="tsx">` with a `render` closure rendered from the
 *   `<template>` and the React-style hooks translated to Vue reactivity). It
 *   returns the generated entry path.
 * - **Stage 2** — the framework's own toolchain compiles that tree natively:
 *   the classic-`h` React JSX transform (`reactJsxPlugin`) or
 *   `@vitejs/plugin-vue` (from `defineLibraryConfig`) + `@vitejs/plugin-vue-jsx`.
 *
 * Each build runs with **`preserveModules` + `cssCodeSplit`**, so every
 * component is emitted as its own JS chunk **and** its own CSS asset (from the
 * component's co-located `.module.scss`). Combined with `sideEffects` in
 * `package.json` (CSS only), consumers importing a single component pull just
 * that component's JS + CSS and tree-shake the rest of the library away.
 *
 * The two frameworks are emitted into separate `dist/<framework>/` subtrees
 * (so their identically-named per-component chunks never collide) and exposed
 * through the package's `./react` and `./vue` subpath exports. A single
 * `pnpm build` runs this config once per framework (selected by `--mode`); the
 * build script clears `dist` once up front, so each framework build only needs
 * to manage its own subtree.
 *
 * Each framework build gets its **own** genuine declarations from
 * {@link jsxComponentsDtsPlugin}, a post-build step that runs the framework's
 * declaration toolchain over the generated tree (the TypeScript compiler API
 * over the React `.tsx` tree; `vue-tsc` over the Vue `.vue` tree). The React
 * declarations reference React's own types (`ReactNode`/`RefObject`/…) and the
 * Vue declarations each SFC's precise `DefineComponent` — rather than both
 * re-importing one shared neutral props declaration. `tsc` still emits the
 * neutral components' own declarations into `dist/components/**` for the
 * package's neutral `.` / `./base-drawer` entry points.
 */
const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/**
 * The `vue-tsc` CLI used to emit the Vue build's declarations. It ships as a
 * dependency of `@mission-platform/jsx` (this package's direct dependency), so
 * it is resolved from the jsx package directory rather than assumed hoisted.
 */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/jsx')],
});

/** Build the per-framework library config (shared between the Vue and React modes). */
function defineFrameworkConfig(framework: 'react' | 'vue'): UserConfig {
  const cacheName = `components-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: framework === 'react' ? 'MissionPlatformJsxComponentsReact' : 'MissionPlatformJsxComponentsVue',
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
        // Re-attach each component's extracted CSS to its JS chunk (Vite lib mode
        // emits the CSS asset but does not import it), so per-component styles load.
        jsxComponentsCssImportPlugin(),
        // Emit each framework's own genuine declarations from its generated tree
        // (React via the TS compiler API, Vue via `vue-tsc`), so React consumers
        // see React types and Vue consumers see each SFC's `DefineComponent`.
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

/**
 * Ship the generated Storyblok wrapper entry's `index.d.ts`. The plugin's
 * {@link generateStoryblokBloks} already synthesises a **precisely typed**
 * declaration alongside the entry (each wrapper's `blok` prop is
 * `SbBlokData & { … }`, one member per schema field — not an open
 * `Record<string, unknown>`), so we just emit that file verbatim (the generated
 * entry itself is not a `tsc`-visible source file).
 */
function storyblokEntryDeclarationsPlugin(cacheDirectory: string): Plugin {
  return {
    name: '@mission-platform/components:storyblok-entry-dts',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.d.ts',
        source: readFileSync(path.join(cacheDirectory, 'index.d.ts'), 'utf8'),
      });
    },
  };
}

/** Copy the generated, framework-agnostic blok configuration JSON into the shipped `dist/storyblok` tree. */
function storyblokConfigAssetsPlugin(cacheDirectory: string): Plugin {
  return {
    name: '@mission-platform/components:storyblok-config-assets',
    closeBundle() {
      const destination = path.resolve(__dirname, 'dist/storyblok');
      mkdirSync(destination, { recursive: true });
      for (const file of readdirSync(cacheDirectory)) {
        if (file.endsWith('.json')) {
          copyFileSync(path.join(cacheDirectory, file), path.join(destination, file));
        }
      }
    },
  };
}

/**
 * Build the per-framework Storyblok blok-wrapper library config.
 *
 * The same neutral components are also projected onto **Storyblok** by the
 * plugin's {@link generateStoryblokBloks} (Stage 1), which derives — per
 * component — the blok configuration JSON (a Storyblok *component object*) and
 * a framework **blok wrapper** that binds Storyblok's `blok` prop onto the
 * already-built framework component (imported from this package's own
 * `./react` / `./vue` subpath). Stage 2 compiles those wrappers natively, just
 * like the framework sources, into `dist/storyblok/<framework>/`, exposed
 * through the `./storyblok/react` and `./storyblok/vue` subpath exports.
 *
 * The blok configuration JSON is framework-agnostic, so it is copied once into
 * the shared `dist/storyblok/` tree (`components.json` — the
 * `storyblok push-components` shape — plus one `<component>.json` create-shape
 * file per component) and shipped via the `./storyblok/components.json` export.
 */
function defineStoryblokConfig(framework: 'react' | 'vue'): UserConfig {
  const cacheName = `components-storyblok-${framework}`;
  const cacheDirectory = path.join(cacheRoot, cacheName);
  const entry = generateStoryblokBloks({
    framework,
    componentsModule,
    outDir: cacheDirectory,
    // The wrappers forward to the package's own built framework subpath.
    componentsImport: `@mission-platform/components/${framework}`,
  });

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  return defineLibraryConfig({
    rootDir: __dirname,
    name:
      framework === 'react' ? 'MissionPlatformJsxComponentsStoryblokReact' : 'MissionPlatformJsxComponentsStoryblokVue',
    entry,
    // Keep each wrapper in its own chunk, mirroring the framework builds.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: [
      ...(framework === 'react' ? ['react', 'react-dom', '@storyblok/react'] : ['vue', '@storyblok/vue']),
      // The wrappers import the package's own built framework subpath.
      '@mission-platform/components',
    ],
    overrides: {
      build: {
        // Per-framework subtree under the shared dist/storyblok output.
        outDir: `dist/storyblok/${framework}`,
      },
      plugins: [
        ...stagePlugins,
        storyblokEntryDeclarationsPlugin(cacheDirectory),
        storyblokConfigAssetsPlugin(cacheDirectory),
      ],
    },
  });
}

export default defineConfig(({ mode }): UserConfig => {
  switch (mode) {
    case 'react': {
      return defineFrameworkConfig('react');
    }
    case 'storyblok-react': {
      return defineStoryblokConfig('react');
    }
    case 'storyblok-vue': {
      return defineStoryblokConfig('vue');
    }
    default: {
      return defineFrameworkConfig('vue');
    }
  }
});
