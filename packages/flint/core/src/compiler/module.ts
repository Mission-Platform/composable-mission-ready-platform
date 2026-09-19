import { compileFlintWasm } from '@mission-platform/flint-wasm';

import { analyzeFlint } from '../analysis/analyze.js';
import {
  flintWatCacheKey,
  persistFlintDebugArtifacts,
  persistFlintSoN,
  persistFlintWat,
  pruneStaleFlintCache,
  type FlintDebugArtifactPaths,
  type FlintWatCache,
} from '../cache.js';
import { createDiagnostic, type FlintDiagnostic } from '../diagnostics.js';
import { prepareFlintFrontend, prepareFlintGraphFrontend } from '../frontend.js';
import { flintStandardLibraryIdentity } from '../stdlib/regex.js';

import {
  dynamicLinkMetadata,
  encoder,
  hashBytes,
  sourceHashForArtifact,
  verifyBackendArtifact,
  type FlintBackendCompilationResult,
} from './backend.js';
import { createDeclarations } from './declarations.js';
import { createEsmSource } from './esm.js';

import type { FlintAnalysisOptions, FlintAnalysisReport } from '../analysis/contracts.js';
import type {
  FlintArtifact,
  FlintArtifactVerificationReport,
  FlintCompileInput,
  FlintCompiler,
  FlintCompilerServiceOptions,
  FlintFrontendResult,
  FlintGraphCompileInput,
  FlintSelfHostedStageReport,
} from '../contracts.js';
import type { FlintAbiManifest, FlintDynamicLinkMetadata } from '../manifest.js';

/**
 * Resolves the analysis policy merged with any requested capabilities.
 */
function resolveAnalysisPolicy(input: FlintCompileInput): FlintAnalysisOptions['policy'] {
  const nested = input.analysis ?? {};
  const basePolicy = nested.policy ?? input.analysisPolicy;
  if (basePolicy === undefined) return undefined;
  if (input.requestedCapabilities !== undefined && basePolicy.allowedCapabilities === undefined) {
    return { ...basePolicy, allowedCapabilities: input.requestedCapabilities };
  }
  return basePolicy;
}

/**
 * Resolves static analysis options from compilation input and policy settings.
 */
export function analysisOptions(input: FlintCompileInput): FlintAnalysisOptions {
  const policy = resolveAnalysisPolicy(input);
  const overrides: Record<string, unknown> = {};
  if (policy !== undefined) overrides.policy = policy;
  if (input.targetFeatures !== undefined) overrides.targetFeatures = input.targetFeatures;
  if (input.analysisRules !== undefined) overrides.rules = input.analysisRules;
  if (input.analysisSourceMap !== undefined) overrides.sourceMap = input.analysisSourceMap;
  return Object.assign({}, input.analysis, overrides);
}

/**
 * Maps frontend IR enum declarations to backend WebAssembly representation.
 */
function formatEnumDeclarations(
  enums: readonly {
    readonly name: string;
    readonly exported: boolean;
    readonly variants: readonly { readonly name: string; readonly tag: number }[];
  }[],
) {
  return enums.map((declaration) => ({
    name: declaration.name,
    exported: declaration.exported,
    representation: 'i32' as const,
    variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
  }));
}

/**
 * Prepares the WAT cache options including the attached compiler logger.
 */
function buildWatCache(input: FlintCompileInput): FlintWatCache | undefined {
  if (input.watCache === undefined) return undefined;
  if (input.logger === undefined) return input.watCache;
  return { ...input.watCache, logger: input.logger };
}

/**
 * Persists frontend SonIR graphs to cache if enabled.
 */
function persistSonIrArtifacts(
  cache: FlintWatCache | undefined,
  cacheKey: string,
  frontend: FlintFrontendResult,
  isDebug: boolean,
) {
  let sonIrPath: string | undefined;
  let unoptimizedSonIrPath: string | undefined;
  if (frontend.sonIr !== undefined) {
    sonIrPath = persistFlintSoN(cache, cacheKey, frontend.sonIr);
  }
  if (isDebug && frontend.unoptimizedSonIr !== undefined) {
    unoptimizedSonIrPath = persistFlintSoN(cache, cacheKey, frontend.unoptimizedSonIr, 'unoptimized');
  }
  return { sonIrPath, unoptimizedSonIrPath };
}

