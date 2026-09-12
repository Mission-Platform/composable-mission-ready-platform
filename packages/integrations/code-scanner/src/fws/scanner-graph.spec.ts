import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';
import { encodeMatrix } from '@mission-platform/matrix-code';
import {
  createForgeWebScriptCompilerService,
  resolveForgeWebScriptModuleGraph,
} from '../../../../compiler/forge/forge-web-script/dist/index.js';

interface ScannerExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly scan_and_decode: (...args: number[]) => RawString;
  readonly scan_and_decode_bytes: (...args: number[]) => RawString;
  readonly sc_foundation_version: () => number;
  readonly sc_foundation_validate_dimensions: (width: number, height: number, stride: number) => number;
  readonly sc_foundation_validate_outcome: (outcome: number) => number;
  readonly sc_foundation_gf256: (left: number, right: number) => number;
  readonly sc_foundation_bit_array: (
    bits: number,
    capacity: number,
    state: number,
    value: number,
    index: number,
  ) => number;
  readonly sc_foundation_bit_matrix: (
    bits: number,
    width: number,
    height: number,
    state: number,
    x: number,
    y: number,
    value: number,
  ) => number;
  readonly sc_oned_pattern_variance: (actual: number, expected: number, count: number) => number;
  readonly sc_oned_quiet_zone: (row: number, start: number, width: number, required: number) => number;
  readonly sc_oned_extract_row: (
    luma: number,
    width: number,
    height: number,
    row: number,
    threshold: number,
    modules: number,
  ) => number;
  readonly sc_oned_decode_ean8: (row: number) => RawString;
  readonly sc_oned_decode_ean13: (row: number) => RawString;
  readonly sc_oned_decode_upca: (row: number) => RawString;
  readonly sc_oned_decode_upce: (row: number) => RawString;
  readonly sc_oned_decode_extension2: (row: number) => RawString;
  readonly sc_oned_decode_extension5: (row: number) => RawString;
  readonly sc_oned_decode_code39: (row: number) => RawString;
  readonly sc_oned_decode_itf: (row: number) => RawString;
  readonly sc_oned_decode_codabar: (row: number) => RawString;
  readonly sc_oned_decode_code93: (row: number) => RawString;
  readonly sc_oned_decode_code128: (row: number) => RawString;
  readonly sc_oned_decode_with_hint: (row: number, possibleFormat: number) => RawString;
  readonly sc_oned_decode_rss14: (row: number) => RawString;
  readonly sc_oned_decode_rss_expanded: (row: number) => RawString;
}

type RawString = readonly [pointer: number, length: number];

const scannerDirectory = resolve(import.meta.dirname);

function loadTree(directory: string, files: Record<string, string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fileName = join(directory, entry.name);
    if (entry.isDirectory()) loadTree(fileName, files);
    else if (entry.name.endsWith('.fws')) files[resolve(fileName)] = readFileSync(fileName, 'utf8');
  }
}

function writeArray(api: ScannerExports, values: readonly number[]): number {
  const pointer = api.fws_alloc((values.length + 1) * 4);
  const view = new DataView(api.memory.buffer, pointer, (values.length + 1) * 4);
  view.setInt32(0, values.length, true);
  values.forEach((value, index) => view.setInt32((index + 1) * 4, value, true));
  return pointer;
}

function readString(api: ScannerExports, value: RawString): string {
  return new TextDecoder().decode(new Uint8Array(api.memory.buffer, value[0], value[1]));
}

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGLLGL'];

function ean8Modules(value: string): number[] {
  const bits = `101${value.slice(0, 4).split('').map((digit) => EAN_L[Number(digit)]).join('')}01010${value.slice(4).split('').map((digit) => EAN_R[Number(digit)]).join('')}101`;
  return [...bits].map(Number);
}

function ean13Modules(value: string): number[] {
  const parity = EAN_PARITY[Number(value[0])];
  const left = value.slice(1, 7).split('').map((digit, index) => (parity[index] === 'L' ? EAN_L : EAN_G)[Number(digit)]).join('');
  const right = value.slice(7).split('').map((digit) => EAN_R[Number(digit)]).join('');
  return [...`101${left}01010${right}101`].map(Number);
}

function scaledPaddedModules(modules: readonly number[], scale = 2, padding = 8): number[] {
  const scaled = modules.flatMap((bit) => new Array(scale).fill(bit));
  return [...new Array(padding * scale).fill(0), ...scaled, ...new Array(padding * scale).fill(0)];
}

