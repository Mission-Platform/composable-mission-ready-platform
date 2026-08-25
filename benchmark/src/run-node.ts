import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { outputsEqual, normalizeBenchmarkOutput } from "./abi.ts";
import { createAssemblyScriptAdapter } from "./adapters/assemblyscript-wasm.ts";
import { createFwsVmAdapter } from "./adapters/fws-vm.ts";
import {
  createFwsExcludedBoundsWasmAdapter,
  createFwsGeneratedWasmAdapter,
  createFwsWasmAdapter,
} from "./adapters/fws-wasm.ts";
import { createJavaScriptAdapter } from "./adapters/javascript.ts";
import { createRustWasmAdapter } from "./adapters/rust-wasm.ts";
import { buildAssemblyScriptArtifact, buildRustArtifact } from "./build.ts";
import { BENCHMARK_CORPUS } from "./corpus.ts";
import {
  measureExecution,
  measureInitialization,
  memoryUsageBytes,
} from "./measure.ts";
import { summarizeSamples } from "./statistics.ts";

import type {
  BenchmarkCase,
  BenchmarkFailure,
  CorrectnessResult,
  EnvironmentMetadata,
  FwsMode,
  HostRuntime,
  MeasurementOptions,
  PhaseMeasurement,
  RuntimeAdapter,
  BuildArtifact,
} from "./contracts.ts";

export interface NodeBenchmarkOptions extends Partial<MeasurementOptions> {
  readonly cases?: readonly BenchmarkCase[];
}

export interface NodeBenchmarkResult {
  readonly hostRuntime: HostRuntime;
  readonly artifacts: readonly BuildArtifact[];
  readonly correctness: readonly CorrectnessResult[];
  readonly measurements: readonly PhaseMeasurement[];
  readonly failures: readonly BenchmarkFailure[];
  readonly environment: EnvironmentMetadata;
}

interface BuildAttempt {
  readonly adapter: RuntimeAdapter;
  readonly artifact?: BuildArtifact;
  readonly durationMs: number;
  readonly error?: string;
}

type InitializationAttempt = {
  readonly initializedResult?: Awaited<
    ReturnType<typeof measureInitialization>
  >;
  readonly error?: string;
};

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function memoryGetter(): (() => number | undefined) | undefined {
  return memoryUsageBytes() === undefined ? undefined : memoryUsageBytes;
}

async function rustLoader(moduleUrl: string): Promise<never> {
  const modulePath = fileURLToPath(moduleUrl);
  const directory = new URL("./", pathToFileURL(modulePath));
  const wasmPath = fileURLToPath(new URL("benchmark_bg.wasm", directory));
  const bgUrl = new URL("benchmark_bg.js", directory).href;
  const bg = (await import(bgUrl)) as {
    __wbg_set_wasm?: (exports: WebAssembly.Exports) => void;
    arithmetic_reduce?: unknown;
    string_transform?: unknown;
    dataset_scan?: unknown;
  };
  if (typeof bg.__wbg_set_wasm === "function") {
    const bytes = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(wasmPath),
    );
    const instance = await WebAssembly.instantiate(bytes, {});
    bg.__wbg_set_wasm(instance.instance.exports);
    return bg as never;
  }
  throw new Error("Rust wasm-pack loader did not expose __wbg_set_wasm.");
}

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

