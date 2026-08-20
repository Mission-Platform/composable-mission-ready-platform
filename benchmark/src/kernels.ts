import type {
  ArithmeticInput,
  BenchmarkInput,
  BenchmarkOutput,
  DatasetInput,
  StringInput,
} from "./contracts.ts";

/** Bit-exact ToInt32 used by the shared arithmetic and dataset kernels. */
export function toI32(value: number): number {
  // eslint-disable-next-line unicorn/prefer-math-trunc -- intentional ToInt32 wrap
  return value | 0;
}

/**
 * Deterministic i32 term used by arithmetic-reduce.
 * Matches Forge Web Script / WASM i32 multiply and remainder semantics.
 */
export function arithmeticTerm(index: number, seed: number): number {
  const termIndex = toI32(index + 1);
  const raw = toI32(Math.imul(termIndex, 1_103_515_245) + seed + 12_345);
  return toI32((raw % 2001) - 1000);
}

function rangeSum(
  lo: number,
  hi: number,
  multiplier: number,
  seed: number,
): number {
  if (lo >= hi) return 0;
  if (lo + 1 === hi) {
    return Math.imul(arithmeticTerm(lo, seed), multiplier);
  }
  const mid = toI32(lo + hi);
  const half = toI32(mid / 2);
  return toI32(
    rangeSum(lo, half, multiplier, seed) + rangeSum(half, hi, multiplier, seed),
  );
}

/** Scalar divide-and-conquer arithmetic reduction (stack-safe depth). */
export function runArithmetic(input: ArithmeticInput): number {
  return toI32(
    input.offset + rangeSum(0, input.n, input.multiplier, input.seed),
  );
}

/** Doubling repeat that matches the recursive FWS implementation. */
export function repeatString(piece: string, count: number): string {
  const n = toI32(count);
  if (n <= 0) return "";
  if (n === 1) return piece;
  const half = repeatString(piece, toI32(n / 2));
  const doubled = `${half}${half}`;
  return n % 2 === 0 ? doubled : `${doubled}${piece}`;
}

/**
 * UTF-8-safe string transform shared by every implementation family.
 * Uses prefix detection + suffix doubling-repeat (no Unicode case folding).
 */
export function runString(input: StringInput): string {
  const head = input.value.startsWith(input.prefix)
    ? input.value
    : `${input.value}${input.prefix}`;
  return `${head}${repeatString(input.suffix, input.repeat)}`;
}

function scanBytes(
  data: readonly number[],
  lo: number,
  hi: number,
  threshold: number,
): number {
  if (lo >= hi) return 0;
  if (lo + 1 === hi) {
    const byte = data[lo] ?? 0;
    return byte >= threshold ? toI32(byte + 1) : 0;
  }
  const mid = toI32(lo + hi);
  const half = toI32(mid / 2);
  return toI32(
    scanBytes(data, lo, half, threshold) + scanBytes(data, half, hi, threshold),
  );
}

/**
 * Large-dataset byte scan/reduction.
 * Each qualifying byte contributes `byte + 1` so both sum and count affect the total.
 */
export function runDataset(input: DatasetInput): number {
  return scanBytes(input.bytes, 0, input.bytes.length, input.threshold);
}

export function runKernel(input: BenchmarkInput): BenchmarkOutput {
  if ("multiplier" in input) return runArithmetic(input);
  if ("suffix" in input) return runString(input);
  return runDataset(input);
}

export const KERNEL_EXPORTS = [
  "arithmetic_reduce",
  "string_transform",
  "dataset_scan",
] as const;