function upceModules(value: string): number[] {
  const parityByNumberSystem = [
    ['GGGLLL', 'GGLGLL', 'GGLLGL', 'GGLLLG', 'GLGGLL', 'GLLGGL', 'GLLLGG', 'GLGLGL', 'GLGLLG', 'GLLGLG'],
    ['LLLGGG', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGLLGL'],
  ];
  const parity = parityByNumberSystem[Number(value[0])][Number(value[7])];
  const left = value.slice(1, 7).split('').map((digit, index) => {
    const patterns = parity[index] === 'L' ? EAN_L : EAN_G;
    return patterns[Number(digit)];
  }).join('');
  return [...`101${left}010101`].map(Number);
}

function extensionModules(value: string, parity: string): number[] {
  const digits = value.split('').map((digit, index) => {
    const patterns = parity[index] === 'L' ? EAN_L : EAN_G;
    return patterns[Number(digit)];
  });
  const bits = ['1011'];
  digits.forEach((digit, index) => {
    bits.push(digit);
    if (index < digits.length - 1) bits.push('01');
  });
  return bits.join('').split('').map(Number);
}

const CODE39_PATTERNS: Record<string, string> = {
  '*': 'nwnnwnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn',
  '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
};

function code39Modules(value: string): number[] {
  const symbols = `*${value}*`.split('').map((symbol) => CODE39_PATTERNS[symbol]);
  const bits = symbols.map((pattern) => [...pattern].map((unit, index) => {
    const bit = index % 2 === 0 ? '1' : '0';
    return unit === 'w' ? bit + bit : bit;
  }).join('')).join('0');
  return [...`00000000${bits}00000000`].map(Number);
}

const ITF_PATTERNS = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn'];

function itfModules(value: string): number[] {
  const bits: string[] = ['1010'];
  for (let index = 0; index < value.length; index += 2) {
    const bars = ITF_PATTERNS[Number(value[index])];
    const spaces = ITF_PATTERNS[Number(value[index + 1])];
    for (let run = 0; run < 5; run += 1) {
      bits.push(bars[run] === 'w' ? '11' : '1');
      bits.push(spaces[run] === 'w' ? '00' : '0');
    }
  }
  bits.push('11101');
  return [...`00000000${bits.join('')}00000000`].map(Number);
}

const CODABAR_ENCODINGS = [0x003, 0x006, 0x009, 0x060, 0x012, 0x042, 0x021, 0x024, 0x030, 0x048, 0x00c, 0x018, 0x045, 0x051, 0x054, 0x015, 0x01a, 0x029, 0x00b, 0x00e];

function codabarModules(value: string): number[] {
  const alphabet = '0123456789-$:/.+ABCD';
  const symbols = `A${value}A`;
  const modules: number[] = new Array(10).fill(0);
  for (const symbol of symbols) {
    const encoding = CODABAR_ENCODINGS[alphabet.indexOf(symbol)];
    for (let bit = 6; bit >= 0; bit -= 1) {
      const wide = (encoding & (1 << bit)) !== 0;
      modules.push(...new Array(wide ? 2 : 1).fill((6 - bit) % 2 === 0 ? 1 : 0));
    }
    modules.push(0);
  }
  return [...modules, ...new Array(10).fill(0)];
}

const CODE93_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%abcd*';
const CODE93_ENCODINGS = [
  0x114, 0x148, 0x144, 0x142, 0x128, 0x124, 0x122, 0x150, 0x112, 0x10a,
  0x1a8, 0x1a4, 0x1a2, 0x194, 0x192, 0x18a, 0x168, 0x164, 0x162, 0x134,
  0x11a, 0x158, 0x14c, 0x146, 0x12c, 0x116, 0x1b4, 0x1b2, 0x1ac, 0x1a6,
  0x196, 0x19a, 0x16c, 0x166, 0x136, 0x13a, 0x12e, 0x1d4, 0x1d2, 0x1ca,
  0x16e, 0x176, 0x1ae, 0x126, 0x1da, 0x1d6, 0x132, 0x15e,
];

function code93Checksum(value: string, maxWeight: number): number {
  let weight = 1;
  let total = 0;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    total += CODE93_ALPHABET.indexOf(value[index]) * weight;
    weight = weight === maxWeight ? 1 : weight + 1;
  }
  return total % 47;
}

function code93Modules(value: string): number[] {
  const c = code93Checksum(value, 20);
  const withC = `${value}${CODE93_ALPHABET[c]}`;
  const k = code93Checksum(withC, 15);
  const symbols = [47, ...[...value].map((symbol) => CODE93_ALPHABET.indexOf(symbol)), c, k, 47];
  const bits = symbols.map((index) => (index === 47 ? 0x15e : CODE93_ENCODINGS[index]).toString(2).padStart(9, '0')).join('');
  return [...`00000000${bits}1${'00000000'}`].map(Number);
}

function code128Symbol(runs: readonly number[]): number[] {
  const modules: number[] = [];
  runs.forEach((run, index) => modules.push(...new Array(run).fill(index % 2 === 0 ? 1 : 0)));
  return modules;
}

function code128Modules(value: string): number[] {
  const runs: Record<number, readonly number[]> = {
    33: [1, 1, 1, 3, 2, 3],
    34: [1, 3, 1, 1, 2, 3],
    35: [1, 3, 1, 3, 2, 1],
    102: [4, 1, 1, 1, 3, 1],
    104: [2, 1, 1, 2, 1, 4],
  };
  const values = [104, ...[...value].map((character) => character.charCodeAt(0) - 32)];
  let checksum = values[0];
  for (let index = 1; index < values.length; index += 1) checksum += values[index] * index;
  values.push(checksum % 103, 106);
  const modules = new Array(10).fill(0);
  for (const code of values) {
    if (code === 106) modules.push(...code128Symbol([2, 3, 3, 1, 1, 1, 2]));
    else modules.push(...code128Symbol(runs[code] ?? []));
  }
  return [...modules, ...new Array(10).fill(0)];
}

// --- RSS-14 / RSS Expanded fixture oracle -----------------------------------
// These helpers mirror the exact ZXing RSSUtils/RSS14Reader/RSSExpandedReader
// arithmetic (including the `stuck_count` replacement for the non-idempotent
// `narrowMask` bit trick ZXing implements with real bitwise AND) so that
// fixtures built here are independently, verifiably consistent with the FWS
// port rather than hand-picked "expected" strings.
function rssCombins(n: number, r: number): number {
  if (r < 0 || n < 0 || r > n) return 0;
  let minDenom = r;
  let maxDenom = n - r;
  if (n - r <= r) { minDenom = n - r; maxDenom = r; }
  let value = 1;
  let denominator = 1;
  let numerator = n;
  while (numerator > maxDenom) {
    value *= numerator;
    if (denominator <= minDenom) { value = Math.trunc(value / denominator); denominator += 1; }
    numerator -= 1;
  }
  while (denominator <= minDenom) { value = Math.trunc(value / denominator); denominator += 1; }
  return value;
}

function rssGroupValue(counts: readonly number[], parityOffset: number, maxWidth: number, noNarrow: boolean): number {
  let remaining = 0;
  for (let index = 0; index < 4; index += 1) remaining += counts[index * 2 + parityOffset];
  let value = 0;
  let stuckCount = 0;
  for (let bar = 0; bar < 3; bar += 1) {
    const width = counts[bar * 2 + parityOffset];
    const elementsLeft = 4 - bar - 1;
    for (let elementWidth = 1; elementWidth < width; elementWidth += 1) {
      let subValue = rssCombins(remaining - elementWidth - 1, elementsLeft - 1);
      const applyNoNarrow = noNarrow && elementWidth > 1 && stuckCount === 0
        && (remaining - elementWidth - elementsLeft >= elementsLeft);
      if (applyNoNarrow) subValue -= rssCombins(remaining - elementWidth - 4 + bar, elementsLeft - 1);
      if (elementsLeft > 1) {
        let lessValue = 0;
        let widest = remaining - elementWidth - 2 + bar;
        while (widest > maxWidth) {
          lessValue += rssCombins(remaining - elementWidth - widest - 1, elementsLeft - 2);
          widest -= 1;
        }
        subValue -= lessValue * (3 - bar);
      }
      if (elementsLeft <= 1 && remaining - elementWidth > maxWidth) subValue -= 1;
      value += subValue;
    }
    if (width === 1) stuckCount += 1;
    remaining -= width;
  }
  return value;
}

