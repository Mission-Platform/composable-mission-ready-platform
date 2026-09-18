import type {
  FlintAnalysisOptions,
  FlintAnalysisReport,
  FlintAnalysisRule,
  FlintAnalysisSourceMap,
  FlintAnalysisPolicy,
} from './analysis';
import type { FlintFunction, FlintModule } from './ast.js';
import type { FlintWatCache } from './cache.js';
import type { FlintDiagnostic } from './diagnostics.js';
import type { FlintLinkConfiguration, FlintModuleGraph } from './graph.js';
import type { FlintIrModule } from './ir.js';
import type { FlintAbiManifest, FlintDynamicLinkMetadata, FlintLinkedExport, FlintSourceImport } from './manifest.js';
import type { FlintOptimizationReport } from './optimizer.js';
import type { FlintSelfHostedCompilerStage, FlintSelfHostedStageArtifact } from './self-hosted/artifact.js';
import type { FlintSoNBoundsChecks, FlintSoNModule, FlintSoNOptimizationReport } from './son-ir.js';
import type { FlintStandardLibraryIdentity } from './stdlib/regex.js';

export {
  FLINT_LANGUAGE_VERSION,
  FLINT_ABI_VERSION,
  type FlintLanguageVersion,
  type FlintAbiVersion,
} from './manifest.js';

export type FlintOptimization = 'debug' | 'release';

/** Named cross-project packaging profile used by graph-aware consumers. */
export type FlintLinkProfile = 'static' | 'dynamic';

/** Link-time policy recorded alongside the ordinary compiler optimization. */
export type FlintLinkOptimizationProfile = 'standard' | 'static-aggressive' | 'dynamic-conservative';

export interface FlintCompilerLogger {
  readonly scope: string;
  readonly log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ) => void;
}

export interface FlintTargetFeatures {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
}

export interface FlintCompilerHints {
  readonly tailCallFunctions?: readonly string[];
  readonly iteratorUnrollLimit?: number;
}

export interface FlintDebugArtifacts {
  readonly optimizedWat?: string;
  readonly unoptimizedWat?: string;
  readonly optimizedWasm?: Uint8Array;
  readonly unoptimizedWasm?: Uint8Array;
}

export interface FlintIteratorExport {
  readonly name: string;
  readonly nextFunction: string;
  readonly elementType: string;
  readonly resultRepresentation: 'value-done-pair';
  readonly ownership: 'borrowed' | 'owned' | 'shared';
}

export type FlintVmExecutionMode = 'interpret' | 'jit' | 'aot';

/** Result of the bounded FWS-authored compiler stage used by tooling adapters. */
export interface FlintSelfHostedStageReport {
  /** Stage identity is optional for compatibility with the original lex-only runner. */
  readonly stage?: FlintSelfHostedCompilerStage;
  readonly mode: FlintVmExecutionMode;
  readonly lexFingerprint: number;
  readonly expectedLexFingerprint: number;
  readonly parity: boolean;
  readonly steps: number;
  readonly inputHash?: string;
  readonly outputHash?: string;
  readonly expectedOutputHash?: string;
  readonly artifact?: FlintSelfHostedStageArtifact;
  readonly diagnostic?: FlintDiagnostic;
  /** Reports for additional promoted stages returned by a compatibility runner. */
  readonly stageReports?: readonly FlintSelfHostedStageReport[];
}

/** VM entry point supplied by the runtime without coupling the browser-safe facade to it. */
export type FlintSelfHostedStageRunner = (
  input: Pick<FlintCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: FlintVmExecutionMode,
) => FlintSelfHostedStageReport;

export interface FlintCompilerServiceOptions {
  /** The bounded FWS stage runner. Remaining frontend/backend stages stay seed-backed. */
  readonly selfHostedRunner?: FlintSelfHostedStageRunner;
  readonly selfHostedVmMode?: FlintVmExecutionMode;
  /** Default source-analysis policy and rules for service consumers. */
  readonly analysisPolicy?: FlintAnalysisPolicy;
  readonly analysisRules?: readonly FlintAnalysisRule[];
}

