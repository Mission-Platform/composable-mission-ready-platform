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
  FlintCompileInput,
  FlintCompiler,
  FlintCompilerServiceOptions,
  FlintFrontendResult,
  FlintGraphCompileInput,
  FlintSelfHostedStageReport,
} from '../contracts.js';

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
 * Compiles a single analyzed Flint module to WebAssembly and synthesizes ESM loader artifacts.
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
  input.logger?.log('info', 'compile.start', { fileName: input.fileName });
  const emptyHash = hashBytes(
    encoder.encode(
      `${input.fileName}\0${input.source}\0${input.compilerVersion}\0${input.requireExports ?? true}\0${graphMetadata.graphHash ?? ''}\0${input.logger?.scope ?? ''}\0${JSON.stringify(flintStandardLibraryIdentity(input.standardLibrary))}`,
    ),
  );
  if (hasFrontendErrors(frontend, analysis)) {
    return { esmSource: '', declarations: '', contentHash: emptyHash, diagnostics, analysis, ...graphMetadata };
  }
  const optimization = input.optimization ?? (frontend.links.linkProfile === undefined ? 'debug' : 'release');
  const module = frontend.optimizedModule as NonNullable<typeof frontend.optimizedModule>;
  const manifest = frontend.abi as NonNullable<typeof frontend.abi>;

  const backendCompileInput = buildBackendCompileInput(
    input,
    frontend,
    sourceFiles,
    graphMetadata.graphHash,
    optimization,
  );
  const backend = compileFlintWasm(backendCompileInput, input.fileName) as unknown as FlintBackendCompilationResult;
  const backendDiagnostics = backend.diagnostics as readonly FlintDiagnostic[];
  if (backendDiagnostics.length > 0 || backend.wasm === undefined) {
    input.logger?.log('error', 'compile.failed', { fileName: input.fileName, diagnostics: backendDiagnostics.length });
    return {
      esmSource: '',
      declarations: '',
      contentHash: emptyHash,
      diagnostics: [...diagnostics, ...backendDiagnostics],
      ...graphMetadata,
    };
  }
  const wasm = backend.wasm;
  const wat = backend.wat ?? '';
  const contentHash = hashBytes(wasm);
  const dynamicMetadata = dynamicLinkMetadata(manifest, contentHash);
  const esmSource = createEsmSource(wasm, manifest, backend.iteratorExports ?? [], dynamicMetadata);
  const { verificationDiagnostics, artifactVerification } = verifyBackendArtifact({
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

  const strictArtifactFailure = analysis.policy.profile === 'strict' && !artifactVerification.verified;
  if (strictArtifactFailure) {
    input.logger?.log('error', 'compile.failed.artifact-verification', {
      fileName: input.fileName,
      diagnostics: verificationDiagnostics.length,
    });
    return {
      esmSource: '',
      declarations: '',
      manifest,
      contentHash,
      diagnostics: [...diagnostics, ...verificationDiagnostics],
      analysis,
      artifactVerification,
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

  const { sonIrPath, unoptimizedSonIrPath, debugPaths, watPath, debugArtifacts } = persistModuleCache(
    input,
    cacheKey,
    frontend,
    backend,
    optimization,
  );

  input.logger?.log('info', 'compile.complete', { fileName: input.fileName, contentHash });
  const artifact: FlintArtifact = {
    wasm,
    esmSource,
    declarations: createDeclarations(manifest),
    manifest,
    contentHash,
    wat,
    optimizationReport: frontend.optimizationReport,
    sonIr: frontend.sonIr,
    sonOptimizationReport: frontend.sonOptimizationReport,
    diagnostics: [...analysis.diagnostics, ...verificationDiagnostics],
    analysis,
    artifactVerification,
    ...graphMetadata,
  };
  return copyDefinedProperties(artifact, {
    sourceMap: backend.sourceMap,
    watPath,
    sonIrPath,
    unoptimizedSonIrPath,
    unoptimizedWatPath: debugPaths.unoptimizedWatPath,
    optimizedWasmPath: debugPaths.optimizedWasmPath,
    unoptimizedWasmPath: debugPaths.unoptimizedWasmPath,
    debugArtifacts,
    iteratorExports: backend.iteratorExports,
    targetFeatures: input.targetFeatures,
    compilerHints: input.compilerHints,
    dynamicLinkMetadata: dynamicMetadata,
  });
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
 */
export function createFlintCompiler(): FlintCompiler {
  let disposed = false;
  return {
    compile(input): FlintArtifact {
      if (disposed) throw new Error('Flint compiler has been disposed.');
      return compileFlint(input);
    },
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