async function buildTargets(): Promise<readonly BuildAttempt[]> {
  const javascript = createJavaScriptAdapter();
  const interpret = createFwsVmAdapter("interpret");
  const jit = createFwsVmAdapter("jit");
  const aot = createFwsVmAdapter("aot");
  const fwsWasm = createFwsWasmAdapter();
  const fwsGeneratedWasm = createFwsGeneratedWasmAdapter();
  const fwsExcludedBoundsWasm = createFwsExcludedBoundsWasmAdapter();
  const rust = createRustWasmAdapter(rustLoader);
  const assemblyScript = createAssemblyScriptAdapter(assemblyScriptLoader);
  const targets: readonly [RuntimeAdapter, () => Promise<BuildArtifact>][] = [
    [javascript, () => javascript.build()],
    [fwsGeneratedWasm, () => fwsGeneratedWasm.build()],
    [interpret, () => interpret.build()],
    [jit, () => jit.build()],
    [aot, () => aot.build()],
    [fwsWasm, () => fwsWasm.build()],
    [fwsExcludedBoundsWasm, () => fwsExcludedBoundsWasm.build()],
    [rust, async () => buildRustArtifact()],
    [assemblyScript, () => buildAssemblyScriptArtifact()],
  ];
  const result: BuildAttempt[] = [];
  for (const [adapter, build] of targets) {
    const started = globalThis.performance.now();
    try {
      const artifact = await build();
      result.push({
        adapter,
        artifact,
        durationMs: globalThis.performance.now() - started,
      });
    } catch (error) {
      result.push({
        adapter,
        durationMs: globalThis.performance.now() - started,
        error: errorMessage(error),
      });
    }
  }
  return result;
}

function keyFor(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  hostRuntime: HostRuntime,
  phase: "build" | "initialize" | "execute",
) {
  return {
    caseId: benchmarkCase.id,
    workload: benchmarkCase.category,
    inputSize: benchmarkCase.size,
    implementation: adapter.implementation,
    ...(adapter.mode === undefined ? {} : { fwsMode: adapter.mode }),
    hostRuntime,
    phase,
  } as const;
}

function failedPhase(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  phase: "build" | "initialize" | "execute",
  hostRuntime: HostRuntime,
  error: string,
): PhaseMeasurement {
  return {
    ...keyFor(benchmarkCase, adapter, hostRuntime, phase),
    samples: [],
    status: "failed",
    error,
  };
}

function unsupportedCorrectness(
  benchmarkCase: BenchmarkCase,
  adapter: RuntimeAdapter,
  reason: string,
): CorrectnessResult {
  return {
    caseId: benchmarkCase.id,
    workload: benchmarkCase.category,
    inputSize: benchmarkCase.size,
    implementation: adapter.implementation,
    ...(adapter.mode === undefined ? {} : { fwsMode: adapter.mode }),
    hostRuntime: "node",
    status: "unsupported",
    expected: benchmarkCase.expected,
    reason,
  };
}

function environment(): EnvironmentMetadata {
  const cpu = os.cpus()[0];
  return {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpuModel: cpu?.model,
    cpuCount: os.cpus().length,
    memoryBytes: os.totalmem(),
    commandLine: process.argv.join(" "),
  };
}

