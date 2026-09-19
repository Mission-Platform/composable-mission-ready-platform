import {
  outputsEqual,
  normalizeBenchmarkOutput,
  readGuestBytes,
  writeGuestBytes,
  decodeUtf8,
  encodeUtf8,
} from "../src/abi.ts";
import { createAssemblyScriptAdapter } from "../src/adapters/assemblyscript-wasm.ts";
import { createFlintVmAdapter } from "../src/adapters/flint-vm.ts";
import { createJavaScriptAdapter } from "../src/adapters/javascript.ts";
import { createRustWasmAdapter } from "../src/adapters/rust-wasm.ts";
import { measureExecution, measureInitialization } from "../src/measure.ts";

import type { RustWasmExports } from "../src/adapters/rust-wasm.ts";
import type {
  BenchmarkCase,
  BenchmarkFailure,
  BuildArtifact,
  CorrectnessResult,
  MeasurementOptions,
  PhaseMeasurement,
  RuntimeAdapter,
  InitializedAdapter,
} from "../src/contracts.ts";

export interface BrowserBenchmarkRequest extends Partial<MeasurementOptions> {
  readonly cases: readonly BenchmarkCase[];
  readonly artifacts: readonly BuildArtifact[];
}

export interface BrowserBenchmarkResult {
  readonly measurements: readonly PhaseMeasurement[];
  readonly correctness: readonly CorrectnessResult[];
  readonly failures: readonly BenchmarkFailure[];
  readonly browserVersion: string;
}

interface BrowserFlintExports {
  readonly arithmetic_reduce: (
    n: number,
    multiplier: number,
    offset: number,
    seed: number,
  ) => number;
  readonly string_transform: (
    value: number,
    valueLength: number,
    prefix: number,
    prefixLength: number,
    suffix: number,
    suffixLength: number,
    repeat: number,
  ) => readonly [number, number];
  readonly dataset_scan: (
    pointer: number,
    length: number,
    threshold: number,
  ) => number;
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
}

interface BrowserGeneratedFlintExports {
  readonly arithmetic_reduce: BrowserFlintExports["arithmetic_reduce"];
  readonly string_transform: (
    value: string,
    prefix: string,
    suffix: string,
    repeat: number,
  ) => string;
  readonly dataset_scan: (
    bytes: readonly [pointer: number, length: number],
    threshold: number,
  ) => number;
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: BrowserFlintExports["fws_alloc"];
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: BrowserFlintExports["fws_realloc"];
  readonly fws_reset: () => void;
}

/**
 * Executes an operation with a reset of the guest instance before and after execution.
 *
 * @param exports Object exporting the fws_reset lifecycle function.
 * @param operation Callback executing guest operations.
 * @returns Result of the operation.
 */
function withReset<T>(
  exports: { readonly fws_reset: () => void },
  operation: () => T,
): T {
  exports.fws_reset();
  let operationFailed = false;
  try {
    return operation();
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      exports.fws_reset();
    } catch (resetError) {
      if (!operationFailed) throw resetError;
    }
  }
}

/**
 * Normalizes an unknown error to a bounded message string.
 *
 * @param error Caught error value.
 * @returns Bounded string representation of the error.
 */
