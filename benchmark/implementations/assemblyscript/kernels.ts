/** Scalar arithmetic-reduce matching the shared i32 divide-and-conquer kernel. */
export function arithmeticReduce(
  n: i32,
  multiplier: i32,
  offset: i32,
  seed: i32,
): i32 {
  return offset + rangeSum(0, n, multiplier, seed);
}

function rangeSum(lo: i32, hi: i32, mult: i32, seed: i32): i32 {
  if (lo >= hi) return 0;
  if (lo + 1 == hi) {
    const idx: i32 = lo + 1;
    const raw: i32 = idx * 1103515245 + seed + 12345;
    const term: i32 = (raw % 2001) - 1000;
    return term * mult;
  }
  const mid: i32 = lo + hi;
  const half: i32 = mid / 2;
  return rangeSum(lo, half, mult, seed) + rangeSum(half, hi, mult, seed);
}

function repeatStr(piece: string, n: i32): string {
  if (n <= 0) return "";
  if (n == 1) return piece;
  const halfn: i32 = n / 2;
  const half = repeatStr(piece, halfn);
  const doubled = half + half;
  if (n % 2 == 0) return doubled;
  return doubled + piece;
}

/** Prefix check + suffix doubling-repeat (no Unicode case folding). */
export function stringTransform(
  value: string,
  prefix: string,
  suffix: string,
  repeat: i32,
): string {
  const head = value.startsWith(prefix) ? value : value + prefix;
  return head + repeatStr(suffix, repeat);
}

function scanBytes(data: Uint8Array, lo: i32, hi: i32, threshold: i32): i32 {
  if (lo >= hi) return 0;
  if (lo + 1 == hi) {
    const byte: i32 = i32(data[lo]);
    if (byte >= threshold) return byte + 1;
    return 0;
  }
  const mid: i32 = lo + hi;
  const half: i32 = mid / 2;
  return (
    scanBytes(data, lo, half, threshold) + scanBytes(data, half, hi, threshold)
  );
}

/** Byte scan/reduction: each byte >= threshold contributes `byte + 1`. */
export function datasetScan(data: Uint8Array, threshold: i32): i32 {
  return scanBytes(data, 0, data.length, threshold);
}