export async function runNodeBenchmark(
  options: NodeBenchmarkOptions = {},
): Promise<NodeBenchmarkResult> {
  const cases = options.cases ?? BENCHMARK_CORPUS;
  const attempts = await buildTargets();
  const artifacts = attempts.flatMap((attempt) =>
    attempt.artifact ? [attempt.artifact] : [],
  );
  const correctness: CorrectnessResult[] = [];
  const measurements: PhaseMeasurement[] = [];
  const failures: BenchmarkFailure[] = [];
  const memory = memoryGetter();
  const initializations = new Map<BuildAttempt, InitializationAttempt>();

  for (const attempt of attempts) {
    for (const benchmarkCase of cases) {
      if (attempt.error !== undefined || attempt.artifact === undefined) {
        const reason = attempt.error ?? "Build produced no artifact.";
        measurements.push(
          failedPhase(benchmarkCase, attempt.adapter, "build", "node", reason),
          failedPhase(
            benchmarkCase,
            attempt.adapter,
            "initialize",
            "node",
            reason,
          ),
          failedPhase(
            benchmarkCase,
            attempt.adapter,
            "execute",
            "node",
            reason,
          ),
        );
        correctness.push(
          unsupportedCorrectness(benchmarkCase, attempt.adapter, reason),
        );
        failures.push({
          implementation: attempt.adapter.implementation,
          ...(attempt.adapter.mode === undefined
            ? {}
            : { fwsMode: attempt.adapter.mode as FwsMode }),
          phase: "build",
          category: /not found|enoent|browser|toolchain|wasm-pack|asc/i.test(
            reason,
          )
            ? "environment"
            : "build",
          message: reason,
        });
        continue;
      }

      const buildSamples = [{ durationMs: attempt.durationMs, operations: 1 }];
      measurements.push({
        ...keyFor(benchmarkCase, attempt.adapter, "node", "build"),
        samples: buildSamples,
        statistics: summarizeSamples(buildSamples),
        status: "measured",
      });
      try {
        let initialization = initializations.get(attempt);
        if (initialization === undefined) {
          try {
            initialization = {
              initializedResult: await measureInitialization(
                attempt.adapter,
                attempt.artifact,
                { ...options, memory },
              ),
            };
          } catch (error) {
            initialization = { error: errorMessage(error) };
          }
          initializations.set(attempt, initialization);
        }
        if (initialization.error !== undefined)
          throw new Error(initialization.error);
        const initializedResult = initialization.initializedResult;
        if (initializedResult === undefined)
          throw new Error("Initialization produced no adapter.");
        measurements.push({
          ...keyFor(benchmarkCase, attempt.adapter, "node", "initialize"),
          samples: initializedResult.measurement.samples,
          statistics: initializedResult.measurement.statistics,
          status: "measured",
        });
        let observed: ReturnType<typeof normalizeBenchmarkOutput>;
        try {
          observed = normalizeBenchmarkOutput(
            await initializedResult.initialized.execute(benchmarkCase.input),
          );
        } catch (error) {
          const reason = errorMessage(error);
          correctness.push({
            ...keyFor(benchmarkCase, attempt.adapter, "node", "execute"),
            status: "failed",
            expected: benchmarkCase.expected,
            reason,
          });
          measurements.push(
            failedPhase(
              benchmarkCase,
              attempt.adapter,
              "execute",
              "node",
              reason,
            ),
          );
          failures.push({
            implementation: attempt.adapter.implementation,
            ...(attempt.adapter.mode === undefined
              ? {}
              : { fwsMode: attempt.adapter.mode }),
            phase: "execute",
            category: "runtime",
            message: reason,
          });
          continue;
        }
        if (!outputsEqual(observed, benchmarkCase.expected)) {
          const reason = "Golden output mismatch.";
          correctness.push({
            ...keyFor(benchmarkCase, attempt.adapter, "node", "execute"),
            status: "failed",
            expected: benchmarkCase.expected,
            observed,
            reason,
          });
          measurements.push(
            failedPhase(
              benchmarkCase,
              attempt.adapter,
              "execute",
              "node",
              reason,
            ),
          );
          failures.push({
            implementation: attempt.adapter.implementation,
            ...(attempt.adapter.mode === undefined
              ? {}
              : { fwsMode: attempt.adapter.mode }),
            phase: "execute",
            category: "correctness",
            message: reason,
          });
          continue;
        }
        correctness.push({
          ...keyFor(benchmarkCase, attempt.adapter, "node", "execute"),
          status: "passed",
          expected: benchmarkCase.expected,
          observed,
        });
        const execution = await measureExecution(
          initializedResult.initialized.execute,
          benchmarkCase.input,
          { ...options, memory },
        );
        measurements.push({
          ...keyFor(benchmarkCase, attempt.adapter, "node", "execute"),
          samples: execution.samples,
          statistics: execution.statistics,
          status: "measured",
        });
      } catch (error) {
        const reason = errorMessage(error);
        measurements.push(
          failedPhase(
            benchmarkCase,
            attempt.adapter,
            "initialize",
            "node",
            reason,
          ),
        );
        correctness.push(
          unsupportedCorrectness(benchmarkCase, attempt.adapter, reason),
        );
        failures.push({
          implementation: attempt.adapter.implementation,
          ...(attempt.adapter.mode === undefined
            ? {}
            : { fwsMode: attempt.adapter.mode }),
          phase: "initialize",
          category: "runtime",
          message: reason,
        });
      }
    }
  }
  for (const initialization of initializations.values()) {
    await initialization.initializedResult?.initialized.close?.();
  }
  return {
    hostRuntime: "node",
    artifacts,
    correctness,
    measurements,
    failures,
    environment: environment(),
  };
}