function message(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

/**
 * Constructs a unique measurement key for a benchmark execution phase.
 *
 * @param benchmarkCase Benchmark scenario specification.
 * @param adapter Runtime adapter being measured.
 * @param phase Phase of the benchmark run.
 * @returns Metadata object uniquely identifying the measurement.
 */
function key(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  phase: "build" | "initialize" | "execute",
) {
  return {
    caseId: benchmarkCase.id,
    workload: benchmarkCase.category,
    inputSize: benchmarkCase.size,
    implementation: adapter.implementation,
    ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
    hostRuntime: "chromium" as const,
    phase,
  };
}

/**
 * Creates a failed phase measurement record.
 *
 * @param benchmarkCase Benchmark scenario specification.
 * @param adapter Runtime adapter being measured.
 * @param phase Phase during which failure occurred.
 * @param error Failure error message.
 * @returns Failed phase measurement object.
 */
function failed(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  phase: "build" | "initialize" | "execute",
  error: string,
): PhaseMeasurement {
  return {
    ...key(benchmarkCase, adapter, phase),
    samples: [],
    status: "failed",
    error,
  };
}

/**
 * Creates a browser runtime adapter for raw Flint WebAssembly artifacts.
 *
 * @param artifact Compiled build artifact containing the WASM URL.
 * @param mode Flint execution mode variant.
 * @returns Runtime adapter for in-browser execution.
 */
function flintWasmAdapter(
  artifact: BuildArtifact,
  mode: "wasm" | "wasm-excluded-bounds" = "wasm",
): RuntimeAdapter {
  let module: WebAssembly.Module | undefined;
  return {
    implementation: "flint",
    mode,
    adapterId: `flint-${mode}-browser`,
    async build(): Promise<BuildArtifact> {
      return artifact;
    },
    async initialize(received): Promise<InitializedAdapter> {
      if (
        received.id !== artifact.id ||
        typeof received.metadata?.wasmUrl !== "string"
      ) {
        throw new Error(
          "Flint browser adapter received an incompatible artifact URL.",
        );
      }
      if (module === undefined) {
        const response = await fetch(received.metadata.wasmUrl);
        if (!response.ok)
          throw new Error(`Unable to fetch Flint WASM (${response.status}).`);
        module = await WebAssembly.compile(await response.arrayBuffer());
      }
      const prepared = new WebAssembly.Instance(module, {})
        .exports as unknown as BrowserFlintExports;
      if (
        typeof prepared.fws_reset !== "function" ||
        typeof prepared.fws_dealloc !== "function" ||
        typeof prepared.fws_realloc !== "function"
      )
        throw new Error(
          "Flint browser WASM module is missing required memory ABI exports.",
        );
      return {
        adapterId: `flint-${mode}-browser`,
        preparation: {
          moduleCompiled: true,
          instancePolicy: "reusable-with-reset",
          resetAbi: "fws_reset-v1",
        },
        execute: (input) => {
          return withReset(prepared, () => {
            if ("multiplier" in input)
              return normalizeBenchmarkOutput(
                prepared.arithmetic_reduce(
                  input.n,
                  input.multiplier,
                  input.offset,
                  input.seed,
                ),
              );
            if ("suffix" in input) {
              const value = writeGuestBytes(
                prepared.memory,
                prepared.fws_alloc,
                encodeUtf8(input.value),
              );
              const prefix = writeGuestBytes(
                prepared.memory,
                prepared.fws_alloc,
                encodeUtf8(input.prefix),
              );
              const suffix = writeGuestBytes(
                prepared.memory,
                prepared.fws_alloc,
                encodeUtf8(input.suffix),
              );
              let output: { pointer: number; length: number } | undefined;
              try {
                const [pointer, length] = prepared.string_transform(
                  value.pointer,
                  value.length,
                  prefix.pointer,
                  prefix.length,
                  suffix.pointer,
                  suffix.length,
                  input.repeat,
                );
                output = { pointer, length };
                return normalizeBenchmarkOutput(
                  decodeUtf8(readGuestBytes(prepared.memory, pointer, length)),
                );
              } finally {
                for (const range of [output, value, prefix, suffix])
                  if (range !== undefined)
                    prepared.fws_dealloc(range.pointer, range.length);
              }
            }
            const data = writeGuestBytes(
              prepared.memory,
              prepared.fws_alloc,
              Uint8Array.from(input.bytes),
            );
            try {
              return normalizeBenchmarkOutput(
                prepared.dataset_scan(
                  data.pointer,
                  data.length,
                  input.threshold,
                ),
              );
            } finally {
              prepared.fws_dealloc(data.pointer, data.length);
            }
          });
        },
      };
    },
  };
}

/**
 * Creates a browser runtime adapter for generated Flint WebAssembly ESM modules.
 *
 * @param artifact Compiled build artifact containing the module URL.
 * @returns Runtime adapter for in-browser execution with generated loader bindings.
 */
function flintGeneratedWasmAdapter(artifact: BuildArtifact): RuntimeAdapter {
  let exports: BrowserGeneratedFlintExports | undefined;
  return {
    implementation: "flint",
    mode: "wasm-generated",
    adapterId: "flint-wasm-generated-browser",
    async build(): Promise<BuildArtifact> {
      return artifact;
    },
    async initialize(received): Promise<InitializedAdapter> {
      if (
        received.id !== artifact.id ||
        typeof received.metadata?.moduleUrl !== "string"
      ) {
        throw new Error(
          "Flint generated browser adapter received an incompatible module URL.",
        );
      }
      const loaded = (await import(received.metadata.moduleUrl)) as {
        loadSync?: () => BrowserGeneratedFlintExports;
      };
      if (typeof loaded.loadSync !== "function")
        throw new Error(
          "Generated Flint browser module has no loadSync loader.",
        );
      exports = loaded.loadSync();
      return {
        adapterId: "flint-wasm-generated-browser",
        preparation: {
          moduleLoaded: true,
          instancePolicy: "reusable-with-reset",
          resetAbi: "fws_reset-v1",
          stringInputAllocations: 1,
        },
        execute: (input) => {
          const instance = exports as BrowserGeneratedFlintExports;
          return withReset(instance, () => {
            if ("multiplier" in input)
              return normalizeBenchmarkOutput(
                instance.arithmetic_reduce(
                  input.n,
                  input.multiplier,
                  input.offset,
                  input.seed,
                ),
              );
            if ("suffix" in input)
              return normalizeBenchmarkOutput(
                instance.string_transform(
                  input.value,
                  input.prefix,
                  input.suffix,
                  input.repeat,
                ),
              );
            const data = writeGuestBytes(
              instance.memory,
              instance.fws_alloc,
              Uint8Array.from(input.bytes),
            );
            try {
              return normalizeBenchmarkOutput(
                instance.dataset_scan(
                  [data.pointer, data.length],
                  input.threshold,
                ),
              );
            } finally {
              instance.fws_dealloc(data.pointer, data.length);
            }
          });
        },
      };
    },
  };
}

/**
 * Dynamically loads and binds Rust WebAssembly exports for the browser harness.
 *
 * @param moduleUrl URL of the Rust WebAssembly module.
 * @returns Promise resolving to Rust WebAssembly exports.
 */
async function rustLoader(moduleUrl: string): Promise<RustWasmExports> {
  // The bundler entry imports benchmark_bg.wasm and initializes its glue.
  return (await import(moduleUrl)) as RustWasmExports;
}

/**
 * Dynamically loads AssemblyScript WebAssembly module exports.
 *
 * @param moduleUrl URL of the AssemblyScript module.
 * @returns Promise resolving to AssemblyScript exports.
 */
async function assemblyScriptLoader(moduleUrl: string): Promise<never> {
  const loaded = (await import(moduleUrl)) as {
    loadModuleSync?: () => Record<string, unknown>;
    loadModule?: () => Promise<Record<string, unknown>>;
  };
  if (typeof loaded.loadModuleSync === "function")
    return loaded.loadModuleSync() as never;
  if (typeof loaded.loadModule === "function")
    return (await loaded.loadModule()) as never;
  throw new Error("AssemblyScript generated module has no loadModule loader.");
}

/**
 * Selects and instantiates the appropriate runtime adapter for a given build artifact.
 *
 * @param artifact Compiled benchmark build artifact.
 * @returns Configured runtime adapter instance.
 */
function adapterFor(artifact: BuildArtifact): RuntimeAdapter {
  if (artifact.implementation === "javascript")
    return createJavaScriptAdapter();
  if (artifact.implementation === "rust-wasm")
    return createRustWasmAdapter(rustLoader);
  if (artifact.implementation === "assemblyscript-wasm")
    return createAssemblyScriptAdapter(assemblyScriptLoader);
  if (artifact.flintMode === "wasm-generated")
    return flintGeneratedWasmAdapter(artifact);
  if (artifact.flintMode === "wasm") return flintWasmAdapter(artifact);
  if (artifact.flintMode === "wasm-excluded-bounds")
    return flintWasmAdapter(artifact, "wasm-excluded-bounds");
  return createFlintVmAdapter(artifact.flintMode ?? "interpret");
}

/**
 * Executes a browser benchmark request across requested artifacts and cases.
 *
 * @param request Complete browser benchmark request specification.
 * @returns Promise resolving to full benchmark measurements and results.
 */
export async function runBrowserRequest(
  request: BrowserBenchmarkRequest,
): Promise<BrowserBenchmarkResult> {
  const measurements: PhaseMeasurement[] = [];
  const correctness: CorrectnessResult[] = [];
  const failures: BenchmarkFailure[] = [];
  for (const artifact of request.artifacts) {
    const adapter = adapterFor(artifact);
    for (const benchmarkCase of request.cases) {
      try {
        const initializedResult = await measureInitialization(
          adapter,
          artifact,
          request,
        );
        measurements.push({
          ...key(benchmarkCase, adapter, "initialize"),
          samples: initializedResult.measurement.samples,
          statistics: initializedResult.measurement.statistics,
          status: "measured",
        });

        let observed;
        try {
          observed = normalizeBenchmarkOutput(
            await initializedResult.initialized.execute(benchmarkCase.input),
          );
        } catch (error) {
          const reason = message(error);
          correctness.push({
            ...key(benchmarkCase, adapter, "execute"),
            status: "failed",
            expected: benchmarkCase.expected,
            reason,
          });
          measurements.push(failed(benchmarkCase, adapter, "execute", reason));
          failures.push({
            implementation: adapter.implementation,
            ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
            phase: "execute",
            category: "runtime",
            message: reason,
          });
          continue;
        }
        if (!outputsEqual(observed, benchmarkCase.expected)) {
          const reason = "Golden output mismatch.";
          correctness.push({
            ...key(benchmarkCase, adapter, "execute"),
            status: "failed",
            expected: benchmarkCase.expected,
            observed,
            reason,
          });
          measurements.push(failed(benchmarkCase, adapter, "execute", reason));
          failures.push({
            implementation: adapter.implementation,
            ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
            phase: "execute",
            category: "correctness",
            message: reason,
          });
          continue;
        }
        correctness.push({
          ...key(benchmarkCase, adapter, "execute"),
          status: "passed",
          expected: benchmarkCase.expected,
          observed,
        });
        const execution = await measureExecution(
          initializedResult.initialized.execute,
          benchmarkCase.input,
          request,
        );
        measurements.push({
          ...key(benchmarkCase, adapter, "execute"),
          samples: execution.samples,
          statistics: execution.statistics,
          status: "measured",
        });
        await initializedResult.initialized.close?.();
      } catch (error) {
        const reason = message(error);
        measurements.push(
          failed(benchmarkCase, adapter, "initialize", reason),
          failed(benchmarkCase, adapter, "execute", reason),
        );
        correctness.push({
          ...key(benchmarkCase, adapter, "execute"),
          status: "unsupported",
          expected: benchmarkCase.expected,
          reason,
        });
        failures.push({
          implementation: adapter.implementation,
          ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
          phase: "initialize",
          category: "runtime",
          message: reason,
        });
      }
    }
  }
  return {
    measurements,
    correctness,
    failures,
    browserVersion: navigator.userAgent,
  };
}

type BrowserGlobal = typeof globalThis & {
  __benchmarkRequest?: BrowserBenchmarkRequest;
  __benchmarkResult?: BrowserBenchmarkResult;
};

async function start(): Promise<void> {
  const runtime = globalThis as BrowserGlobal;
  const request = runtime.__benchmarkRequest;
  if (request === undefined) return;
  runtime.__benchmarkResult = await runBrowserRequest(request);
  document.title = "benchmark-complete";
  document.body.textContent = "benchmark-complete";
}

globalThis.addEventListener("benchmark-request", () => void start(), {
  once: true,
});
await start();
