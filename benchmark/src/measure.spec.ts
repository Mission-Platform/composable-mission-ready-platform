import { describe, expect, it } from "vitest";

import { measureExecution } from "./measure.ts";

const input = { n: 0, multiplier: 0, offset: 0, seed: 0 };

describe("benchmark measurement", () => {
  it("warms up, samples, and reports throughput and memory deltas", async () => {
    let calls = 0;
    const measurement = await measureExecution(
      () => {
        calls += 1;
        return calls;
      },
      input,
      {
        warmupIterations: 2,
        sampleIterations: 4,
        operationsPerSample: 10,
        now: (() => {
          let tick = 0;
          return () => (tick += 2);
        })(),
        memory: (() => {
          let value = 100;
          return () => (value += 4);
        })(),
      },
    );

    expect(calls).toBe(6);
    expect(measurement.samples).toHaveLength(4);
    expect(measurement.statistics.count).toBe(4);
    expect(measurement.statistics.p95Ms).toBe(2);
    expect(measurement.statistics.throughputPerSecond).toBe(5000);
    expect(measurement.statistics.memoryDeltaBytes).toBe(4);
  });

  it("rejects invalid iteration counts", async () => {
    await expect(
      measureExecution(() => {}, input, {
        warmupIterations: -1,
        sampleIterations: 1,
      }),
    ).rejects.toThrow("warmupIterations");
  });
});