/**
 * Persists backend debug artifacts (WAT, WASM) to cache if debug optimization is selected.
 */
function persistDebugArtifacts(
  cache: FlintWatCache | undefined,
  cacheKey: string,
  backend: FlintBackendCompilationResult,
  isDebug: boolean,
): {
  readonly debugPaths: Partial<FlintDebugArtifactPaths>;
  readonly watPath: string | undefined;
  readonly debugArtifacts: unknown;
} {
  if (!isDebug || cache === undefined || cache.writeBinaryAtomic === undefined) {
    const watPath = persistFlintWat(cache, cacheKey, backend.wat ?? '');
    return { debugPaths: {}, watPath, debugArtifacts: undefined };
  }
  const debugArtifacts = {
    optimizedWat: backend.wat,
    unoptimizedWat: backend.unoptimizedWat,
    optimizedWasm: backend.wasm,
    unoptimizedWasm: backend.unoptimizedWasm,
  };
  const debugPaths = persistFlintDebugArtifacts(cache, cacheKey, debugArtifacts);
  const watPath = debugPaths.optimizedWatPath ?? persistFlintWat(cache, cacheKey, backend.wat ?? '');
  return { debugPaths, watPath, debugArtifacts };
}

/**
 * Persists compiled SonIR, WAT, and Wasm debug artifacts to cache and prunes stale artifacts.
 */
function persistModuleCache(
  input: FlintCompileInput,
  cacheKey: string,
  frontend: FlintFrontendResult,
  backend: FlintBackendCompilationResult,
  optimization: 'debug' | 'release',
) {
  const cache = buildWatCache(input);
  const isDebug = optimization === 'debug';
  const { sonIrPath, unoptimizedSonIrPath } = persistSonIrArtifacts(cache, cacheKey, frontend, isDebug);
  const { debugPaths, watPath, debugArtifacts } = persistDebugArtifacts(cache, cacheKey, backend, isDebug);

  const writtenFiles = [
    sonIrPath,
    unoptimizedSonIrPath,
    debugPaths.optimizedWatPath,
    debugPaths.unoptimizedWatPath,
    debugPaths.optimizedWasmPath,
    debugPaths.unoptimizedWasmPath,
    watPath,
  ].filter((filePath): filePath is string => filePath !== undefined);

  pruneStaleFlintCache(cache, input.fileName, cacheKey, writtenFiles);

  return { sonIrPath, unoptimizedSonIrPath, debugPaths, watPath, debugArtifacts };
}

/**
 * Checks whether any mandatory frontend compiler structures are missing.
 */
function isFrontendIncomplete(frontend: FlintFrontendResult): boolean {
  return [frontend.optimizedModule, frontend.abi, frontend.ir, frontend.optimizedIr].includes(undefined);
}

/**
 * Determines whether compilation should abort early due to frontend diagnostics or missing IR.
 */
function hasFrontendErrors(frontend: FlintFrontendResult, analysis: FlintAnalysisReport): boolean {
  if (frontend.diagnostics.length > 0 || analysis.blockingFindings.length > 0) return true;
  return isFrontendIncomplete(frontend);
}

/**
 * Builds the backend compiler configuration from frontend artifacts and options.
 */
