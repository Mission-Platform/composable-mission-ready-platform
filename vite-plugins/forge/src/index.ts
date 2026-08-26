/**
 * `@mission-platform/vite-plugin-forge`
 *
 * A **two-stage** compiler that turns the framework-neutral components authored
 * against `@mission-platform/forge` into fully native React or Vue 3 components,
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
export { reactJsxPlugin as default } from './config.js';

/**
 * A Vite plugin that configures the automatic React JSX runtime for generated
 * sources authored in the neutral dialect. The Vue target instead uses
 * `@vitejs/plugin-vue` + `@vitejs/plugin-vue-jsx` and needs no JSX-transform config.
 *
 * The factory is configured through Vite's **`oxc`** transform option (Vite 8 /
 * Rolldown transforms JS/TS with Oxc, not esbuild). The neutral→React source
 * uses Oxc's `automatic` runtime with `importSource: 'react'`; the former
 * `esbuild` JSX fields are deprecated and warn under Rolldown-Vite.
 */
export {
  defineJsxHookLibraryConfig,
  defineJsxLibraryConfig,
  reactJsxPlugin,
  solidJsxPlugin,
  solidJsxTsdownPlugin,
  stagePluginsForTsdown,
  sveltePlugin,
  svelteTsdownPlugin,
  type JsxHookLibraryConfigOptions,
  type JsxLibraryConfigOptions,
} from './config.js';

export {
  analyzeForgeModule,
  compileModule,
  compileComponentModule,
  compileHookModule,
  createCompilerPipeline,
  createForgeCompilerService,
  PersistentForgeCompilerService,
  parseFrontendModule,
  parseForgeSource,
  type CompiledModule,
  type CompilerInput,
  type CompilerPipeline,
  type CompiledArtifact,
  type CompileHookOptions,
  type CompileModuleOptions,
  type CompileOptions,
  type ForgeCacheLimits,
  type ForgeCacheStats,
  type ForgeCompilationReport,
  type ForgeCompileRequest,
  type ForgeCompilerService,
  type ForgeInvalidationResult,
  type ForgeProjectInput,
  type ForgeProjectSnapshot,
} from './compiler/compile.js';
export { DEFAULT_FORGE_CACHE_LIMITS, createEmptyForgeCacheStats } from './compiler/cache.js';
export {
  createForgeArtifactManifest,
  type ForgeArtifactKind,
  type ForgeArtifactManifest,
  type ForgeArtifactRecord,
} from './compiler/artifact-manifest.js';
export { createForgeArtifactWriter, type ForgeArtifactWriter } from './compiler/artifact-writer.js';
export {
  createForgeGenerationContext,
  type ForgeGenerationContext,
  type ForgeGenerationContextOptions,
} from './compiler/generation-context.js';

export {
  CompilerDiagnosticError,
  createCompilerDiagnostic,
  formatCompilerDiagnostic,
  throwOnCompilerErrors,
} from '@mission-platform/forge-plugin-api';

export { findComponentFunction, isSlotElement, parseTsx, readSlotName } from './compiler/ast.js';
export {
  discoverComponentsFromGraph,
  discoverComponents,
  discoverHelperExportsFromGraph,
  discoverHelperExports,
  type DiscoveredComponent,
  type DiscoveredHelperExport,
} from './compiler/discover.js';

export { buildForgeFileGraph } from './compiler/graph.js';
export type {
  ForgeFileEdge,
  ForgeFileGraph,
  ForgeFileGraphOptions,
  ForgeFileKind,
  ForgeFileNode,
  ForgeGraphDiagnostic,
  ForgeGraphDiagnosticCode,
} from './compiler/graph.js';

export type {
  CompilerDiagnostic,
  CompilerDiagnosticSeverity,
  CompilerPhase,
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  FrameworkSourceMetadata,
  GeneratedExtraModule,
  GeneratedModule,
  GeneratorContext,
  JsxFramework,
  OutputLanguage,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
  TsdownBuildContext,
  ViteBuildContext,
} from '@mission-platform/forge-plugin-api';
export { validateForgeOutputPlugin, validateForgeOutputPluginSelection } from '@mission-platform/forge-plugin-api';

export type {
  GeneratedRouterDeclaration,
  GeneratedRouterModule,
  RouterBuildAdapters,
  RouterCapability,
  RouterCapabilityImport,
  RouterCapabilityModule,
  RouterCapabilityUse,
  RouterCapabilityUseKind,
  RouterOptimizeOptions,
  RouterOutputPlugin,
  RouterPluginSelection,
  RouterTargetContext,
  RouterTargetPlan,
} from '@mission-platform/forge-router-plugin-api';

export { analyzeRouterCapabilities, compileRouterModule, createRouterCompilerPipeline } from './compiler/router.js';

export {
  generateFrameworkSources,
  createFrameworkSourceTarget,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  jsxComponentsEntryDtsPlugin,
  type GenerateFrameworkSourcesOptions,
  type FrameworkSourceTarget,
  type JsxComponentsDtsOptions,
  type JsxComponentsEntryDtsOptions,
} from './generate.js';

export {
  generateHookLibrarySources,
  hookLibraryDtsPlugin,
  type GenerateHookLibrarySourcesOptions,
  type HookLibraryDtsOptions,
} from './generate-hooks.js';

export {
  defineTsdownForgeComponents,
  defineTsdownForgeEmailComponents,
  defineTsdownForgeHooks,
  defineTsdownForgeHooksAll,
  type TsdownForgeComponentsOptions,
  type TsdownForgeEmailComponentsOptions,
  type TsdownForgeHooksAllOptions,
  type TsdownForgeHooksOptions,
} from './tsdown.js';
