import { summarizeSamples } from "./statistics.ts";

import type {
  BenchmarkInput,
  BenchmarkSample,
  ExecutionMeasurement,
  InitializedAdapter,
  MeasurementOptions,
  RuntimeAdapter,
  SampleStatistics,
} from "./contracts.ts";

const DEFAULT_OPTIONS: MeasurementOptions = {
  warmupIterations: 3,
  sampleIterations: 10,
};

function clock(options: MeasurementOptions): () => number {
  return options.now ?? (() => globalThis.performance.now());
}

function checkedOptions(
  options: Partial<MeasurementOptions>,
): MeasurementOptions {
  const result = { ...DEFAULT_OPTIONS, ...options };
  if (
    !Number.isInteger(result.warmupIterations) ||
    result.warmupIterations < 0
  ) {
    throw new RangeError("warmupIterations must be a non-negative integer.");
  }
  if (
    !Number.isInteger(result.sampleIterations) ||
    result.sampleIterations < 1
  ) {
    throw new RangeError("sampleIterations must be a positive integer.");
  }
  if (
    result.operationsPerSample !== undefined &&
    (!Number.isFinite(result.operationsPerSample) ||
      result.operationsPerSample < 0)
  ) {
    throw new RangeError(
      "operationsPerSample must be finite and non-negative.",
    );
  }
  return result;
}

export async function measureExecution<Input extends BenchmarkInput>(
  operation: (input: Input) => unknown | Promise<unknown>,
  input: Input,
  options: Partial<MeasurementOptions> = {},
): Promise<ExecutionMeasurement> {
  const settings = checkedOptions(options);
  const now = clock(settings);
  const operations = settings.operationsPerSample ?? 1;

  for (let index = 0; index < settings.warmupIterations; index += 1) {
    await operation(input);
  }

  const samples: BenchmarkSample[] = [];
  for (let index = 0; index < settings.sampleIterations; index += 1) {
    const beforeMemory = settings.memory?.();
    const started = now();
    await operation(input);
    const durationMs = now() - started;
    const afterMemory = settings.memory?.();
    samples.push({
      durationMs,
      operations,
      ...(beforeMemory !== undefined && afterMemory !== undefined
        ? { memoryDeltaBytes: afterMemory - beforeMemory }
        : {}),
    });
  }
  return { samples, statistics: summarizeSamples(samples) };
}

export async function measureInitialization<Input extends BenchmarkInput>(
  adapter: RuntimeAdapter<Input>,
  artifact: Parameters<RuntimeAdapter<Input>["initialize"]>[0],
  options: Partial<MeasurementOptions> = {},
): Promise<{
  readonly initialized: InitializedAdapter<Input>;
  readonly measurement: ExecutionMeasurement;
}> {
  const settings = checkedOptions(options);
  const now = clock(settings);
  const samples: BenchmarkSample[] = [];
  let initialized: InitializedAdapter<Input> | undefined;

  for (let index = 0; index < settings.warmupIterations; index += 1) {
    const value = await adapter.initialize(artifact);
    await value.close?.();
  }
  for (let index = 0; index < settings.sampleIterations; index += 1) {
    const beforeMemory = settings.memory?.();
    const started = now();
    const value = await adapter.initialize(artifact);
    const durationMs = now() - started;
    await initialized?.close?.();
    initialized = value;
    const afterMemory = settings.memory?.();
    samples.push({
      durationMs,
      operations: 1,
      ...(beforeMemory !== undefined && afterMemory !== undefined
        ? { memoryDeltaBytes: afterMemory - beforeMemory }
        : {}),
    });
  }
  if (initialized === undefined)
    throw new Error("Initialization produced no adapter.");
  return {
    initialized,
    measurement: { samples, statistics: summarizeSamples(samples) },
  };
}

export function memoryUsageBytes(): number | undefined {
  const memory = globalThis as typeof globalThis & {
    process?: { memoryUsage?: () => { heapUsed: number } };
    performance?: { memory?: { usedJSHeapSize: number } };
  };
  if (typeof memory.process?.memoryUsage === "function") {
    return memory.process.memoryUsage().heapUsed;
  }
  const used = memory.performance?.memory?.usedJSHeapSize;
  return typeof used === "number" ? used : undefined;
}

export function unavailableStatistics(): SampleStatistics | undefined {
  return undefined;
}
