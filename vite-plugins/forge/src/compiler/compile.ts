/**
 * Stage-1 of the two-stage compiler: source-to-source transformation.
 *
 * A neutral component authored against `@mission-platform/forge` is parsed with
 * the Oxc parser and re-emitted as a per-framework **source
 * module** — a React `.tsx` or a Vue `.vue` single-file component. Stage 2 (the
 * framework's own Vite plugin / JSX transform) then compiles that module
 * natively, so the output never pays for a generic runtime adapter and a new
 * target framework is added simply by writing another emitter.
 */
import { createCompilerPipeline } from './pipeline.js';

import type { OptimizeOptions } from './optimize.js';
import type {
  CompilerDiagnostic,
  GeneratedModule,
  FrameworkOutputPlugin,
  OutputLanguage,
  TargetComponentHost,
} from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';

export { moduleTargetsFramework, readFrameworkDirective } from './ast.js';
export { analyzeForgeModule, createCompilerPipeline } from './pipeline.js';
export { analyzeRouterCapabilities, compileRouterModule, createRouterCompilerPipeline } from './router.js';
export { createGenericAst, parseForgeModule, parseForgeSource } from './frontends.js';
export { parseFrontendModule } from './frontends.js';
export { inferSemanticModule } from './infer.js';
export { buildForgeFileGraph } from './graph.js';
export { collectForgeDependents } from './graph.js';
export type {
  ForgeFileEdge,
  ForgeFileEdgeRelation,
  ForgeFileGraph,
  ForgeFileGraphOptions,
  ForgeFileKind,
  ForgeFileNode,
  ForgeGraphDiagnostic,
  ForgeGraphDiagnosticCode,
  ForgePathAliases,
} from './graph.js';
export type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  FrameworkSourceMetadata,
  GeneratedExtraModule,
  GeneratedModule,
  GeneratorContext,
  OutputLanguage,
  TargetContext,
  TargetComponentHost,
  TargetIntentions,
  TargetOptimizeOptions,
  TsdownBuildContext,
  ViteBuildContext,
} from '@mission-platform/forge-plugin-api';
export type { CompilerDiagnostic, CompilerDiagnosticSeverity, CompilerPhase } from '@mission-platform/forge-plugin-api';
export type {
  DynamicNodeIntention,
  EffectIntention,
  EventIntention,
  GenericAstNode,
  GenericImport,
  GenericModuleAst,
  GenericRenderNode,
  GenericStatement,
  ListKeyIntention,
  MemoIntention,
  PropIntention,
  RefIntention,
  SemanticIntentions,
  SemanticModule,
  SlotIntention,
  SourceBackedExpression,
  SourceSpan,
  StateIntention,
} from '@mission-platform/forge-plugin-api';
export type { CompilerInput, CompilerPipeline } from './pipeline.js';
export {
  createForgeCompilerService,
  PersistentForgeCompilerService,
  type CompiledArtifact,
  type ForgeCompileRequest,
  type ForgeCompilerService,
  type ForgeInvalidationResult,
  type ForgeProjectInput,
  type ForgeProjectSnapshot,
} from './service.js';
export {
  DEFAULT_FORGE_CACHE_LIMITS,
  createEmptyForgeCacheStats,
  type ForgeCacheLimits,
  type ForgeCacheStats,
} from './cache.js';
export {
  createForgeArtifactManifest,
  type ForgeArtifactKind,
  type ForgeArtifactManifest,
  type ForgeArtifactRecord,
} from './artifact-manifest.js';
export type { ForgeCompilationReport, ForgePhaseTiming } from './report.js';
export type { RouterCompilationResult, RouterCompilerInput } from './router.js';
export type { ForgeSourceKind, FrontendModule } from './frontends.js';
export {
  CompilerDiagnosticError,
  createCompilerDiagnostic,
  formatCompilerDiagnostic,
  throwOnCompilerErrors,
} from '@mission-platform/forge-plugin-api';
export {
  constantBoolean,
  hasMpStaticMarker,
  isCompileTimeConstant,
  MP_STATIC_ATTR,
  optimizeForgeModule,
  optimizeGenericModule,
  stripMpStaticAttributes,
  stripMpStaticMarker,
  type OptimizeOptions,
} from './optimize.js';

/** Options for {@link compileComponentModule}. */
export interface CompileOptions {
  /** The output plugin that owns target lowering and source generation. */
  framework: FrameworkOutputPlugin;
  /** The neutral component's export name (e.g. `ForgeBadge`); used by the Vue emitter. */
  componentName: string;
  /** Source file name used for diagnostics. Defaults to `<componentName>.tsx`. */
  fileName?: string;
  /** Owning workspace source root used to resolve `@/` imports. */
  sourceRoot?: string;
  /**
   * The folder base names of the package's discovered components (e.g.
   * `forge-typography`). A relative value import whose base is in this set is a
   * sibling **component** (the Vue emitter imports it as `./<base>.vue`);
   * everything else is a plain **helper module** (imported by name from
   * `./<base>`). When omitted every relative value import is treated as a
   * component, preserving the original behaviour.
   */
  componentFolders?: ReadonlySet<string>;
  /** Host metadata for sibling component references in target templates. */
  componentHosts?: ReadonlyMap<string, TargetComponentHost>;
  /**
   * Run the Stage-1 (framework-neutral) optimisation passes before emit.
   * Defaults to `true`. Pass `false` to disable every pass, or an
   * {@link OptimizeOptions} object to toggle individual ones.
   */
  optimize?: boolean | OptimizeOptions;
  /** Native router target selected independently from {@link framework}. */
  router?: RouterPluginSelection;
  routerPlugins?: readonly RouterOutputPlugin[];
  routerConditions?: readonly string[];
}

