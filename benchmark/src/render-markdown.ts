import type {
  BenchmarkReport,
  BaselineComparison,
  PerformanceComparison,
  PerformanceGateResult,
} from "./contracts.ts";

function text(value: unknown): string {
  return String(value).replaceAll("|", String.raw`\|`).replaceAll("\n", " ");
}

function value(value: unknown): string {
  if (typeof value === "string")
    return text(value.length > 160 ? `${value.slice(0, 157)}...` : value);
  return text(JSON.stringify(value));
}

function mode(measurement: { fwsMode?: string }): string {
  return measurement.fwsMode ?? "-";
}

function measurementRows(report: BenchmarkReport): string {
  const rows = report.measurements
    .map((measurement) => {
      const statistics = measurement.statistics;
      return `| ${text(measurement.caseId)} | ${text(measurement.workload)} | ${text(measurement.inputSize)} | ${text(measurement.implementation)} | ${mode(measurement)} | ${text(measurement.hostRuntime)} | ${text(measurement.phase)} | ${text(measurement.status)} | ${statistics === undefined ? "-" : statistics.medianMs.toFixed(3)} | ${statistics === undefined ? "-" : statistics.p95Ms.toFixed(3)} | ${statistics === undefined ? "-" : statistics.throughputPerSecond.toFixed(2)} |`;
    })
    .join("\n");
  const metrics =
    (report.metrics ?? []).length === 0
      ? "No metric records were generated."
      : `| Metric | Case | Implementation | Mode | Host | Value | Unit | Reference | Reference mode | Explanation |\n| --- | --- | --- | --- | --- | ---: | --- | ---: | --- | --- |\n${metricRows(report)}`;
  return `${rows}\n\n## Metric Evidence\n${metrics}`;
}

function rankingRows(report: BenchmarkReport): string {
  const passed = new Set(
    report.correctness
      .filter((record) => record.status === "passed")
      .map(
        (record) =>
          `${record.caseId}|${record.implementation}|${mode(record)}|${record.hostRuntime}`,
      ),
  );
  return report.measurements
    .filter(
      (measurement) =>
        measurement.phase === "execute" &&
        measurement.status === "measured" &&
        measurement.statistics !== undefined &&
        passed.has(
          `${measurement.caseId}|${measurement.implementation}|${mode(measurement)}|${measurement.hostRuntime}`,
        ),
    )
    .toSorted(
      (left, right) => left.statistics!.medianMs - right.statistics!.medianMs,
    )
    .map(
      (measurement, index) =>
        `| ${index + 1} | ${text(measurement.workload)} | ${text(measurement.inputSize)} | ${text(measurement.implementation)} | ${mode(measurement)} | ${text(measurement.hostRuntime)} | ${measurement.statistics!.medianMs.toFixed(3)} | ${measurement.statistics!.throughputPerSecond.toFixed(2)} |`,
    )
    .join("\n");
}

function comparisonRows(
  comparisons: readonly BaselineComparison[] | undefined,
): string {
  return (comparisons ?? [])
    .map(
      (comparison) =>
        `| ${text(comparison.key.caseId)} | ${text(comparison.key.implementation)} | ${mode(comparison.key)} | ${text(comparison.key.hostRuntime)} | ${text(comparison.key.phase)} | ${text(comparison.status)} | ${comparison.latencyDeltaPercent === undefined ? "-" : comparison.latencyDeltaPercent.toFixed(2)}% | ${comparison.throughputDeltaPercent === undefined ? "-" : comparison.throughputDeltaPercent.toFixed(2)}% | ${text(comparison.explanation ?? "")} |`,
    )
    .join("\n");
}

function javascriptPerformanceComparisonRows(
  comparisons: readonly PerformanceComparison[] | undefined,
): string {
  return (comparisons ?? [])
    .filter(
      (comparison) => comparison.referenceKey.implementation === "javascript",
    )
    .map(
      (comparison) =>
        `| ${text(comparison.candidateKey.caseId)} | ${text(comparison.candidateKey.workload)} | ${text(comparison.candidateKey.inputSize)} | ${text(comparison.candidateKey.implementation)} | ${mode(comparison.candidateKey)} | ${text(comparison.candidateKey.hostRuntime)} | ${comparison.candidateMedianMs === undefined ? "-" : comparison.candidateMedianMs.toFixed(3)} | ${comparison.javascriptMedianMs === undefined ? "-" : comparison.javascriptMedianMs.toFixed(3)} | ${comparison.latencyRatio === undefined ? "-" : `${comparison.latencyRatio.toFixed(2)}x`} | ${comparison.latencyDeltaPercent === undefined ? "-" : `${comparison.latencyDeltaPercent.toFixed(2)}%`} | ${comparison.candidateThroughputPerSecond === undefined ? "-" : comparison.candidateThroughputPerSecond.toFixed(2)} | ${comparison.javascriptThroughputPerSecond === undefined ? "-" : comparison.javascriptThroughputPerSecond.toFixed(2)} | ${comparison.throughputRatio === undefined ? "-" : `${comparison.throughputRatio.toFixed(2)}x`} | ${comparison.throughputDeltaPercent === undefined ? "-" : `${comparison.throughputDeltaPercent.toFixed(2)}%`} | ${text(comparison.status)} | ${text(comparison.explanation ?? "")} |`,
    )
    .join("\n");
}

