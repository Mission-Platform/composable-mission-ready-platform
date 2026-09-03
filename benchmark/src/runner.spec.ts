import { describe, expect, it } from "vitest";

import { BENCHMARK_CORPUS } from "./corpus.ts";
import { runChromiumBenchmark } from "./run-browser.ts";
import { runNodeBenchmark } from "./run-node.ts";

const smallCases = BENCHMARK_CORPUS.filter(
  (benchmarkCase) => benchmarkCase.size === "small",
);

describe("benchmark execution pipeline", () => {
  it("runs every native target through the Node correctness gate", async () => {
    const result = await runNodeBenchmark({
      cases: smallCases,
      warmupIterations: 0,
      sampleIterations: 1,
    });

    expect(result.artifacts.length).toBeGreaterThanOrEqual(8);
    expect(
      result.artifacts.some(
        (artifact) => artifact.fwsMode === "wasm-excluded-bounds",
      ),
    ).toBe(true);
    expect(result.correctness).toHaveLength(9 * smallCases.length);
    expect(
      result.correctness
        .filter((record) => record.implementation !== "rust-wasm")
        .every((record) => record.status === "passed"),
    ).toBe(true);
    expect(
      result.measurements.some(
        (measurement) => measurement.phase === "initialize",
      ),
    ).toBe(true);
    expect(
      result.measurements.some(
        (measurement) => measurement.phase === "execute",
      ),
    ).toBe(true);
    console.log(result.failures);
    expect(
      result.failures.filter((failure) => failure.category !== "environment"),
    ).toHaveLength(0);
  }, 120_000);

  it("runs Chromium or reports an actionable blocked environment result", async () => {
    const node = await runNodeBenchmark({
      cases: smallCases,
      warmupIterations: 0,
      sampleIterations: 1,
    });
    const result = await runChromiumBenchmark({
      artifacts: node.artifacts,
      cases: smallCases,
      warmupIterations: 0,
      sampleIterations: 1,
      timeoutMs: 60_000,
    });

    if (result.status === "completed") {
      expect(
        result.correctness.every((record) => record.status === "passed"),
      ).toBe(true);
      expect(
        result.measurements.some(
          (measurement) => measurement.hostRuntime === "chromium",
        ),
      ).toBe(true);
    } else {
      expect(result.status).toBe("blocked");
      expect(
        result.failures.some((failure) => failure.category === "environment"),
      ).toBe(true);
    }
  }, 180_000);
});