function buildBackendCompileInput(
  input: FlintCompileInput,
  frontend: FlintFrontendResult,
  sourceFiles: readonly string[],
  graphHash: string | undefined,
  optimization: 'debug' | 'release',
) {
  const ir = frontend.ir as NonNullable<typeof frontend.ir>;
  const optimizedIr = frontend.optimizedIr as NonNullable<typeof frontend.optimizedIr>;
  const manifest = frontend.abi as NonNullable<typeof frontend.abi>;

  const metadata: Record<string, unknown> = {
    compilerVersion: input.compilerVersion,
    optimization,
    sourceFiles,
    sourceHash: sourceHashForArtifact(input.source, input.fileName),
    memoryModel: 'region-arc-checked-linear' as const,
    boundsChecks: input.boundsChecks ?? 'runtime',
  };
  if (graphHash !== undefined) metadata.graphHash = graphHash;
  if (input.targetFeatures !== undefined) metadata.targetFeatures = input.targetFeatures;
  if (input.compilerHints !== undefined) metadata.compilerHints = input.compilerHints;
  if (frontend.sonIr !== undefined) {
    metadata.sonSchemaVersion = frontend.sonIr.schemaVersion;
    metadata.sonGraphHash = frontend.sonIr.graphHash;
    metadata.sonOptimizationPasses = frontend.sonIr.optimizationReport?.passes.map(({ name }) => name);
  }
  if (input.logger !== undefined) metadata.loggerScope = input.logger.scope;

  return {
    ir: {
      ...ir,
      memoryModel: 'region-arc-checked-linear' as const,
      enumDeclarations: formatEnumDeclarations(ir.enums),
      aggregateLayouts: manifest.aggregateLayouts,
    } as unknown as Parameters<typeof compileFlintWasm>[0]['ir'],
    optimizedIr: {
      ...optimizedIr,
      memoryModel: 'region-arc-checked-linear' as const,
      enumDeclarations: formatEnumDeclarations(optimizedIr.enums),
      aggregateLayouts: manifest.aggregateLayouts,
    } as unknown as Parameters<typeof compileFlintWasm>[0]['optimizedIr'],
    abi: manifest,
    links: frontend.links,
    metadata: metadata as unknown as Parameters<typeof compileFlintWasm>[0]['metadata'],
    logger: input.logger,
  };
}

/**
 * Computes deterministic disk cache key for a compiled module.
 */
function computeModuleCacheKey(
  input: FlintCompileInput,
  frontend: FlintFrontendResult,
  moduleName: string,
  sourceFiles: readonly string[],
  graphHash: string | undefined,
  optimization: 'debug' | 'release',
  analysis: FlintAnalysisReport,
): string {
  const options = analysisOptions(input);
  return flintWatCacheKey({
    compilerVersion: input.compilerVersion,
    optimization,
    graphHash,
    sourceGraph: sourceFiles.map((fileName) => ({
      fileName,
      moduleId: moduleName,
      contentHash: hashBytes(encoder.encode(input.source)),
    })),
    linkConfiguration: input.linkConfiguration,
    standardLibrary: flintStandardLibraryIdentity(input.standardLibrary),
    targetFeatures: input.targetFeatures,
    compilerHints: input.compilerHints,
    loggerScope: input.logger?.scope,
    analysisPolicy: analysis.policy,
    analysisRuleIds: options.rules?.map(({ id }) => id).toSorted(),
    analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
    sonSchemaVersion: frontend.sonIr?.schemaVersion,
    sonGraphHash: frontend.sonIr?.graphHash,
    memoryModel: 'region-arc-checked-linear',
    boundsChecks: input.boundsChecks ?? 'runtime',
  });
}

/**
 * Copies non-undefined fields from source into target.
 */
function copyDefinedProperties<T extends object>(target: T, source: Record<string, unknown>): T {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return target;
}

/**
 * Emits an event message through the attached compiler logger if configured.
 *
 * @param logger - Optional compiler event logger.
 * @param level - Log severity level.
 * @param event - Event name identifier.
 * @param payload - Structured data associated with the event.
 */
function logCompilerEvent(
  logger: FlintCompileInput['logger'],
  level: 'info' | 'error' | 'warn' | 'debug',
  event: string,
  payload: Record<string, unknown>,
): void {
  if (logger !== undefined) {
    logger.log(level, event, payload);
  }
}

