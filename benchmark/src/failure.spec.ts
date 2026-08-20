import { describe, expect, it } from "vitest";

import { BENCHMARK_CORPUS } from "./corpus.ts";
import { runNodeBenchmark } from "./run-node.ts";

const smallCase = BENCHMARK_CORPUS.find(
  (benchmarkCase) => benchmarkCase.size === "small",
)!;

describe("benchmark failure isolation", () => {
  it("isolates correctness failures and completes the run", async () => {
    // Create a modified case with a wrong expected output
    const corruptCase = {
      ...smallCase,
      id: "corrupt:case",
      expected: "CORRUPT_OUTPUT",
    };

    const result = await runNodeBenchmark({
      cases: [corruptCase],
      warmupIterations: 0,
      sampleIterations: 1,
    });

    // Verify:
    // 1. Correctness failure recorded
    const correctness = result.correctness.find(
      (c) => c.status === "failed" && c.reason === "Golden output mismatch.",
    );
    expect(correctness).toBeDefined();

    // 2. Execute measurements not collected (or status is failed)
    const executeMeasurement = result.measurements.find(
      (m) => m.phase === "execute" && m.status === "failed",
    );
    expect(executeMeasurement).toBeDefined();

    // 3. No measured execute samples for the corrupted key
    const measuredExecute = result.measurements.find(
      (m) => m.phase === "execute" && m.status === "measured",
    );
    expect(measuredExecute).toBeUndefined();

    // 4. Run completes (no throw)
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it("handles environment failures actionably", async () => {
    // Force a failure in Chromium launch
    const { vi } = await import("vitest");
    const { chromium } = await import("playwright");
    vi.spyOn(chromium, "launch").mockRejectedValue(new Error("Chromium launch failed"));

    const { runChromiumBenchmark } = await import("./run-browser.ts");
    const result = await runChromiumBenchmark({
      artifacts: [],
      cases: [],
    });

    // Verify it is actionable and not fatal
    expect(result.status).toBe("failed");
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0].category).toBe("runtime");
    vi.restoreAllMocks();
  });
});
