import { createScannerCases, type ScannerCase } from "./scanner-fixtures.ts";
import { summarizeSamples } from "./statistics.ts";

import type { BenchmarkSample, SampleStatistics } from "./contracts.ts";

export interface ImageLike {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}

export interface Roi {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LumaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

interface ScanResult {
  readonly format: string;
  readonly value: string | null;
}

export interface ScannerApi {
  readonly imageDataToLuma: (image: ImageLike) => LumaImage;
  readonly contrastStretchLuma: (image: LumaImage) => LumaImage;
  readonly scanImageData: (image: ImageLike, roi?: Roi) => ScanResult | null;
  readonly createScannerRawPointerSessionAsync: () => Promise<ScannerRawPointerSession>;
}

export interface ScannerRawPointerSession {
  readonly scan: (image: ImageLike, roi?: Roi) => ScanResult | null;
}

export type ScannerPhase =
  "preprocess" | "marshal-proxy" | "adapted-scan" | "raw-session-scan";

export interface ScannerMeasurement {
  readonly caseId: string;
  readonly width: number;
  readonly height: number;
  readonly roi: boolean;
  readonly phase: ScannerPhase;
  readonly status: "measured" | "failed";
  readonly samples: readonly BenchmarkSample[];
  readonly statistics?: SampleStatistics;
  readonly error?: string;
}

export interface ScannerComparisonHook {
  readonly adapted: "available";
  readonly rawSession: "available";
  readonly limitation: string;
}

export interface ScannerBenchmarkReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly benchmark: "code-scanner";
  readonly methodology: Readonly<{
    readonly warmupIterations: number;
    readonly sampleIterations: number;
    readonly clock: "performance.now";
  }>;
  readonly comparison: ScannerComparisonHook;
  readonly cases: readonly Readonly<{
    id: string;
    width: number;
    height: number;
    roi: boolean;
    expected: Readonly<{ format: "qr"; value: string }>;
  }>[];
  readonly correctness: readonly ScannerCorrectness[];
  readonly measurements: readonly ScannerMeasurement[];
}

export interface ScannerCorrectness {
  readonly caseId: string;
  readonly phase: "adapted-scan" | "raw-session-scan";
  readonly status: "passed" | "failed";
  readonly expected: Readonly<{ format: "qr"; value: string }>;
  readonly observed?: ScanResult;
  readonly reason?: string;
}

export interface ScannerBenchmarkOptions {
  readonly warmupIterations?: number;
  readonly sampleIterations?: number;
  readonly now?: () => number;
  readonly cases?: readonly ScannerCase[];
  readonly scanner?: ScannerApi;
}

const RAW_SESSION_LIMITATION =
  "The public raw/session API accepts an ImageLike and performs its own preprocessing, allocation, marshalling, scan, and decoding; raw-session timings are not prepared-luma or marshalling-parity measurements.";

export function scannerComparisonHook(): ScannerComparisonHook {
  return {
    adapted: "available",
    rawSession: "available",
    limitation: RAW_SESSION_LIMITATION,
  };
}

function checkedIterations(options: ScannerBenchmarkOptions): {
  readonly warmupIterations: number;
  readonly sampleIterations: number;
} {
  const warmupIterations = options.warmupIterations ?? 3;
  const sampleIterations = options.sampleIterations ?? 10;
  if (!Number.isInteger(warmupIterations) || warmupIterations < 0)
    throw new RangeError("warmupIterations must be a non-negative integer.");
  if (!Number.isInteger(sampleIterations) || sampleIterations < 1)
    throw new RangeError("sampleIterations must be a positive integer.");
  return { warmupIterations, sampleIterations };
}

async function loadScanner(): Promise<ScannerApi> {
  const scannerUrl = new URL(
    "../../packages/integrations/code-scanner/dist/index.js",
    import.meta.url,
  );
  const module = await import(scannerUrl.href);
  const loaded = module as Partial<ScannerApi>;
  if (
    typeof loaded.imageDataToLuma !== "function" ||
    typeof loaded.contrastStretchLuma !== "function" ||
    typeof loaded.scanImageData !== "function" ||
    typeof loaded.createScannerRawPointerSessionAsync !== "function"
  ) {
    throw new TypeError(
      "Built code-scanner bundle does not expose the required public benchmark APIs.",
    );
  }
  return loaded as ScannerApi;
}

function nowDefault(): number {
  return globalThis.performance.now();
}

async function measure(
  operation: () => unknown | Promise<unknown>,
  warmupIterations: number,
  sampleIterations: number,
  now: () => number,
): Promise<{
  readonly samples: readonly BenchmarkSample[];
  readonly statistics: SampleStatistics;
}> {
  for (let index = 0; index < warmupIterations; index += 1) await operation();
  const samples: BenchmarkSample[] = [];
  for (let index = 0; index < sampleIterations; index += 1) {
    const started = now();
    await operation();
    samples.push({ durationMs: now() - started, operations: 1 });
  }
  return { samples, statistics: summarizeSamples(samples) };
}