/**
 * Computes a fallback content hash used when compilation produces no WebAssembly binary.
 *
 * @param input - Module compilation input.
 * @param graphHash - Optional hash of the linked module graph.
 * @returns 8-character hexadecimal hash string.
 */
function computeInitialEmptyHash(input: FlintCompileInput, graphHash = ''): string {
  const requireExports = input.requireExports ?? true;
  const loggerScope = input.logger?.scope ?? '';
  const stdlibIdentity = JSON.stringify(flintStandardLibraryIdentity(input.standardLibrary));
  return hashBytes(
    encoder.encode(
      `${input.fileName}\0${input.source}\0${input.compilerVersion}\0${requireExports}\0${graphHash}\0${loggerScope}\0${stdlibIdentity}`,
    ),
  );
}

/**
 * Resolves the optimization level for a single module from input options and link profile.
 *
 * @param input - Module compilation input.
 * @param frontend - Prepared frontend analysis results containing link profile.
 * @returns Selected optimization level ('debug' or 'release').
 */
function resolveModuleOptimization(input: FlintCompileInput, frontend: FlintFrontendResult): 'debug' | 'release' {
  if (input.optimization !== undefined) return input.optimization;
  return frontend.links.linkProfile === undefined ? 'debug' : 'release';
}

/**
 * Runs WebAssembly backend code generation for an analyzed module.
 *
 * @param input - Module compilation input.
 * @param frontend - Analyzed frontend result containing IR.
 * @param sourceFiles - Source file paths contributing to this compilation.
 * @param graphHash - Optional module graph hash.
 * @param optimization - Optimization level.
 * @returns Structured backend compilation result.
 */
function executeBackendCompilation(
  input: FlintCompileInput,
  frontend: FlintFrontendResult,
  sourceFiles: readonly string[],
  graphHash: string | undefined,
  optimization: 'debug' | 'release',
): FlintBackendCompilationResult {
  const backendCompileInput = buildBackendCompileInput(input, frontend, sourceFiles, graphHash, optimization);
  return compileFlintWasm(backendCompileInput, input.fileName) as unknown as FlintBackendCompilationResult;
}

/**
 * Checks whether backend WebAssembly compilation resulted in errors or missing output.
 *
 * @param backend - Backend compilation result.
 * @returns True if backend diagnostics or missing binary indicate failure.
 */
function hasBackendCompilationFailure(backend: FlintBackendCompilationResult): boolean {
  return backend.diagnostics.length > 0 || backend.wasm === undefined;
}

/**
 * Evaluates whether artifact verification failed under strict security policy.
 *
 * @param profile - Policy profile ('strict' or 'development').
 * @param verified - Whether the artifact verification passed.
 * @returns True if verification failure must block compilation under strict policy.
 */
function isStrictVerificationFailure(profile: 'strict' | 'development', verified: boolean): boolean {
  return profile === 'strict' && !verified;
}

/**
 * Packages a verified WebAssembly module into a complete FlintArtifact.
 *
 * @param input - Module compilation input.
 * @param frontend - Analyzed frontend compiler result.
 * @param backend - Backend WebAssembly generation result.
 * @param manifest - Validated ABI manifest.
 * @param wasm - Emitted WebAssembly binary.
 * @param esmSource - Synthesized ESM loader script.
 * @param dynamicMetadata - Optional dynamic link metadata.
 * @param verification - Verification report and diagnostics.
 * @param graphMetadata - Graph link metadata to preserve.
 * @param cacheData - Paths of persisted cache and debug artifacts.
 * @param analysis - Static analysis report.
 * @returns Final compiled artifact ready for distribution.
 */
