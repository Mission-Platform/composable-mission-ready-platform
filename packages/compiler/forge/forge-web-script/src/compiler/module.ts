import { compileForgeWebScriptWasm } from '@mission-platform/forge-web-script-wasm';

import { analyzeForgeWebScript } from '../analysis/analyze.js';
import {
  forgeWebScriptWatCacheKey,
  persistForgeWebScriptDebugArtifacts,
  persistForgeWebScriptSoN,
  persistForgeWebScriptWat,
  pruneStaleForgeWebScriptCache,
  type ForgeWebScriptDebugArtifactPaths,
  type ForgeWebScriptWatCache,
} from '../cache.js';
import { createDiagnostic, type ForgeWebScriptDiagnostic } from '../diagnostics.js';
import { prepareForgeWebScriptFrontend, prepareForgeWebScriptGraphFrontend } from '../frontend.js';
import { forgeWebScriptStandardLibraryIdentity } from '../stdlib/regex.js';

import {
  dynamicLinkMetadata,
  encoder,
  hashBytes,
  sourceHashForArtifact,
  verifyBackendArtifact,
  type ForgeWebScriptBackendCompilationResult,
} from './backend.js';
import { createDeclarations } from './declarations.js';
import { createEsmSource } from './esm.js';

import type { ForgeWebScriptAnalysisOptions, ForgeWebScriptAnalysisReport } from '../analysis/contracts.js';
import type {
  ForgeWebScriptArtifact,
  ForgeWebScriptCompileInput,
  ForgeWebScriptCompiler,
  ForgeWebScriptCompilerServiceOptions,
  ForgeWebScriptFrontendResult,
  ForgeWebScriptGraphCompileInput,
  ForgeWebScriptSelfHostedStageReport,
} from '../contracts.js';

/**
 * Resolves the analysis policy merged with any requested capabilities.
 */
function resolveAnalysisPolicy(input: ForgeWebScriptCompileInput): ForgeWebScriptAnalysisOptions['policy'] {
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
export function analysisOptions(input: ForgeWebScriptCompileInput): ForgeWebScriptAnalysisOptions {
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
function buildWatCache(input: ForgeWebScriptCompileInput): ForgeWebScriptWatCache | undefined {
  if (input.watCache === undefined) return undefined;
  if (input.logger === undefined) return input.watCache;
  return { ...input.watCache, logger: input.logger };
}

/**
 * Persists frontend SonIR graphs to cache if enabled.
 */
function persistSonIrArtifacts(
  cache: ForgeWebScriptWatCache | undefined,
  cacheKey: string,
  frontend: ForgeWebScriptFrontendResult,
  isDebug: boolean,
) {
  let sonIrPath: string | undefined;
  let unoptimizedSonIrPath: string | undefined;
  if (frontend.sonIr !== undefined) {
    sonIrPath = persistForgeWebScriptSoN(cache, cacheKey, frontend.sonIr);
  }
  if (isDebug && frontend.unoptimizedSonIr !== undefined) {
    unoptimizedSonIrPath = persistForgeWebScriptSoN(cache, cacheKey, frontend.unoptimizedSonIr, 'unoptimized');
  }
  return { sonIrPath, unoptimizedSonIrPath };
}

/**
 * Persists backend debug artifacts (WAT, WASM) to cache if debug optimization is selected.
 */
function persistDebugArtifacts(
  cache: ForgeWebScriptWatCache | undefined,
  cacheKey: string,
  backend: ForgeWebScriptBackendCompilationResult,
  isDebug: boolean,
): {
  readonly debugPaths: Partial<ForgeWebScriptDebugArtifactPaths>;
  readonly watPath: string | undefined;
  readonly debugArtifacts: unknown;
} {
  if (!isDebug || cache === undefined || cache.writeBinaryAtomic === undefined) {
    const watPath = persistForgeWebScriptWat(cache, cacheKey, backend.wat ?? '');
    return { debugPaths: {}, watPath, debugArtifacts: undefined };
  }
  const debugArtifacts = {
    optimizedWat: backend.wat,
    unoptimizedWat: backend.unoptimizedWat,
    optimizedWasm: backend.wasm,
    unoptimizedWasm: backend.unoptimizedWasm,
  };
  const debugPaths = persistForgeWebScriptDebugArtifacts(cache, cacheKey, debugArtifacts);
  const watPath = debugPaths.optimizedWatPath ?? persistForgeWebScriptWat(cache, cacheKey, backend.wat ?? '');
  return { debugPaths, watPath, debugArtifacts };
}

/**
 * Persists compiled SonIR, WAT, and Wasm debug artifacts to cache and prunes stale artifacts.
 */
function persistModuleCache(
  input: ForgeWebScriptCompileInput,
  cacheKey: string,
  frontend: ForgeWebScriptFrontendResult,
  backend: ForgeWebScriptBackendCompilationResult,
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

  pruneStaleForgeWebScriptCache(cache, input.fileName, cacheKey, writtenFiles);

  return { sonIrPath, unoptimizedSonIrPath, debugPaths, watPath, debugArtifacts };
}

/**
 * Checks whether any mandatory frontend compiler structures are missing.
 */
function isFrontendIncomplete(frontend: ForgeWebScriptFrontendResult): boolean {
  return [frontend.optimizedModule, frontend.abi, frontend.ir, frontend.optimizedIr].includes(undefined);
}

/**
 * Determines whether compilation should abort early due to frontend diagnostics or missing IR.
 */
function hasFrontendErrors(frontend: ForgeWebScriptFrontendResult, analysis: ForgeWebScriptAnalysisReport): boolean {
  if (frontend.diagnostics.length > 0 || analysis.blockingFindings.length > 0) return true;
  return isFrontendIncomplete(frontend);
}

/**
 * Builds the backend compiler configuration from frontend artifacts and options.
 */
function buildBackendCompileInput(
  input: ForgeWebScriptCompileInput,
  frontend: ForgeWebScriptFrontendResult,
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
    } as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['ir'],
    optimizedIr: {
      ...optimizedIr,
      memoryModel: 'region-arc-checked-linear' as const,
      enumDeclarations: formatEnumDeclarations(optimizedIr.enums),
      aggregateLayouts: manifest.aggregateLayouts,
    } as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['optimizedIr'],
    abi: manifest,
    links: frontend.links,
    metadata: metadata as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['metadata'],
    logger: input.logger,
  };
}

