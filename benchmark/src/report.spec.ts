import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderHtml } from "./render-html.ts";
import {
  createBenchmarkReport,
  compareBenchmarkReports,
  comparePerformanceGates,
  writeBenchmarkReport,
} from "./report.ts";

import type { BenchmarkReport, PhaseMeasurement } from "./contracts.ts";

function measurement(
  caseId: string,
  medianMs: number,
  overrides: Partial<PhaseMeasurement> = {},
): PhaseMeasurement {
  return {
    caseId,
    workload: "arithmetic",
    inputSize: "small",
    implementation: "javascript",
    hostRuntime: "node",
    phase: "execute",
    samples: [{ durationMs: medianMs, operations: 1 }],
    statistics: {
      count: 1,
      meanMs: medianMs,
      medianMs,
      p95Ms: medianMs,
      minMs: medianMs,
      maxMs: medianMs,
      throughputPerSecond: 1000 / medianMs,
    },
    status: "measured",
    ...overrides,
  };
}

function report(measurements: readonly PhaseMeasurement[]): BenchmarkReport {
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-20T00:00:00.000Z",
    corpusHash: "fixture-corpus",
    environment: {
      platform: "darwin",
      architecture: "arm64",
      nodeVersion: "v24.19.0",
      commandLine: "test",
    },
    methodology: {
      warmupIterations: 0,
      sampleIterations: 1,
      clock: "performance.now",
    },
    artifacts: [],
    correctness: [],
    measurements,
    failures: [],
  };
}

function correctnessFor(
  measurementValue: PhaseMeasurement,
  status: "passed" | "failed" = "passed",
) {
  return {
    caseId: measurementValue.caseId,
    workload: measurementValue.workload,
    inputSize: measurementValue.inputSize,
    implementation: measurementValue.implementation,
    ...(measurementValue.fwsMode === undefined
      ? {}
      : { fwsMode: measurementValue.fwsMode }),
    hostRuntime: measurementValue.hostRuntime,
    status,
    expected: 1,
  } as const;
}

