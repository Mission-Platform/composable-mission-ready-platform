import type { ForgeWebScriptModule } from './ast.js';
import type { ForgeWebScriptWatCache } from './cache.js';
import type { ForgeWebScriptDiagnostic } from './diagnostics.js';
import type { ForgeWebScriptLinkConfiguration, ForgeWebScriptModuleGraph } from './graph.js';
import type { ForgeWebScriptIrModule } from './ir.js';
import type {
  ForgeWebScriptAbiManifest,
  ForgeWebScriptDynamicLinkMetadata,
  ForgeWebScriptLinkedExport,
  ForgeWebScriptSourceImport,
} from './manifest.js';
import type { ForgeWebScriptOptimizationReport } from './optimizer.js';
import type {
  ForgeWebScriptSelfHostedCompilerStage,
  ForgeWebScriptSelfHostedStageArtifact,
} from './self-hosted/artifact.js';
import type { ForgeWebScriptStandardLibraryIdentity } from './stdlib/regex.js';

export type ForgeWebScriptOptimization = 'debug' | 'release';

/** Named cross-project packaging profile used by graph-aware consumers. */
export type ForgeWebScriptLinkProfile = 'static' | 'dynamic';

/** Link-time policy recorded alongside the ordinary compiler optimization. */
export type ForgeWebScriptLinkOptimizationProfile =
  | 'standard'
  | 'static-aggressive'
  | 'dynamic-conservative';

export interface ForgeWebScriptCompilerLogger {
  readonly scope: string;
  readonly log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ) => void;
}

export interface ForgeWebScriptTargetFeatures {
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly memory64?: boolean;
  readonly threads?: boolean;
  readonly atomics?: boolean;
}

export interface ForgeWebScriptCompilerHints {
  readonly tailCallFunctions?: readonly string[];
  readonly iteratorUnrollLimit?: number;
}

export interface ForgeWebScriptDebugArtifacts {
  readonly optimizedWat?: string;
  readonly unoptimizedWat?: string;
  readonly optimizedWasm?: Uint8Array;
  readonly unoptimizedWasm?: Uint8Array;
}

export interface ForgeWebScriptIteratorExport {
  readonly name: string;
  readonly nextFunction: string;
  readonly elementType: string;
  readonly resultRepresentation: 'value-done-pair';
  readonly ownership: 'borrowed' | 'owned' | 'shared';
}

export type ForgeWebScriptVmExecutionMode = 'interpret' | 'jit' | 'aot';

/** Result of the bounded FWS-authored compiler stage used by tooling adapters. */
export interface ForgeWebScriptSelfHostedStageReport {
  /** Stage identity is optional for compatibility with the original lex-only runner. */
  readonly stage?: ForgeWebScriptSelfHostedCompilerStage;
  readonly mode: ForgeWebScriptVmExecutionMode;
  readonly lexFingerprint: number;
  readonly expectedLexFingerprint: number;
  readonly parity: boolean;
  readonly steps: number;
  readonly inputHash?: string;
  readonly outputHash?: string;
  readonly expectedOutputHash?: string;
  readonly artifact?: ForgeWebScriptSelfHostedStageArtifact;
  readonly diagnostic?: ForgeWebScriptDiagnostic;
  /** Reports for additional promoted stages returned by a compatibility runner. */
  readonly stageReports?: readonly ForgeWebScriptSelfHostedStageReport[];
}

/** VM entry point supplied by the runtime without coupling the browser-safe facade to it. */
export type ForgeWebScriptSelfHostedStageRunner = (
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: ForgeWebScriptVmExecutionMode,
) => ForgeWebScriptSelfHostedStageReport;

export interface ForgeWebScriptCompilerServiceOptions {
  /** The bounded FWS stage runner. Remaining frontend/backend stages stay seed-backed. */
  readonly selfHostedRunner?: ForgeWebScriptSelfHostedStageRunner;
  readonly selfHostedVmMode?: ForgeWebScriptVmExecutionMode;
}

export type ForgeWebScriptAsyncCapability = 'scheduler.microtask' | 'scheduler.worker';

/** Explicit async boundary shared by VM, Wasm, and host adapters. */
export interface ForgeWebScriptAsyncCompilationContract {
  readonly capabilities: readonly ForgeWebScriptAsyncCapability[];
  readonly deterministic: true;
  readonly taskIdRepresentation: 'u32';
  readonly messageRepresentation: 'owned-bytes';
  readonly ordering: 'sequence';
}

export interface ForgeWebScriptCompileInput {
  readonly source: string;
  readonly fileName: string;
  readonly compilerVersion: string;
  /** Require every function declaration to opt into the Wasm ABI. */
  readonly requireExports?: boolean;
  readonly optimization?: ForgeWebScriptOptimization;
  readonly requestedCapabilities?: readonly string[];
  readonly root?: string;
  readonly watCache?: ForgeWebScriptWatCache;
  readonly linkConfiguration?: ForgeWebScriptLinkConfiguration;
  readonly linkProfile?: ForgeWebScriptLinkProfile;
  /** Compiler-owned stdlib identities are part of cache/artifact inputs. */
  readonly standardLibrary?: ForgeWebScriptStandardLibraryIdentity;
  readonly async?: ForgeWebScriptAsyncCompilationContract;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptCompilerHints;
  readonly logger?: ForgeWebScriptCompilerLogger;
}

