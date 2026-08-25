export const BENCHMARK_SCHEMA_VERSION = 1 as const;

export const BENCHMARK_CATEGORIES = [
  "arithmetic",
  "string",
  "dataset",
] as const;
export type BenchmarkCategory = (typeof BENCHMARK_CATEGORIES)[number];

export const BENCHMARK_SIZES = ["small", "medium", "large"] as const;
export type BenchmarkSize = (typeof BENCHMARK_SIZES)[number];

export const BENCHMARK_PHASES = ["build", "initialize", "execute"] as const;
export type BenchmarkPhase = (typeof BENCHMARK_PHASES)[number];

export const IMPLEMENTATIONS = [
  "javascript",
  "rust-wasm",
  "assemblyscript-wasm",
  "fws",
] as const;
export type Implementation = (typeof IMPLEMENTATIONS)[number];

export const FWS_MODES = [
  "interpret",
  "jit",
  "aot",
  "wasm",
  "wasm-generated",
  "wasm-excluded-bounds",
] as const;
export type FwsMode = (typeof FWS_MODES)[number];

export type BenchmarkMetric =
  | "compile-time"
  | "wasm-size"
  | "call-throughput"
  | "memory-behavior"
  | "bounds-check-overhead";

export interface BenchmarkMetricRecord {
  readonly metric: BenchmarkMetric;
  readonly implementation: Implementation;
  readonly fwsMode?: FwsMode;
  readonly caseId?: string;
  readonly hostRuntime?: HostRuntime;
  readonly value: number;
  readonly unit: "milliseconds" | "bytes" | "calls-per-second" | "percent";
  readonly referenceValue?: number;
  readonly referenceMode?: FwsMode;
  readonly explanation?: string;
}

/** Metadata identifying the FWS pipeline represented by a benchmark artifact. */
export interface FwsBenchmarkPipelineMetadata {
  readonly pipeline: "fws-son-wasm-two-stage" | "fws-vm-reference";
  readonly frontend: "son-ir" | "vm-ir";
  readonly wasmStage?: "wasm-ir-optimizer";
  readonly optimization: "debug" | "release";
  readonly boundsChecks?: "runtime" | "proven-safe" | "excluded-by-profile";
  readonly memoryModel?: "region-arc-checked-linear";
  readonly sonGraphHash?: string;
  readonly sonNodeCount?: number;
  readonly sonPassCount?: number;
}

export const HOST_RUNTIMES = ["node", "chromium"] as const;
export type HostRuntime = (typeof HOST_RUNTIMES)[number];

export const BENCHMARK_OPERATIONS = [
  "arithmetic-reduce",
  "string-transform",
  "dataset-scan",
] as const;
export type BenchmarkOperation = (typeof BENCHMARK_OPERATIONS)[number];

export type ArithmeticInput = Readonly<{
  /** Number of deterministic terms to reduce. */
  n: number;
  multiplier: number;
  offset: number;
  seed: number;
}>;

export type StringInput = Readonly<{
  value: string;
  prefix: string;
  suffix: string;
  repeat: number;
}>;

export type DatasetInput = Readonly<{
  /** Raw bytes in the inclusive range 0..255. */
  bytes: readonly number[];
  threshold: number;
}>;

export type BenchmarkInput = ArithmeticInput | StringInput | DatasetInput;
/** Shared golden-output contract. All current workloads return number or string. */
export type BenchmarkOutput = number | string;

export interface BenchmarkCase<
  Input extends BenchmarkInput = BenchmarkInput,
  Output extends BenchmarkOutput = BenchmarkOutput,
> {
  readonly id: string;
  readonly category: BenchmarkCategory;
  readonly operation: BenchmarkOperation;
  readonly size: BenchmarkSize;
  readonly fixture: "standard" | "empty" | "singleton" | "unicode";
  readonly input: Input;
  readonly expected: Output;
  readonly inputBytes: number;
  readonly fixtureHash: string;
}

export type WorkloadCase<
  Input extends BenchmarkInput = BenchmarkInput,
  Output extends BenchmarkOutput = BenchmarkOutput,
> = BenchmarkCase<Input, Output>;

export type NormalizedResult = BenchmarkOutput;

export interface BuildArtifact {
  readonly id: string;
  readonly implementation: Implementation;
  readonly fwsMode?: FwsMode;
  readonly hostRuntime?: HostRuntime;
  readonly artifactKind: "javascript" | "wasm" | "fws-source" | "fws-vm";
  readonly sizeBytes?: number;
  readonly hash?: string;
  readonly exports?: readonly string[];
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
  readonly fwsPipeline?: FwsBenchmarkPipelineMetadata;
}

export interface InitializedAdapter<
  Input extends BenchmarkInput = BenchmarkInput,
  Output extends BenchmarkOutput = BenchmarkOutput,
> {
  readonly adapterId: string;
  readonly execute: (input: Input) => Output | Promise<Output>;
  /** Preparation details are kept out of steady-state execute measurements. */
  readonly preparation?: Readonly<Record<string, string | number | boolean>>;
  readonly close?: () => void | Promise<void>;
}

export interface RuntimeAdapter<
  Input extends BenchmarkInput = BenchmarkInput,
  Output extends BenchmarkOutput = BenchmarkOutput,
> {
  readonly implementation: Implementation;
  readonly mode?: FwsMode;
  readonly adapterId: string;
  build: () => Promise<BuildArtifact>;
  initialize: (
    artifact: BuildArtifact,
  ) => Promise<InitializedAdapter<Input, Output>>;
}

