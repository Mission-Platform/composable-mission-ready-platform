import path from "node:path";

import { BENCHMARK_ROOT } from "./build.ts";
import { BENCHMARK_CORPUS, BENCHMARK_CORPUS_HASH } from "./corpus.ts";
import {
  DEFAULT_PERFORMANCE_GATE_POLICY,
  createBenchmarkReport,
  createRunId,
  readBenchmarkReport,
  writeBenchmarkReport,
} from "./report.ts";
import { runChromiumBenchmark } from "./run-browser.ts";
import { runNodeBenchmark } from "./run-node.ts";

function numberFlag(
  arguments_: readonly string[],
  name: string,
  fallback: number,
): number {
  const index = arguments_.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(arguments_[index + 1]);
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`${name} requires a non-negative integer.`);
  return value;
}

function decimalFlag(
  arguments_: readonly string[],
  name: string,
  fallback: number,
): number {
  const index = arguments_.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(arguments_[index + 1]);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} requires a non-negative number.`);
  return value;
}

function stringFlag(
  arguments_: readonly string[],
  name: string,
): string | undefined {
  const index = arguments_.indexOf(name);
  if (index === -1) return undefined;
  const value = arguments_[index + 1];
  if (value === undefined || value.startsWith("--"))
    throw new Error(`${name} requires a value.`);
  return value;
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    process.stdout.write(
      "Usage: pnpm bench [--warmup N] [--samples N] [--output DIR] [--baseline REPORT.JSON] [--max-ratio N] [--timing-floor-ms N] [--enforce-gate] [--node-only|--browser-only]\n",
    );
    return;
  }
  const nodeOnly = arguments_.includes("--node-only");
  const browserOnly = arguments_.includes("--browser-only");
  if (nodeOnly && browserOnly)
    throw new Error("--node-only and --browser-only are mutually exclusive.");
  const warmupIterations = numberFlag(arguments_, "--warmup", 3);
  const sampleIterations = numberFlag(arguments_, "--samples", 10);
  const output = stringFlag(arguments_, "--output");
  const baselinePath = stringFlag(arguments_, "--baseline");
  const performanceGate = {
    maxRatio: decimalFlag(
      arguments_,
      "--max-ratio",
      DEFAULT_PERFORMANCE_GATE_POLICY.maxRatio,
    ),
    timingFloorMs: decimalFlag(
      arguments_,
      "--timing-floor-ms",
      DEFAULT_PERFORMANCE_GATE_POLICY.timingFloorMs,
    ),
  };
  const enforceGate = arguments_.includes("--enforce-gate");
  const runId = stringFlag(arguments_, "--run-id") ?? createRunId();
  const repositoryRoot = path.resolve(BENCHMARK_ROOT, "..");
  const resolveUserPath = (value: string): string =>
    path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
  const baseline =
    baselinePath === undefined
      ? undefined
      : await readBenchmarkReport(resolveUserPath(baselinePath));
  const node = browserOnly
    ? undefined
    : await runNodeBenchmark({ warmupIterations, sampleIterations });
  const browser = nodeOnly
    ? undefined
    : await runChromiumBenchmark({
        artifacts: node?.artifacts ?? [],
        buildFailures: node?.failures,
        cases: BENCHMARK_CORPUS,
        warmupIterations,
        sampleIterations,
      });
  const measured = [
    ...(node?.measurements ?? []),
    ...(browser?.measurements ?? []),
  ].filter((measurement) => measurement.status === "measured").length;
  const failures = [...(node?.failures ?? []), ...(browser?.failures ?? [])];
  const report = createBenchmarkReport({
    node,
    browser,
    warmupIterations,
    sampleIterations,
    corpusHash: BENCHMARK_CORPUS_HASH,
    baseline,
    performanceGate,
  });
  const reportDirectory =
    output === undefined
      ? path.join(BENCHMARK_ROOT, "results", runId)
      : resolveUserPath(output);
  const reportPaths = await writeBenchmarkReport(report, reportDirectory);
  process.stdout.write(
    [
      `benchmark completed: ${measured} measured phase results`,
      `prepared ${BENCHMARK_CORPUS.length} deterministic workload cases`,
      `corpus hash: ${BENCHMARK_CORPUS_HASH}`,
      `node: ${node === undefined ? "not requested" : `${node.measurements.length} phase results`}`,
      `chromium: ${browser?.status ?? "not requested"}`,
      `failures: ${failures.length}`,
      `performance gate: ${report.performanceGates?.failed ? "failed" : "passed"} (${report.performanceGates?.results.length ?? 0} FWS execute rows)`,
      `report: ${reportPaths.directory}`,
      ...failures
        .slice(0, 10)
        .map((failure) => `- ${failure.category}: ${failure.message}`),
    ].join("\n") + "\n",
  );
  if (enforceGate && report.performanceGates?.failed === true)
    process.exitCode = 1;
}

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
}