/**
 * Computes deterministic disk cache key for a compiled module.
 */
function computeModuleCacheKey(
  input: ForgeWebScriptCompileInput,
  frontend: ForgeWebScriptFrontendResult,
  moduleName: string,
  sourceFiles: readonly string[],
  graphHash: string | undefined,
  optimization: 'debug' | 'release',
  analysis: ForgeWebScriptAnalysisReport,
): string {
  const options = analysisOptions(input);
  return forgeWebScriptWatCacheKey({
    compilerVersion: input.compilerVersion,
    optimization,
    graphHash,
    sourceGraph: sourceFiles.map((fileName) => ({
      fileName,
      moduleId: moduleName,
      contentHash: hashBytes(encoder.encode(input.source)),
    })),
    linkConfiguration: input.linkConfiguration,
    standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
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
 * Compiles a single analyzed Forge Web Script module to WebAssembly and synthesizes ESM loader artifacts.
 */
export function compileForgeWebScriptModule(
  input: ForgeWebScriptCompileInput,
  frontend: ForgeWebScriptFrontendResult,
  graphMetadata: Pick<
    ForgeWebScriptArtifact,
    'graphHash' | 'linkMode' | 'linkedModules' | 'linkProfile' | 'optimizationProfile'
  > = {},
  sourceFiles: readonly string[] = frontend.sourceFiles,
): ForgeWebScriptArtifact {
  const diagnostics = [...frontend.diagnostics];
  const analysis = analyzeForgeWebScript(frontend, analysisOptions(input));
  diagnostics.push(...analysis.diagnostics);
  input.logger?.log('info', 'compile.start', { fileName: input.fileName });
  const emptyHash = hashBytes(
    encoder.encode(
      `${input.fileName}\0${input.source}\0${input.compilerVersion}\0${input.requireExports ?? true}\0${graphMetadata.graphHash ?? ''}\0${input.logger?.scope ?? ''}\0${JSON.stringify(forgeWebScriptStandardLibraryIdentity(input.standardLibrary))}`,
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
  const backend = compileForgeWebScriptWasm(
    backendCompileInput,
    input.fileName,
  ) as unknown as ForgeWebScriptBackendCompilationResult;
  const backendDiagnostics = backend.diagnostics as readonly ForgeWebScriptDiagnostic[];
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
  const artifact: ForgeWebScriptArtifact = {
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
 * Compiles a Forge Web Script seed input by preparing frontend ASTs and compiling the resulting module.
 */
export function compileForgeWebScriptSeed(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact {
  return compileForgeWebScriptModule(input, prepareForgeWebScriptFrontend(input));
}

/**
 * Compiles a Forge Web Script source string to WebAssembly and runtime artifacts.
 */
export function compileForgeWebScript(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact {
  return compileForgeWebScriptSeed(input);
}

/**
 * Creates an instance of the Forge Web Script compiler.
 */
export function createForgeWebScriptCompiler(): ForgeWebScriptCompiler {
  let disposed = false;
  return {
    compile(input): ForgeWebScriptArtifact {
      if (disposed) throw new Error('Forge Web Script compiler has been disposed.');
      return compileForgeWebScript(input);
    },
    dispose(): void {
      disposed = true;
    },
  };
}

/**
 * Compiles a multi-module Forge Web Script module graph into a unified WebAssembly artifact.
 */
export function compileForgeWebScriptGraph(input: ForgeWebScriptGraphCompileInput): ForgeWebScriptArtifact {
  const frontend = prepareForgeWebScriptGraphFrontend(input);
  return compileForgeWebScriptModule(
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
  input: Pick<ForgeWebScriptCompileInput, 'fileName'>,
  message: string,
  stage: ForgeWebScriptSelfHostedStageReport['stage'] = 'lex',
): ForgeWebScriptDiagnostic {
  return createDiagnostic(input.fileName, stage === 'parse' ? 'parse' : 'lex', 'FWS-BOOTSTRAP-001', message, {
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
  input: Pick<ForgeWebScriptCompileInput, 'fileName'>,
  failed: ForgeWebScriptSelfHostedStageReport,
  mode: string,
): ForgeWebScriptDiagnostic {
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
  runner: NonNullable<ForgeWebScriptCompilerServiceOptions['selfHostedRunner']>,
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
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
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  options: ForgeWebScriptCompilerServiceOptions,
): {
  readonly report?: ForgeWebScriptSelfHostedStageReport;
  readonly stageReports?: readonly ForgeWebScriptSelfHostedStageReport[];
  readonly diagnostic?: ForgeWebScriptDiagnostic;
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
  artifact: ForgeWebScriptArtifact,
  result: ReturnType<typeof runSelfHostedStage>,
): ForgeWebScriptArtifact {
  if (result.diagnostic === undefined) return artifact;
  return {
    ...artifact,
    wasm: undefined,
    esmSource: '',
    declarations: '',
    diagnostics: [...artifact.diagnostics, result.diagnostic],
  };
}
