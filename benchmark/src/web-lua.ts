import { performance } from "node:perf_hooks";

import {
  compileWebLua,
  createWebLuaRuntime,
  type WebLuaRuntime,
} from "@mission-platform/web-lua/node";

export interface WebLuaBenchmarkCase {
  readonly id: string;
  readonly source: string;
  readonly expected: number;
}

export const WEB_LUA_BENCHMARK_CORPUS = [
  {
    id: "scalar-arithmetic",
    source: "return 2 + 3 * 4",
    expected: 14,
  },
  {
    id: "loop-and-local-state",
    source:
      "local value = 0; while value < 3 do value = value + 1 end; return value",
    expected: 3,
  },
  {
    id: "function-call",
    source:
      "function add(left, right) return left + right end; return add(20, 22)",
    expected: 42,
  },
] as const satisfies readonly WebLuaBenchmarkCase[];

export interface WebLuaBenchmarkOptions {
  readonly warmupIterations?: number;
  readonly sampleIterations?: number;
}

export interface WebLuaBenchmarkCaseResult {
  readonly id: string;
  readonly result: number;
  readonly samplesMs: readonly number[];
}

export interface WebLuaBenchmarkReport {
  readonly contentHash: string;
  readonly graphHash: string;
  readonly artifactSizeBytes: number;
  readonly compileMs: number;
  readonly initializeMs: number;
  readonly memoryBeforeBytes: number;
  readonly memoryAfterBytes: number;
  readonly memoryGrowthBytes: number;
  readonly cases: readonly WebLuaBenchmarkCaseResult[];
}

function positiveInteger(value: number | undefined, fallback: number): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1)
    throw new RangeError("Benchmark iterations must be positive integers.");
  return result;
}

function memoryBytes(runtime: WebLuaRuntime): number {
  return runtime.exports.memory.buffer.byteLength;
}

async function executeCase(
  runtime: WebLuaRuntime,
  benchmarkCase: WebLuaBenchmarkCase,
): Promise<number> {
  const state = runtime.createState();
  try {
    const prototype = runtime.load(state, benchmarkCase.source);
    if (runtime.status(state) !== 0)
      throw new Error(`WebLua benchmark failed to load '${benchmarkCase.id}'.`);
    const result = runtime.call(state, prototype);
    if (runtime.status(state) !== 0)
      throw new Error(
        `WebLua benchmark failed while executing '${benchmarkCase.id}'.`,
      );
    if (result !== benchmarkCase.expected)
      throw new Error(
        `WebLua benchmark '${benchmarkCase.id}' returned ${result}, expected ${benchmarkCase.expected}.`,
      );
    return result;
  } finally {
    runtime.close(state);
  }
}

export async function runWebLuaBenchmark(
  options: WebLuaBenchmarkOptions = {},
): Promise<WebLuaBenchmarkReport> {
  const warmupIterations = positiveInteger(options.warmupIterations, 1);
  const sampleIterations = positiveInteger(options.sampleIterations, 3);
  const compileStarted = performance.now();
  const artifact = await compileWebLua();
  const compileMs = performance.now() - compileStarted;
  const initializeStarted = performance.now();
  const runtime = await createWebLuaRuntime(artifact);
  const initializeMs = performance.now() - initializeStarted;
  const memoryBeforeBytes = memoryBytes(runtime);
  const cases: WebLuaBenchmarkCaseResult[] = [];

  try {
    for (const benchmarkCase of WEB_LUA_BENCHMARK_CORPUS) {
      for (let index = 0; index < warmupIterations; index += 1)
        await executeCase(runtime, benchmarkCase);
      const samplesMs: number[] = [];
      let result = 0;
      for (let index = 0; index < sampleIterations; index += 1) {
        const started = performance.now();
        result = await executeCase(runtime, benchmarkCase);
        samplesMs.push(performance.now() - started);
      }
      cases.push({ id: benchmarkCase.id, result, samplesMs });
      runtime.exports.fws_reset();
    }
    const memoryAfterBytes = memoryBytes(runtime);
    return {
      contentHash: artifact.contentHash,
      graphHash: artifact.graphHash,
      artifactSizeBytes: artifact.artifact.wasm?.byteLength ?? 0,
      compileMs,
      initializeMs,
      memoryBeforeBytes,
      memoryAfterBytes,
      memoryGrowthBytes: memoryAfterBytes - memoryBeforeBytes,
      cases,
    };
  } finally {
    runtime.exports.fws_reset();
  }
}