const RSS14_FINDER_PATTERNS = [
  [3, 8, 2, 1], [3, 5, 5, 1], [3, 3, 7, 1], [3, 1, 9, 1], [2, 7, 4, 1],
  [2, 5, 6, 1], [2, 3, 8, 1], [1, 5, 7, 1], [1, 3, 9, 1],
];
const RSS14_OUTSIDE_EVEN_TOTAL = [1, 10, 34, 70, 126];
const RSS14_OUTSIDE_GSUM = [0, 161, 961, 2015, 2715];
const RSS14_OUTSIDE_ODD_WIDEST = [8, 6, 4, 3, 1];
const RSS14_INSIDE_ODD_TOTAL = [4, 20, 48, 81];
const RSS14_INSIDE_GSUM = [0, 336, 1036, 1516];
const RSS14_INSIDE_ODD_WIDEST = [2, 4, 6, 8];

function rss14CharacterValue(odd: readonly number[], even: readonly number[], outside: boolean): { value: number; checksumPortion: number } {
  const counts: number[] = [];
  for (let index = 0; index < 4; index += 1) counts.push(odd[index], even[index]);
  let oddChecksum = 0;
  let evenChecksum = 0;
  let oddSum = 0;
  let evenSum = 0;
  for (let index = 3; index >= 0; index -= 1) {
    oddChecksum = oddChecksum * 9 + odd[index];
    evenChecksum = evenChecksum * 9 + even[index];
    oddSum += odd[index];
    evenSum += even[index];
  }
  const checksumPortion = oddChecksum + 3 * evenChecksum;
  if (outside) {
    const group = Math.trunc((12 - oddSum) / 2);
    const oddWidest = RSS14_OUTSIDE_ODD_WIDEST[group];
    const vOdd = rssGroupValue(counts, 0, oddWidest, false);
    const vEven = rssGroupValue(counts, 1, 9 - oddWidest, true);
    return { value: vOdd * RSS14_OUTSIDE_EVEN_TOTAL[group] + vEven + RSS14_OUTSIDE_GSUM[group], checksumPortion };
  }
  const group = Math.trunc((10 - evenSum) / 2);
  const oddWidest = RSS14_INSIDE_ODD_WIDEST[group];
  const vOdd = rssGroupValue(counts, 0, oddWidest, true);
  const vEven = rssGroupValue(counts, 1, 9 - oddWidest, false);
  return { value: vEven * RSS14_INSIDE_ODD_TOTAL[group] + vOdd + RSS14_INSIDE_GSUM[group], checksumPortion };
}

function rss14PairValue(outsideOdd: readonly number[], outsideEven: readonly number[], insideOdd: readonly number[], insideEven: readonly number[]) {
  const outside = rss14CharacterValue(outsideOdd, outsideEven, true);
  const inside = rss14CharacterValue(insideOdd, insideEven, false);
  return { value: 1597 * outside.value + inside.value, checksumPortion: outside.checksumPortion + 4 * inside.checksumPortion };
}


function rss14ConstructResult(left: number, right: number): string {
  const symbolValue = 4537077n * BigInt(left) + BigInt(right);
  const text = symbolValue.toString().padStart(13, '0');
  let checksum = 0;
  for (let index = 0; index < 13; index += 1) checksum += index % 2 === 0 ? Number(text[index]) * 3 : Number(text[index]);
  let checkDigit = 10 - (checksum % 10);
  if (checkDigit === 10) checkDigit = 0;
  return text + String(checkDigit);
}

function rss14PairRuns(finderValue: number, outsideOdd: readonly number[], outsideEven: readonly number[], insideOdd: readonly number[], insideEven: readonly number[]): number[] {
  return [
    outsideOdd[0], outsideEven[0], outsideOdd[1], outsideEven[1],
    outsideOdd[2], outsideEven[2], outsideOdd[3], outsideEven[3],
    ...RSS14_FINDER_PATTERNS[finderValue],
    insideEven[3], insideOdd[3], insideEven[2], insideOdd[2],
    insideEven[1], insideOdd[1], insideEven[0], insideOdd[0],
  ];
}

function runsToBits(runs: readonly number[]): number[] {
  let color = 1;
  const bits: number[] = [];
  for (const width of runs) {
    for (let index = 0; index < width; index += 1) bits.push(color);
    color = 1 - color;
  }
  return bits;
}

function rss14Row(outsideOdd: readonly number[], outsideEven: readonly number[], insideOdd: readonly number[], insideEven: readonly number[], leftFinder: number, rightFinder: number): number[] {
  const leftBits = runsToBits(rss14PairRuns(leftFinder, outsideOdd, outsideEven, insideOdd, insideEven));
  // The decoder reads the right pair on the physically reversed row (ZXing's
  // `row.reverse()`), so the right symbol is the bit-level mirror of a forward
  // pair. Reverse the generated bits (not the run array) to preserve colour
  // polarity so the reversed-row scan sees a valid `outside|finder|inside`.
  const rightBits = [...runsToBits(rss14PairRuns(rightFinder, outsideOdd, outsideEven, insideOdd, insideEven))].reverse();
  const quiet = new Array(24).fill(0);
  const mid = new Array(22).fill(0);
  // Each pair's inside character ends in a white run adjacent to the mid/quiet
  // whitespace. A single black guard module bounds that final run so the
  // forward recorder captures its true width instead of absorbing the gap.
  const guard = [1];
  return [...quiet, ...leftBits, ...guard, ...mid, ...guard, ...rightBits, ...quiet];
}

