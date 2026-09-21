/**
 * `@mission-platform/vite-plugin-forge`
 *
 * A framework-neutral compiler driver that turns components and composables authored
 * against `@mission-platform/forge-jsx` into native target artifacts across five
 * built-in frameworks (React, Vue 3, Solid, Svelte 5, Web Components) or arbitrary
 * custom plugin targets, with no generic runtime adapter:
 *
 * 1. **Parse & Normalize (Oxc).** Neutral `.tsx` source is parsed with Oxc into a
 *    generic AST and normalized into stable facts and markers. Oxc is the sole
 *    compiler AST path; legacy TypeScript AST shims are removed.
 * 2. **Neutral Optimize & Semantic IR.** Shared optimizations produce a framework-neutral
 *    `SemanticModule` capturing component/composable intentions, props, state, effects,
 *    and render trees.
 * 3. **Target Lower & Target Optimize.** The explicitly supplied `FrameworkOutputPlugin`
 *    lowers neutral semantics into a target-owned plan (`lower`), then refines it
 *    (`optimize`). Lowering is a required phase; target generation strictly requires
 *    a lowered and optimized plan (`assertTargetIntentionsLowered`).
 * 4. **Generate.** The plugin's `generate` phase emits native target source (e.g.,
 *    React `.tsx`, Vue `.vue` SFC, Solid `.tsx`, Svelte `.svelte`, or Web Components
 *    custom elements).
 * 5. **Native Build.** The generated tree is compiled by native framework toolchains
 *    configured via the plugin's `build.vite` or `build.tsdown` adapters.
 *
 * Custom targets are registered simply by implementing a `FrameworkOutputPlugin` with
 * an open `FrameworkId` (`JsxFramework | (string & {})`); there is no internal target
 * registry or enum switch in the driver.
 *
 * Because the generated public entry is not a `tsc`-visible source file,
 * {@link jsxComponentsEntryDtsPlugin} synthesises per-framework declarations at
 * build time.
 *
 * @example
 * ```ts
 * // tsdown.config.ts — one library config, Forge plugins inject lifecycle lazily
 * defineTsdownLibrary({
 *   rootDir: import.meta.dirname,
 *   entry: 'src/index.ts',
 *   plugins: tsdownForgeComponentPlugins({
 *     rootDir: import.meta.dirname,
 *     frameworks: [
 *       forgeReactFramework(),
 *       forgeVueFramework(),
 *       forgeSolidFramework(),
 *       forgeSvelteFramework(),
 *       forgeWebComponentsFramework(),
 *     ],
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

export { findComponentFunction, isSlotElement, readSlotName } from './compiler/components.js';
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
  ForgeBuildAdapters,
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
  resolveCanonicalChunkName,
  resolveCanonicalEntryName,
  type CanonicalChunkCandidate,
  type TsdownForgeComponentPluginsOptions,
  type TsdownForgeEmailComponentsOptions,
  type TsdownForgeHooksAllOptions,
} from './tsdown.js';