export interface BenchmarkKey {
  readonly caseId: string;
  readonly workload: BenchmarkCategory;
  readonly inputSize: BenchmarkSize;
  readonly implementation: Implementation;
  readonly fwsMode?: FwsMode;
  readonly hostRuntime: HostRuntime;
  readonly phase: BenchmarkPhase;
}

export interface BenchmarkSample {
  readonly durationMs: number;
  readonly operations: number;
  readonly memoryDeltaBytes?: number;
}

export interface SampleStatistics {
  readonly count: number;
  readonly meanMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly throughputPerSecond: number;
  readonly memoryDeltaBytes?: number;
}

export interface PhaseMeasurement extends BenchmarkKey {
  readonly samples: readonly BenchmarkSample[];
  readonly statistics?: SampleStatistics;
  readonly status: "measured" | "unsupported" | "failed";
  readonly error?: string;
}

export interface CorrectnessResult extends Omit<BenchmarkKey, "phase"> {
  readonly status: "passed" | "failed" | "unsupported";
  readonly expected: BenchmarkOutput;
  readonly observed?: BenchmarkOutput;
  readonly reason?: string;
}

export type CorrectnessRecord = CorrectnessResult;

export interface EnvironmentMetadata {
  readonly nodeVersion?: string;
  readonly browserVersion?: string;
  readonly platform: string;
  readonly architecture: string;
  readonly cpuModel?: string;
  readonly cpuCount?: number;
  readonly memoryBytes?: number;
  readonly compilerVersions?: Readonly<Record<string, string>>;
  readonly optimizationFlags?: readonly string[];
  readonly commandLine: string;
}

export interface BaselineComparison {
  readonly key: BenchmarkKey;
  readonly status:
    "comparable" | "not-comparable" | "missing-baseline" | "missing-current";
  readonly explanation?: string;
  readonly latencyDeltaPercent?: number;
  readonly throughputDeltaPercent?: number;
}

export type PerformanceComparisonStatus =
  "comparable" | "not-comparable" | "missing-baseline";

export interface PerformanceComparison {
  readonly candidateKey: BenchmarkKey;
  readonly referenceKey: BenchmarkKey;
  readonly status: PerformanceComparisonStatus;
  readonly candidateMedianMs?: number;
  /** Median latency for the implementation named by `referenceKey`. */
  readonly referenceMedianMs?: number;
  /** Retained for compatibility with the original JavaScript-only field. */
  readonly javascriptMedianMs?: number;
  readonly candidateThroughputPerSecond?: number;
  /** Throughput for the implementation named by `referenceKey`. */
  readonly referenceThroughputPerSecond?: number;
  /** Retained for compatibility with the original JavaScript-only field. */
  readonly javascriptThroughputPerSecond?: number;
  readonly latencyRatio?: number;
  readonly throughputRatio?: number;
  readonly latencyDeltaPercent?: number;
  readonly throughputDeltaPercent?: number;
  readonly explanation?: string;
}

export interface PerformanceGatePolicy {
  /** Maximum permitted FWS-to-JavaScript median latency ratio. */
  readonly maxRatio: number;
  /** Measurements at or below this floor are not failed for small-case noise. */
  readonly timingFloorMs: number;
}

export type PerformanceGateStatus =
  "passed" | "failed" | "not-comparable" | "missing-baseline";

export interface PerformanceGateResult {
  /** The FWS execute row being evaluated. */
  readonly key: BenchmarkKey;
  /** The exact JavaScript/node identity used as the reference, when available. */
  readonly referenceKey: BenchmarkKey;
  readonly status: PerformanceGateStatus;
  readonly measuredMedianMs?: number;
  readonly referenceMedianMs?: number;
  readonly ratio?: number;
  readonly throughputRatio?: number;
  readonly timingFloorMs: number;
  readonly allowedRatio: number;
  readonly explanation?: string;
}

export interface PerformanceGateReport {
  readonly policy: PerformanceGatePolicy;
  readonly results: readonly PerformanceGateResult[];
  readonly failed: boolean;
}

export interface BenchmarkReport {
  readonly schemaVersion: typeof BENCHMARK_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly corpusHash: string;
  readonly environment: EnvironmentMetadata;
  readonly methodology: Readonly<{
    readonly warmupIterations: number;
    readonly sampleIterations: number;
    readonly clock: "performance.now";
  }>;
  readonly artifacts: readonly BuildArtifact[];
  readonly correctness: readonly CorrectnessResult[];
  readonly measurements: readonly PhaseMeasurement[];
  readonly failures: readonly BenchmarkFailure[];
  readonly metrics: readonly BenchmarkMetricRecord[];
  readonly comparisons?: readonly BaselineComparison[];
  readonly performanceComparisons?: readonly PerformanceComparison[];
  readonly performanceGates?: PerformanceGateReport;
}

export interface MeasurementOptions {
  readonly warmupIterations: number;
  readonly sampleIterations: number;
  readonly operationsPerSample?: number;
  readonly memory?: () => number | undefined;
  readonly now?: () => number;
}

export interface ExecutionMeasurement {
  readonly samples: readonly BenchmarkSample[];
  readonly statistics: SampleStatistics;
}

export interface BenchmarkFailure {
  readonly implementation: Implementation;
  readonly fwsMode?: FwsMode;
  readonly phase: BenchmarkPhase;
  readonly category: "environment" | "build" | "runtime" | "correctness";
  readonly message: string;
}

export function createBenchmarkKey(key: BenchmarkKey): string {
  return [
    key.caseId,
    key.workload,
    key.inputSize,
    key.implementation,
    key.fwsMode ?? "-",
    key.hostRuntime,
    key.phase,
  ].join("|");
}
