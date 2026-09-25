import {
  compileNodeGraph,
  emitGraphSource,
  validateGraph,
  type FlintDiagnostic,
  type FlintGraphNode,
  type FlintGraphValidationIssue,
  type FlintNodeGraph,
} from '@mission-platform/flint';

import type { FlintTraceReport } from '@mission-platform/flint-runtime';

export type CompilerWorkerRequest =
  | {
      readonly type: 'compile_and_run';
      readonly graph: FlintNodeGraph;
      readonly inputs: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'export_source';
      readonly graph: FlintNodeGraph;
    };

export type CompilerWorkerResponse =
  | {
      readonly type: 'run_success';
      readonly outputs: Readonly<Record<string, unknown>>;
      readonly trace?: FlintTraceReport;
      readonly wasmBytes?: Uint8Array;
    }
  | {
      readonly type: 'run_error';
      readonly error: string;
      readonly nodeErrors: Readonly<Record<string, string>>;
    }
  | {
      readonly type: 'export_result';
      readonly source: string;
      readonly wasmBytes?: Uint8Array;
      readonly abiManifest?: unknown;
    };

/**
 * Generates a cryptographically random double-precision floating point number in [0, 1).
 */
function generateSecureRandomFloat(): number {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  const high = array[0] ?? 0;
  const low = array[1] ?? 0;
  return (high * 4_294_967_296 + low) / (4_294_967_296 * 4_294_967_296);
}

/**
 * Maps validation issues to node-keyed error messages.
 */
function collectValidationErrors(issues: readonly FlintGraphValidationIssue[]): Record<string, string> {
  const nodeErrors: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.nodeId) {
      nodeErrors[issue.nodeId] = issue.message;
    }
  }
  return nodeErrors;
}

/**
 * Maps compiler diagnostic errors to node-keyed error messages using source map spans.
 */
function collectDiagnosticErrors(
  diagnostics: readonly FlintDiagnostic[],
  spanToNode: ReadonlyMap<string, string>,
): Record<string, string> {
  const nodeErrors: Record<string, string> = {};
  for (const d of diagnostics) {
    if (d.span) {
      const key = `${d.span.line}:${d.span.column}:${d.span.endLine}:${d.span.endColumn}`;
      const nodeId = spanToNode.get(key);
      if (nodeId) {
        nodeErrors[nodeId] = d.message;
      }
    }
  }
  return nodeErrors;
}

/**
 * Prepares sorted arguments for invoking the exported entry function.
 */
function prepareCallArguments(
  sortedNodeIds: readonly string[] | undefined,
  nodes: readonly FlintGraphNode[],
  inputs: Readonly<Record<string, unknown>>,
): unknown[] {
  const sortedInputNodes = (sortedNodeIds ?? [])
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is FlintGraphNode => n !== undefined && (n.kind === 'input' || n.operation === 'input'));

  return sortedInputNodes.map((n) => {
    const name = String(n.properties?.name ?? n.id);
    return inputs[name] ?? inputs[n.id] ?? 0;
  });
}

/**
 * Instantiates and invokes the compiled WebAssembly module entry function.
 */
async function invokeWasmEntry(wasmBytes: Uint8Array, entryFnName: string, callArgs: unknown[]): Promise<unknown> {
  const wasmModule = await WebAssembly.instantiate(wasmBytes, {
    env: {
      memory: new WebAssembly.Memory({ initial: 256 }),
      host_clock_now: () => BigInt(Date.now()),
      host_random_f64: () => generateSecureRandomFloat(),
      host_log_debug: () => {
        /* no-op debug logger */
      },
    },
  });

  const instantiated = wasmModule as {
    instance?: { exports: Record<string, unknown> };
    exports?: Record<string, unknown>;
  };
  const wasmExports = instantiated.instance?.exports ?? instantiated.exports ?? {};
  const entryFn = wasmExports[entryFnName];

  if (typeof entryFn !== 'function') {
    throw new TypeError(`Exported function '${entryFnName}' was not found in WebAssembly exports.`);
  }

  return Reflect.apply(entryFn, undefined, callArgs);
}