export type FlintAsyncCapability = 'scheduler.microtask' | 'scheduler.worker';

/** Explicit async boundary shared by VM, Wasm, and host adapters. */
export interface FlintAsyncCompilationContract {
  readonly capabilities: readonly FlintAsyncCapability[];
  readonly deterministic: true;
  readonly taskIdRepresentation: 'u32';
  readonly messageRepresentation: 'owned-bytes';
  readonly ordering: 'sequence';
}

export interface FlintCompileInput {
  readonly source: string;
  readonly fileName: string;
  readonly compilerVersion: string;
  /** Require every function declaration to opt into the Wasm ABI. */
  readonly requireExports?: boolean;
  readonly optimization?: FlintOptimization;
  readonly requestedCapabilities?: readonly string[];
  /** Imported function signatures supplied by a graph/editor host. */
  readonly externalFunctions?: readonly FlintFunction[];
  readonly root?: string;
  readonly watCache?: FlintWatCache;
  readonly linkConfiguration?: FlintLinkConfiguration;
  readonly linkProfile?: FlintLinkProfile;
  /** Compiler-owned stdlib identities are part of cache/artifact inputs. */
  readonly standardLibrary?: FlintStandardLibraryIdentity;
  readonly async?: FlintAsyncCompilationContract;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintCompilerHints;
  /** Runtime bounds checks are part of the semantic/cache identity. */
  readonly boundsChecks?: FlintSoNBoundsChecks;
  readonly logger?: FlintCompilerLogger;
  /** Analysis is additive; `analysisPolicy` and `analysisRules` are compatibility shortcuts. */
  readonly analysis?: FlintAnalysisOptions;
  readonly analysisPolicy?: FlintAnalysisPolicy;
  readonly analysisRules?: readonly FlintAnalysisRule[];
  readonly analysisSourceMap?: FlintAnalysisSourceMap;
}

export interface FlintGraphCompileInput {
  readonly graph: FlintModuleGraph;
  readonly entryFileName: string;
  readonly compilerVersion: string;
  /** Require every function declaration to opt into the Wasm ABI. */
  readonly requireExports?: boolean;
  readonly optimization?: FlintOptimization;
  readonly requestedCapabilities?: readonly string[];
  readonly linkConfiguration?: FlintLinkConfiguration;
  readonly linkProfile?: FlintLinkProfile;
  readonly standardLibrary?: FlintStandardLibraryIdentity;
  readonly watCache?: FlintWatCache;
  readonly async?: FlintAsyncCompilationContract;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintCompilerHints;
  readonly logger?: FlintCompilerLogger;
  readonly analysis?: FlintAnalysisOptions;
  readonly analysisPolicy?: FlintAnalysisPolicy;
  readonly analysisRules?: readonly FlintAnalysisRule[];
  readonly analysisSourceMap?: FlintAnalysisSourceMap;
  readonly boundsChecks?: FlintSoNBoundsChecks;
}

export interface FlintFrontendLinkMetadata {
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: 'static' | 'dynamic';
  readonly sourceImports?: readonly FlintSourceImport[];
  readonly linkedExports?: readonly FlintLinkedExport[];
  readonly linkedModules: readonly string[];
  readonly linkProfile?: FlintLinkProfile;
  readonly optimizationProfile?: FlintLinkOptimizationProfile;
}

/** The stable, backend-independent result of parsing, checking, and lowering a module. */
export interface FlintFrontendResult {
  readonly source: string;
  readonly fileName: string;
  readonly module?: FlintModule;
  readonly ir?: FlintIrModule;
  readonly optimizedModule?: FlintModule;
  readonly optimizedIr?: FlintIrModule;
  /** Canonical semantic graph; the optimized graph is the backend boundary. */
  readonly unoptimizedSonIr?: FlintSoNModule;
  readonly sonIr?: FlintSoNModule;
  readonly sonOptimizationReport?: FlintSoNOptimizationReport;
  readonly optimizationReport?: FlintOptimizationReport;
  readonly abi?: FlintAbiManifest;
  readonly links: FlintFrontendLinkMetadata;
  readonly sourceFiles: readonly string[];
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly analysis?: FlintAnalysisReport;
}