function rss14TryFinderPair(checkValue: number): [number, number] | undefined {
  for (let leftFinder = 0; leftFinder <= 8; leftFinder += 1) {
    for (let rightFinder = 0; rightFinder <= 8; rightFinder += 1) {
      let target = 9 * leftFinder + rightFinder;
      if (target > 72) target -= 1;
      if (target > 8) target -= 1;
      if (target === checkValue) return [leftFinder, rightFinder];
    }
  }
  return undefined;
}

// Search for a valid, in-range RSS-14 symbol. The left and right pairs share
// the same character widths (so left === right). The combined symbol value is
// 4537078 * pair, which must stay within 13 digits for the (spec-bounded)
// integer result builder, so only pair values <= 2_203_851 are usable.
function buildRss14Fixture() {
  const outsideOddSums = [12, 10, 8, 6, 4];
  const insideEvenSums = [4, 6, 8, 10];
  for (const oddSum of outsideOddSums) {
    for (const outsideOdd of tuplesSummingTo(oddSum, 8)) {
      for (const outsideEven of tuplesSummingTo(16 - oddSum, 8)) {
        const outside = rss14CharacterValue(outsideOdd, outsideEven, true);
        if (outside.value < 0 || 1597 * outside.value > 2_203_851) continue;
        for (const evenSum of insideEvenSums) {
          for (const insideEven of tuplesSummingTo(evenSum, 8)) {
            for (const insideOdd of tuplesSummingTo(15 - evenSum, 8)) {
              const inside = rss14CharacterValue(insideOdd, insideEven, false);
              const pairValue = 1597 * outside.value + inside.value;
              if (pairValue <= 0 || pairValue > 2_203_851) continue;
              const checksumPortion = outside.checksumPortion + 4 * inside.checksumPortion;
              const checkValue = (17 * checksumPortion) % 79;
              const finder = rss14TryFinderPair(checkValue);
              if (!finder) continue;
              const modules = rss14Row(outsideOdd, outsideEven, insideOdd, insideEven, finder[0], finder[1]);
              const expected = rss14ConstructResult(pairValue, pairValue);
              return { modules, expected };
            }
          }
        }
      }
    }
  }
  throw new Error('failed to find an in-range RSS-14 fixture');
}

// --- RSS Expanded fixture oracle (bounded to the {A, A} two-pair sequence) --
const RSS_EXP_SYMBOL_WIDEST = [7, 5, 4, 3, 1];
const RSS_EXP_EVEN_TOTAL = [4, 20, 52, 104, 204];
const RSS_EXP_GSUM = [0, 348, 1388, 2948, 3988];
const RSS_EXP_WEIGHTS: Record<number, readonly number[]> = {
  0: [1, 3, 9, 27, 81, 32, 96, 77],
  1: [20, 60, 180, 118, 143, 7, 21, 63],
  2: [189, 145, 13, 39, 117, 140, 209, 205],
};

function rssExpCharacter(odd: readonly number[], even: readonly number[], weightRow: number | null): { value: number; checksumPortion: number } {
  const counts: number[] = [];
  for (let index = 0; index < 4; index += 1) counts.push(odd[index], even[index]);
  let oddSum = 0;
  let checksumPortion = 0;
  for (let index = 3; index >= 0; index -= 1) {
    if (weightRow !== null) {
      checksumPortion += odd[index] * RSS_EXP_WEIGHTS[weightRow][index * 2];
      checksumPortion += even[index] * RSS_EXP_WEIGHTS[weightRow][index * 2 + 1];
    }
    oddSum += odd[index];
  }
  const group = Math.trunc((13 - oddSum) / 2);
  const oddWidest = RSS_EXP_SYMBOL_WIDEST[group];
  const evenWidest = 9 - oddWidest;
  const vOdd = rssGroupValue(counts, 0, oddWidest, true);
  const vEven = rssGroupValue(counts, 1, evenWidest, false);
  return { value: vOdd * RSS_EXP_EVEN_TOTAL[group] + vEven + RSS_EXP_GSUM[group], checksumPortion };
}

function rssExpPairRuns(
  odd: readonly number[],
  even: readonly number[],
  rightOdd: readonly number[],
  rightEven: readonly number[],
  finder: readonly number[],
): number[] {
  return [
    odd[0], even[0], odd[1], even[1], odd[2], even[2], odd[3], even[3],
    ...finder,
    rightEven[3], rightOdd[3], rightEven[2], rightOdd[2],
    rightEven[1], rightOdd[1], rightEven[0], rightOdd[0],
  ];
}

const RSS_EXP_FINDER_A = [1, 8, 4, 1];

// All length-4 tuples with each element in [1, max] summing to `total`.
function tuplesSummingTo(total: number, max: number): number[][] {
  const results: number[][] = [];
  for (let a = 1; a <= max; a += 1) {
    for (let b = 1; b <= max; b += 1) {
      for (let c = 1; c <= max; c += 1) {
        const d = total - a - b - c;
        if (d >= 1 && d <= max) results.push([a, b, c, d]);
      }
    }
  }
  return results;
}

function rssExpChecksumMatches(
  checkCharValue: number,
  firstValue: { checksumPortion: number },
  secondLeft: { checksumPortion: number },
  secondRight: { checksumPortion: number },
): boolean {
  const checksum = (firstValue.checksumPortion + secondLeft.checksumPortion + secondRight.checksumPortion) % 211;
  return checksum === checkCharValue;
}

function rssExpNumericText(values: readonly number[]): string | undefined {
  if ((values[0] & 0x600) !== 0) return undefined;
  const totalBits = 36;
  const bitValue = (pos: number): number => {
    const charIndex = Math.trunc(pos / 12);
    if (charIndex < 0 || charIndex > 2) return 0;
    const bitIndex = pos - charIndex * 12;
    return (values[charIndex] >> (11 - bitIndex)) & 1;
  };
  let position = 5;
  let text = '';
  while (position + 7 <= totalBits) {
    let numeric = 0;
    for (let index = 0; index < 7; index += 1) numeric = numeric * 2 + bitValue(position + index);
    if (numeric < 8) return undefined;
    const digit1 = Math.trunc((numeric - 8) / 11);
    const digit2 = numeric - 8 - digit1 * 11;
    if (digit1 > 10 || digit2 > 10) return undefined;
    position += 7;
    if (digit1 === 10) return text || undefined;
    text += String(digit1);
    if (digit2 === 10) return text;
    text += String(digit2);
  }
  return text || undefined;
}

