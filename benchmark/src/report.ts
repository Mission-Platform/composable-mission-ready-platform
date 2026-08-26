import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createBenchmarkKey } from "./contracts.ts";
import { BENCHMARK_CORPUS_HASH } from "./corpus.ts";
import { renderHtml } from "./render-html.ts";
import { renderMarkdown } from "./render-markdown.ts";

import type {
  BaselineComparison,
  BenchmarkFailure,
  BenchmarkKey,
  BenchmarkMetricRecord,
  BenchmarkReport,
  CorrectnessResult,
  EnvironmentMetadata,
  PhaseMeasurement,
  PerformanceComparison,
  PerformanceGatePolicy,
  PerformanceGateReport,
  PerformanceGateResult,
} from "./contracts.ts";
import type { ChromiumBenchmarkResult } from "./run-browser.ts";
import type { NodeBenchmarkResult } from "./run-node.ts";

export const DEFAULT_PERFORMANCE_GATE_POLICY: PerformanceGatePolicy = {
  maxRatio: 2,
  timingFloorMs: 0.05,
};

export interface CreateReportOptions {
  readonly node?: NodeBenchmarkResult;
  readonly browser?: ChromiumBenchmarkResult;
  readonly warmupIterations: number;
  readonly sampleIterations: number;
  readonly corpusHash?: string;
  readonly generatedAt?: string;
  readonly baseline?: BenchmarkReport;
  readonly performanceGate?: PerformanceGatePolicy;
}

export interface ReportPaths {
  readonly directory: string;
  readonly json: string;
  readonly markdown: string;
  readonly html: string;
}

function environmentFor(
  node: NodeBenchmarkResult | undefined,
  browser: ChromiumBenchmarkResult | undefined,
): EnvironmentMetadata {
  return {
    ...(node?.environment ?? {
      platform: "unknown",
      architecture: "unknown",
      commandLine: process.argv.join(" "),
    }),
    ...(browser?.browserVersion === undefined
      ? {}
      : { browserVersion: browser.browserVersion }),
  };
}

