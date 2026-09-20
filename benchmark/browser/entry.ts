import {
  outputsEqual,
  normalizeBenchmarkOutput,
  readGuestBytes,
  writeGuestBytes,
  decodeUtf8,
  encodeUtf8,
} from "../src/abi.ts";
import {
  createAssemblyScriptAdapter,
  type AssemblyScriptExports,
} from "../src/adapters/assemblyscript-wasm.ts";
import { createFlintVmAdapter } from "../src/adapters/flint-vm.ts";
import { createJavaScriptAdapter } from "../src/adapters/javascript.ts";
import {
  createRustWasmAdapter,
  type RustWasmExports,
} from "../src/adapters/rust-wasm.ts";
import { measureExecution, measureInitialization } from "../src/measure.ts";

import type {
  BenchmarkCase,
  BenchmarkFailure,
  BenchmarkInput,
  BenchmarkKey,
  BenchmarkOutput,
  BuildArtifact,
  CorrectnessResult,
  InitializedAdapter,
  MeasurementOptions,
  PhaseMeasurement,
  RuntimeAdapter,
} from "../src/contracts.ts";

/**
 * Payload sent to the browser runner containing test cases, build artifacts, and measurement options.
 */
export interface BrowserBenchmarkRequest extends Partial<MeasurementOptions> {
  readonly cases: readonly BenchmarkCase[];
  readonly artifacts: readonly BuildArtifact[];
}

/**
 * Complete evaluation report produced by the in-browser benchmark runner.
 */
export interface BrowserBenchmarkResult {
  readonly measurements: readonly PhaseMeasurement[];
  readonly correctness: readonly CorrectnessResult[];
  readonly failures: readonly BenchmarkFailure[];
  readonly browserVersion: string;
}

/**
 * Native WebAssembly export contract expected by browser Flint execution.
 */
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

/**
 * Generated ESM export contract for browser execution.
 */
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
  readonly fws_reset: BrowserFlintExports["fws_reset"];
}

/**
 * Dynamically loaded ESM module contract with loadSync method.
 */
interface BrowserGeneratedModule {
  readonly loadSync: () => BrowserGeneratedFlintExports;
}

/**
 * Memory slice record for allocated guest buffers.
 */
interface GuestMemoryRange {
  readonly pointer: number;
  readonly length: number;
}

/**
 * Wraps an execution in the reset ABI lifecycle, guaranteeing reset execution upon completion.
 *
 * @param exports - Object containing the fws_reset ABI export.
 * @param operation - Benchmark operation closure to execute.
 * @returns Result of the operation.
 * @throws {Error} Rethrows operation error or reset failure.
 */
function withReset<T extends BenchmarkOutput | number | string | undefined>(
  exports: { readonly fws_reset: () => void },
  operation: () => T,
): T {
  exports.fws_reset();
  let operationFailed = false;
  try {
    return operation();
  } catch (error: unknown) {
    operationFailed = true;
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    try {
      exports.fws_reset();
    } catch (resetError: unknown) {
      if (!operationFailed) {
        throw resetError instanceof Error
          ? resetError
          : new Error(String(resetError));
      }
    }
  }
}

/**
 * Formats an unknown thrown error into a bounded descriptive message.
 *
 * @param error - The thrown value.
 * @returns Bounded message string.
 */
function formatErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

/**
 * Constructs a structured benchmark key identifying the case, adapter, and phase.
 *
 * @param benchmarkCase - Case being evaluated.
 * @param adapter - Runtime adapter being measured.
 * @param phase - Benchmark phase (build, initialize, or execute).
 * @returns Structured benchmark key.
 */
