import { prepareForgeWebScriptGraphFrontend } from '../frontend.js';
import { hashForgeWebScriptModuleGraph } from '../graph.js';
import { forgeWebScriptStandardLibraryIdentity } from '../stdlib/regex.js';

import {
  compileForgeWebScriptGraph,
  createForgeWebScriptCompiler,
  runSelfHostedStage,
  withSelfHostedResult,
} from './module.js';

import type { ForgeWebScriptAnalysisReport } from '../analysis/contracts.js';
import type {
  ForgeWebScriptArtifact,
  ForgeWebScriptCompileInput,
  ForgeWebScriptCompilerReport,
  ForgeWebScriptCompilerService,
  ForgeWebScriptCompilerServiceOptions,
  ForgeWebScriptGraphCompileInput,
  ForgeWebScriptSelfHostedStageReport,
} from '../contracts.js';
import type { ForgeWebScriptDiagnostic } from '../diagnostics.js';

/**
 * Computes an in-memory compiler cache key for single-module compilation.
 */
function keyFor(input: ForgeWebScriptCompileInput, selfHostedVmMode: string): string {
  const analysisPolicy = input.analysisPolicy ?? input.analysis?.policy;
  const analysisRules = input.analysisRules ?? input.analysis?.rules;
  return JSON.stringify({
    ...input,
    requestedCapabilities: [...(input.requestedCapabilities ?? [])].toSorted(),
    standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
    analysisPolicy,
    analysisRuleIds: analysisRules?.map(({ id }) => id).toSorted(),
    analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
    selfHostedVmMode,
  });
}

/**
 * Resolves analysis policy, rules, and source-map configurations for graph compilation.
 */
function resolveGraphAnalysisSettings(input: ForgeWebScriptGraphCompileInput) {
  const analysis = input.analysis;
  return {
    policy: input.analysisPolicy ?? analysis?.policy,
    rules: input.analysisRules ?? analysis?.rules,
    sourceMap: input.analysisSourceMap ?? analysis?.sourceMap,
  };
}

/**
 * Extracts optional compiler settings and cache metadata for graph compilation.
 */
function resolveGraphKeyMetadata(input: ForgeWebScriptGraphCompileInput) {
  const capabilities = input.requestedCapabilities ? [...input.requestedCapabilities].toSorted() : [];
  return {
    capabilities,
    requireExports: input.requireExports ?? true,
    optimization: input.optimization ?? 'debug',
    loggerScope: input.logger ? input.logger.scope : undefined,
    watCacheRoot: input.watCache ? input.watCache.root : undefined,
  };
}

/**
 * Computes an in-memory compiler cache key for module graph compilation.
 */
function graphKeyFor(input: ForgeWebScriptGraphCompileInput, selfHostedVmMode: string): string {
  const analysis = resolveGraphAnalysisSettings(input);
  const metadata = resolveGraphKeyMetadata(input);
  return JSON.stringify({
    graphHash: hashForgeWebScriptModuleGraph(input.graph, input.linkConfiguration),
    entryFileName: input.entryFileName,
    compilerVersion: input.compilerVersion,
    requireExports: metadata.requireExports,
    optimization: metadata.optimization,
    loggerScope: metadata.loggerScope,
    requestedCapabilities: metadata.capabilities,
    watCacheRoot: metadata.watCacheRoot,
    linkConfiguration: input.linkConfiguration,
    standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
    targetFeatures: input.targetFeatures,
    compilerHints: input.compilerHints,
    analysisPolicy: analysis.policy,
    analysisRuleIds: analysis.rules ? analysis.rules.map(({ id }) => id).toSorted() : undefined,
    analysisSourceMap: analysis.sourceMap,
    selfHostedVmMode,
  });
}

/**
 * Merges service-level default analysis policy and rules into compilation inputs.
 */
function withServiceOptions<T extends { analysisPolicy?: unknown; analysisRules?: unknown }>(
  input: T,
  options: ForgeWebScriptCompilerServiceOptions,
): T {
  return {
    ...input,
    analysisPolicy: input.analysisPolicy ?? options.analysisPolicy,
    analysisRules: input.analysisRules ?? options.analysisRules,
  };
}

/**
 * Checks whether a cached graph compilation entry references the invalidated file.
 */
function shouldInvalidateGraphEntry(entry: { readonly input: ForgeWebScriptGraphCompileInput }, file: string): boolean {
  return (
    entry.input.graph.modules.some(({ fileName }) => fileName === file) ||
    entry.input.graph.edges.some(({ resolved }) => resolved === file)
  );
}

/**
 * Removes cached compilation entries for an invalidated file.
 */
function invalidateFileCache(
  cache: Map<string, { readonly input: ForgeWebScriptCompileInput; readonly artifact: ForgeWebScriptArtifact }>,
  file: string,
): void {
  for (const [key, entry] of cache) {
    if (entry.input.fileName === file) cache.delete(key);
  }
}

/**
 * Removes cached graph compilation entries that depend on an invalidated file.
 */
