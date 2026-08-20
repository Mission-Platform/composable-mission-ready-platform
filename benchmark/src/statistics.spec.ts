import { describe, expect, it } from "vitest";

import { percentile, summarizeSamples } from "./statistics.ts";

describe("benchmark statistics", () => {
  it("calculates nearest-rank percentiles without mutating samples", () => {
    const values = [4, 1, 9, 2];

    expect(percentile(values, 0)).toBe(1);
    expect(percentile(values, 0.5)).toBe(2);
    expect(percentile(values, 0.95)).toBe(9);
    expect(values).toEqual([4, 1, 9, 2]);
  });

  it("summarizes latency, throughput, and available memory samples", () => {
    const summary = summarizeSamples([
      { durationMs: 1, operations: 10, memoryDeltaBytes: 100 },
      { durationMs: 2, operations: 10, memoryDeltaBytes: 300 },
      { durationMs: 3, operations: 10 },
      { durationMs: 4, operations: 10, memoryDeltaBytes: 500 },
    ]);

    expect(summary).toMatchObject({
      count: 4,
      meanMs: 2.5,
      medianMs: 2,
      p95Ms: 4,
      minMs: 1,
      maxMs: 4,
      throughputPerSecond: 4000,
      memoryDeltaBytes: 300,
    });
  });

  it("rejects empty and invalid samples", () => {
    expect(() => percentile([], 0.5)).toThrow(/empty sample set/);
    expect(() => percentile([1], 1.1)).toThrow(/between 0 and 1/);
    expect(() => summarizeSamples([{ durationMs: -1, operations: 1 }])).toThrow(
      /durations/,
    );
    expect(() => summarizeSamples([{ durationMs: 1, operations: -1 }])).toThrow(
      /operation counts/,
    );
  });
});