describe("durable benchmark reports", () => {
  it("sorts report content and writes all canonical artifacts", async () => {
    const artifactMeasurements = [
      measurement("z-case", 3),
      measurement("a-case", 1),
      measurement("comparison-case", 4),
      measurement("comparison-case", 2, { implementation: "rust-wasm" }),
      measurement("comparison-case", 3, {
        implementation: "assemblyscript-wasm",
      }),
      measurement("comparison-case", 6, {
        implementation: "fws",
        fwsMode: "wasm",
      }),
    ];
    const current = createBenchmarkReport({
      node: {
        hostRuntime: "node",
        artifacts: [],
        correctness: artifactMeasurements.map((value) => correctnessFor(value)),
        measurements: artifactMeasurements,
        failures: [],
        environment: report([]).environment,
      },
      warmupIterations: 0,
      sampleIterations: 1,
      generatedAt: "2026-08-20T00:00:00.000Z",
      corpusHash: "fixture-corpus",
    });
    expect(current.measurements.map(({ caseId }) => caseId)).toEqual([
      "a-case",
      "comparison-case",
      "comparison-case",
      "comparison-case",
      "comparison-case",
      "z-case",
    ]);
    expect(current.performanceComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateKey: expect.objectContaining({
            caseId: "comparison-case",
            implementation: "rust-wasm",
          }),
          status: "comparable",
        }),
      ]),
    );

    const directory = await mkdtemp(
      path.join(os.tmpdir(), "benchmark-report-"),
    );
    try {
      const paths = await writeBenchmarkReport(current, directory);
      const json = JSON.parse(
        await readFile(paths.json, "utf8"),
      ) as BenchmarkReport;
      expect(json).toEqual(current);
      expect(await readFile(paths.markdown, "utf8")).toContain(
        "## Measurements",
      );
      expect(await readFile(paths.markdown, "utf8")).toContain(
        "## Performance Gates",
      );
      const markdown = await readFile(paths.markdown, "utf8");
      expect(markdown).toContain("## JavaScript Performance Comparisons");
      expect(markdown).toContain("Candidate median (ms)");
      expect(markdown).toContain("Latency ratio");
      expect(markdown).toContain("Throughput Δ");
      expect(markdown).toContain("rust-wasm");
      expect(markdown).toContain("0.50x");
      expect(markdown).toContain("-50.00%");
      expect(markdown).toContain("2.00x");
      expect(markdown).toContain("100.00%");
      expect(markdown).toContain("## FWS Performance Comparisons");
      expect(markdown).toContain("Reference median (ms)");
      expect(markdown).toContain("assemblyscript-wasm");
      const html = await readFile(paths.html, "utf8");
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("<table>");
      expect(html).toContain("JavaScript Performance Comparisons");
      expect(html).toContain("Candidate median (ms)");
      expect(html).toContain("rust-wasm");
      expect(html).toContain("0.50x");
      expect(html).toContain("100.00%");
      expect(html).toContain("FWS Performance Comparisons");
      expect(html).toContain("Reference median (ms)");
      expect(html).toContain("assemblyscript-wasm");
      expect(html).toContain("Performance Gates");
      expect(html).toContain('data-performance-gate="passed"');
      expect(html.indexOf("a-case")).toBeLessThan(html.indexOf("z-case"));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("escapes report content in self-contained HTML", () => {
    const unsafe = {
      ...report([]),
      failures: [
        {
          implementation: "javascript" as const,
          phase: "execute" as const,
          category: "runtime" as const,
          message: "<script>alert('x')</script>",
        },
      ],
    };
    const html = renderHtml(unsafe);
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  it("computes deltas and classifies missing keys", () => {
    const baseline = report([
      measurement("same", 10),
      measurement("baseline-only", 5),
    ]);
    const current = report([
      measurement("same", 12),
      measurement("current-only", 4),
    ]);
    const comparisons = compareBenchmarkReports(current, baseline);
    expect(comparisons[0]?.key).toEqual(
      expect.objectContaining({
        caseId: "baseline-only",
        phase: "execute",
      }),
    );
    expect(Object.keys(comparisons[0]?.key ?? {})).toEqual([
      "caseId",
      "workload",
      "inputSize",
      "implementation",
      "hostRuntime",
      "phase",
    ]);
    expect(comparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "comparable",
          latencyDeltaPercent: 20,
          throughputDeltaPercent: expect.closeTo(-16.666666666666666, 10),
        }),
        expect.objectContaining({ status: "missing-current" }),
        expect.objectContaining({ status: "missing-baseline" }),
      ]),
    );
  });

  it("marks schema, corpus, and environment differences not comparable", () => {
    const baseline = report([measurement("same", 10)]);
    const current = {
      ...report([measurement("same", 12)]),
      corpusHash: "different-corpus",
      environment: { ...report([]).environment, platform: "linux" },
    };
    const comparisons = compareBenchmarkReports(current, baseline);
    expect(comparisons[0]).toMatchObject({ status: "not-comparable" });
    expect(comparisons[0]?.explanation).toMatch(/Corpus hashes differ/);
    expect(comparisons[0]?.explanation).toMatch(/Environment differs/);
  });

  it("gates correct FWS execute rows against the matching Node JavaScript median", () => {
    const javascriptSmall = measurement("small", 0.01, {
      workload: "arithmetic",
      inputSize: "small",
    });
    const fwsSmall = measurement("small", 0.04, {
      implementation: "fws",
      fwsMode: "jit",
      workload: "arithmetic",
      inputSize: "small",
    });
    const javascriptMedium = measurement("medium", 10, {
      workload: "arithmetic",
      inputSize: "medium",
    });
    const fwsMedium = measurement("medium", 25, {
      implementation: "fws",
      fwsMode: "aot",
      workload: "arithmetic",
      inputSize: "medium",
    });
    const current = {
      ...report([javascriptSmall, fwsSmall, javascriptMedium, fwsMedium]),
      correctness: [
        correctnessFor(javascriptSmall),
        correctnessFor(fwsSmall),
        correctnessFor(javascriptMedium),
        correctnessFor(fwsMedium),
      ],
    };
    const gates = comparePerformanceGates(current, {
      maxRatio: 2,
      timingFloorMs: 0.05,
    });

    expect(gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: expect.objectContaining({ caseId: "small", fwsMode: "jit" }),
          status: "passed",
          ratio: 4,
          referenceMedianMs: 0.01,
          timingFloorMs: 0.05,
        }),
        expect.objectContaining({
          key: expect.objectContaining({ caseId: "medium", fwsMode: "aot" }),
          status: "failed",
          ratio: 2.5,
        }),
      ]),
    );
  });

  it("surfaces failed correctness, missing baselines, and browser diagnostics", () => {
    const fwsFailed = measurement("failed", 3, {
      implementation: "fws",
      fwsMode: "interpret",
    });
    const fwsMissing = measurement("missing", 3, {
      implementation: "fws",
      fwsMode: "wasm",
    });
    const fwsBrowser = measurement("browser", 3, {
      implementation: "fws",
      fwsMode: "wasm-generated",
      hostRuntime: "chromium",
    });
    const current = {
      ...report([fwsFailed, fwsMissing, fwsBrowser]),
      correctness: [
        correctnessFor(fwsFailed, "failed"),
        correctnessFor(fwsMissing),
        correctnessFor(fwsBrowser),
      ],
    };
    const gates = comparePerformanceGates(current);

    expect(gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: expect.objectContaining({ caseId: "failed" }),
          status: "not-comparable",
        }),
        expect.objectContaining({
          key: expect.objectContaining({ caseId: "missing" }),
          status: "missing-baseline",
        }),
        expect.objectContaining({
          key: expect.objectContaining({ caseId: "browser" }),
          status: "not-comparable",
          explanation: expect.stringMatching(/Node JavaScript/),
        }),
      ]),
    );
  });

  it("compares every implementation and FWS mode with a host-local JavaScript row", () => {
    const javascriptNode = measurement("comparison", 10, {
      statistics: {
        count: 1,
        meanMs: 10,
        medianMs: 10,
        p95Ms: 10,
        minMs: 10,
        maxMs: 10,
        throughputPerSecond: 100,
      },
    });
    const rustNode = measurement("comparison", 20, {
      implementation: "rust-wasm",
      statistics: {
        count: 1,
        meanMs: 20,
        medianMs: 20,
        p95Ms: 20,
        minMs: 20,
        maxMs: 20,
        throughputPerSecond: 50,
      },
    });
    const assemblyScriptNode = measurement("comparison", 5, {
      implementation: "assemblyscript-wasm",
      statistics: {
        count: 1,
        meanMs: 5,
        medianMs: 5,
        p95Ms: 5,
        minMs: 5,
        maxMs: 5,
        throughputPerSecond: 200,
      },
    });
    const fwsRows = ["interpret", "jit", "aot", "wasm", "wasm-generated"].map(
      (fwsMode) =>
        measurement("comparison", 15, {
          implementation: "fws",
          fwsMode: fwsMode as
            "interpret" | "jit" | "aot" | "wasm" | "wasm-generated",
        }),
    );
    const javascriptChromium = measurement("comparison", 8, {
      hostRuntime: "chromium",
      statistics: {
        count: 1,
        meanMs: 8,
        medianMs: 8,
        p95Ms: 8,
        minMs: 8,
        maxMs: 8,
        throughputPerSecond: 80,
      },
    });
    const rustChromium = measurement("comparison", 16, {
      implementation: "rust-wasm",
      hostRuntime: "chromium",
      statistics: {
        count: 1,
        meanMs: 16,
        medianMs: 16,
        p95Ms: 16,
        minMs: 16,
        maxMs: 16,
        throughputPerSecond: 40,
      },
    });
    const allMeasurements = [
      javascriptNode,
      rustNode,
      assemblyScriptNode,
      ...fwsRows,
      javascriptChromium,
      rustChromium,
    ];
    const current = createBenchmarkReport({
      node: {
        hostRuntime: "node",
        artifacts: [],
        correctness: allMeasurements
          .filter((value) => value.hostRuntime === "node")
          .map((value) => correctnessFor(value)),
        measurements: allMeasurements.filter(
          (value) => value.hostRuntime === "node",
        ),
        failures: [],
        environment: report([]).environment,
      },
      browser: {
        status: "completed",
        measurements: allMeasurements.filter(
          (value) => value.hostRuntime === "chromium",
        ),
        correctness: allMeasurements
          .filter((value) => value.hostRuntime === "chromium")
          .map((value) => correctnessFor(value)),
        failures: [],
      },
      warmupIterations: 0,
      sampleIterations: 1,
      generatedAt: "2026-08-20T00:00:00.000Z",
      corpusHash: "fixture-corpus",
    });

    expect(current.performanceComparisons).toHaveLength(18);
    expect(current.performanceComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateKey: expect.objectContaining({
            implementation: "rust-wasm",
            hostRuntime: "node",
          }),
          referenceKey: expect.objectContaining({
            implementation: "javascript",
            hostRuntime: "node",
          }),
          status: "comparable",
          candidateMedianMs: 20,
          javascriptMedianMs: 10,
          latencyRatio: 2,
          latencyDeltaPercent: 100,
          throughputRatio: 0.5,
          throughputDeltaPercent: -50,
        }),
        expect.objectContaining({
          candidateKey: expect.objectContaining({
            implementation: "assemblyscript-wasm",
          }),
          status: "comparable",
          latencyRatio: 0.5,
          latencyDeltaPercent: -50,
          throughputRatio: 2,
          throughputDeltaPercent: 100,
        }),
        expect.objectContaining({
          candidateKey: expect.objectContaining({
            implementation: "fws",
            fwsMode: "wasm",
          }),
          referenceKey: expect.objectContaining({
            implementation: "assemblyscript-wasm",
          }),
          status: "comparable",
          latencyRatio: 3,
          latencyDeltaPercent: 200,
          throughputRatio: expect.closeTo(1 / 3, 10),
          throughputDeltaPercent: expect.closeTo(-66.66666666666667, 10),
        }),
        expect.objectContaining({
          candidateKey: expect.objectContaining({
            implementation: "fws",
            fwsMode: "wasm",
          }),
          referenceKey: expect.objectContaining({
            implementation: "rust-wasm",
          }),
          status: "comparable",
          latencyRatio: 0.75,
          latencyDeltaPercent: -25,
          throughputRatio: expect.closeTo(4 / 3, 10),
          throughputDeltaPercent: expect.closeTo(33.33333333333333, 10),
        }),
        expect.objectContaining({
          candidateKey: expect.objectContaining({
            implementation: "rust-wasm",
            hostRuntime: "chromium",
          }),
          referenceKey: expect.objectContaining({
            implementation: "javascript",
            hostRuntime: "chromium",
          }),
          status: "comparable",
          latencyRatio: 2,
        }),
      ]),
    );
    expect(
      current.performanceComparisons
        ?.filter(
          (comparison) =>
            comparison.candidateKey.implementation === "fws" &&
            comparison.referenceKey.implementation === "javascript",
        )
        .map((comparison) => comparison.candidateKey.fwsMode),
    ).toEqual(["aot", "interpret", "jit", "wasm-generated", "wasm"]);
  });

  it("retains explicit statuses for missing or invalid JavaScript comparisons", () => {
    const javascript = measurement("passed", 10);
    const candidate = measurement("passed", 20, {
      implementation: "rust-wasm",
    });
    const missingBaseline = measurement("missing", 20, {
      implementation: "assemblyscript-wasm",
    });
    const failedMeasurement = measurement("failed-measurement", 20, {
      implementation: "rust-wasm",
      status: "failed",
    });
    const failedMeasurementBaseline = measurement("failed-measurement", 10);
    const failedCorrectness = measurement("failed-correctness", 20, {
      implementation: "rust-wasm",
    });
    const failedCorrectnessBaseline = measurement("failed-correctness", 10);
    const zeroReference = measurement("zero-reference", 0);
    const zeroReferenceCandidate = measurement("zero-reference", 20, {
      implementation: "fws",
      fwsMode: "jit",
    });
    const missingThroughputReference = measurement("missing-throughput", 10, {
      statistics: { ...javascript.statistics!, throughputPerSecond: 0 },
    });
    const missingThroughputCandidate = measurement("missing-throughput", 20, {
      implementation: "fws",
      fwsMode: "aot",
    });
    const browserCandidate = measurement("node-only", 20, {
      implementation: "fws",
      fwsMode: "wasm",
      hostRuntime: "chromium",
    });
    const invalidGenericCandidate = measurement("invalid-generic", 20, {
      implementation: "fws",
      fwsMode: "wasm",
    });
    const invalidAssemblyScriptReference = measurement("invalid-generic", 0, {
      implementation: "assemblyscript-wasm",
    });
    const validRustReference = measurement("invalid-generic", 10, {
      implementation: "rust-wasm",
    });
    const measurements = [
      javascript,
      candidate,
      missingBaseline,
      failedMeasurement,
      failedMeasurementBaseline,
      failedCorrectness,
      failedCorrectnessBaseline,
      zeroReference,
      zeroReferenceCandidate,
      missingThroughputReference,
      missingThroughputCandidate,
      browserCandidate,
      invalidGenericCandidate,
      invalidAssemblyScriptReference,
      validRustReference,
    ];
    const current = createBenchmarkReport({
      node: {
        hostRuntime: "node",
        artifacts: [],
        correctness: measurements
          .filter((value) => value.hostRuntime === "node")
          .map((value) =>
            correctnessFor(
              value,
              value.caseId === "failed-correctness" ? "failed" : "passed",
            ),
          ),
        measurements,
        failures: [],
        environment: report([]).environment,
      },
      warmupIterations: 0,
      sampleIterations: 1,
      generatedAt: "2026-08-20T00:00:00.000Z",
      corpusHash: "fixture-corpus",
    });
    const comparisons = new Map(
      current.performanceComparisons?.map((comparison) => [
        `${comparison.candidateKey.caseId}|${comparison.referenceKey.implementation}`,
        comparison,
      ]),
    );
    const javascriptComparison = (caseId: string) =>
      comparisons.get(`${caseId}|javascript`);
    const comparisonAgainst = (caseId: string, implementation: string) =>
      comparisons.get(`${caseId}|${implementation}`);

    expect(javascriptComparison("missing")?.status).toBe("missing-baseline");
    expect(javascriptComparison("failed-measurement")).toMatchObject({
      status: "not-comparable",
      explanation: expect.stringMatching(/not measured/),
    });
    expect(javascriptComparison("failed-correctness")).toMatchObject({
      status: "not-comparable",
      explanation: expect.stringMatching(/correctness/),
    });
    expect(javascriptComparison("zero-reference")).toMatchObject({
      status: "not-comparable",
      explanation: expect.stringMatching(/positive median/),
    });
    expect(javascriptComparison("missing-throughput")).toMatchObject({
      status: "not-comparable",
      explanation: expect.stringMatching(/throughput/),
    });
    expect(
      comparisonAgainst("invalid-generic", "assemblyscript-wasm"),
    ).toMatchObject({
      status: "not-comparable",
      explanation: expect.stringMatching(/positive median/),
    });
    expect(comparisonAgainst("invalid-generic", "rust-wasm")).toMatchObject({
      status: "comparable",
      latencyRatio: 2,
      latencyDeltaPercent: 100,
    });
    expect(current.performanceComparisons).not.toContainEqual(
      expect.objectContaining({
        candidateKey: expect.objectContaining({ caseId: "node-only" }),
        status: "comparable",
      }),
    );
  });
});