export interface ForgeWebScriptGraphCompileInput {
  readonly graph: ForgeWebScriptModuleGraph;
  readonly entryFileName: string;
  readonly compilerVersion: string;
  /** Require every function declaration to opt into the Wasm ABI. */
  readonly requireExports?: boolean;
  readonly optimization?: ForgeWebScriptOptimization;
  readonly requestedCapabilities?: readonly string[];
  readonly linkConfiguration?: ForgeWebScriptLinkConfiguration;
  readonly linkProfile?: ForgeWebScriptLinkProfile;
  readonly standardLibrary?: ForgeWebScriptStandardLibraryIdentity;
  readonly watCache?: ForgeWebScriptWatCache;
  readonly async?: ForgeWebScriptAsyncCompilationContract;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptCompilerHints;
  readonly logger?: ForgeWebScriptCompilerLogger;
}

export interface ForgeWebScriptFrontendLinkMetadata {
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: 'static' | 'dynamic';
  readonly sourceImports?: readonly ForgeWebScriptSourceImport[];
  readonly linkedExports?: readonly ForgeWebScriptLinkedExport[];
  readonly linkedModules: readonly string[];
  readonly linkProfile?: ForgeWebScriptLinkProfile;
  readonly optimizationProfile?: ForgeWebScriptLinkOptimizationProfile;
}

/** The stable, backend-independent result of parsing, checking, and lowering a module. */
export interface ForgeWebScriptFrontendResult {
  readonly source: string;
  readonly fileName: string;
  readonly module?: ForgeWebScriptModule;
  readonly ir?: ForgeWebScriptIrModule;
  readonly optimizedModule?: ForgeWebScriptModule;
  readonly optimizedIr?: ForgeWebScriptIrModule;
  readonly optimizationReport?: ForgeWebScriptOptimizationReport;
  readonly abi?: ForgeWebScriptAbiManifest;
  readonly links: ForgeWebScriptFrontendLinkMetadata;
  readonly sourceFiles: readonly string[];
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
}

/** Input owned by a backend implementation after frontend validation succeeds. */
export interface ForgeWebScriptBackendInput {
  readonly ir: ForgeWebScriptIrModule;
  readonly optimizedIr: ForgeWebScriptIrModule;
  readonly abi: ForgeWebScriptAbiManifest;
  readonly links: ForgeWebScriptFrontendLinkMetadata;
  readonly metadata: ForgeWebScriptDeterministicArtifactMetadata;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptCompilerHints;
}

export interface ForgeWebScriptDeterministicArtifactMetadata {
  readonly compilerVersion: string;
  readonly optimization: ForgeWebScriptOptimization;
  readonly sourceFiles: readonly string[];
  readonly graphHash?: string;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptCompilerHints;
  readonly loggerScope?: string;
}

/** Backend output is deliberately independent from the compatibility facade's ESM artifact. */
export interface ForgeWebScriptBackendResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly debugArtifacts?: ForgeWebScriptDebugArtifacts;
  readonly iteratorExports?: readonly ForgeWebScriptIteratorExport[];
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptCompilerHints;
  readonly contentHash: string;
  readonly metadata: ForgeWebScriptDeterministicArtifactMetadata;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
}

export interface ForgeWebScriptArtifact {
  readonly wasm?: Uint8Array;
  readonly wasmAsset?: string;
  readonly esmSource: string;
  readonly declarations: string;
  readonly manifest?: ForgeWebScriptAbiManifest;
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
  readonly debugArtifacts?: ForgeWebScriptDebugArtifacts;
  readonly iteratorExports?: readonly ForgeWebScriptIteratorExport[];
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly compilerHints?: ForgeWebScriptCompilerHints;
  readonly optimizationReport?: ForgeWebScriptOptimizationReport;
  readonly linkProfile?: ForgeWebScriptLinkProfile;
  readonly optimizationProfile?: ForgeWebScriptLinkOptimizationProfile;
  readonly dynamicLinkMetadata?: ForgeWebScriptDynamicLinkMetadata;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
}

export interface ForgeWebScriptCompiler {
  compile(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact;
  dispose(): void;
}

export interface ForgeWebScriptCompilerReport {
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly invalidatedFiles: readonly string[];
  readonly selfHosted?: ForgeWebScriptSelfHostedStageReport;
  /** Additive staged view; `selfHosted` remains the compatibility projection. */
  readonly selfHostedStages?: readonly ForgeWebScriptSelfHostedStageReport[];
}

export interface ForgeWebScriptCompilerService extends ForgeWebScriptCompiler {
  compileGraph(input: ForgeWebScriptGraphCompileInput): ForgeWebScriptArtifact;
  prepare(input: Pick<ForgeWebScriptCompileInput, 'root' | 'fileName'>): void;
  invalidate(files: readonly string[]): void;
  report(): ForgeWebScriptCompilerReport;
}