function fwsPerformanceComparisonRows(
  comparisons: readonly PerformanceComparison[] | undefined,
): string {
  return (comparisons ?? [])
    .map(
      (comparison) =>
        `| ${text(comparison.candidateKey.caseId)} | ${text(comparison.candidateKey.workload)} | ${text(comparison.candidateKey.inputSize)} | ${mode(comparison.candidateKey)} | ${text(comparison.candidateKey.hostRuntime)} | ${text(comparison.referenceKey.implementation)} | ${comparison.candidateMedianMs === undefined ? "-" : comparison.candidateMedianMs.toFixed(3)} | ${comparison.referenceMedianMs === undefined ? "-" : comparison.referenceMedianMs.toFixed(3)} | ${comparison.latencyRatio === undefined ? "-" : `${comparison.latencyRatio.toFixed(2)}x`} | ${comparison.latencyDeltaPercent === undefined ? "-" : `${comparison.latencyDeltaPercent.toFixed(2)}%`} | ${comparison.candidateThroughputPerSecond === undefined ? "-" : comparison.candidateThroughputPerSecond.toFixed(2)} | ${comparison.referenceThroughputPerSecond === undefined ? "-" : comparison.referenceThroughputPerSecond.toFixed(2)} | ${comparison.throughputRatio === undefined ? "-" : `${comparison.throughputRatio.toFixed(2)}x`} | ${comparison.throughputDeltaPercent === undefined ? "-" : `${comparison.throughputDeltaPercent.toFixed(2)}%`} | ${text(comparison.status)} | ${text(comparison.explanation ?? "")} |`,
    )
    .join("\n");
}

function performanceGateRows(
  results: readonly PerformanceGateResult[] | undefined,
): string {
  return (results ?? [])
    .map(
      (result) =>
        `| ${text(result.key.caseId)} | ${text(result.key.workload)} | ${text(result.key.inputSize)} | ${text(result.key.implementation)} | ${mode(result.key)} | ${text(result.key.hostRuntime)} | ${text(result.status)} | ${result.measuredMedianMs === undefined ? "-" : result.measuredMedianMs.toFixed(3)} | ${result.referenceMedianMs === undefined ? "-" : result.referenceMedianMs.toFixed(3)} | ${result.ratio === undefined ? "-" : result.ratio.toFixed(2)}x | ${result.throughputRatio === undefined ? "-" : result.throughputRatio.toFixed(2)}x | ${result.timingFloorMs.toFixed(3)} | ${text(result.explanation ?? "")} |`,
    )
    .join("\n");
}

function metricRows(report: BenchmarkReport): string {
  return (report.metrics ?? [])
    .map(
      (metric) =>
        `| ${text(metric.metric)} | ${text(metric.caseId ?? "-")} | ${text(metric.implementation)} | ${mode(metric)} | ${text(metric.hostRuntime ?? "-")} | ${metric.value.toFixed(3)} | ${text(metric.unit)} | ${metric.referenceValue === undefined ? "-" : metric.referenceValue.toFixed(3)} | ${text(metric.referenceMode ?? "-")} | ${text(metric.explanation ?? "")} |`,
    )
    .join("\n");
}

