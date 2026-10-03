import { compileFlint } from '../compiler.js';

import { buildGraphAst } from './ast-builder.js';
import { emitGraphSource } from './source-emitter.js';

import type { FlintModule } from '../ast.js';
import type { FlintArtifact, FlintCompileInput } from '../contracts.js';
import type { FlintNodeGraph, FlintNodeSourceMap } from './types.js';

export interface FlintGraphCompilationArtifact {
  readonly module: FlintModule;
  readonly source: string;
  readonly sourceMap: FlintNodeSourceMap;
  readonly entryFunctionName: string;
}

export interface FlintCompiledNodeGraphArtifact extends Omit<FlintArtifact, 'sourceMap'> {
  readonly compilation: FlintGraphCompilationArtifact;
  readonly nodeSourceMap: FlintNodeSourceMap;
  readonly sourceMap: FlintNodeSourceMap;
  readonly wasmSourceMap?: string;
}

/**
 * Dual compiler generator for Flint visual node graphs.
 * Synthesizes typed in-memory FlintModule AST and formatted .flint source text with bidirectional source maps.
 */
export function compileGraphToFlint(graph: FlintNodeGraph): FlintGraphCompilationArtifact {
  const astResult = buildGraphAst(graph);
  const sourceResult = emitGraphSource(graph);

  return {
    module: astResult.module,
    source: sourceResult.source,
    sourceMap: sourceResult.sourceMap,
    entryFunctionName: sourceResult.entryFunctionName,
  };
}

/**
 * Compiles a visual FlintNodeGraph end-to-end into WebAssembly binary, ABI manifest, and source artifacts.
 */
export function compileNodeGraph(
  graph: FlintNodeGraph,
  options?: Partial<FlintCompileInput>,
): FlintCompiledNodeGraphArtifact {
  const compilation = compileGraphToFlint(graph);
  const fileName = options?.fileName ?? `${graph.name || 'graph'}.flint`;
  const artifact = compileFlint({
    source: compilation.source,
    fileName,
    compilerVersion: options?.compilerVersion ?? '0.1.0',
    requestedCapabilities: graph.requestedCapabilities,
    ...options,
  });

  return {
    ...artifact,
    compilation,
    nodeSourceMap: compilation.sourceMap,
    sourceMap: compilation.sourceMap,
    wasmSourceMap: artifact.sourceMap,
  };
}