function uniqueFailures(
  failures: readonly BenchmarkFailure[],
): readonly BenchmarkFailure[] {
  const seen = new Set<string>();
  return failures.filter((failure) => {
    const key = `${failure.implementation}|${failure.fwsMode ?? "-"}|${failure.phase}|${failure.category}|${failure.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortMeasurements(
  measurements: readonly PhaseMeasurement[],
): readonly PhaseMeasurement[] {
  return measurements.toSorted((left, right) =>
    createBenchmarkKey(left).localeCompare(createBenchmarkKey(right)),
  );
}

function sortCorrectness(
  correctness: readonly CorrectnessResult[],
): readonly CorrectnessResult[] {
  return correctness.toSorted((left, right) => {
    const leftKey = `${left.caseId}|${left.workload}|${left.inputSize}|${left.implementation}|${left.fwsMode ?? "-"}|${left.hostRuntime}`;
    const rightKey = `${right.caseId}|${right.workload}|${right.inputSize}|${right.implementation}|${right.fwsMode ?? "-"}|${right.hostRuntime}`;
    return leftKey.localeCompare(rightKey);
  });
}

function gateIdentity(value: BenchmarkKey): string {
  return `${value.caseId}|${value.workload}|${value.inputSize}|${value.hostRuntime}`;
}

function performanceComparisonIdentity(
  value: Pick<
    BenchmarkKey,
    "caseId" | "workload" | "inputSize" | "hostRuntime"
  >,
): string {
  return `${value.caseId}|${value.workload}|${value.inputSize}|${value.hostRuntime}`;
}

function metricIdentity(metric: BenchmarkMetricRecord): string {
  return [
    metric.metric,
    metric.caseId ?? "-",
    metric.implementation,
    metric.fwsMode ?? "-",
    metric.hostRuntime ?? "-",
  ].join("|");
}

function benchmarkMetrics(
  artifacts: BenchmarkReport["artifacts"],
  measurements: readonly PhaseMeasurement[],
): readonly BenchmarkMetricRecord[] {
  const metrics: BenchmarkMetricRecord[] = [];
  for (const measurement of measurements) {
    const statistics = measurement.statistics;
    if (statistics === undefined || measurement.status !== "measured") continue;
    if (measurement.phase === "build") {
      metrics.push({
        metric: "compile-time",
        implementation: measurement.implementation,
        ...(measurement.fwsMode === undefined
          ? {}
          : { fwsMode: measurement.fwsMode }),
        caseId: measurement.caseId,
        hostRuntime: measurement.hostRuntime,
        value: statistics.medianMs,
        unit: "milliseconds",
      });
    } else if (measurement.phase === "execute") {
      metrics.push({
        metric: "call-throughput",
        implementation: measurement.implementation,
        ...(measurement.fwsMode === undefined
          ? {}
          : { fwsMode: measurement.fwsMode }),
        caseId: measurement.caseId,
        hostRuntime: measurement.hostRuntime,
        value: statistics.throughputPerSecond,
        unit: "calls-per-second",
      });
      if (statistics.memoryDeltaBytes !== undefined) {
        metrics.push({
          metric: "memory-behavior",
          implementation: measurement.implementation,
          ...(measurement.fwsMode === undefined
            ? {}
            : { fwsMode: measurement.fwsMode }),
          caseId: measurement.caseId,
          hostRuntime: measurement.hostRuntime,
          value: statistics.memoryDeltaBytes,
          unit: "bytes",
        });
      }
    }
  }
  for (const artifact of artifacts) {
    if (artifact.sizeBytes === undefined) continue;
    metrics.push({
      metric: "wasm-size",
      implementation: artifact.implementation,
      ...(artifact.fwsMode === undefined ? {} : { fwsMode: artifact.fwsMode }),
      value: artifact.sizeBytes,
      unit: "bytes",
      ...(artifact.fwsPipeline?.pipeline === "fws-son-wasm-two-stage"
        ? {
            explanation:
              "Size includes the canonical SoN frontend and Wasm-stage optimizer.",
          }
        : {}),
    });
  }
  const checked = new Map<string, PhaseMeasurement>();
  const excluded = new Map<string, PhaseMeasurement>();
  for (const measurement of measurements) {
    if (measurement.phase !== "execute" || measurement.status !== "measured")
      continue;
    const key = `${measurement.caseId}|${measurement.workload}|${measurement.inputSize}|${measurement.hostRuntime}`;
    if (measurement.implementation !== "fws") continue;
    if (measurement.fwsMode === "wasm") checked.set(key, measurement);
    if (measurement.fwsMode === "wasm-excluded-bounds")
      excluded.set(key, measurement);
  }
  for (const [key, runtime] of checked) {
    const profile = excluded.get(key);
    const runtimeMs = runtime.statistics?.medianMs;
    const profileMs = profile?.statistics?.medianMs;
    if (
      profile === undefined ||
      runtimeMs === undefined ||
      profileMs === undefined ||
      profileMs <= 0
    )
      continue;
    const overhead = deltaPercent(runtimeMs, profileMs);
    if (overhead === undefined) continue;
    metrics.push({
      metric: "bounds-check-overhead",
      implementation: "fws",
      fwsMode: "wasm",
      caseId: runtime.caseId,
      hostRuntime: runtime.hostRuntime,
      value: overhead,
      unit: "percent",
      referenceValue: profileMs,
      referenceMode: "wasm-excluded-bounds",
      explanation:
        "Checked runtime profile versus the explicit excluded-by-profile run.",
    });
  }
  return metrics.toSorted((left, right) =>
    metricIdentity(left).localeCompare(metricIdentity(right)),
  );
}

function correctnessIdentity(
  value: Pick<
    CorrectnessResult,
    | "caseId"
    | "workload"
    | "inputSize"
    | "implementation"
    | "fwsMode"
    | "hostRuntime"
  >,
): string {
  return `${value.caseId}|${value.workload}|${value.inputSize}|${value.implementation}|${value.fwsMode ?? "-"}|${value.hostRuntime}`;
}

function referenceKeyFor(value: PhaseMeasurement): BenchmarkKey {
  return {
    caseId: value.caseId,
    workload: value.workload,
    inputSize: value.inputSize,
    implementation: "javascript",
    hostRuntime: "node",
    phase: "execute",
  };
}

function validMedian(
  measurement: PhaseMeasurement | undefined,
): number | undefined {
  const median = measurement?.statistics?.medianMs;
  return median !== undefined && Number.isFinite(median) && median >= 0
    ? median
    : undefined;
}

function validPolicy(policy: PerformanceGatePolicy): void {
  if (!Number.isFinite(policy.maxRatio) || policy.maxRatio <= 0)
    throw new Error("Performance gate maxRatio must be greater than zero.");
  if (!Number.isFinite(policy.timingFloorMs) || policy.timingFloorMs < 0)
    throw new Error("Performance gate timingFloorMs must be non-negative.");
}

export function comparePerformanceGates(
  report: BenchmarkReport,
  policy: PerformanceGatePolicy = DEFAULT_PERFORMANCE_GATE_POLICY,
): readonly PerformanceGateResult[] {
  validPolicy(policy);
  const references = new Map(
    report.measurements
      .filter(
        (measurement) =>
          measurement.implementation === "javascript" &&
          measurement.hostRuntime === "node" &&
          measurement.phase === "execute",
      )
      .map((measurement) => [gateIdentity(measurement), measurement]),
  );
  const correctness = new Map(
    report.correctness.map((record) => [correctnessIdentity(record), record]),
  );
  return report.measurements
    .filter(
      (measurement) =>
        measurement.implementation === "fws" && measurement.phase === "execute",
    )
    .map((measurement) => {
      const referenceKey = referenceKeyFor(measurement);
      const candidateKey = benchmarkKey(measurement);
      const reference = references.get(gateIdentity(referenceKey));
      const candidateCorrectness = correctness.get(
        correctnessIdentity(measurement),
      );
      const referenceCorrectness =
        reference === undefined
          ? undefined
          : correctness.get(correctnessIdentity(reference));
      const base = {
        key: candidateKey,
        referenceKey,
        allowedRatio: policy.maxRatio,
        timingFloorMs: policy.timingFloorMs,
      };
      if (measurement.hostRuntime !== "node") {
        return {
          ...base,
          status: "not-comparable",
          explanation:
            "Chromium measurements are diagnostics; the performance gate uses the Node JavaScript baseline.",
        } satisfies PerformanceGateResult;
      }
      if (candidateCorrectness?.status !== "passed") {
        return {
          ...base,
          status: "not-comparable",
          explanation:
            candidateCorrectness === undefined
              ? "No correctness-passing result exists for this FWS execute row."
              : "The FWS execute row did not pass correctness.",
        } satisfies PerformanceGateResult;
      }
      if (measurement.status !== "measured") {
        return {
          ...base,
          status: "not-comparable",
          explanation: "The FWS execute row was not measured successfully.",
        } satisfies PerformanceGateResult;
      }
      const measuredMedianMs = validMedian(measurement);
      if (measuredMedianMs === undefined) {
        return {
          ...base,
          status: "not-comparable",
          explanation: "The FWS execute row has no valid median statistics.",
        } satisfies PerformanceGateResult;
      }
      if (
        reference === undefined ||
        referenceCorrectness?.status !== "passed"
      ) {
        return {
          ...base,
          status: "missing-baseline",
          explanation:
            reference === undefined
              ? "No matching Node JavaScript execute baseline exists."
              : "The matching Node JavaScript baseline did not pass correctness.",
        } satisfies PerformanceGateResult;
      }
      const referenceMedianMs = validMedian(reference);
      if (
        reference.status !== "measured" ||
        referenceMedianMs === undefined ||
        referenceMedianMs === 0
      ) {
        return {
          ...base,
          measuredMedianMs,
          status: "not-comparable",
          explanation:
            "The matching Node JavaScript baseline has no positive median statistics.",
        } satisfies PerformanceGateResult;
      }
      const ratio = measuredMedianMs / referenceMedianMs;
      const referenceThroughput = reference.statistics?.throughputPerSecond;
      const measuredThroughput = measurement.statistics?.throughputPerSecond;
      const throughputRatio =
        referenceThroughput !== undefined &&
        measuredThroughput !== undefined &&
        referenceThroughput > 0
          ? measuredThroughput / referenceThroughput
          : undefined;
      const belowSmallCaseFloor =
        measurement.inputSize === "small" &&
        measuredMedianMs <= policy.timingFloorMs;
      const failed = ratio > policy.maxRatio && !belowSmallCaseFloor;
      return {
        ...base,
        status: failed ? "failed" : "passed",
        measuredMedianMs,
        referenceMedianMs,
        ratio,
        ...(throughputRatio === undefined ? {} : { throughputRatio }),
        ...(belowSmallCaseFloor && ratio > policy.maxRatio
          ? {
              explanation: `Median is at or below the ${policy.timingFloorMs} ms small-case timing floor; ratio is reported but does not fail the gate.`,
            }
          : {}),
      } satisfies PerformanceGateResult;
    })
    .toSorted((left, right) =>
      `${left.key.caseId}|${left.key.fwsMode ?? "-"}`.localeCompare(
        `${right.key.caseId}|${right.key.fwsMode ?? "-"}`,
      ),
    );
}

function createPerformanceGateReport(
  report: BenchmarkReport,
  policy: PerformanceGatePolicy,
): PerformanceGateReport {
  const results = comparePerformanceGates(report, policy);
  return {
    policy,
    results,
    failed: results.some((result) => result.status === "failed"),
  };
}

type PerformanceReferenceImplementation =
  "javascript" | "assemblyscript-wasm" | "rust-wasm";

function performanceReferenceKeyFor(
  value: PhaseMeasurement,
  implementation: PerformanceReferenceImplementation,
): BenchmarkKey {
  return {
    caseId: value.caseId,
    workload: value.workload,
    inputSize: value.inputSize,
    implementation,
    hostRuntime: value.hostRuntime,
    phase: "execute",
  };
}

function validPositiveMedian(
  measurement: PhaseMeasurement | undefined,
): number | undefined {
  const median = measurement?.statistics?.medianMs;
  return median !== undefined && Number.isFinite(median) && median > 0
    ? median
    : undefined;
}

function validPositiveThroughput(
  measurement: PhaseMeasurement | undefined,
): number | undefined {
  const throughput = measurement?.statistics?.throughputPerSecond;
  return throughput !== undefined &&
    Number.isFinite(throughput) &&
    throughput > 0
    ? throughput
    : undefined;
}

function referenceLabel(
  implementation: PerformanceReferenceImplementation,
): string {
  return implementation === "javascript"
    ? "JavaScript"
    : implementation === "assemblyscript-wasm"
      ? "AssemblyScript/WASM"
      : "Rust/WASM";
}

function compatibilityFields(
  referenceImplementation: PerformanceReferenceImplementation,
  referenceMedianMs: number | undefined,
  referenceThroughputPerSecond: number | undefined,
): Pick<
  PerformanceComparison,
  "javascriptMedianMs" | "javascriptThroughputPerSecond"
> {
  return referenceImplementation === "javascript"
    ? {
        ...(referenceMedianMs === undefined
          ? {}
          : { javascriptMedianMs: referenceMedianMs }),
        ...(referenceThroughputPerSecond === undefined
          ? {}
          : { javascriptThroughputPerSecond: referenceThroughputPerSecond }),
      }
    : {};
}

function sortPerformanceComparisons(
  comparisons: readonly PerformanceComparison[],
): readonly PerformanceComparison[] {
  return comparisons.toSorted((left, right) => {
    const candidateOrder = createBenchmarkKey(left.candidateKey).localeCompare(
      createBenchmarkKey(right.candidateKey),
    );
    return candidateOrder === 0
      ? left.referenceKey.implementation.localeCompare(
          right.referenceKey.implementation,
        )
      : candidateOrder;
  });
}

function compareAgainstReferences(
  report: BenchmarkReport,
  candidatePredicate: (measurement: PhaseMeasurement) => boolean,
  referenceImplementations: readonly PerformanceReferenceImplementation[],
): readonly PerformanceComparison[] {
  const references = new Map(
    report.measurements
      .filter(
        (measurement) =>
          measurement.phase === "execute" &&
          referenceImplementations.includes(
            measurement.implementation as PerformanceReferenceImplementation,
          ),
      )
      .map((measurement) => [
        `${performanceComparisonIdentity(measurement)}|${measurement.implementation}`,
        measurement,
      ]),
  );
  const correctness = new Map(
    report.correctness.map((record) => [correctnessIdentity(record), record]),
  );
  const results = report.measurements
    .filter(
      (measurement) =>
        measurement.phase === "execute" && candidatePredicate(measurement),
    )
    .flatMap((measurement) =>
      referenceImplementations.map((referenceImplementation) => {
        const candidateKey = benchmarkKey(measurement);
        const referenceKey = performanceReferenceKeyFor(
          measurement,
          referenceImplementation,
        );
        const reference = references.get(
          `${performanceComparisonIdentity(measurement)}|${referenceImplementation}`,
        );
        const base = { candidateKey, referenceKey };
        const label = referenceLabel(referenceImplementation);
        if (reference === undefined) {
          return {
            ...base,
            status: "missing-baseline",
            explanation: `No matching ${measurement.hostRuntime} ${label} execute baseline exists.`,
          } satisfies PerformanceComparison;
        }

        const candidateCorrectness = correctness.get(
          correctnessIdentity(measurement),
        );
        const referenceCorrectness = correctness.get(
          correctnessIdentity(reference),
        );
        if (candidateCorrectness?.status !== "passed") {
          return {
            ...base,
            status: "not-comparable",
            explanation:
              candidateCorrectness === undefined
                ? "No correctness-passing result exists for the candidate execute row."
                : "The candidate execute row did not pass correctness.",
          } satisfies PerformanceComparison;
        }
        if (referenceCorrectness?.status !== "passed") {
          return {
            ...base,
            status: "not-comparable",
            explanation:
              referenceCorrectness === undefined
                ? `No correctness-passing result exists for the ${label} execute baseline.`
                : `The ${label} execute baseline did not pass correctness.`,
          } satisfies PerformanceComparison;
        }
        if (measurement.status !== "measured") {
          return {
            ...base,
            status: "not-comparable",
            explanation:
              "The candidate execute row was not measured successfully.",
          } satisfies PerformanceComparison;
        }
        if (reference.status !== "measured") {
          return {
            ...base,
            status: "not-comparable",
            explanation: `The ${label} execute baseline was not measured successfully.`,
          } satisfies PerformanceComparison;
        }

        const candidateMedianMs = validPositiveMedian(measurement);
        const referenceMedianMs = validPositiveMedian(reference);
        const compatibility = compatibilityFields(
          referenceImplementation,
          referenceMedianMs,
          validPositiveThroughput(reference),
        );
        if (candidateMedianMs === undefined) {
          return {
            ...base,
            status: "not-comparable",
            ...compatibility,
            explanation:
              "The candidate execute row has no positive median statistics.",
          } satisfies PerformanceComparison;
        }
        if (referenceMedianMs === undefined) {
          return {
            ...base,
            status: "not-comparable",
            candidateMedianMs,
            ...compatibility,
            explanation: `The ${label} execute baseline has no positive median statistics.`,
          } satisfies PerformanceComparison;
        }

        const candidateThroughputPerSecond =
          validPositiveThroughput(measurement);
        const referenceThroughputPerSecond = validPositiveThroughput(reference);
        if (candidateThroughputPerSecond === undefined) {
          return {
            ...base,
            status: "not-comparable",
            candidateMedianMs,
            referenceMedianMs,
            ...compatibility,
            explanation:
              "The candidate execute row has no positive throughput statistics.",
          } satisfies PerformanceComparison;
        }
        if (referenceThroughputPerSecond === undefined) {
          return {
            ...base,
            status: "not-comparable",
            candidateMedianMs,
            referenceMedianMs,
            candidateThroughputPerSecond,
            ...compatibility,
            explanation: `The ${label} execute baseline has no positive throughput statistics.`,
          } satisfies PerformanceComparison;
        }

        const latencyRatio = candidateMedianMs / referenceMedianMs;
        const throughputRatio =
          candidateThroughputPerSecond / referenceThroughputPerSecond;
        return {
          ...base,
          status: "comparable",
          candidateMedianMs,
          referenceMedianMs,
          ...compatibility,
          candidateThroughputPerSecond,
          referenceThroughputPerSecond,
          latencyRatio,
          throughputRatio,
          latencyDeltaPercent: deltaPercent(
            candidateMedianMs,
            referenceMedianMs,
          ),
          throughputDeltaPercent: deltaPercent(
            candidateThroughputPerSecond,
            referenceThroughputPerSecond,
          ),
        } satisfies PerformanceComparison;
      }),
    );
  return sortPerformanceComparisons(results);
}

export function compareJavaScriptPerformance(
  report: BenchmarkReport,
): readonly PerformanceComparison[] {
  return compareAgainstReferences(
    report,
    (measurement) => measurement.implementation !== "javascript",
    ["javascript"],
  );
}

export function compareFwsPerformance(
  report: BenchmarkReport,
): readonly PerformanceComparison[] {
  return compareAgainstReferences(
    report,
    (measurement) => measurement.implementation === "fws",
    ["assemblyscript-wasm", "rust-wasm"],
  );
}

export function createBenchmarkReport(
  options: CreateReportOptions,
): BenchmarkReport {
  const nodeMeasurements = options.node?.measurements ?? [];
  const browserMeasurements = options.browser?.measurements ?? [];
  const nodeCorrectness = options.node?.correctness ?? [];
  const browserCorrectness = options.browser?.correctness ?? [];
  const failures = uniqueFailures([
    ...(options.node?.failures ?? []),
    ...(options.browser?.failures ?? []),
  ]);
  const report: BenchmarkReport = {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    corpusHash: options.corpusHash ?? BENCHMARK_CORPUS_HASH,
    environment: environmentFor(options.node, options.browser),
    methodology: {
      warmupIterations: options.warmupIterations,
      sampleIterations: options.sampleIterations,
      clock: "performance.now",
    },
    artifacts: (options.node?.artifacts ?? []).toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
    correctness: sortCorrectness([...nodeCorrectness, ...browserCorrectness]),
    measurements: sortMeasurements([
      ...nodeMeasurements,
      ...browserMeasurements,
    ]),
    failures,
    metrics: [],
  };
  const measuredReport = {
    ...report,
    metrics: benchmarkMetrics(report.artifacts, report.measurements),
  } satisfies BenchmarkReport;
  const withGate = {
    ...measuredReport,
    performanceComparisons: [
      ...compareJavaScriptPerformance(measuredReport),
      ...compareFwsPerformance(measuredReport),
    ].toSorted((left, right) => {
      const candidateOrder = createBenchmarkKey(
        left.candidateKey,
      ).localeCompare(createBenchmarkKey(right.candidateKey));
      return candidateOrder === 0
        ? left.referenceKey.implementation.localeCompare(
            right.referenceKey.implementation,
          )
        : candidateOrder;
    }),
    performanceGates: createPerformanceGateReport(
      measuredReport,
      options.performanceGate ?? DEFAULT_PERFORMANCE_GATE_POLICY,
    ),
  };
  return options.baseline === undefined
    ? withGate
    : {
        ...withGate,
        comparisons: compareBenchmarkReports(withGate, options.baseline),
      };
}

function environmentMismatch(
  current: EnvironmentMetadata,
  baseline: EnvironmentMetadata,
): string | undefined {
  const fields: readonly (keyof EnvironmentMetadata)[] = [
    "platform",
    "architecture",
    "nodeVersion",
    "browserVersion",
    "cpuModel",
  ];
  const changed = fields.filter((field) => current[field] !== baseline[field]);
  return changed.length === 0
    ? undefined
    : `Environment differs for ${changed.join(", ")}; latency and throughput are not comparable.`;
}

function comparisonKey(measurement: PhaseMeasurement): string {
  return createBenchmarkKey(measurement);
}

function benchmarkKey(measurement: PhaseMeasurement): BenchmarkKey {
  return {
    caseId: measurement.caseId,
    workload: measurement.workload,
    inputSize: measurement.inputSize,
    implementation: measurement.implementation,
    ...(measurement.fwsMode === undefined
      ? {}
      : { fwsMode: measurement.fwsMode }),
    hostRuntime: measurement.hostRuntime,
    phase: measurement.phase,
  };
}

function deltaPercent(current: number, baseline: number): number | undefined {
  return baseline === 0 ? undefined : ((current - baseline) / baseline) * 100;
}

export function compareBenchmarkReports(
  current: BenchmarkReport,
  baseline: BenchmarkReport,
): readonly BaselineComparison[] {
  const currentByKey = new Map(
    current.measurements.map((measurement) => [
      comparisonKey(measurement),
      measurement,
    ]),
  );
  const baselineByKey = new Map(
    baseline.measurements.map((measurement) => [
      comparisonKey(measurement),
      measurement,
    ]),
  );
  const keys = [
    ...new Set([...currentByKey.keys(), ...baselineByKey.keys()]),
  ].toSorted();
  const environmentReason = environmentMismatch(
    current.environment,
    baseline.environment,
  );
  const schemaReason =
    current.schemaVersion === baseline.schemaVersion
      ? undefined
      : `Schema versions differ (${current.schemaVersion} vs ${baseline.schemaVersion}); reports are not comparable.`;
  const corpusReason =
    current.corpusHash === baseline.corpusHash
      ? undefined
      : `Corpus hashes differ (${current.corpusHash} vs ${baseline.corpusHash}); workloads are not comparable.`;

  return keys.map((key) => {
    const currentMeasurement = currentByKey.get(key);
    const baselineMeasurement = baselineByKey.get(key);
    const measurement = currentMeasurement ?? baselineMeasurement!;
    const comparisonKeyValue = benchmarkKey(measurement);
    if (
      schemaReason !== undefined ||
      corpusReason !== undefined ||
      environmentReason !== undefined
    ) {
      return {
        key: comparisonKeyValue,
        status: "not-comparable",
        explanation: [schemaReason, corpusReason, environmentReason]
          .filter((reason): reason is string => reason !== undefined)
          .join(" "),
      } satisfies BaselineComparison;
    }
    if (currentMeasurement === undefined) {
      return {
        key: comparisonKeyValue,
        status: "missing-current",
        explanation:
          "The measurement key exists in the baseline but not in the current run.",
      } satisfies BaselineComparison;
    }
    if (baselineMeasurement === undefined) {
      return {
        key: comparisonKeyValue,
        status: "missing-baseline",
        explanation:
          "The measurement key exists in the current run but not in the baseline.",
      } satisfies BaselineComparison;
    }
    if (
      currentMeasurement.statistics === undefined ||
      baselineMeasurement.statistics === undefined
    ) {
      return {
        key: comparisonKeyValue,
        status: "not-comparable",
        explanation:
          "One side has no valid statistics (unsupported, failed, or empty samples).",
      } satisfies BaselineComparison;
    }
    return {
      key: comparisonKeyValue,
      status: "comparable",
      latencyDeltaPercent: deltaPercent(
        currentMeasurement.statistics.medianMs,
        baselineMeasurement.statistics.medianMs,
      ),
      throughputDeltaPercent: deltaPercent(
        currentMeasurement.statistics.throughputPerSecond,
        baselineMeasurement.statistics.throughputPerSecond,
      ),
    } satisfies BaselineComparison;
  });
}

export function createRunId(date: Date = new Date()): string {
  return date.toISOString().replaceAll(/[-:.]/g, "").replace("Z", "Z");
}

export async function writeBenchmarkReport(
  report: BenchmarkReport,
  outputDirectory: string,
): Promise<ReportPaths> {
  await mkdir(outputDirectory, { recursive: true });
  const paths = {
    directory: outputDirectory,
    json: path.join(outputDirectory, "report.json"),
    markdown: path.join(outputDirectory, "report.md"),
    html: path.join(outputDirectory, "report.html"),
  };
  await Promise.all([
    writeFile(paths.json, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(paths.markdown, `${renderMarkdown(report)}\n`, "utf8"),
    writeFile(paths.html, renderHtml(report), "utf8"),
  ]);
  return paths;
}

export async function readBenchmarkReport(
  filePath: string,
): Promise<BenchmarkReport> {
  const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    (parsed as { schemaVersion?: unknown }).schemaVersion !== 1 ||
    !Array.isArray((parsed as { measurements?: unknown }).measurements)
  ) {
    throw new Error(
      "Baseline is not a supported benchmark report (schema version 1 required).",
    );
  }
  return parsed as BenchmarkReport;
}
