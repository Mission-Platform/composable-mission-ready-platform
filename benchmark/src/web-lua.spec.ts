import { describe, expect, it } from "vitest";

import { WEB_LUA_BENCHMARK_CORPUS, runWebLuaBenchmark } from "./web-lua.ts";

describe("WebLua benchmark workload", () => {
  it("contains deterministic scalar workloads with golden results", () => {
    expect(WEB_LUA_BENCHMARK_CORPUS.length).toBeGreaterThanOrEqual(3);
    expect(WEB_LUA_BENCHMARK_CORPUS.map((entry) => entry.expected)).toEqual([
      14, 3, 42,
    ]);
    expect(
      new Set(WEB_LUA_BENCHMARK_CORPUS.map((entry) => entry.id)).size,
    ).toBe(WEB_LUA_BENCHMARK_CORPUS.length);
  });

  it("measures initialization, execution, and memory evidence", async () => {
    const report = await runWebLuaBenchmark({
      warmupIterations: 1,
      sampleIterations: 1,
    });

    expect(report).not.toHaveProperty("compileMs");
    expect(report).not.toHaveProperty("artifactSizeBytes");
    expect(report.initializeMs).toBeGreaterThanOrEqual(0);
    expect(report.memoryAfterBytes).toBeGreaterThanOrEqual(
      report.memoryBeforeBytes,
    );
    expect(report.cases).toHaveLength(WEB_LUA_BENCHMARK_CORPUS.length);
    expect(report.cases.every((entry) => entry.samplesMs.length === 1)).toBe(
      true,
    );
  }, 120_000);
});
