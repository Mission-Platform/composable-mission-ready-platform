/**
 * `@mission-platform/vite-plugin-forge`
 *
 * A **two-stage** compiler that turns the framework-neutral components authored
 * against `@mission-platform/forge-jsx` into fully native React or Vue 3 components,
 * with no runtime adapter:
 *
 * 1. **Stage 1 — source-to-source.** {@link generateFrameworkSources} parses the
 *    neutral `.tsx` modules with Oxc and emits a
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
 * // tsdown.config.ts — one library config, Forge plugins inject lifecycle lazily
 * defineTsdownLibrary({
 *   rootDir: import.meta.dirname,
 *   entry: 'src/index.ts',
 *   plugins: tsdownForgeComponentPlugins({
 *     rootDir: import.meta.dirname,
 *     frameworks: [forgeReactFramework(), forgeVueFramework()],
 *   }),
 * });
 *
 * // vite.config.ts — high-level helper owns a build session; generation runs in buildStart
 * defineJsxLibraryConfig({
 *   rootDir: import.meta.dirname,
 *   plugin: forgeReactFramework(),
 *   name: 'MissionPlatformComponents',
 * });
 * ```
 */
export { forgeArtifactPublishPlugin, forgeBuildLifecyclePlugin, forgeVirtualEntry } from './build-integration.js';

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
export {
  createForgeArtifactWriter,
  forgeArtifactAttemptDirectory,
  type ForgeArtifactWriter,
} from './compiler/artifact-writer.js';
export {
  assertForgeArtifactRoot,
  ensureForgeArtifactDirectory,
  resolveForgeArtifactPath,
  validateForgeArtifactName,
  validateForgeArtifactSegment,
} from './compiler/artifact-path.js';
export {
  createForgeGenerationContext,
  type ForgeGenerationContext,
  type ForgeGenerationContextOptions,
} from './compiler/generation-context.js';
export {
  createForgeBuildSession,
  type CreateForgeBuildSessionOptions,
  type ForgeBuildKind,
  type ForgeBuildPlan,
  type ForgeBuildSession,
  type ForgeTargetGenerationContext,
  type ForgeTargetGenerationResult,
  type ForgeTargetPlan,
  type ForgeTargetResult,
} from './compiler/session.js';

export {
  CompilerDiagnosticError,
  createCompilerDiagnostic,
  formatCompilerDiagnostic,
  throwOnCompilerErrors,
} from '@mission-platform/forge-plugin-api';

export { findComponentFunction, isSlotElement, readSlotName } from './compiler/ast.js';
export { parseOxcModule, type OxcComment, type OxcNode, type OxcParsedModule } from './compiler/oxc.js';
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
  type GenerateFrameworkSourcesOptions,
  type FrameworkSourceTarget,
} from './generate.js';

export { generateHookLibrarySources, type GenerateHookLibrarySourcesOptions } from './generate-hooks.js';

export {
  defineTsdownForgeComponentsAll,
  defineTsdownForgeHooksAll,
  tsdownForgeComponentPlugins,
  tsdownForgeHookPlugins,
  defineTsdownForgeEmailComponents,
  type TsdownForgeComponentPluginsOptions,
  type TsdownForgeEmailComponentsOptions,
  type TsdownForgeHooksAllOptions,
} from './tsdown.js';
