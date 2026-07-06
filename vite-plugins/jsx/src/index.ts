/**
 * `@mission-platform/vite-plugin-jsx`
 *
 * A **two-stage** compiler that turns the framework-neutral components authored
 * against `@mission-platform/jsx` into fully native React or Vue 3 components,
 * with no runtime adapter:
 *
 * 1. **Stage 1 — source-to-source.** {@link generateFrameworkSources} parses the
 *    neutral `.tsx` modules with the TypeScript compiler API and emits a
 *    per-framework source tree: a React `.tsx` module (`class` → `className`,
 *    `h` → `React.createElement`) or a real Vue `.vue` single-file component
 *    (`<script setup>` with native `<template>` markup where the body allows it,
 *    else a `render` closure rendered from the `<template>`; React-style hooks
 *    translated to Vue reactivity/lifecycle). Adding a target framework is just
 *    another emitter.
 * 2. **Stage 2 — native compile.** The generated tree is compiled by the
 *    framework's own toolchain — the classic-`h` React JSX transform (configured
 *    by {@link reactJsxPlugin}) or `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`)
 *    — so neither runtime pays for a generic walk.
 *
 * Because the generated public entry is not a `tsc`-visible source file,
 * {@link jsxComponentsEntryDtsPlugin} synthesises its `./react` / `./vue`
 * declarations at build time.
 *
 * @example
 * ```ts
 * // vite.config.ts (mode === 'react')
 * const entry = generateFrameworkSources({ framework: 'react', componentsModule, outDir });
 * defineLibraryConfig({
 *   rootDir: __dirname,
 *   entry,
 *   fileName: 'react',
 *   overrides: {
 *     plugins: [reactJsxPlugin(), jsxComponentsEntryDtsPlugin({ framework: 'react', componentsModule, declarationFileName: 'react' })],
 *   },
 * });
 * ```
 */
import type { Plugin } from 'vite';

/**
 * A Vite plugin that configures the classic `h` / `Fragment` JSX factory for the
 * generated **React** sources (their JSX is authored in the neutral dialect and
 * `h` is imported as `React.createElement`). The Vue target instead uses
 * `@vitejs/plugin-vue` + `@vitejs/plugin-vue-jsx` and needs no esbuild JSX config.
 */
export function reactJsxPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-jsx:react',
    enforce: 'pre',
    config() {
      return {
        esbuild: {
          jsxFactory: 'h',
          jsxFragment: 'Fragment',
        },
      };
    },
  };
}

export {
  compileComponentModule,
  type CompiledModule,
  type CompileOptions,
  type JsxFramework,
} from './compiler/compile.js';

export {
  analyzeStoryblokComponent,
  emitBlokDataType,
  emitStoryblokBlokWrapper,
  emitStoryblokComponent,
  toDisplayName,
  toTechnicalName,
  type AnalyzedField,
  type AnalyzedStoryblokComponent,
  type StoryblokBlokWrapperOptions,
  type StoryblokComponent,
  type StoryblokComponentNames,
  type StoryblokSchemaField,
  // eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
} from './generators/storyblok/index.js';

export {
  generateFrameworkSources,
  generateStoryblokBloks,
  jsxComponentsCssImportPlugin,
  jsxComponentsEntryDtsPlugin,
  type GenerateFrameworkSourcesOptions,
  type GenerateStoryblokBloksOptions,
  type JsxComponentsEntryDtsOptions,
} from './generate.js';

export default reactJsxPlugin;