function invalidateGraphCache(
  graphCache: Map<
    string,
    { readonly input: ForgeWebScriptGraphCompileInput; readonly artifact: ForgeWebScriptArtifact }
  >,
  invalidated: Set<string>,
  file: string,
): void {
  for (const [key, entry] of graphCache) {
    if (shouldInvalidateGraphEntry(entry, file)) {
      graphCache.delete(key);
      invalidated.add(entry.input.entryFileName);
    }
  }
}

/**
 * Creates an in-memory caching compiler service for incremental compilation and graph builds.
 */
export function createForgeWebScriptCompilerService(
  options: ForgeWebScriptCompilerServiceOptions = {},
): ForgeWebScriptCompilerService {
  const compiler = createForgeWebScriptCompiler();
  const cache = new Map<
    string,
    { readonly input: ForgeWebScriptCompileInput; readonly artifact: ForgeWebScriptArtifact }
  >();
  const graphCache = new Map<
    string,
    { readonly input: ForgeWebScriptGraphCompileInput; readonly artifact: ForgeWebScriptArtifact }
  >();
  const invalidated = new Set<string>();
  let disposed = false;
  let cacheHits = 0;
  let cacheMisses = 0;
  let diagnostics: readonly ForgeWebScriptDiagnostic[] = [];
  let analysis: ForgeWebScriptAnalysisReport | undefined;
  let selfHosted: ForgeWebScriptSelfHostedStageReport | undefined;
  let selfHostedStages: readonly ForgeWebScriptSelfHostedStageReport[] | undefined;
  const selfHostedVmMode = options.selfHostedVmMode ?? 'interpret';

  /** Asserts that the compiler service has not been disposed. */
  const assertActive = (): void => {
    if (disposed) throw new Error('Forge Web Script compiler service has been disposed.');
  };

  return {
    prepare(input): void {
      assertActive();
      if (input.root !== undefined) invalidated.add(input.root);
    },
    compile(input): ForgeWebScriptArtifact {
      assertActive();
      const effectiveInput = withServiceOptions(input, options);
      const key = keyFor(effectiveInput, selfHostedVmMode);
      const cached = cache.get(key);
      if (cached !== undefined && !invalidated.has(effectiveInput.fileName)) {
        cacheHits += 1;
        diagnostics = cached.artifact.diagnostics;
        analysis = cached.artifact.analysis;
        return cached.artifact;
      }
      cacheMisses += 1;
      const stage = runSelfHostedStage(effectiveInput, options);
      selfHosted = stage.report;
      selfHostedStages = stage.stageReports;
      const artifact = withSelfHostedResult(compiler.compile(effectiveInput), stage);
      cache.set(key, { input: effectiveInput, artifact });
      invalidated.delete(effectiveInput.fileName);
      diagnostics = artifact.diagnostics;
      analysis = artifact.analysis;
      return artifact;
    },
    compileGraph(input): ForgeWebScriptArtifact {
      assertActive();
      const effectiveInput = withServiceOptions(input, options);
      const key = graphKeyFor(effectiveInput, selfHostedVmMode);
      const cached = graphCache.get(key);
      const invalidatedGraph = effectiveInput.graph.modules.some(({ fileName }) => invalidated.has(fileName));
      if (cached !== undefined && !invalidatedGraph) {
        cacheHits += 1;
        diagnostics = cached.artifact.diagnostics;
        analysis = cached.artifact.analysis;
        return cached.artifact;
      }
      cacheMisses += 1;
      const frontend = prepareForgeWebScriptGraphFrontend(effectiveInput);
      const stage = runSelfHostedStage(
        {
          source: frontend.source,
          fileName: effectiveInput.entryFileName,
          compilerVersion: effectiveInput.compilerVersion,
          requestedCapabilities: effectiveInput.requestedCapabilities,
        },
        options,
      );
      selfHosted = stage.report;
      selfHostedStages = stage.stageReports;
      const artifact = withSelfHostedResult(compileForgeWebScriptGraph(effectiveInput), stage);
      graphCache.set(key, { input: effectiveInput, artifact });
      for (const module of effectiveInput.graph.modules) invalidated.delete(module.fileName);
      diagnostics = artifact.diagnostics;
      analysis = artifact.analysis;
      return artifact;
    },
    invalidate(files): void {
      assertActive();
      for (const file of files) {
        invalidated.add(file);
        invalidateFileCache(cache, file);
        invalidateGraphCache(graphCache, invalidated, file);
      }
    },
    report(): ForgeWebScriptCompilerReport {
      assertActive();
      return {
        diagnostics,
        cacheHits,
        cacheMisses,
        invalidatedFiles: [...invalidated].toSorted(),
        ...(analysis === undefined ? {} : { analysis }),
        ...(selfHosted === undefined ? {} : { selfHosted }),
        ...(selfHostedStages === undefined ? {} : { selfHostedStages }),
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      cache.clear();
      graphCache.clear();
      invalidated.clear();
      compiler.dispose();
    },
  };
}