function buildSuccessfulArtifact(
  input: FlintCompileInput,
  frontend: FlintFrontendResult,
  backend: FlintBackendCompilationResult,
  manifest: FlintAbiManifest,
  wasm: Uint8Array,
  esmSource: string,
  dynamicMetadata: FlintDynamicLinkMetadata | undefined,
  verification: {
    readonly verificationDiagnostics: readonly FlintDiagnostic[];
    readonly artifactVerification: FlintArtifactVerificationReport;
  },
  graphMetadata: Pick<
    FlintArtifact,
    'graphHash' | 'linkMode' | 'linkedModules' | 'linkProfile' | 'optimizationProfile'
  >,
  cacheData: ReturnType<typeof persistModuleCache>,
  analysis: FlintAnalysisReport,
): FlintArtifact {
  const artifact: FlintArtifact = {
    wasm,
    esmSource,
    declarations: createDeclarations(manifest),
    manifest,
    contentHash: hashBytes(wasm),
    wat: backend.wat ?? '',
    optimizationReport: frontend.optimizationReport,
    sonIr: frontend.sonIr,
    sonOptimizationReport: frontend.sonOptimizationReport,
    diagnostics: [...analysis.diagnostics, ...verification.verificationDiagnostics],
    analysis,
    artifactVerification: verification.artifactVerification,
    ...graphMetadata,
  };
  return copyDefinedProperties(artifact, {
    sourceMap: backend.sourceMap,
    watPath: cacheData.watPath,
    sonIrPath: cacheData.sonIrPath,
    unoptimizedSonIrPath: cacheData.unoptimizedSonIrPath,
    unoptimizedWatPath: cacheData.debugPaths.unoptimizedWatPath,
    optimizedWasmPath: cacheData.debugPaths.optimizedWasmPath,
    unoptimizedWasmPath: cacheData.debugPaths.unoptimizedWasmPath,
    debugArtifacts: cacheData.debugArtifacts,
    iteratorExports: backend.iteratorExports,
    targetFeatures: input.targetFeatures,
    compilerHints: input.compilerHints,
    dynamicLinkMetadata: dynamicMetadata,
  });
}

/**
 * Compiles a single analyzed Flint module to WebAssembly and synthesizes ESM loader artifacts.
 *
 * @param input - Module compilation input specification.
 * @param frontend - Prepared frontend compiler result.
 * @param graphMetadata - Optional metadata propagated from module graph linking.
 * @param sourceFiles - Source file paths contributing to this compilation unit.
 * @returns Complete compiled artifact containing binaries, declarations, and reports.
 */
