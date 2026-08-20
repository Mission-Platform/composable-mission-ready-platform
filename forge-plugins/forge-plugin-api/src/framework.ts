import type { CompilerDiagnostic } from "./diagnostics.js";
import type { SemanticModule } from "./ir.js";
import type { TsdownPlugin, UserConfig as TsdownUserConfig } from "tsdown";
import type { Plugin, UserConfig as ViteUserConfig } from "vite";

/** Current built-in framework IDs; plugins may use any additional string ID. */
export type JsxFramework =
  "react" | "vue" | "svelte" | "solid" | "web-components";

/** Output languages known by Forge, with an open string extension point for new targets. */
export type OutputLanguage =
  "tsx" | "jsx" | "ts" | "vue" | "svelte" | "astro" | (string & {});

/** A generated auxiliary module written beside the primary generated module. */
export interface GeneratedExtraModule {
  readonly name: string;
  readonly code: string;
  readonly lang: OutputLanguage;
}

/** The source artifact returned by a framework output plugin. */
export interface GeneratedModule {
  readonly code: string;
  readonly lang: OutputLanguage;
  readonly extraModules?: readonly GeneratedExtraModule[];
  /** Optional source map retained by chained compiler passes. */
  readonly map?: string | Readonly<Record<string, unknown>>;
  /** Optional declaration modules retained by chained compiler passes. */
  readonly declarations?: readonly {
    readonly name: string;
    readonly code: string;
  }[];
  readonly diagnostics?: readonly CompilerDiagnostic[];
}

/** Context shared by target lowering and optimization. */
export interface TargetContext {
  readonly framework: string;
  readonly moduleKind: "component" | "composable";
  readonly componentName?: string;
  readonly componentFolders?: ReadonlySet<string>;
  /** Host metadata for sibling component references, when a target needs it. */
  readonly componentHosts?: ReadonlyMap<string, TargetComponentHost>;
}

/** Target-neutral host invocation metadata shared by generated component references. */
export interface TargetComponentHost {
  readonly baseTag?: string;
  readonly invocation: "is-attribute" | "custom-tag";
}

/**
 * The target-owned plan produced by a plugin's `lower` phase and refined by its
 * `optimize` phase. Each target declares its own extension of this contract and
 * discriminates it on {@link TargetLoweredModule.framework}, so a plan can be
 * narrowed without casting while every plugin still satisfies the same
 * {@link TargetIntentions} shape.
 */
export interface TargetLoweredModule {
  readonly framework: string;
  /** Identifiers of the target optimizations applied to this plan. */
  readonly appliedOptimizations: readonly string[];
}

/** Target-specific intention wrapper; neutral facts remain available to later passes. */
export interface TargetIntentions {
  readonly framework: string;
  readonly module: SemanticModule;
  readonly context: TargetContext;
  readonly diagnostics?: readonly CompilerDiagnostic[];
  /** The lowered target plan, when the plugin implements a real lowering phase. */
  readonly lowered?: TargetLoweredModule;
}

/** Neutral optimization options shared by the compiler and target plugins. */
export interface NeutralOptimizeOptions {
  readonly deadBranchPruning?: boolean;
  readonly staticMarking?: boolean;
  readonly stableKeyInference?: boolean;
}

/** Options passed to a target optimizer without changing the public neutral options. */
export interface TargetOptimizeOptions {
  readonly neutral: NeutralOptimizeOptions;
  readonly custom?: Readonly<Record<string, unknown>>;
}

/** Context passed to source generators after target lowering and optimization. */
export type GeneratorContext = TargetContext;

/** Shared context for framework-owned Vite plugin bundles. */
export interface ViteBuildContext {
  readonly rootDir?: string;
  readonly generatedDirectory?: string;
  readonly outputDirectory?: string;
  readonly config?: ViteUserConfig;
}

/** Shared context for framework-owned tsdown/Rolldown plugin bundles. */
export interface TsdownBuildContext {
  readonly rootDir?: string;
  readonly generatedDirectory?: string;
  readonly outputDirectory?: string;
  readonly config?: TsdownUserConfig;
}

/** Independently typed framework build integrations. */
export interface FrameworkBuildAdapters {
  readonly vite?: (context: ViteBuildContext) => readonly Plugin[];
  readonly tsdown?: (context: TsdownBuildContext) => readonly TsdownPlugin[];
}

/** Source-tree conventions required by the framework-neutral build driver. */
export interface FrameworkSourceMetadata {
  readonly componentExtension: string;
  readonly componentImportExtension: string;
  readonly composableExtension: string;
  readonly entryExtension: string;
  readonly componentExport: "default" | "named" | "element";
}

/** A composable post-IR framework output plugin. */
export interface FrameworkOutputPlugin {
  readonly id: JsxFramework | string;
  /** Optional implementation version used to invalidate target artifacts. */
  readonly version?: string;
  readonly outputLanguage: OutputLanguage;
  /** Output language used when the plugin compiles neutral hook modules. */
  readonly hookOutputLanguage?: OutputLanguage;
  readonly source: FrameworkSourceMetadata;
  readonly runtimeExternals?: readonly string[];
  readonly displayNameSuffix?: string;
  readonly lower: (
    ir: SemanticModule,
    context: TargetContext,
  ) => TargetIntentions;
  /** Prepare cross-module metadata used while lowering generated components. */
  readonly prepareComponentHosts?: (
    modules: readonly {
      readonly componentName: string;
      readonly module: SemanticModule;
    }[],
  ) => ReadonlyMap<string, TargetComponentHost>;
  readonly optimize: (
    intentions: TargetIntentions,
    options: TargetOptimizeOptions,
  ) => TargetIntentions;
  readonly generate: (
    intentions: TargetIntentions,
    context: GeneratorContext,
  ) => GeneratedModule;
  readonly build: FrameworkBuildAdapters;
}

/** Caller-owned target selection; validation rejects empty and duplicate IDs. */
export type FrameworkOutputPluginSelection = readonly FrameworkOutputPlugin[];