function createBenchmarkKey(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  phase: "build" | "initialize" | "execute",
): BenchmarkKey {
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
 * Constructs a failed phase measurement record.
 *
 * @param benchmarkCase - Target case.
 * @param adapter - Target runtime adapter.
 * @param phase - Benchmark phase that failed.
 * @param errorMessage - Failure description.
 * @returns PhaseMeasurement with status "failed".
 */
function createFailedMeasurement(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  phase: "build" | "initialize" | "execute",
  errorMessage: string,
): PhaseMeasurement {
  return {
    ...createBenchmarkKey(benchmarkCase, adapter, phase),
    samples: [],
    status: "failed",
    error: errorMessage,
  };
}

/**
 * Fetches and compiles a WebAssembly module from a remote or blob URL.
 *
 * @param wasmUrl - URL to fetch the WASM binary from.
 * @returns Compiled WebAssembly.Module.
 * @throws {Error} If fetching or compilation fails.
 */
async function compileBrowserWasmModule(
  wasmUrl: string,
): Promise<WebAssembly.Module> {
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch Flint WASM (${response.status}).`);
  }
  return WebAssembly.compile(await response.arrayBuffer());
}

/**
 * Type guard validating that WebAssembly exports satisfy the BrowserFlintExports contract.
 *
 * @param exports - Member exports from WebAssembly instance.
 * @returns True if exports conform to BrowserFlintExports.
 */
function isBrowserFlintExports(
  exports: WebAssembly.Exports,
): exports is WebAssembly.Exports & BrowserFlintExports {
  return (
    typeof exports.arithmetic_reduce === "function" &&
    typeof exports.string_transform === "function" &&
    typeof exports.dataset_scan === "function" &&
    exports.memory instanceof WebAssembly.Memory &&
    typeof exports.fws_alloc === "function" &&
    typeof exports.fws_dealloc === "function" &&
    typeof exports.fws_realloc === "function" &&
    typeof exports.fws_reset === "function"
  );
}

/**
 * Dispatches an input workload through raw WebAssembly browser exports.
 *
 * @param prepared - Initialized browser Flint exports.
 * @param input - Benchmark input payload.
 * @returns Normalized benchmark output.
 */
function executeBrowserWasmInput(
  prepared: BrowserFlintExports,
  input: BenchmarkInput,
): BenchmarkOutput {
  return withReset(prepared, () => {
    if ("multiplier" in input) {
      return normalizeBenchmarkOutput(
        prepared.arithmetic_reduce(
          input.n,
          input.multiplier,
          input.offset,
          input.seed,
        ),
      );
    }
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
      let output: GuestMemoryRange | undefined;
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
        for (const range of [output, value, prefix, suffix]) {
          if (range !== undefined) {
            prepared.fws_dealloc(range.pointer, range.length);
          }
        }
      }
    }
    const data = writeGuestBytes(
      prepared.memory,
      prepared.fws_alloc,
      Uint8Array.from(input.bytes),
    );
    try {
      return normalizeBenchmarkOutput(
        prepared.dataset_scan(data.pointer, data.length, input.threshold),
      );
    } finally {
      prepared.fws_dealloc(data.pointer, data.length);
    }
  });
}

/**
 * Creates a browser runtime adapter for raw WebAssembly execution.
 *
 * @param artifact - Build artifact containing metadata and WASM URL.
 * @param mode - Target WASM mode (standard or bounds-excluded).
 * @returns Runtime adapter adhering to the benchmark contract.
 */
function flintWasmAdapter(
  artifact: BuildArtifact,
  mode: "wasm" | "wasm-excluded-bounds" = "wasm",
): RuntimeAdapter {
  let module: WebAssembly.Module | undefined;
  return {
    implementation: "flint",
    mode,
    adapterId: `fws-${mode}-browser`,
    build(): Promise<BuildArtifact> {
      return Promise.resolve(artifact);
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
        module = await compileBrowserWasmModule(received.metadata.wasmUrl);
      }
      const instanceExports = new WebAssembly.Instance(module, {}).exports;
      if (!isBrowserFlintExports(instanceExports)) {
        throw new TypeError(
          "Flint browser WASM module is missing required memory ABI exports.",
        );
      }
      return {
        adapterId: `fws-${mode}-browser`,
        preparation: {
          moduleCompiled: true,
          instancePolicy: "reusable-with-reset",
          resetAbi: "fws_reset-v1",
        },
        execute: (input) => executeBrowserWasmInput(instanceExports, input),
      };
    },
  };
}

/**
 * Type guard verifying that a dynamic import satisfies BrowserGeneratedModule.
 *
 * @param value - Dynamic import value.
 * @returns True if value contains a valid loadSync method.
 */
function isBrowserGeneratedModule(
  value: unknown,
): value is BrowserGeneratedModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "loadSync" in value &&
    typeof value.loadSync === "function"
  );
}

/**
 * Dispatches an input workload through compiler-generated ESM browser exports.
 *
 * @param instance - Browser generated exports instance.
 * @param input - Benchmark input payload.
 * @returns Normalized benchmark output.
 */
function executeBrowserGeneratedInput(
  instance: BrowserGeneratedFlintExports,
  input: BenchmarkInput,
): BenchmarkOutput {
  return withReset(instance, () => {
    if ("multiplier" in input) {
      return normalizeBenchmarkOutput(
        instance.arithmetic_reduce(
          input.n,
          input.multiplier,
          input.offset,
          input.seed,
        ),
      );
    }
    if ("suffix" in input) {
      return normalizeBenchmarkOutput(
        instance.string_transform(
          input.value,
          input.prefix,
          input.suffix,
          input.repeat,
        ),
      );
    }
    const data = writeGuestBytes(
      instance.memory,
      instance.fws_alloc,
      Uint8Array.from(input.bytes),
    );
    try {
      return normalizeBenchmarkOutput(
        instance.dataset_scan([data.pointer, data.length], input.threshold),
      );
    } finally {
      instance.fws_dealloc(data.pointer, data.length);
    }
  });
}

/**
 * Creates a browser runtime adapter for generated ESM WebAssembly execution.
 *
 * @param artifact - Build artifact containing generated module URL.
 * @returns Runtime adapter for browser generated WebAssembly execution.
 */
function flintGeneratedWasmAdapter(artifact: BuildArtifact): RuntimeAdapter {
  let exports: BrowserGeneratedFlintExports | undefined;
  return {
    implementation: "flint",
    mode: "wasm-generated",
    adapterId: "flint-wasm-generated-browser",
    build(): Promise<BuildArtifact> {
      return Promise.resolve(artifact);
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
      const loaded: unknown = await import(received.metadata.moduleUrl);
      if (!isBrowserGeneratedModule(loaded)) {
        throw new TypeError(
          "Generated Flint browser module has no loadSync loader.",
        );
      }
      exports = loaded.loadSync();
      const instance = exports;
      return {
        adapterId: "flint-wasm-generated-browser",
        preparation: {
          moduleLoaded: true,
          instancePolicy: "reusable-with-reset",
          resetAbi: "fws_reset-v1",
          stringInputAllocations: 1,
        },
        execute: (input) => executeBrowserGeneratedInput(instance, input),
      };
    },
  };
}

/**
 * Type guard verifying that a module export satisfies the RustWasmExports interface.
 *
 * @param value - Dynamic import export candidate.
 * @returns True if value contains required Rust WASM kernel functions.
 */
function isRustWasmExports(value: unknown): value is RustWasmExports {
  return (
    typeof value === "object" &&
    value !== null &&
    "arithmetic_reduce" in value &&
    typeof value.arithmetic_reduce === "function" &&
    "string_transform" in value &&
    typeof value.string_transform === "function" &&
    "dataset_scan" in value &&
    typeof value.dataset_scan === "function"
  );
}

/**
 * Loads Rust WebAssembly exports in the browser environment.
 *
 * @param moduleUrl - URL of the generated Rust WASM ESM wrapper.
 * @returns Initialized Rust WebAssembly exports.
 * @throws {TypeError} If loaded module does not conform to RustWasmExports.
 */
async function rustLoader(moduleUrl: string): Promise<RustWasmExports> {
  const loaded: unknown = await import(moduleUrl);
  if (!isRustWasmExports(loaded)) {
    throw new TypeError("Rust WASM module failed to load as valid exports.");
  }
  return loaded;
}

/**
 * Module shape of AssemblyScript generated loader glue.
 */
interface AssemblyScriptModule {
  readonly loadModuleSync?: () => AssemblyScriptExports;
  readonly loadModule?: () => Promise<AssemblyScriptExports>;
}

/**
 * Type guard validating AssemblyScript generated module loader contract.
 *
 * @param value - Dynamic import export candidate.
 * @returns True if value conforms to AssemblyScriptModule.
 */
function isAssemblyScriptModule(value: unknown): value is AssemblyScriptModule {
  return (
    typeof value === "object" &&
    value !== null &&
    (("loadModuleSync" in value &&
      typeof value.loadModuleSync === "function") ||
      ("loadModule" in value && typeof value.loadModule === "function"))
  );
}

/**
 * Loads AssemblyScript WebAssembly exports in the browser environment.
 *
 * @param moduleUrl - URL of the generated AssemblyScript ESM wrapper.
 * @returns Initialized AssemblyScript exports.
 * @throws {TypeError} If loaded module is invalid or lacks loader functions.
 */
async function assemblyScriptLoader(
  moduleUrl: string,
): Promise<AssemblyScriptExports> {
  const loaded: unknown = await import(moduleUrl);
  if (!isAssemblyScriptModule(loaded)) {
    throw new TypeError(
      "AssemblyScript generated module has no loadModule loader.",
    );
  }
  if (typeof loaded.loadModuleSync === "function") {
    return loaded.loadModuleSync();
  }
  if (typeof loaded.loadModule === "function") {
    return await loaded.loadModule();
  }
  throw new TypeError(
    "AssemblyScript generated module has no executable loadModule function.",
  );
}

/**
 * Resolves the appropriate browser runtime adapter for a given build artifact.
 *
 * @param artifact - Build artifact to adapt.
 * @returns Suitable runtime adapter instance.
 */
function adapterFor(artifact: BuildArtifact): RuntimeAdapter {
  if (artifact.implementation === "javascript") {
    return createJavaScriptAdapter();
  }
  if (artifact.implementation === "rust-wasm") {
    return createRustWasmAdapter(rustLoader);
  }
  if (artifact.implementation === "assemblyscript-wasm") {
    return createAssemblyScriptAdapter(assemblyScriptLoader);
  }
  if (artifact.flintMode === "wasm-generated") {
    return flintGeneratedWasmAdapter(artifact);
  }
  if (artifact.flintMode === "wasm") {
    return flintWasmAdapter(artifact);
  }
  if (artifact.flintMode === "wasm-excluded-bounds") {
    return flintWasmAdapter(artifact, "wasm-excluded-bounds");
  }
  return createFlintVmAdapter(artifact.flintMode ?? "interpret");
}

/**
 * Result of executing and validating a single benchmark case.
 */
interface CaseExecutionOutcome {
  readonly phaseMeasurements: readonly PhaseMeasurement[];
  readonly correctnessResult: CorrectnessResult;
  readonly failure?: BenchmarkFailure;
}

/**
 * Executes a single benchmark case against an initialized adapter, validating correctness and recording latency.
 *
 * @param initialized - Initialized benchmark adapter instance.
 * @param benchmarkCase - Case definition and input payload.
 * @param adapter - Runtime adapter contract.
 * @param request - Browser request configuration.
 * @returns Execution outcome with measurements and validation status.
 */
async function executeAndValidateCase(
  initialized: InitializedAdapter,
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  request: BrowserBenchmarkRequest,
): Promise<CaseExecutionOutcome> {
  let observed: BenchmarkOutput;
  try {
    observed = normalizeBenchmarkOutput(
      await initialized.execute(benchmarkCase.input),
    );
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    return {
      phaseMeasurements: [
        createFailedMeasurement(
          benchmarkCase,
          adapter,
          "execute",
          errorMessage,
        ),
      ],
      correctnessResult: {
        ...createBenchmarkKey(benchmarkCase, adapter, "execute"),
        status: "failed",
        expected: benchmarkCase.expected,
        reason: errorMessage,
      },
      failure: {
        implementation: adapter.implementation,
        ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
        phase: "execute",
        category: "runtime",
        message: errorMessage,
      },
    };
  }

  if (!outputsEqual(observed, benchmarkCase.expected)) {
    const mismatchReason = "Golden output mismatch.";
    return {
      phaseMeasurements: [
        createFailedMeasurement(
          benchmarkCase,
          adapter,
          "execute",
          mismatchReason,
        ),
      ],
      correctnessResult: {
        ...createBenchmarkKey(benchmarkCase, adapter, "execute"),
        status: "failed",
        expected: benchmarkCase.expected,
        observed,
        reason: mismatchReason,
      },
      failure: {
        implementation: adapter.implementation,
        ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
        phase: "execute",
        category: "correctness",
        message: mismatchReason,
      },
    };
  }

  const execution = await measureExecution(
    initialized.execute,
    benchmarkCase.input,
    request,
  );

  return {
    phaseMeasurements: [
      {
        ...createBenchmarkKey(benchmarkCase, adapter, "execute"),
        samples: execution.samples,
        statistics: execution.statistics,
        status: "measured",
      },
    ],
    correctnessResult: {
      ...createBenchmarkKey(benchmarkCase, adapter, "execute"),
      status: "passed",
      expected: benchmarkCase.expected,
      observed,
    },
  };
}

/**
 * Evaluates a single benchmark case for an artifact, handling initialization and execution errors.
 *
 * @param benchmarkCase - Case being evaluated.
 * @param adapter - Target runtime adapter.
 * @param artifact - Build artifact being measured.
 * @param request - Benchmark execution parameters.
 * @returns Aggregated measurements, correctness entries, and failure reports.
 */
async function processBenchmarkCase(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  artifact: BuildArtifact,
  request: BrowserBenchmarkRequest,
): Promise<{
  readonly measurements: readonly PhaseMeasurement[];
  readonly correctness: readonly CorrectnessResult[];
  readonly failures: readonly BenchmarkFailure[];
}> {
  try {
    const initializedResult = await measureInitialization(
      adapter,
      artifact,
      request,
    );
    const initMeasurement: PhaseMeasurement = {
      ...createBenchmarkKey(benchmarkCase, adapter, "initialize"),
      samples: initializedResult.measurement.samples,
      statistics: initializedResult.measurement.statistics,
      status: "measured",
    };

    const executionOutcome = await executeAndValidateCase(
      initializedResult.initialized,
      benchmarkCase,
      adapter,
      request,
    );

    await initializedResult.initialized.close?.();

    return {
      measurements: [initMeasurement, ...executionOutcome.phaseMeasurements],
      correctness: [executionOutcome.correctnessResult],
      failures: executionOutcome.failure ? [executionOutcome.failure] : [],
    };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    return {
      measurements: [
        createFailedMeasurement(
          benchmarkCase,
          adapter,
          "initialize",
          errorMessage,
        ),
        createFailedMeasurement(
          benchmarkCase,
          adapter,
          "execute",
          errorMessage,
        ),
      ],
      correctness: [
        {
          ...createBenchmarkKey(benchmarkCase, adapter, "execute"),
          status: "unsupported",
          expected: benchmarkCase.expected,
          reason: errorMessage,
        },
      ],
      failures: [
        {
          implementation: adapter.implementation,
          ...(adapter.mode === undefined ? {} : { flintMode: adapter.mode }),
          phase: "initialize",
          category: "runtime",
          message: errorMessage,
        },
      ],
    };
  }
}

/**
 * Main execution handler evaluating a complete browser benchmark suite across all requested artifacts.
 *
 * @param request - Input specification with artifacts, cases, and measurement options.
 * @returns Complete evaluation outcome with latency statistics and correctness checks.
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
      const outcome = await processBenchmarkCase(
        benchmarkCase,
        adapter,
        artifact,
        request,
      );
      measurements.push(...outcome.measurements);
      correctness.push(...outcome.correctness);
      failures.push(...outcome.failures);
    }
  }

  return {
    measurements,
    correctness,
    failures,
    browserVersion: navigator.userAgent,
  };
}

/**
 * Type guard verifying whether an unknown candidate conforms to the BrowserBenchmarkRequest contract.
 *
 * @param value - Candidate request payload.
 * @returns True if value is a valid BrowserBenchmarkRequest.
 */
function isBrowserBenchmarkRequest(
  value: unknown,
): value is BrowserBenchmarkRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "cases" in value &&
    Array.isArray(value.cases) &&
    "artifacts" in value &&
    Array.isArray(value.artifacts)
  );
}

/**
 * Safely retrieves the benchmark request payload attached to the global environment.
 *
 * @returns The benchmark request if present on globalThis, otherwise undefined.
 */
function getBenchmarkRequest(): BrowserBenchmarkRequest | undefined {
  const candidate: unknown = Reflect.get(globalThis, "__benchmarkRequest");
  return isBrowserBenchmarkRequest(candidate) ? candidate : undefined;
}

/**
 * Stores the benchmark result on the global environment for runner retrieval.
 *
 * @param result - The completed benchmark result.
 */
function setBenchmarkResult(result: BrowserBenchmarkResult): void {
  Reflect.set(globalThis, "__benchmarkResult", result);
}

/**
 * Initializes browser benchmark execution from window state when triggered by automated harness.
 */
async function start(): Promise<void> {
  const request = getBenchmarkRequest();
  if (request === undefined) return;
  const result = await runBrowserRequest(request);
  setBenchmarkResult(result);
  document.title = "benchmark-complete";
  document.body.textContent = "benchmark-complete";
}

globalThis.addEventListener("benchmark-request", () => void start(), {
  once: true,
});
await start();
