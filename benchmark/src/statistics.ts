import type { BenchmarkSample, SampleStatistics } from "./contracts.ts";

export function percentile(
  values: readonly number[],
  fraction: number,
): number {
  if (values.length === 0) {
    throw new Error("Cannot calculate a percentile for an empty sample set.");
  }
  if (fraction < 0 || fraction > 1 || !Number.isFinite(fraction)) {
    throw new RangeError(
      `Percentile fraction must be between 0 and 1; received ${fraction}.`,
    );
  }

  const sorted = values.toSorted((left, right) => left - right);
  const rank = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[rank] ?? sorted.at(-1)!;
}

export function summarizeSamples(
  samples: readonly BenchmarkSample[],
): SampleStatistics {
  if (samples.length === 0) {
    throw new Error("Cannot summarize an empty sample set.");
  }
  if (
    samples.some(
      (sample) => sample.durationMs < 0 || !Number.isFinite(sample.durationMs),
    )
  ) {
    throw new RangeError("Sample durations must be finite and non-negative.");
  }
  if (
    samples.some(
      (sample) => sample.operations < 0 || !Number.isFinite(sample.operations),
    )
  ) {
    throw new RangeError(
      "Sample operation counts must be finite and non-negative.",
    );
  }

  const durations = samples.map((sample) => sample.durationMs);
  const totalDurationMs = durations.reduce(
    (total, duration) => total + duration,
    0,
  );
  const totalOperations = samples.reduce(
    (total, sample) => total + sample.operations,
    0,
  );
  const memorySamples = samples.flatMap((sample) =>
    sample.memoryDeltaBytes === undefined ? [] : [sample.memoryDeltaBytes],
  );

  return {
    count: samples.length,
    meanMs: totalDurationMs / samples.length,
    medianMs: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    throughputPerSecond:
      totalDurationMs === 0
        ? Number.POSITIVE_INFINITY
        : (totalOperations * 1000) / totalDurationMs,
    ...(memorySamples.length > 0
      ? {
          memoryDeltaBytes:
            memorySamples.reduce((total, value) => total + value, 0) /
            memorySamples.length,
        }
      : {}),
  };
}
