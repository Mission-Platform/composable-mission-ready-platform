import { compileForgeWebScriptWasm } from '@mission-platform/forge-web-script-wasm';

import { analyzeForgeWebScript } from '../analysis/analyze.js';
import {
  forgeWebScriptWatCacheKey,
  persistForgeWebScriptDebugArtifacts,
  persistForgeWebScriptSoN,
  persistForgeWebScriptWat,
  pruneStaleForgeWebScriptCache,
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

import type { ForgeWebScriptAnalysisOptions } from '../analysis/contracts.js';
import type {
  ForgeWebScriptArtifact,
  ForgeWebScriptCompileInput,
  ForgeWebScriptCompiler,
  ForgeWebScriptCompilerServiceOptions,
  ForgeWebScriptFrontendResult,
  ForgeWebScriptGraphCompileInput,
  ForgeWebScriptSelfHostedStageReport,
} from '../contracts.js';

export function analysisOptions(input: ForgeWebScriptCompileInput): ForgeWebScriptAnalysisOptions {
  const nested = input.analysis ?? {};
  const policy = nested.policy ?? input.analysisPolicy;
  const policyWithCapabilities =
    input.requestedCapabilities === undefined || policy?.allowedCapabilities !== undefined
      ? policy
      : { ...policy, allowedCapabilities: input.requestedCapabilities };
  return {
    ...nested,
    ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
    ...(policyWithCapabilities === undefined ? {} : { policy: policyWithCapabilities }),
    ...(input.analysisRules === undefined ? {} : { rules: input.analysisRules }),
    ...(input.analysisSourceMap === undefined ? {} : { sourceMap: input.analysisSourceMap }),
  };
}

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
  if (
    frontend.diagnostics.length > 0 ||
    analysis.blockingFindings.length > 0 ||
    frontend.optimizedModule === undefined ||
    frontend.abi === undefined
  )
    return { esmSource: '', declarations: '', contentHash: emptyHash, diagnostics, analysis, ...graphMetadata };
  const optimization = input.optimization ?? (frontend.links.linkProfile === undefined ? 'debug' : 'release');
  const module = frontend.optimizedModule;
  const manifest = frontend.abi;
  const backend = compileForgeWebScriptWasm(
    {
      ir: {
        ...frontend.ir!,
        memoryModel: 'region-arc-checked-linear' as const,
        enumDeclarations: frontend.ir!.enums.map((declaration) => ({
          name: declaration.name,
          exported: declaration.exported,
          representation: 'i32' as const,
          variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
        })),
        aggregateLayouts: manifest.aggregateLayouts,
      } as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['ir'],
      optimizedIr: {
        ...frontend.optimizedIr!,
        memoryModel: 'region-arc-checked-linear' as const,
        enumDeclarations: frontend.optimizedIr!.enums.map((declaration) => ({
          name: declaration.name,
          exported: declaration.exported,
          representation: 'i32' as const,
          variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
        })),
        aggregateLayouts: manifest.aggregateLayouts,
      } as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['optimizedIr'],
      abi: manifest,
      links: frontend.links,
      metadata: {
        compilerVersion: input.compilerVersion,
        optimization,
        sourceFiles,
        sourceHash: sourceHashForArtifact(input.source, input.fileName),
        memoryModel: 'region-arc-checked-linear' as const,
        ...(graphMetadata.graphHash === undefined ? {} : { graphHash: graphMetadata.graphHash }),
        ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
        ...(input.compilerHints === undefined ? {} : { compilerHints: input.compilerHints }),
        boundsChecks: input.boundsChecks ?? 'runtime',
        ...(frontend.sonIr === undefined
          ? {}
          : {
              sonSchemaVersion: frontend.sonIr.schemaVersion,
              sonGraphHash: frontend.sonIr.graphHash,
              sonOptimizationPasses: frontend.sonIr.optimizationReport?.passes.map(({ name }) => name),
            }),
        ...(input.logger === undefined ? {} : { loggerScope: input.logger.scope }),
      },
      logger: input.logger,
    },
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
  const sourceMap = backend.sourceMap;
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
  const cacheKey = forgeWebScriptWatCacheKey({
    compilerVersion: input.compilerVersion,
    optimization,
    graphHash: graphMetadata.graphHash,
    sourceGraph: sourceFiles.map((fileName) => ({
      fileName,
      moduleId: module.name,
      contentHash: hashBytes(encoder.encode(input.source)),
    })),
    linkConfiguration: input.linkConfiguration,
    standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
    targetFeatures: input.targetFeatures,
    compilerHints: input.compilerHints,
    loggerScope: input.logger?.scope,
    analysisPolicy: analysis.policy,
    analysisRuleIds: analysisOptions(input)
      .rules?.map(({ id }) => id)
      .toSorted(),
    analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
    sonSchemaVersion: frontend.sonIr?.schemaVersion,
    sonGraphHash: frontend.sonIr?.graphHash,
    memoryModel: 'region-arc-checked-linear',
    boundsChecks: input.boundsChecks ?? 'runtime',
  });
  const debugArtifacts =
    optimization === 'debug'
      ? {
          optimizedWat: backend.wat,
          unoptimizedWat: backend.unoptimizedWat,
          optimizedWasm: backend.wasm,
          unoptimizedWasm: backend.unoptimizedWasm,
        }
      : undefined;
  const cache =
    input.watCache === undefined
      ? undefined
      : { ...input.watCache, ...(input.logger === undefined ? {} : { logger: input.logger }) };
  const sonIrPath = persistForgeWebScriptSoN(cache, cacheKey, frontend.sonIr!);
  const unoptimizedSonIrPath =
    optimization === 'debug' && frontend.unoptimizedSonIr !== undefined
      ? persistForgeWebScriptSoN(cache, cacheKey, frontend.unoptimizedSonIr, 'unoptimized')
      : undefined;
  const debugPaths =
    cache?.writeBinaryAtomic === undefined
      ? {}
      : persistForgeWebScriptDebugArtifacts(cache, cacheKey, debugArtifacts ?? {});
  const watPath = debugPaths.optimizedWatPath ?? persistForgeWebScriptWat(cache, cacheKey, wat);

  const writtenFiles = [
    sonIrPath,
    unoptimizedSonIrPath,
    debugPaths.optimizedWatPath,
    debugPaths.unoptimizedWatPath,
    debugPaths.optimizedWasmPath,
    debugPaths.unoptimizedWasmPath,
    watPath,
  ].filter((p): p is string => p !== undefined);
  pruneStaleForgeWebScriptCache(cache, input.fileName, cacheKey, writtenFiles);

  input.logger?.log('info', 'compile.complete', { fileName: input.fileName, contentHash: hashBytes(wasm) });
  return {
    wasm,
    esmSource,
    declarations: createDeclarations(manifest),
    manifest,
    ...(sourceMap === undefined ? {} : { sourceMap }),
    contentHash,
    wat,
    ...(watPath === undefined ? {} : { watPath }),
    ...(sonIrPath === undefined ? {} : { sonIrPath }),
    ...(unoptimizedSonIrPath === undefined ? {} : { unoptimizedSonIrPath }),
    ...(debugPaths.unoptimizedWatPath === undefined ? {} : { unoptimizedWatPath: debugPaths.unoptimizedWatPath }),
    ...(debugPaths.optimizedWasmPath === undefined ? {} : { optimizedWasmPath: debugPaths.optimizedWasmPath }),
    ...(debugPaths.unoptimizedWasmPath === undefined ? {} : { unoptimizedWasmPath: debugPaths.unoptimizedWasmPath }),
    ...(debugArtifacts === undefined ? {} : { debugArtifacts }),
    ...(backend.iteratorExports === undefined ? {} : { iteratorExports: backend.iteratorExports }),
    ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
    ...(input.compilerHints === undefined ? {} : { compilerHints: input.compilerHints }),
    optimizationReport: frontend.optimizationReport,
    sonIr: frontend.sonIr,
    sonOptimizationReport: frontend.sonOptimizationReport,
    ...(dynamicMetadata === undefined ? {} : { dynamicLinkMetadata: dynamicMetadata }),
    diagnostics: [...analysis.diagnostics, ...verificationDiagnostics],
    analysis,
    artifactVerification,
    ...graphMetadata,
  };
}

export function compileForgeWebScriptSeed(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact {
  return compileForgeWebScriptModule(input, prepareForgeWebScriptFrontend(input));
}

export function compileForgeWebScript(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact {
  return compileForgeWebScriptSeed(input);
}

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
    const report = options.selfHostedRunner(input, mode);
    const stageReports = [report, ...(report.stageReports ?? [])];
    const failed = stageReports.find(({ parity }) => !parity);
    return failed === undefined
      ? { report, stageReports }
      : {
          report,
          stageReports,
          diagnostic: selfHostedDiagnostic(
            input,
            `FWS VM ${failed.stage ?? 'lex'} stage parity failed in ${mode} mode: expected ${failed.expectedOutputHash ?? failed.expectedLexFingerprint}, received ${failed.outputHash ?? failed.lexFingerprint}.`,
            failed.stage,
          ),
        };
  } catch (error: unknown) {
    return {
      diagnostic: selfHostedDiagnostic(
        input,
        `FWS VM bootstrap failed in ${mode} mode: ${error instanceof Error ? error.message : String(error)}`,
      ),
    };
  }
}

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