export function compileFlintModule(
  input: FlintCompileInput,
  frontend: FlintFrontendResult,
  graphMetadata: Pick<
    FlintArtifact,
    'graphHash' | 'linkMode' | 'linkedModules' | 'linkProfile' | 'optimizationProfile'
  > = {},
  sourceFiles: readonly string[] = frontend.sourceFiles,
): FlintArtifact {
  const diagnostics = [...frontend.diagnostics];
  const analysis = analyzeFlint(frontend, analysisOptions(input));
  diagnostics.push(...analysis.diagnostics);
  logCompilerEvent(input.logger, 'info', 'compile.start', { fileName: input.fileName });

  const emptyHash = computeInitialEmptyHash(input, graphMetadata.graphHash);
  if (hasFrontendErrors(frontend, analysis)) {
    return { esmSource: '', declarations: '', contentHash: emptyHash, diagnostics, analysis, ...graphMetadata };
  }

  const optimization = resolveModuleOptimization(input, frontend);
  const module = frontend.optimizedModule as NonNullable<typeof frontend.optimizedModule>;
  const manifest = frontend.abi as NonNullable<typeof frontend.abi>;

  const backend = executeBackendCompilation(input, frontend, sourceFiles, graphMetadata.graphHash, optimization);
  if (hasBackendCompilationFailure(backend)) {
    logCompilerEvent(input.logger, 'error', 'compile.failed', {
      fileName: input.fileName,
      diagnostics: backend.diagnostics.length,
    });
    return {
      esmSource: '',
      declarations: '',
      contentHash: emptyHash,
      diagnostics: [...diagnostics, ...backend.diagnostics],
      ...graphMetadata,
    };
  }

  const wasm = backend.wasm as Uint8Array;
  const contentHash = hashBytes(wasm);
  const dynamicMetadata = dynamicLinkMetadata(manifest, contentHash);
  const esmSource = createEsmSource(wasm, manifest, backend.iteratorExports ?? [], dynamicMetadata);
  const verification = verifyBackendArtifact({
    wasm,
    unoptimizedWasm: backend.unoptimizedWasm,
    fileName: input.fileName,
    manifest,
    metadata: backend.metadata,
    targetFeatures: input.targetFeatures,
    featureRequirements: backend.featureRequirements,
    iteratorExports: backend.iteratorExports,
    expectedContentHash: backend.contentHash,
    expectedSourceHash: sourceHashForArtifact(input.source, input.fileName),
    esmSource,
    profile: analysis.policy.profile,
    allowedCapabilities: analysis.policy.allowedCapabilities,
  });

  if (isStrictVerificationFailure(analysis.policy.profile, verification.artifactVerification.verified)) {
    logCompilerEvent(input.logger, 'error', 'compile.failed.artifact-verification', {
      fileName: input.fileName,
      diagnostics: verification.verificationDiagnostics.length,
    });
    return {
      esmSource: '',
      declarations: '',
      manifest,
      contentHash,
      diagnostics: [...diagnostics, ...verification.verificationDiagnostics],
      analysis,
      artifactVerification: verification.artifactVerification,
      ...graphMetadata,
    };
  }

  const cacheKey = computeModuleCacheKey(
    input,
    frontend,
    module.name,
    sourceFiles,
    graphMetadata.graphHash,
    optimization,
    analysis,
  );
  const cacheData = persistModuleCache(input, cacheKey, frontend, backend, optimization);
  logCompilerEvent(input.logger, 'info', 'compile.complete', { fileName: input.fileName, contentHash });

  return buildSuccessfulArtifact(
    input,
    frontend,
    backend,
    manifest,
    wasm,
    esmSource,
    dynamicMetadata,
    verification,
    graphMetadata,
    cacheData,
    analysis,
  );
}

/**
 * Compiles a Flint seed input by preparing frontend ASTs and compiling the resulting module.
 */
export function compileFlintSeed(input: FlintCompileInput): FlintArtifact {
  return compileFlintModule(input, prepareFlintFrontend(input));
}

/**
 * Compiles a Flint source string to WebAssembly and runtime artifacts.
 */
export function compileFlint(input: FlintCompileInput): FlintArtifact {
  return compileFlintSeed(input);
}

/**
 * Creates an instance of the Flint compiler.
 *
 * @returns Configured compiler instance.
 */
export function createFlintCompiler(): FlintCompiler {
  let disposed = false;
  return {
    /**
     * Compiles a single Flint input into a WebAssembly artifact.
     *
     * @param input - Module compilation input including source and compiler configuration.
     * @returns Emitted compiler artifact containing WebAssembly binary and diagnostics.
     * @throws {Error} If the compiler instance has been disposed.
     */
    compile(input): FlintArtifact {
      if (disposed) throw new Error('Flint compiler has been disposed.');
      return compileFlint(input);
    },
    /**
     * Disposes the compiler instance, preventing subsequent compilation calls.
     */
    dispose(): void {
      disposed = true;
    },
  };
}

/**
 * Compiles a multi-module Flint module graph into a unified WebAssembly artifact.
 */