/** Input owned by a backend implementation after frontend validation succeeds. */
export interface FlintBackendInput {
  readonly ir: FlintIrModule;
  readonly optimizedIr: FlintIrModule;
  readonly abi: FlintAbiManifest;
  readonly links: FlintFrontendLinkMetadata;
  readonly metadata: FlintDeterministicArtifactMetadata;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintCompilerHints;
  readonly boundsChecks?: FlintSoNBoundsChecks;
}

export interface FlintDeterministicArtifactMetadata {
  readonly compilerVersion: string;
  readonly optimization: FlintOptimization;
  readonly sourceFiles: readonly string[];
  readonly sourceHash?: string;
  readonly graphHash?: string;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintCompilerHints;
  readonly loggerScope?: string;
  readonly memoryModel?: 'region-arc-checked-linear';
  readonly boundsChecks?: FlintSoNBoundsChecks;
  readonly sonGraphHash?: string;
}

/** Backend output is deliberately independent from the compatibility facade's ESM artifact. */
export interface FlintBackendResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly debugArtifacts?: FlintDebugArtifacts;
  readonly iteratorExports?: readonly FlintIteratorExport[];
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintCompilerHints;
  readonly contentHash: string;
  readonly metadata: FlintDeterministicArtifactMetadata;
  readonly diagnostics: readonly FlintDiagnostic[];
}

export interface FlintArtifact {
  readonly wasm?: Uint8Array;
  readonly wasmAsset?: string;
  readonly esmSource: string;
  readonly declarations: string;
  readonly manifest?: FlintAbiManifest;
  readonly sourceMap?: string;
  readonly contentHash: string;
  readonly graphHash?: string;
  readonly linkMode?: 'static' | 'dynamic';
  readonly linkedModules?: readonly string[];
  readonly wat?: string;
  readonly watPath?: string;
  readonly unoptimizedWatPath?: string;
  readonly optimizedWasmPath?: string;
  readonly unoptimizedWasmPath?: string;
  readonly sonIr?: FlintSoNModule;
  readonly sonOptimizationReport?: FlintSoNOptimizationReport;
  readonly sonIrPath?: string;
  readonly unoptimizedSonIrPath?: string;
  readonly debugArtifacts?: FlintDebugArtifacts;
  readonly iteratorExports?: readonly FlintIteratorExport[];
  readonly targetFeatures?: FlintTargetFeatures;
  readonly compilerHints?: FlintCompilerHints;
  readonly optimizationReport?: FlintOptimizationReport;
  readonly linkProfile?: FlintLinkProfile;
  readonly optimizationProfile?: FlintLinkOptimizationProfile;
  readonly dynamicLinkMetadata?: FlintDynamicLinkMetadata;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly analysis?: FlintAnalysisReport;
  readonly artifactVerification?: FlintArtifactVerificationReport;
}

export interface FlintArtifactVerificationReport {
  readonly verified: boolean;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly contentHash: string;
  readonly checkedVariants: readonly ('optimized' | 'unoptimized')[];
}

export interface FlintCompiler {
  compile(input: FlintCompileInput): FlintArtifact;
  dispose(): void;
}

export interface FlintCompilerReport {
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly invalidatedFiles: readonly string[];
  readonly selfHosted?: FlintSelfHostedStageReport;
  /** Additive staged view; `selfHosted` remains the compatibility projection. */
  readonly selfHostedStages?: readonly FlintSelfHostedStageReport[];
  readonly analysis?: FlintAnalysisReport;
}

export interface FlintCompilerService extends FlintCompiler {
  compileGraph(input: FlintGraphCompileInput): FlintArtifact;
  prepare(input: Pick<FlintCompileInput, 'root' | 'fileName'>): void;
  invalidate(files: readonly string[]): void;
  report(): FlintCompilerReport;
}