/**
 * Validates a graph, compiles its AST, and verifies valid WebAssembly artifact emission.
 */
function validateAndCompileGraph(graph: FlintNodeGraph): {
  errorResponse?: CompilerWorkerResponse;
  artifact?: ReturnType<typeof compileNodeGraph>;
  sortedNodeIds?: readonly string[];
} {
  const validation = validateGraph(graph);
  if (!validation.valid) {
    return {
      errorResponse: {
        type: 'run_error',
        error: 'Graph validation failed.',
        nodeErrors: collectValidationErrors(validation.issues),
      },
    };
  }

  const artifact = compileNodeGraph(graph);
  const errorDiagnostics = artifact.diagnostics.filter((d) => d.severity === 'error');
  if (errorDiagnostics.length > 0) {
    return {
      errorResponse: {
        type: 'run_error',
        error: errorDiagnostics.map((d) => d.message).join('\n'),
        nodeErrors: collectDiagnosticErrors(errorDiagnostics, artifact.compilation.sourceMap.spanToNode),
      },
    };
  }

  if (!artifact.wasm) {
    return {
      errorResponse: {
        type: 'run_error',
        error: 'No WebAssembly binary was emitted by the Flint compiler.',
        nodeErrors: {},
      },
    };
  }

  return { artifact, sortedNodeIds: validation.sortedNodeIds };
}

/**
 * Executes a visual graph compilation and runs the WebAssembly binary in-memory.
 */
export async function executeGraph(
  graph: FlintNodeGraph,
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<CompilerWorkerResponse> {
  const check = validateAndCompileGraph(graph);
  if (check.errorResponse || !check.artifact || !check.sortedNodeIds || !check.artifact.wasm) {
    return (
      check.errorResponse ?? {
        type: 'run_error',
        error: 'Graph validation or compilation failed.',
        nodeErrors: {},
      }
    );
  }
  const artifact = check.artifact;
  const sortedNodeIds = check.sortedNodeIds;

  try {
    const callArgs = prepareCallArguments(sortedNodeIds, graph.nodes, inputs);
    const result = await invokeWasmEntry(artifact.wasm, artifact.compilation.entryFunctionName, callArgs);

    return {
      type: 'run_success',
      outputs: { result },
      wasmBytes: artifact.wasm,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: 'run_error',
      error: `Runtime execution error: ${message}`,
      nodeErrors: {},
    };
  }
}

/**
 * Exports formatted Flint source, compiled WebAssembly, and ABI manifest for a graph.
 */
export function exportGraphArtifacts(graph: FlintNodeGraph): CompilerWorkerResponse {
  try {
    const emission = emitGraphSource(graph);
    const artifact = compileNodeGraph(graph);

    return {
      type: 'export_result',
      source: emission.source,
      wasmBytes: artifact.wasm,
      abiManifest: artifact.manifest,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: 'run_error',
      error: `Failed to export source: ${message}`,
      nodeErrors: {},
    };
  }
}

// Worker message listener for background compilation thread
if (globalThis.self !== undefined && 'addEventListener' in globalThis.self) {
  globalThis.self.addEventListener('message', async (event: Event) => {
    if (!('data' in event)) return;
    const request = (event as MessageEvent<CompilerWorkerRequest>).data;
    if (!request) return;

    if (request.type === 'compile_and_run') {
      const response = await executeGraph(request.graph, request.inputs);
      (globalThis.self as unknown as { postMessage: (msg: unknown) => void }).postMessage(response);
    } else if (request.type === 'export_source') {
      const response = exportGraphArtifacts(request.graph);
      (globalThis.self as unknown as { postMessage: (msg: unknown) => void }).postMessage(response);
    }
  });
}