export function compileFlintGraph(input: FlintGraphCompileInput): FlintArtifact {
  const frontend = prepareFlintGraphFrontend(input);
  return compileFlintModule(
    {
      source: frontend.source,
      fileName: input.entryFileName,
      compilerVersion: input.compilerVersion,
      requireExports: input.requireExports,
      optimization: input.optimization ?? (input.linkProfile === undefined ? undefined : 'release'),
      requestedCapabilities: input.requestedCapabilities,
      watCache: input.watCache,
      linkConfiguration: input.linkConfiguration,
      linkProfile: input.linkProfile,
      standardLibrary: input.standardLibrary,
      targetFeatures: input.targetFeatures,
      compilerHints: input.compilerHints,
      boundsChecks: input.boundsChecks,
      logger: input.logger,
      analysis: {
        ...input.analysis,
        sourceFiles:
          input.analysis?.sourceFiles ?? input.graph.modules.map(({ fileName, source }) => ({ fileName, source })),
      },
      analysisPolicy: input.analysisPolicy,
      analysisRules: input.analysisRules,
      analysisSourceMap: input.analysisSourceMap,
    },
    frontend,
    {
      graphHash: frontend.links.graphHash,
      linkMode: frontend.links.linkMode,
      linkedModules: frontend.links.linkedModules,
      linkProfile: frontend.links.linkProfile,
      optimizationProfile: frontend.links.optimizationProfile,
    },
  );
}

/**
 * Creates a diagnostic for self-hosted bootstrap or parity verification issues.
 */
export function selfHostedDiagnostic(
  input: Pick<FlintCompileInput, 'fileName'>,
  message: string,
  stage: FlintSelfHostedStageReport['stage'] = 'lex',
): FlintDiagnostic {
  return createDiagnostic(input.fileName, stage === 'parse' ? 'parse' : 'lex', 'FLINT-BOOTSTRAP-001', message, {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  });
}

/**
 * Formats a diagnostic for parity check failures in self-hosted execution.
 */
function formatSelfHostedFailureDiagnostic(
  input: Pick<FlintCompileInput, 'fileName'>,
  failed: FlintSelfHostedStageReport,
  mode: string,
): FlintDiagnostic {
  const expected = failed.expectedOutputHash ?? failed.expectedLexFingerprint;
  const received = failed.outputHash ?? failed.lexFingerprint;
  const stageName = failed.stage ?? 'lex';
  return selfHostedDiagnostic(
    input,
    `FWS VM ${stageName} stage parity failed in ${mode} mode: expected ${expected}, received ${received}.`,
    failed.stage,
  );
}

/**
 * Formats caught exceptions from self-hosted execution into an error string.
 */
function formatBootstrapError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Executes the self-hosted compiler stage runner and inspects parity reports.
 */
function executeSelfHostedStage(
  runner: NonNullable<FlintCompilerServiceOptions['selfHostedRunner']>,
  input: Pick<FlintCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: 'interpret' | 'jit' | 'aot',
) {
  const report = runner(input, mode);
  const stageReports = report.stageReports ? [report, ...report.stageReports] : [report];
  const failed = stageReports.find(({ parity }) => !parity);
  if (failed !== undefined) {
    return {
      report,
      stageReports,
      diagnostic: formatSelfHostedFailureDiagnostic(input, failed, mode),
    };
  }
  return { report, stageReports };
}

/**
 * Executes a self-hosted compiler stage and validates parity reports against expected fingerprints.
 */
export function runSelfHostedStage(
  input: Pick<FlintCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  options: FlintCompilerServiceOptions,
): {
  readonly report?: FlintSelfHostedStageReport;
  readonly stageReports?: readonly FlintSelfHostedStageReport[];
  readonly diagnostic?: FlintDiagnostic;
} {
  if (options.selfHostedRunner === undefined) return {};
  const mode = options.selfHostedVmMode ?? 'interpret';
  try {
    return executeSelfHostedStage(options.selfHostedRunner, input, mode);
  } catch (error: unknown) {
    return {
      diagnostic: selfHostedDiagnostic(
        input,
        `FWS VM bootstrap failed in ${mode} mode: ${formatBootstrapError(error)}`,
      ),
    };
  }
}

/**
 * Merges self-hosted runner stage verification results into the final compilation artifact.
 */
export function withSelfHostedResult(
  artifact: FlintArtifact,
  result: ReturnType<typeof runSelfHostedStage>,
): FlintArtifact {
  if (result.diagnostic === undefined) return artifact;
  return {
    ...artifact,
    wasm: undefined,
    esmSource: '',
    declarations: '',
    diagnostics: [...artifact.diagnostics, result.diagnostic],
  };
}
