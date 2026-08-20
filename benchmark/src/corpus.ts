import { runArithmetic, runDataset, runString } from "./kernels.ts";

import type {
  ArithmeticInput,
  BenchmarkCase,
  BenchmarkCategory,
  BenchmarkOutput,
  BenchmarkSize,
  DatasetInput,
  StringInput,
} from "./contracts.ts";

/** Element counts for arithmetic `n`. */
const SIZE_COUNTS: Readonly<Record<BenchmarkSize, number>> = {
  small: 16,
  medium: 4096,
  large: 65_536,
};

/**
 * String segment counts. Large input exercises boundary copying without
 * making the output or adapter payload unreasonably large.
 */
const STRING_COUNTS: Readonly<Record<BenchmarkSize, number>> = {
  small: 16,
  medium: 128,
  large: 512,
};

const STRING_REPEATS: Readonly<Record<BenchmarkSize, number>> = {
  small: 2,
  medium: 2,
  large: 64,
};

const ARITHMETIC_SEEDS: Readonly<Record<BenchmarkSize, number>> = {
  small: 17,
  medium: 29,
  large: 43,
};

/**
 * Dataset payload sizes. The recursive scan has logarithmic stack depth, so
 * the large payload increases work without increasing recursion depth much.
 */
const DATASET_COUNTS: Readonly<Record<BenchmarkSize, number>> = {
  small: 32,
  medium: 8192,
  large: 16_384,
};

const TEXT_SEEDS = ["Forge Web Script", "Δοκιμή", "日本語", "emoji 🚀"];

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function stableHash(value: unknown): string {
  const bytes = new TextEncoder().encode(stableStringify(value));
  let hash = 14_695_981_039_346_656_037n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 1_099_511_628_211n);
  }
  return hash.toString(16).padStart(16, "0");
}

function seededByte(index: number, seed: number): number {
  const value = Math.imul(index + 1, 1_103_515_245) + seed + 12_345;
  return value & 0xff;
}

function expectedFor(
  category: BenchmarkCategory,
  input: ArithmeticInput | StringInput | DatasetInput,
): BenchmarkOutput {
  if (category === "arithmetic") {
    return runArithmetic(input as ArithmeticInput);
  }
  if (category === "string") {
    return runString(input as StringInput);
  }
  return runDataset(input as DatasetInput);
}

function createCase(
  category: BenchmarkCategory,
  size: BenchmarkSize,
  fixture: "standard" | "empty" | "singleton" | "unicode",
  input: ArithmeticInput | StringInput | DatasetInput,
): BenchmarkCase {
  const operation =
    category === "arithmetic"
      ? "arithmetic-reduce"
      : category === "string"
        ? "string-transform"
        : "dataset-scan";
  const id = `${category}:${fixture}:${size}`;
  const expected = expectedFor(category, input);
  return {
    id,
    category,
    operation,
    size,
    fixture,
    input,
    expected,
    inputBytes: new TextEncoder().encode(stableStringify(input)).byteLength,
    fixtureHash: stableHash({
      id,
      input,
      expected,
    }),
  };
}

function arithmeticCases(size: BenchmarkSize): readonly BenchmarkCase[] {
  const n = SIZE_COUNTS[size];
  const seed = ARITHMETIC_SEEDS[size];
  return [
    createCase("arithmetic", size, "standard", {
      n,
      multiplier: 3,
      offset: -7,
      seed,
    }),
    ...(size === "small"
      ? [
          createCase("arithmetic", size, "empty", {
            n: 0,
            multiplier: 3,
            offset: -7,
            seed,
          }),
          createCase("arithmetic", size, "singleton", {
            n: 1,
            multiplier: 3,
            offset: -7,
            seed,
          }),
        ]
      : []),
  ];
}

function stringCases(size: BenchmarkSize): readonly BenchmarkCase[] {
  const count = STRING_COUNTS[size];
  const value = Array.from(
    { length: count },
    (_, index) => `${TEXT_SEEDS[index % TEXT_SEEDS.length]} ${index}`,
  ).join(" · ");
  const prefix = size === "small" ? "Forge" : "Forge Web";
  return [
    createCase("string", size, size === "small" ? "unicode" : "standard", {
      value,
      prefix,
      suffix: "!",
      repeat: STRING_REPEATS[size],
    }),
    ...(size === "small"
      ? [
          createCase("string", size, "empty", {
            value: "",
            prefix: "",
            suffix: "∅",
            repeat: 1,
          }),
        ]
      : []),
  ];
}

function datasetCases(size: BenchmarkSize): readonly BenchmarkCase[] {
  const count = DATASET_COUNTS[size];
  const bytes = Array.from({ length: count }, (_, index) =>
    seededByte(index, count),
  );
  return [
    createCase("dataset", size, "standard", { bytes, threshold: 128 }),
    ...(size === "small"
      ? [
          createCase("dataset", size, "empty", { bytes: [], threshold: 0 }),
          createCase("dataset", size, "singleton", {
            bytes: [200],
            threshold: 128,
          }),
        ]
      : []),
  ];
}

export function createBenchmarkCorpus(): readonly BenchmarkCase[] {
  return (["small", "medium", "large"] as const).flatMap((size) => [
    ...arithmeticCases(size),
    ...stringCases(size),
    ...datasetCases(size),
  ]);
}

export function corpusHash(
  cases: readonly BenchmarkCase[] = createBenchmarkCorpus(),
): string {
  return stableHash(
    cases.map(
      ({
        id,
        category,
        operation,
        size,
        fixture,
        input,
        expected,
        inputBytes,
        fixtureHash,
      }) => ({
        id,
        category,
        operation,
        size,
        fixture,
        input,
        expected,
        inputBytes,
        fixtureHash,
      }),
    ),
  );
}

export const BENCHMARK_CORPUS = createBenchmarkCorpus();
export const BENCHMARK_CORPUS_HASH = corpusHash(BENCHMARK_CORPUS);