function rssExpCharacters(weightRow: number | null) {
  const candidates: Array<{
    odd: number[];
    even: number[];
    value: number;
    checksumPortion: number;
  }> = [];
  for (const oddSum of [4, 6, 8, 10, 12]) {
    const evenSum = 17 - oddSum;
    for (const odd of tuplesSummingTo(oddSum, 8)) {
      for (const even of tuplesSummingTo(evenSum, 8)) {
        candidates.push({ odd, even, ...rssExpCharacter(odd, even, weightRow) });
      }
    }
  }
  return candidates;
}

function buildRssExpandedFixture() {
  const firstCandidates = rssExpCharacters(0).filter(({ value }) => value === 8);
  const secondLeftCandidates = rssExpCharacters(1).filter(({ value }) => value === 258);
  const secondRightCandidates = rssExpCharacters(2).filter(({ value }) => value >= 64 && value <= 71);
  const checkCharCandidates = rssExpCharacters(null).filter(({ value }) => value <= 210);

  let found: {
    checkOdd: number[];
    checkEven: number[];
    firstOdd: number[];
    firstEven: number[];
    secondLeftOdd: number[];
    secondLeftEven: number[];
    secondRightOdd: number[];
    secondRightEven: number[];
    expected: string;
  } | undefined;
  outer: for (const firstCandidate of firstCandidates) {
    for (const secondLeft of secondLeftCandidates) {
      for (const secondRight of secondRightCandidates) {
        const expected = rssExpNumericText([firstCandidate.value, secondLeft.value, secondRight.value]);
        if (!expected) continue;
        for (const checkCandidate of checkCharCandidates) {
          if (!rssExpChecksumMatches(checkCandidate.value, firstCandidate, secondLeft, secondRight)) continue;
          found = {
            checkOdd: checkCandidate.odd,
            checkEven: checkCandidate.even,
            firstOdd: firstCandidate.odd,
            firstEven: firstCandidate.even,
            secondLeftOdd: secondLeft.odd,
            secondLeftEven: secondLeft.even,
            secondRightOdd: secondRight.odd,
            secondRightEven: secondRight.even,
            expected,
          };
          break outer;
        }
      }
    }
  }
  if (!found) throw new Error('failed to find a valid checksum-consistent RSS Expanded fixture');
  const {
    checkOdd, checkEven, firstOdd, firstEven,
    secondLeftOdd, secondLeftEven, secondRightOdd, secondRightEven, expected,
  } = found;

  const pair0Runs = rssExpPairRuns(checkOdd, checkEven, firstOdd, firstEven, RSS_EXP_FINDER_A);
  const pair1Runs = [
    secondLeftOdd[0], secondLeftEven[0], secondLeftOdd[1], secondLeftEven[1],
    secondLeftOdd[2], secondLeftEven[2], secondLeftOdd[3], secondLeftEven[3],
    ...[...RSS_EXP_FINDER_A].reverse(),
    secondRightEven[3], secondRightOdd[3], secondRightEven[2], secondRightOdd[2],
    secondRightEven[1], secondRightOdd[1], secondRightEven[0], secondRightOdd[0],
  ];

  const quiet = new Array(24).fill(0);
  const gap = new Array(24).fill(0);
  const modules = [...quiet, ...runsToBits(pair0Runs), 1, ...gap, ...runsToBits(pair1Runs), 1, ...quiet];
  return { modules, expected };
}
function renderMatrixLuma(width: number, modules: readonly number[], scale = 4, quiet = 4): { width: number; height: number; luma: number[] } {
  const side = (width + quiet * 2) * scale;
  const luma = new Array(side * side).fill(255);
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (modules[y * width + x] !== 1) continue;
      for (let py = 0; py < scale; py += 1) {
        for (let px = 0; px < scale; px += 1) {
          luma[(quiet * scale + y * scale + py) * side + quiet * scale + x * scale + px] = 0;
        }
      }
    }
  }
  return { width: side, height: side, luma };
}

function loadPackedModuleFixture(fileName: string, width: number): { width: number; height: number; modules: number[] } {
  const rows = readFileSync(resolve(scannerDirectory, 'fixtures', fileName), 'utf8').trim().split(/\r?\n/);
  const modules = rows.flatMap((row) => row.trim().split(/\s+/).flatMap((hex) => {
    const byte = Number.parseInt(hex, 16);
    return Array.from({ length: 8 }, (_, bit) => (byte >> (7 - bit)) & 1);
  }).slice(0, width));
  return { width, height: rows.length, modules };
}

function renderRectangularLuma(width: number, height: number, modules: readonly number[], scale = 4, quiet = 4): { width: number; height: number; luma: number[] } {
  const imageWidth = (width + quiet * 2) * scale;
  const imageHeight = (height + quiet * 2) * scale;
  const luma = new Array(imageWidth * imageHeight).fill(255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (modules[y * width + x] !== 1) continue;
      for (let py = 0; py < scale; py += 1) {
        for (let px = 0; px < scale; px += 1) {
          luma[(quiet * scale + y * scale + py) * imageWidth + quiet * scale + x * scale + px] = 0;
        }
      }
    }
  }
  return { width: imageWidth, height: imageHeight, luma };
}

function renderMaxicodeLuma(modules: readonly number[], scale = 4, quiet = 4): { width: number; height: number; luma: number[] } {
  const moduleWidth = 30;
  const moduleHeight = 33;
  const width = (moduleWidth + quiet * 2) * scale;
  const height = (moduleHeight + quiet * 2) * scale;
  const luma = new Array(width * height).fill(255);
  for (let y = 0; y < moduleHeight; y += 1) {
    const shift = y % 2 === 1 ? Math.floor(scale / 2) : 0;
    for (let x = 0; x < moduleWidth; x += 1) {
      if (modules[y * moduleWidth + x] !== 1) continue;
      for (let py = 0; py < scale; py += 1) {
        for (let px = 0; px < scale; px += 1) {
          luma[(quiet * scale + y * scale + py) * width + quiet * scale + x * scale + shift + px] = 0;
        }
      }
    }
  }
  return { width, height, luma };
}