/** Options for compiling a module with an externally supplied output plugin. */
export interface CompileModuleOptions {
  /** The output plugin that owns lowering and source generation. */
  framework: FrameworkOutputPlugin;
  /** The neutral module kind being compiled. */
  moduleKind: 'component' | 'composable';
  /** The neutral component's export name, when compiling a component. */
  componentName?: string;
  /** Source file name used for diagnostics. */
  fileName?: string;
  /** Owning workspace source root used to resolve `@/` imports. */
  sourceRoot?: string;
  /** The folder base names of the package's discovered components. */
  componentFolders?: ReadonlySet<string>;
  /** Host metadata for sibling component references in target templates. */
  componentHosts?: ReadonlyMap<string, TargetComponentHost>;
  /** Run Stage-1 optimization passes before target lowering. */
  optimize?: boolean | OptimizeOptions;
  /** Native router target selected independently from {@link framework}. */
  router?: RouterPluginSelection;
  routerPlugins?: readonly RouterOutputPlugin[];
  routerConditions?: readonly string[];
}

/** An auxiliary SFC emitted alongside a primary module (e.g. a recursive helper component). */
export interface ExtraModule {
  /** The flat-tree base name (no extension) the module is written under, e.g. `forge-menubar-item`. */
  name: string;
  /** The emitted SFC source. */
  code: string;
  /** The extension/language the module is written under. */
  lang: OutputLanguage;
}

/** The Stage-1 result: emitted source and the extension it should be written under. */
export interface CompiledModule {
  /** The emitted per-framework source. */
  code: string;
  /**
   * The file extension/language of {@link CompiledModule.code}: `tsx` for a React/Solid
   * component/hook module, `vue` for a Vue SFC, `svelte` for a Svelte SFC, or `ts` for a hook module.
   */
  lang: OutputLanguage;
  /**
   * Auxiliary SFCs generated alongside the primary module (e.g. the recursive
   * helper components the Vue emitter extracts from a self-recursive,
   * state-capturing render helper). Written next to the primary SFC by the
   * driver and compiled in Stage 2. Empty/absent for the common single-file case.
   */
  extraModules?: ExtraModule[];
  /** Source map retained from the router pass or the framework generator. */
  map?: string | Readonly<Record<string, unknown>>;
  /** Declaration modules retained from the router pass or framework generator. */
  declarations?: { name: string; code: string }[];
  /** Phase-level diagnostics produced by an output plugin. */
  diagnostics?: CompilerDiagnostic[];
}

/**
 * Compile one neutral (or framework-gated) component module to its per-framework
 * source (Stage 1).
 *
 * A leading `"use react";` / `"use vue";` directive is stripped before emitting
 * so the marker never leaks into the output; gating a module out of the
 * non-matching framework's build is handled upstream by the discovery step
 * (see {@link moduleTargetsFramework}).
 */
export function compileComponentModule(source: string, options: CompileOptions): CompiledModule {
  return compileModule(source, {
    ...options,
    moduleKind: 'component',
  });
}

/**
 * Compile one neutral module through a caller-supplied output plugin.
 *
 * Unlike the historical JSX convenience wrappers, this entry point preserves
 * the plugin's open output language and auxiliary module languages. It is the
 * shared seam used by standalone target packages such as Astro.
 */
export function compileModule(source: string, options: CompileModuleOptions): CompiledModule {
  return projectGeneratedModule(
    createCompilerPipeline().compile(
      {
        source,
        fileName:
          options.fileName ?? (options.moduleKind === 'composable' ? 'hook.tsx' : `${options.componentName}.tsx`),
        moduleKind: options.moduleKind,
        componentName: options.componentName,
        componentFolders: options.componentFolders,
        componentHosts: options.componentHosts,
        sourceRoot: options.sourceRoot,
        optimize: options.optimize === false ? false : options.optimize === true ? {} : options.optimize,
        router: options.router,
        routerPlugins: options.routerPlugins,
        routerConditions: options.routerConditions,
      },
      options.framework,
    ),
  );
}

/** Options for {@link compileHookModule}. */
export interface CompileHookOptions {
  /** The output plugin that owns target lowering and source generation. */
  framework: FrameworkOutputPlugin;
  /** Source file name used for diagnostics. Defaults to `hook.tsx`. */
  fileName?: string;
  /** Owning workspace source root used to resolve `@/` imports. */
  sourceRoot?: string;
  /**
   * Run the Stage-1 (framework-neutral) optimisation passes before emit.
   * Defaults to `true`. Pass `false` to disable every pass, or an
   * {@link OptimizeOptions} object to toggle individual ones.
   */
  optimize?: boolean | OptimizeOptions;
}

/**
 * Compile one neutral **hook module** (a write-once composable authored against
 * `@mission-platform/forge`'s React-style hooks, *not* a UI component) to its
 * per-framework source (Stage 1).
 */
export function compileHookModule(source: string, options: CompileHookOptions): CompiledModule {
  return compileModule(source, {
    ...options,
    moduleKind: 'composable',
  });
}

function projectGeneratedModule(module: GeneratedModule): CompiledModule {
  return {
    code: module.code,
    lang: module.lang,
    extraModules: module.extraModules?.map((extraModule) => {
      return { name: extraModule.name, code: extraModule.code, lang: extraModule.lang };
    }),
    map: module.map,
    declarations: module.declarations ? [...module.declarations] : undefined,
    diagnostics: module.diagnostics ? [...module.diagnostics] : undefined,
  };
}