function phaseOperation(
  api: ScannerApi,
  rawSession: ScannerRawPointerSession,
  benchmarkCase: ScannerCase,
  phase: ScannerPhase,
): () => unknown {
  if (phase === "preprocess") {
    return () =>
      api.contrastStretchLuma(api.imageDataToLuma(benchmarkCase.image));
  }
  if (phase === "marshal-proxy") {
    const prepared = api.contrastStretchLuma(
      api.imageDataToLuma(benchmarkCase.image),
    );
    return () => [...prepared.data];
  }
  if (phase === "raw-session-scan") {
    return () => rawSession.scan(benchmarkCase.image, benchmarkCase.roi);
  }
  return () =>
    api.scanImageData(benchmarkCase.image, benchmarkCase.roi) ?? undefined;
}

function failedMeasurement(
  benchmarkCase: ScannerCase,
  phase: ScannerPhase,
  error: unknown,
): ScannerMeasurement {
  const reason = error instanceof Error ? error.message : String(error);
  return {
    caseId: benchmarkCase.id,
    width: benchmarkCase.width,
    height: benchmarkCase.height,
    roi: benchmarkCase.roi !== undefined,
    phase,
    status: "failed",
    samples: [],
    error: reason,
  };
}

export async function runScannerBenchmark(
  options: ScannerBenchmarkOptions = {},
): Promise<ScannerBenchmarkReport> {
  const iterations = checkedIterations(options);
  const cases = options.cases ?? createScannerCases();
  const api = options.scanner ?? (await loadScanner());
  const rawSession = await api.createScannerRawPointerSessionAsync();
  const now = options.now ?? nowDefault;
  const measurements: ScannerMeasurement[] = [];
  const correctness: ScannerCorrectness[] = [];
  for (const benchmarkCase of cases) {
    try {
      const observed =
        api.scanImageData(benchmarkCase.image, benchmarkCase.roi) ?? undefined;
      const passed =
        observed?.format === benchmarkCase.expected.format &&
        observed.value === benchmarkCase.expected.value;
      correctness.push({
        caseId: benchmarkCase.id,
        phase: "adapted-scan",
        status: passed ? "passed" : "failed",
        expected: benchmarkCase.expected,
        observed,
        ...(passed
          ? {}
          : {
              reason:
                "Adapted scanner result did not match the fixture golden.",
            }),
      });
    } catch (error) {
      correctness.push({
        caseId: benchmarkCase.id,
        phase: "adapted-scan",
        status: "failed",
        expected: benchmarkCase.expected,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      const observed =
        rawSession.scan(benchmarkCase.image, benchmarkCase.roi) ?? undefined;
      const passed =
        observed?.format === benchmarkCase.expected.format &&
        observed.value === benchmarkCase.expected.value;
      correctness.push({
        caseId: benchmarkCase.id,
        phase: "raw-session-scan",
        status: passed ? "passed" : "failed",
        expected: benchmarkCase.expected,
        observed,
        ...(passed
          ? {}
          : {
              reason:
                "Raw/session scanner result did not match the fixture golden.",
            }),
      });
    } catch (error) {
      correctness.push({
        caseId: benchmarkCase.id,
        phase: "raw-session-scan",
        status: "failed",
        expected: benchmarkCase.expected,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    for (const phase of [
      "preprocess",
      "marshal-proxy",
      "adapted-scan",
      "raw-session-scan",
    ] as const) {
      try {
        const measured = await measure(
          phaseOperation(api, rawSession, benchmarkCase, phase),
          iterations.warmupIterations,
          iterations.sampleIterations,
          now,
        );
        measurements.push({
          caseId: benchmarkCase.id,
          width: benchmarkCase.width,
          height: benchmarkCase.height,
          roi: benchmarkCase.roi !== undefined,
          phase,
          status: "measured",
          ...measured,
        });
      } catch (error) {
        measurements.push(failedMeasurement(benchmarkCase, phase, error));
      }
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    benchmark: "code-scanner",
    methodology: { ...iterations, clock: "performance.now" },
    comparison: scannerComparisonHook(),
    cases: cases.map(({ id, width, height, roi, expected }) => ({
      id,
      width,
      height,
      roi: roi !== undefined,
      expected,
    })),
    correctness,
    measurements,
  };
}

export function renderScannerMarkdown(report: ScannerBenchmarkReport): string {
  const lines = [
    "# Code scanner benchmark",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Comparison status",
    "",
    `- Adapted façade: **${report.comparison.adapted}**`,
    `- Raw/session API: **${report.comparison.rawSession}**`,
    `- Limitation: ${report.comparison.limitation}`,
    "",
    "## Measurements",
    "",
    "| Case | Frame | ROI | Phase | Median (ms) | p95 (ms) | Status |",
    "| --- | ---: | --- | --- | ---: | ---: | --- |",
  ];
  for (const measurement of report.measurements) {
    const statistics = measurement.statistics;
    lines.push(
      `| ${measurement.caseId} | ${measurement.width}×${measurement.height} | ${measurement.roi ? "yes" : "no"} | ${measurement.phase} | ${statistics?.medianMs?.toFixed(3) ?? "—"} | ${statistics?.p95Ms?.toFixed(3) ?? "—"} | ${measurement.status} |`,
    );
  }
  lines.push("", "## Correctness", "");
  for (const result of report.correctness) {
    lines.push(`- ${result.caseId}: **${result.status}**`);
  }
  lines.push(
    "",
    "`marshal-proxy` measures conversion of an already prepared luma buffer to a JavaScript number array. `raw-session-scan` calls the public raw session with the original `ImageLike` frame and ROI, including its own preprocessing; it is not prepared-luma or marshalling parity with `marshal-proxy`.",
  );
  return `${lines.join("\n")}\n`;
}