export function renderMarkdown(report: BenchmarkReport): string {
  const failures =
    report.failures.length === 0
      ? "None."
      : report.failures
          .map(
            (failure) =>
              `- ${text(failure.implementation)} ${text(failure.phase)}: ${text(failure.message)}`,
          )
          .join("\n");
  const correctness =
    report.correctness.length === 0
      ? "None."
      : report.correctness
          .map(
            (record) =>
              `| ${text(record.caseId)} | ${text(record.implementation)} | ${mode(record)} | ${text(record.hostRuntime)} | ${text(record.status)} | ${value(record.expected)} | ${value(record.observed ?? "-")} | ${text(record.reason ?? "")} |`,
          )
          .join("\n");
  const artifacts =
    report.artifacts.length === 0
      ? "None."
      : report.artifacts
          .map(
            (artifact) =>
              `| ${text(artifact.id)} | ${text(artifact.implementation)} | ${mode(artifact)} | ${text(artifact.artifactKind)} | ${artifact.sizeBytes ?? "-"} | ${text(artifact.hash ?? "-")} |`,
          )
          .join("\n");
  const baselineComparisons =
    report.comparisons === undefined || report.comparisons.length === 0
      ? "No baseline comparison was requested."
      : `| Case | Implementation | Mode | Host | Phase | Status | Median Δ | Throughput Δ | Explanation |\n| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |\n${comparisonRows(report.comparisons)}`;
  const performanceGates =
    report.performanceGates === undefined
      ? "No performance gate was requested."
      : `Policy: maximum ratio ${report.performanceGates.policy.maxRatio.toFixed(2)}x; small-case timing floor ${report.performanceGates.policy.timingFloorMs.toFixed(3)} ms; overall status: **${report.performanceGates.failed ? "failed" : "passed"}**.\n\n| Case | Workload | Size | Implementation | Mode | Host | Status | FWS median (ms) | JavaScript median (ms) | Latency ratio | Throughput ratio | Floor (ms) | Explanation |\n| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |\n${performanceGateRows(report.performanceGates.results)}`;
  const javascriptPerformanceComparisons =
    report.performanceComparisons === undefined ||
    report.performanceComparisons.filter(
      (comparison) => comparison.referenceKey.implementation === "javascript",
    ).length === 0
      ? "No JavaScript performance comparisons were generated."
      : `Comparisons use the matching JavaScript execute row on the same host runtime. Latency ratios above 1x are slower; throughput ratios above 1x are higher. Positive latency percentages mean slower latency, while positive throughput percentages mean higher throughput.\n\n| Case | Workload | Size | Implementation | Mode | Host | Candidate median (ms) | JavaScript median (ms) | Latency ratio | Latency Δ | Candidate throughput/s | JavaScript throughput/s | Throughput ratio | Throughput Δ | Status | Explanation |\n| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |\n${javascriptPerformanceComparisonRows(report.performanceComparisons)}`;
  const fwsPerformanceComparisons =
    report.performanceComparisons === undefined ||
    report.performanceComparisons.filter(
      (comparison) => comparison.referenceKey.implementation !== "javascript",
    ).length === 0
      ? "No generalized FWS performance comparisons were generated."
      : `Each FWS execute row is compared with matching AssemblyScript/WASM and Rust/WASM rows on the same host runtime. Latency ratios above 1x are slower; throughput ratios above 1x are higher. Positive percentages indicate slower latency or higher throughput, respectively.\n\n| Case | Workload | Size | FWS mode | Host | Reference | FWS median (ms) | Reference median (ms) | Latency ratio | Latency Δ | FWS throughput/s | Reference throughput/s | Throughput ratio | Throughput Δ | Status | Explanation |\n| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |\n${fwsPerformanceComparisonRows(report.performanceComparisons.filter((comparison) => comparison.referenceKey.implementation !== "javascript"))}`;
  const comparisons = `${baselineComparisons}\n\n## JavaScript Performance Comparisons\n${javascriptPerformanceComparisons}\n\n## FWS Performance Comparisons\n${fwsPerformanceComparisons}\n\n## Performance Gates\n${performanceGates}`;
  return `# Forge Web Script Benchmark\n\n- Generated: ${text(report.generatedAt)}\n- Schema: ${report.schemaVersion}\n- Corpus hash: ${text(report.corpusHash)}\n\n## Methodology\n\n- Warmup iterations: ${report.methodology.warmupIterations}\n- Sample iterations: ${report.methodology.sampleIterations}\n- Clock: ${report.methodology.clock}\n- Build, initialization, and execute phases are reported separately. Only correctness-passing execute measurements enter rankings.\n\n## Environment\n\n| Field | Value |\n| --- | --- |\n| Node | ${text(report.environment.nodeVersion ?? "unavailable")} |\n| Chromium | ${text(report.environment.browserVersion ?? "unavailable")} |\n| Platform | ${text(report.environment.platform)} |\n| Architecture | ${text(report.environment.architecture)} |\n| CPU | ${text(report.environment.cpuModel ?? "unavailable")} |\n| CPU count | ${report.environment.cpuCount ?? "unavailable"} |\n| Memory | ${report.environment.memoryBytes ?? "unavailable"} |\n| Command | ${text(report.environment.commandLine)} |\n\n## Artifacts\n\n| ID | Implementation | Mode | Kind | Bytes | Hash |\n| --- | --- | --- | --- | ---: | --- |\n${artifacts}\n\n## Rankings\n\nRankings are ordered by median execute latency and exclude failed, unsupported, or incorrect cases.\n\n| Rank | Workload | Size | Implementation | Mode | Host | Median ms | Throughput/s |\n| ---: | --- | --- | --- | --- | --- | ---: | ---: |\n${rankingRows(report) || "| - | - | - | - | - | - | - | - |"}\n\n## Measurements\n\n| Case | Workload | Size | Implementation | Mode | Host | Phase | Status | Median ms | P95 ms | Throughput/s |\n| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |\n${measurementRows(report) || "| - | - | - | - | - | - | - | - | - | - | - |"}\n\n## Correctness\n\n| Case | Implementation | Mode | Host | Status | Expected | Observed | Reason |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${correctness === "None." ? "| - | - | - | - | - | - | - | - |" : correctness}\n\n## Failures\n\n${failures}\n\n## Baseline comparison\n\n${comparisons}\n`;
}
