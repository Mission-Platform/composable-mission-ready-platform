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
  const keyFor = (input: ForgeWebScriptCompileInput): string =>
    JSON.stringify({
      ...input,
      requestedCapabilities: [...(input.requestedCapabilities ?? [])].toSorted(),
      standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
      analysisPolicy: input.analysisPolicy ?? input.analysis?.policy,
      analysisRuleIds: (input.analysisRules ?? input.analysis?.rules)?.map(({ id }) => id).toSorted(),
      analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
      selfHostedVmMode: options.selfHostedVmMode ?? 'interpret',
    });
  const graphKeyFor = (input: ForgeWebScriptGraphCompileInput): string =>
    JSON.stringify({
      graphHash: hashForgeWebScriptModuleGraph(input.graph, input.linkConfiguration),
      entryFileName: input.entryFileName,
      compilerVersion: input.compilerVersion,
      requireExports: input.requireExports ?? true,
      optimization: input.optimization ?? 'debug',
      loggerScope: input.logger?.scope,
      requestedCapabilities: [...(input.requestedCapabilities ?? [])].toSorted(),
      watCacheRoot: input.watCache?.root,
      linkConfiguration: input.linkConfiguration,
      standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
      targetFeatures: input.targetFeatures,
      compilerHints: input.compilerHints,
      analysisPolicy: input.analysisPolicy ?? input.analysis?.policy,
      analysisRuleIds: (input.analysisRules ?? input.analysis?.rules)?.map(({ id }) => id).toSorted(),
      analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
      selfHostedVmMode: options.selfHostedVmMode ?? 'interpret',
    });
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
      const effectiveInput: ForgeWebScriptCompileInput = {
        ...input,
        ...(input.analysisPolicy === undefined && options.analysisPolicy === undefined
          ? {}
          : { analysisPolicy: input.analysisPolicy ?? options.analysisPolicy }),
        ...(input.analysisRules === undefined && options.analysisRules === undefined
          ? {}
          : { analysisRules: input.analysisRules ?? options.analysisRules }),
      };
      const key = keyFor(effectiveInput);
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
      const effectiveInput: ForgeWebScriptGraphCompileInput = {
        ...input,
        ...(input.analysisPolicy === undefined && options.analysisPolicy === undefined
          ? {}
          : { analysisPolicy: input.analysisPolicy ?? options.analysisPolicy }),
        ...(input.analysisRules === undefined && options.analysisRules === undefined
          ? {}
          : { analysisRules: input.analysisRules ?? options.analysisRules }),
      };
      const key = graphKeyFor(effectiveInput);
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
        for (const [key, entry] of cache) if (entry.input.fileName === file) cache.delete(key);
        for (const [key, entry] of graphCache) {
          if (
            entry.input.graph.modules.some(({ fileName }) => fileName === file) ||
            entry.input.graph.edges.some(({ resolved }) => resolved === file)
          ) {
            graphCache.delete(key);
            invalidated.add(entry.input.entryFileName);
          }
        }
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