describe('compiled scanner FWS foundation graph', () => {  let api: ScannerExports;

  beforeAll(async () => {
    const files: Record<string, string> = {};
    loadTree(scannerDirectory, files);
    const entry = resolve(scannerDirectory, 'scanner.fws');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const linkConfiguration = {
      projectRoots: [scannerDirectory],
      defaultLinkMode: 'static' as const,
      crossProjectLinkMode: 'static' as const,
      linkProfile: 'static' as const,
    };
    const graph = await resolveForgeWebScriptModuleGraph([entry], resolver, linkConfiguration);
    const service = createForgeWebScriptCompilerService();
    try {
      const artifact = service.compileGraph({
        graph: graph.graph,
        entryFileName: entry,
        compilerVersion: '0.1.0',
        linkConfiguration,
      });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      expect(errors, errors.map(({ message }) => message).join('\n')).toHaveLength(0);
      expect(artifact.wasm).toBeDefined();
      expect(artifact.manifest?.linkProfile).toBe('static');
      expect(artifact.manifest?.optimizationProfile).toBe('static-aggressive');
      api = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!)).exports as unknown as ScannerExports;
    } finally {
      service.dispose();
    }
  }, 180_000);

  it('links the foundation, 1D readers, and bounded 2D dispatch layer', () => {
    const source = readFileSync(resolve(scannerDirectory, 'scanner.fws'), 'utf8');
    expect(source).toContain('import "./foundation.fws" as foundation;');
    expect(source).toContain('import "./common.fws" as c;');
    expect(source).toContain('import "./oned.fws" as oned;');
    expect(source).toContain('import "./image.fws" as image;');
    expect(source).toContain('import "./locate-matrix.fws" as matrix_locator;');
    expect(source).toContain('import "./pdf417.fws" as pdf417;');
    expect(source).toContain('import "./maxicode.fws" as maxicode;');
    expect(source).toContain('locate_datamatrix_modules');
    expect(source).toContain('locate_aztec_modules');
    expect(source).toContain('locate_pdf417_modules');
    expect(source).toContain('locate_maxicode_modules');
    expect(source).not.toContain('import "./databar.fws"');
    expect(source).toContain('sc_foundation_version');
  });
  it('decodes clean Data Matrix and compact Aztec symbols through the linked 2D entry', () => {
    const cases = [
      { symbology: 'datamatrix' as const, format: 5 },
      { symbology: 'aztec' as const, format: 0 },
    ];
    for (const { symbology, format } of cases) {
      const matrix = encodeMatrix(symbology, 'HELLO');
      const image = renderMatrixLuma(matrix.width, matrix.modules);
      const result = api.scan_and_decode(
        image.width,
        image.height,
        writeArray(api, image.luma),
        writeArray(api, new Array(image.width * image.height).fill(0)),
        writeArray(api, new Array(image.width * image.height).fill(0)),
        writeArray(api, new Array(image.width * image.height + 1).fill(0)),
        writeArray(api, new Array(16).fill(0)),
      );
      expect(readString(api, result)).toBe(`D0${format}072069076076079`);
    }

    const invertedMatrix = encodeMatrix('datamatrix', 'HELLO');
    const invertedImage = renderMatrixLuma(invertedMatrix.width, invertedMatrix.modules);
    const invertedResult = api.scan_and_decode(
      invertedImage.width,
      invertedImage.height,
      writeArray(api, invertedImage.luma.map((value) => 255 - value)),
      writeArray(api, new Array(invertedImage.width * invertedImage.height).fill(0)),
      writeArray(api, new Array(invertedImage.width * invertedImage.height).fill(0)),
      writeArray(api, new Array(invertedImage.width * invertedImage.height + 1).fill(0)),
      writeArray(api, new Array(16).fill(0)),
    );
    expect(readString(api, invertedResult)).toBe('D05072069076076079');

  });

  it('decodes packed PDF417 and MaxiCode fixtures through the linked image entry', () => {
    const pdf = loadPackedModuleFixture('pdf417-hello.modules.txt', 120);
    const pdfImage = renderRectangularLuma(pdf.width, pdf.height, pdf.modules);
    const pdfResult = api.scan_and_decode(
      pdfImage.width,
      pdfImage.height,
      writeArray(api, pdfImage.luma),
      writeArray(api, new Array(pdfImage.width * pdfImage.height).fill(0)),
      writeArray(api, new Array(pdfImage.width * pdfImage.height).fill(0)),
      writeArray(api, new Array(pdfImage.width * pdfImage.height + 1).fill(0)),
      writeArray(api, new Array(16).fill(0)),
    );
    expect(readString(api, pdfResult)).toBe('D10ZXing PDF417 text compaction corpus 0123456789');

    const maxi = loadPackedModuleFixture('maxicode-hello.modules.txt', 30);
    const maxiImage = renderMaxicodeLuma(maxi.modules);
    const maxiResult = api.scan_and_decode(
      maxiImage.width,
      maxiImage.height,
      writeArray(api, maxiImage.luma),
      writeArray(api, new Array(maxiImage.width * maxiImage.height).fill(0)),
      writeArray(api, new Array(maxiImage.width * maxiImage.height).fill(0)),
      writeArray(api, new Array(maxiImage.width * maxiImage.height + 1).fill(0)),
      writeArray(api, new Array(16).fill(0)),
    );
    expect(readString(api, maxiResult)).toBe('D09HELLO');
  });

  it('fails closed for a blank 2D image instead of returning a fallback payload', () => {
    const image = { width: 128, height: 128, luma: new Array(128 * 128).fill(255) };
    const result = api.scan_and_decode(
      image.width,
      image.height,
      writeArray(api, image.luma),
      writeArray(api, new Array(image.width * image.height).fill(0)),
      writeArray(api, new Array(image.width * image.height).fill(0)),
      writeArray(api, new Array(image.width * image.height + 1).fill(0)),
      writeArray(api, new Array(16).fill(0)),
    );
    expect(readString(api, result)).toBe('');
  });

  it('exposes the foundation version and checked dimension contract', () => {
    expect(api.sc_foundation_version()).toBe(1);
    expect(api.sc_foundation_validate_dimensions(32, 32, 32)).toBe(2);
    expect(api.sc_foundation_validate_dimensions(0, 32, 32)).toBe(-1);
    expect(api.sc_foundation_validate_dimensions(32, 32, 31)).toBe(-1);
    expect(api.sc_foundation_validate_dimensions(4097, 1, 4097)).toBe(-1);
  });

  it('runs deterministic GF256 and packed-container operations through the scanner artifact', () => {
    expect(api.sc_foundation_gf256(0, 0x83)).toBe(0);
    expect(api.sc_foundation_gf256(1, 1)).toBe(1);

    const bits = api.fws_alloc(8);
    const bitArrayState = writeArray(api, [0, 0, 0, 0]);
    expect(api.sc_foundation_bit_array(bits, 8, bitArrayState, 1, 0)).toBe(1);
    expect(api.sc_foundation_bit_array(bits, 8, bitArrayState, 0, 8)).toBe(-1);

    const matrixBits = api.fws_alloc(4);
    const matrixState = writeArray(api, [0, 0, 0, 0, 0, 0]);
    expect(api.sc_foundation_bit_matrix(matrixBits, 2, 2, matrixState, 1, 1, 1)).toBe(1);
    expect(api.sc_foundation_bit_matrix(matrixBits, 2, 2, matrixState, 2, 1, 1)).toBe(-1);
  });

  it('decodes EAN-8 and rejects a checksum mutation through the linked reader', () => {
    const modules = ean8Modules('55123457');
    const valid = writeArray(api, modules);
    expect(modules).toHaveLength(67);
    expect(readString(api, api.sc_oned_decode_ean8(valid))).toBe('55123457');

    const invalidBits = ean8Modules('55123457');
    invalidBits[63] = invalidBits[63] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_ean8(writeArray(api, invalidBits)))).toBe('');
  });

  it('decodes EAN-13 with configured possible-format ordering and reuses the reader', () => {
    const row = writeArray(api, ean13Modules('5901234123457'));
    const first = readString(api, api.sc_oned_decode_ean13(row));
    const second = readString(api, api.sc_oned_decode_with_hint(row, 7));
    expect(first).toBe('5901234123457');
    expect(second).toBe(first);
    expect(readString(api, api.sc_oned_decode_with_hint(row, 6))).toBe('');
  });

  it('normalizes a zero-prefixed EAN-13 symbol to UPC-A', () => {
    const row = writeArray(api, ean13Modules('0042100005264'));
    expect(readString(api, api.sc_oned_decode_upca(row))).toBe('042100005264');
  });

  it('decodes a one-row luminance image through the scanner entry point', () => {
    const bits = ean13Modules('5901234123457');
    const luma = writeArray(api, bits.map((bit) => (bit === 1 ? 0 : 255)));
    const modules = writeArray(api, new Array(bits.length).fill(0));
    const result = api.scan_and_decode(
      bits.length,
      1,
      luma,
      modules,
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('5901234123457');
  });

  it('decodes a scaled, padded EAN-13 row through the scanner entry point', () => {
    const bits = scaledPaddedModules(ean13Modules('5901234123457'), 3, 8);
    const luma = writeArray(api, bits.map((bit) => (bit === 1 ? 0 : 255)));
    const modules = writeArray(api, new Array(bits.length).fill(0));
    const result = api.scan_and_decode(
      bits.length,
      1,
      luma,
      modules,
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('5901234123457');
    expect(readString(api, api.sc_oned_decode_ean13(writeArray(api, bits)))).toBe('5901234123457');
  });

  it('decodes UPC-E with validated parity and expanded checksum', () => {
    const row = writeArray(api, upceModules('01234505'));
    expect(readString(api, api.sc_oned_decode_upce(row))).toBe('01234505');

    const invalid = upceModules('01234505');
    invalid[invalid.length - 1] = invalid[invalid.length - 1] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_upce(writeArray(api, invalid)))).toBe('');
  });

  it('dispatches UPC-E through the scanner entry and configured format hint', () => {
    const modules = upceModules('01234505');
    expect(readString(api, api.sc_oned_decode_with_hint(writeArray(api, modules), 15))).toBe('01234505');

    const scaled = scaledPaddedModules(modules, 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      writeArray(api, new Array(scaled.length).fill(0)),
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('01234505');
  });

  it('decodes validated EAN/UPC two- and five-digit extensions', () => {
    const extension2 = extensionModules('00', 'LL');
    const extension5 = extensionModules('00000', 'GGLLL');
    const extension2Pointer = writeArray(api, extension2);
    expect(readString(api, api.sc_oned_decode_extension2(extension2Pointer))).toBe('00');
    expect(readString(api, api.sc_oned_decode_extension5(writeArray(api, extension5)))).toBe('00000');

    const invalid = extension5.slice();
    invalid[invalid.length - 1] = invalid[invalid.length - 1] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_extension5(writeArray(api, invalid)))).toBe('');

    const invalidParity = extensionModules('00000', 'LLLLL');
    expect(readString(api, api.sc_oned_decode_extension5(writeArray(api, invalidParity)))).toBe('');
  });

  it('decodes Code 39 vectors through the linked graph and rejects missing framing', () => {
    const code39 = code39Modules('ABC');
    const direct = writeArray(api, code39);
    expect(readString(api, api.sc_oned_decode_code39(direct))).toBe('ABC');

    const scaled = scaledPaddedModules(code39Modules('ABC'), 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const modules = writeArray(api, new Array(scaled.length).fill(0));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      modules,
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('ABC');

    const invalid = code39Modules('ABC');
    invalid[8] = 0;
    expect(readString(api, api.sc_oned_decode_code39(writeArray(api, invalid)))).toBe('');
  });

  it('decodes even-length ITF vectors through the linked graph and rejects bad structure', () => {
    const itf = itfModules('123456');
    const direct = writeArray(api, itf);
    expect(readString(api, api.sc_oned_decode_itf(direct))).toBe('123456');

    const scaled = scaledPaddedModules(itfModules('123456'), 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const modules = writeArray(api, new Array(scaled.length).fill(0));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      modules,
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('123456');

    const invalid = itfModules('123456');
    invalid[8] = 0;
    expect(readString(api, api.sc_oned_decode_itf(writeArray(api, invalid)))).toBe('');
  });

  it('decodes Codabar through direct, scaled, and filtered paths', () => {
    const modules = codabarModules('1234');
    expect(readString(api, api.sc_oned_decode_codabar(writeArray(api, modules)))).toBe('1234');
    expect(readString(api, api.sc_oned_decode_with_hint(writeArray(api, modules), 1))).toBe('1234');

    const scaled = scaledPaddedModules(modules, 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      writeArray(api, new Array(scaled.length).fill(0)),
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('1234');

    const invalid = modules.slice();
    invalid[invalid.length - 12] = invalid[invalid.length - 12] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_codabar(writeArray(api, invalid)))).toBe('');
  });

  it('decodes Code 93 with C/K checks and rejects a mutated check symbol', () => {
    const modules = code93Modules('ABC');
    expect(readString(api, api.sc_oned_decode_code93(writeArray(api, modules)))).toBe('ABC');

    const scaled = scaledPaddedModules(modules, 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      writeArray(api, new Array(scaled.length).fill(0)),
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('ABC');

    const invalid = modules.slice();
    invalid[invalid.length - 18] = invalid[invalid.length - 18] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_code93(writeArray(api, invalid)))).toBe('');
  });

  it('decodes Code 128 Code B with checksum and rejects a mutated data bar', () => {
    const modules = code128Modules('AB');
    expect(readString(api, api.sc_oned_decode_code128(writeArray(api, modules)))).toBe('AB');
    expect(readString(api, api.sc_oned_decode_with_hint(writeArray(api, modules), 4))).toBe('AB');

    const scaled = scaledPaddedModules(modules, 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      writeArray(api, new Array(scaled.length).fill(0)),
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain('AB');

    const invalid = modules.slice();
    invalid[24] = invalid[24] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_code128(writeArray(api, invalid)))).toBe('');
  });

  it('decodes RSS-14 through direct, scaled, and dispatch-hint paths and rejects a mutated symbol', () => {
    const { modules, expected } = buildRss14Fixture();
    expect(readString(api, api.sc_oned_decode_rss14(writeArray(api, modules)))).toBe(expected);
    expect(readString(api, api.sc_oned_decode_with_hint(writeArray(api, modules), 12))).toBe(expected);

    const scaled = scaledPaddedModules(modules, 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      writeArray(api, new Array(scaled.length).fill(0)),
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain(expected);

    const invalid = modules.slice();
    invalid[invalid.length - 30] = invalid[invalid.length - 30] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_rss14(writeArray(api, invalid)))).toBe('');
  });

  it('decodes a bounded two-pair RSS Expanded symbol and rejects a mutated checksum character', () => {
    const { modules, expected } = buildRssExpandedFixture();
    expect(expected.length).toBeGreaterThan(0);
    expect(readString(api, api.sc_oned_decode_rss_expanded(writeArray(api, modules)))).toBe(expected);
    expect(readString(api, api.sc_oned_decode_with_hint(writeArray(api, modules), 13))).toBe(expected);

    const scaled = scaledPaddedModules(modules, 2, 8);
    const luma = writeArray(api, scaled.map((bit) => (bit === 1 ? 0 : 255)));
    const result = api.scan_and_decode(
      scaled.length,
      1,
      luma,
      writeArray(api, new Array(scaled.length).fill(0)),
      writeArray(api, []),
      writeArray(api, []),
      writeArray(api, []),
    );
    expect(readString(api, result)).toContain(expected);

    const invalid = modules.slice();
    invalid[30] = invalid[30] === 0 ? 1 : 0;
    expect(readString(api, api.sc_oned_decode_rss_expanded(writeArray(api, invalid)))).toBe('');
  });

  it('extracts a luminance row and applies bounded variance/quiet-zone checks', () => {
    const bits = ean8Modules('55123457');
    const luma = writeArray(api, bits.map((bit) => (bit === 1 ? 0 : 255)));
    const modules = writeArray(api, new Array(bits.length).fill(0));
    expect(api.sc_oned_extract_row(luma, bits.length, 1, 0, 128, modules)).toBe(1);
    expect(api.sc_oned_quiet_zone(writeArray(api, [0, 0, 1, 0, 0]), 2, 1, 2)).toBe(1);
    expect(api.sc_oned_quiet_zone(writeArray(api, [0, 1, 0]), 1, 1, 2)).toBe(0);
    expect(api.sc_oned_pattern_variance(writeArray(api, [2, 3, 2]), writeArray(api, [2, 3, 2]), 3)).toBe(0);
    expect(api.sc_oned_pattern_variance(writeArray(api, [0, 3, 2]), writeArray(api, [2, 3, 2]), 3)).toBe(-1);
  });

  it('validates bounded outcome records through the linked ABI', () => {
    expect(api.sc_foundation_validate_outcome(writeArray(api, new Array(16).fill(0)))).toBe(2);
    expect(api.sc_foundation_validate_outcome(writeArray(api, new Array(15).fill(0)))).toBe(-1);

    const invalid = new Array(16).fill(0);
    invalid[0] = 3;
    expect(api.sc_foundation_validate_outcome(writeArray(api, invalid))).toBe(-1);
  });

  it('fails closed for compatibility scan calls without reading caller buffers', () => {
    const empty = 0;
    expect(readString(api, api.scan_and_decode(0, 1, empty, empty, empty, empty, empty))).toBe('');
    expect(readString(api, api.scan_and_decode_roi(32, 32, empty, 31, 31, 2, 2, empty, empty, empty, empty))).toBe('');
    expect(readString(api, api.scan_and_decode_bytes(32, 32, 0, empty, empty, empty, empty))).toBe('');
  });
});