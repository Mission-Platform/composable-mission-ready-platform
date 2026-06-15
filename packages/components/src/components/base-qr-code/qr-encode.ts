/**
 * Self-contained QR Code encoder for {@link BaseQrCode}.
 *
 * A dependency-free TypeScript implementation that encodes an arbitrary UTF-8
 * string into a square matrix of dark / light modules. It encodes the payload
 * as a single byte-mode segment, selects the smallest QR version that fits the
 * data at the requested error-correction level, and chooses the data mask with
 * the lowest penalty score per the QR specification (ISO/IEC 18004).
 *
 * The algorithm is a port of Project Nayuki's reference QR Code generator,
 * which is released into the public domain. It deliberately supports only byte
 * mode (which can represent any text/URL) to keep the surface area small.
 */

/** Error-correction level: higher levels tolerate more damage but hold less data. */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** The result of {@link encodeQr}: a square grid of dark (`true`) modules. */
export interface QrMatrix {
  /** Side length of the matrix, in modules (excluding any quiet-zone margin). */
  size: number;
  /** `modules[y][x]` — `true` when the module is dark. */
  modules: boolean[][];
  /** The selected QR version (`1`–`40`). */
  version: number;
}

const MIN_VERSION = 1;
const MAX_VERSION = 40;

/** Ordinal + format bits for each error-correction level. */
const ECC: Record<QrErrorCorrection, { ordinal: number; formatBits: number }> = {
  L: { ordinal: 0, formatBits: 1 },
  M: { ordinal: 1, formatBits: 0 },
  Q: { ordinal: 2, formatBits: 3 },
  H: { ordinal: 3, formatBits: 2 },
};

// Number of error-correction codewords per block, indexed [ecc ordinal][version].
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  // 0 is an unused padding entry (versions are 1-based).
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
];

// Number of error-correction blocks, indexed [ecc ordinal][version].
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19,
    19, 20, 21, 22, 24, 25,
  ],
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31,
    33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43,
    45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48,
    51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
  ],
];

/** Number of bits in a byte-mode character-count field for the given version. */
function byteModeCharCountBits(version: number): number {
  if (version <= 9) return 8;
  return 16;
}

/** Total number of data + EC codewords (8-bit groups) that a version holds. */
function getNumberRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numberAlign = Math.floor(version / 7) + 2;
    result -= (25 * numberAlign - 10) * numberAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Number of 8-bit data codewords (excluding EC codewords) for a version + ECC. */
function getNumberDataCodewords(version: number, ecc: QrErrorCorrection): number {
  const ord = ECC[ecc].ordinal;
  return (
    Math.floor(getNumberRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ord][version] * NUM_ERROR_CORRECTION_BLOCKS[ord][version]
  );
}

/** Appends the `len` low bits of `val` (MSB-first) to the bit array. */
function appendBits(value: number, length: number, bits: number[]): void {
  for (let index = length - 1; index >= 0; index--) {
    bits.push((value >>> index) & 1);
  }
}

// ── Reed-Solomon error correction over GF(256) ───────────────────────────────

/** Multiplies two field elements modulo the QR generator polynomial 0x11D. */
function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let index = 7; index >= 0; index--) {
    z = (z << 1) ^ ((z >>> 7) * 0x1_1d);
    z ^= ((y >>> index) & 1) * x;
  }
  return z & 0xff;
}

/** Computes the divisor (generator) polynomial of the given degree. */
function reedSolomonComputeDivisor(degree: number): number[] {
  const result: number[] = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;
  let root = 1;
  for (let index = 0; index < degree; index++) {
    for (let index = 0; index < result.length; index++) {
      result[index] = reedSolomonMultiply(result[index], root);
      if (index + 1 < result.length) result[index] ^= result[index + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

/** Computes the Reed-Solomon remainder of `data` divided by `divisor`. */
function reedSolomonComputeRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result: number[] = Array.from({ length: divisor.length }, () => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let index = 0; index < result.length; index++) {
      result[index] ^= reedSolomonMultiply(divisor[index], factor);
    }
  }
  return result;
}

/** Splits the data codewords into blocks, appends EC codewords, and interleaves. */
function addEccAndInterleave(data: number[], version: number, ecc: QrErrorCorrection): number[] {
  const ord = ECC[ecc].ordinal;
  const numberBlocks = NUM_ERROR_CORRECTION_BLOCKS[ord][version];
  const blockEccLength = ECC_CODEWORDS_PER_BLOCK[ord][version];
  const rawCodewords = Math.floor(getNumberRawDataModules(version) / 8);
  const numberShortBlocks = numberBlocks - (rawCodewords % numberBlocks);
  const shortBlockLength = Math.floor(rawCodewords / numberBlocks);

  const blocks: number[][] = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLength);
  for (let index = 0, k = 0; index < numberBlocks; index++) {
    const datLength = shortBlockLength - blockEccLength + (index < numberShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + datLength);
    k += datLength;
    const block = [...dat];
    const eccCodewords = reedSolomonComputeRemainder(dat, rsDiv);
    if (index < numberShortBlocks) block.push(0);
    block.push(...eccCodewords);
    blocks.push(block);
  }

  const result: number[] = [];
  for (let index = 0; index < blocks[0].length; index++) {
    for (const [index_, block] of blocks.entries()) {
      // Skip the padding cell that short blocks have at index `shortBlockLen - blockEccLen`.
      if (index !== shortBlockLength - blockEccLength || index_ >= numberShortBlocks) {
        result.push(block[index]);
      }
    }
  }
  return result;
}

// ── Matrix builder ───────────────────────────────────────────────────────────

class QrBuilder {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly version: number;
  private readonly ecc: QrErrorCorrection;
  private readonly isFunction: boolean[][];

  constructor(version: number, ecc: QrErrorCorrection) {
    this.version = version;
    this.ecc = ecc;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => false));
    this.isFunction = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => false));
  }

  build(dataCodewords: number[]): boolean[][] {
    this.drawFunctionPatterns();
    const allCodewords = addEccAndInterleave(dataCodewords, this.version, this.ecc);
    this.drawCodewords(allCodewords);

    // Pick the mask with the lowest penalty.
    let minPenalty = Number.MAX_SAFE_INTEGER;
    let bestMask = 0;
    for (let mask = 0; mask < 8; mask++) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      const penalty = this.getPenaltyScore();
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestMask = mask;
      }
      this.applyMask(mask); // Undo (XOR is its own inverse).
    }
    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
    return this.modules;
  }

  private setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  private drawFunctionPatterns(): void {
    for (let index = 0; index < this.size; index++) {
      this.setFunctionModule(6, index, index % 2 === 0);
      this.setFunctionModule(index, 6, index % 2 === 0);
    }

    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const alignPositions = this.getAlignmentPatternPositions();
    const numberAlign = alignPositions.length;
    for (let index = 0; index < numberAlign; index++) {
      for (let index_ = 0; index_ < numberAlign; index_++) {
        // Skip the three finder-pattern corners.
        if (
          !(
            (index === 0 && index_ === 0) ||
            (index === 0 && index_ === numberAlign - 1) ||
            (index === numberAlign - 1 && index_ === 0)
          )
        ) {
          this.drawAlignmentPattern(alignPositions[index], alignPositions[index_]);
        }
      }
    }

    this.drawFormatBits(0);
    this.drawVersion();
  }

  private drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distribution = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, distribution !== 2 && distribution !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private getAlignmentPatternPositions(): number[] {
    if (this.version === 1) return [];
    const numberAlign = Math.floor(this.version / 7) + 2;
    const step = Math.floor((this.version * 8 + numberAlign * 3 + 5) / (numberAlign * 4 - 4)) * 2;
    const result: number[] = [6];
    for (let pos = this.size - 7; result.length < numberAlign; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  private drawFormatBits(mask: number): void {
    const data = (ECC[this.ecc].formatBits << 3) | mask;
    let rem = data;
    for (let index = 0; index < 10; index++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x5_37);
    }
    const bits = ((data << 10) | rem) ^ 0x54_12;

    for (let index = 0; index <= 5; index++) this.setFunctionModule(8, index, getBit(bits, index));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let index = 9; index < 15; index++) this.setFunctionModule(14 - index, 8, getBit(bits, index));

    for (let index = 0; index < 8; index++) this.setFunctionModule(this.size - 1 - index, 8, getBit(bits, index));
    for (let index = 8; index < 15; index++) this.setFunctionModule(8, this.size - 15 + index, getBit(bits, index));
    this.setFunctionModule(8, this.size - 8, true);
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let index = 0; index < 12; index++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f_25);
    }
    const bits = (this.version << 12) | rem;
    for (let index = 0; index < 18; index++) {
      const bit = getBit(bits, index);
      const a = this.size - 11 + (index % 3);
      const b = Math.floor(index / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  private drawCodewords(data: number[]): void {
    let index = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let index_ = 0; index_ < 2; index_++) {
          const x = right - index_;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && index < data.length * 8) {
            this.modules[y][x] = getBit(data[index >>> 3], 7 - (index & 7));
            index++;
          }
        }
      }
    }
  }

  private applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0: {
            invert = (x + y) % 2 === 0;
            break;
          }
          case 1: {
            invert = y % 2 === 0;
            break;
          }
          case 2: {
            invert = x % 3 === 0;
            break;
          }
          case 3: {
            invert = (x + y) % 3 === 0;
            break;
          }
          case 4: {
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          }
          case 5: {
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          }
          case 6: {
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          }
          case 7: {
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          }
          default: {
            invert = false;
          }
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  private getPenaltyScore(): number {
    let result = 0;
    const size = this.size;
    const modules = this.modules;

    // Adjacent modules in rows / columns with the same colour.
    for (let y = 0; y < size; y++) {
      let runColor = false;
      let runX = 0;
      const runHistory: number[] = Array.from({ length: 7 }, () => 0);
      for (let x = 0; x < size; x++) {
        if (modules[y][x] === runColor) {
          runX++;
          if (runX === 5) result += 3;
          else if (runX > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runX, runHistory);
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * 40;
          runColor = modules[y][x];
          runX = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * 40;
    }
    for (let x = 0; x < size; x++) {
      let runColor = false;
      let runY = 0;
      const runHistory: number[] = Array.from({ length: 7 }, () => 0);
      for (let y = 0; y < size; y++) {
        if (modules[y][x] === runColor) {
          runY++;
          if (runY === 5) result += 3;
          else if (runY > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runY, runHistory);
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * 40;
          runColor = modules[y][x];
          runY = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * 40;
    }

    // 2x2 blocks of the same colour.
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = modules[y][x];
        if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) {
          result += 3;
        }
      }
    }

    // Balance of dark and light modules.
    let dark = 0;
    for (const row of modules) for (const cell of row) if (cell) dark++;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * 10;
    return result;
  }

  private finderPenaltyCountPatterns(runHistory: readonly number[]): number {
    const n = runHistory[1];
    const core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 && runHistory[4] === n && runHistory[5] === n;
    return (
      (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
      (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0)
    );
  }

  private finderPenaltyTerminateAndCount(currentColor: boolean, currentRun: number, runHistory: number[]): number {
    let run = currentRun;
    if (currentColor) {
      this.finderPenaltyAddHistory(run, runHistory);
      run = 0;
    }
    run += this.size;
    this.finderPenaltyAddHistory(run, runHistory);
    return this.finderPenaltyCountPatterns(runHistory);
  }

  private finderPenaltyAddHistory(currentRunLength: number, runHistory: number[]): void {
    if (runHistory[0] === 0) currentRunLength += this.size; // Add light border to first run.
    runHistory.pop();
    runHistory.unshift(currentRunLength);
  }
}

function getBit(x: number, index: number): boolean {
  return ((x >>> index) & 1) !== 0;
}

/** UTF-8 encodes a string into a byte array. */
function toUtf8(text: string): number[] {
  return [...new TextEncoder().encode(text)];
}

/**
 * Encodes `text` into a QR Code matrix at the given error-correction level.
 *
 * @throws if the text is too long to fit in the largest (version 40) QR Code at
 *   the chosen error-correction level.
 */
export function encodeQr(text: string, errorCorrection: QrErrorCorrection = 'M'): QrMatrix {
  const bytes = toUtf8(text);

  // Find the smallest version that fits a single byte-mode segment.
  let version = MIN_VERSION;
  let dataCapacityBits = 0;
  for (; version <= MAX_VERSION; version++) {
    dataCapacityBits = getNumberDataCodewords(version, errorCorrection) * 8;
    const usedBits = 4 + byteModeCharCountBits(version) + bytes.length * 8;
    if (usedBits <= dataCapacityBits) break;
    if (version === MAX_VERSION) {
      throw new RangeError('Data too long for a QR Code at the chosen error-correction level');
    }
  }

  const bits: number[] = [];
  appendBits(0x4, 4, bits); // Byte-mode indicator.
  appendBits(bytes.length, byteModeCharCountBits(version), bits);
  for (const b of bytes) appendBits(b, 8, bits);

  // Terminator + bit/byte padding.
  appendBits(0, Math.min(4, dataCapacityBits - bits.length), bits);
  appendBits(0, (8 - (bits.length % 8)) % 8, bits);

  // Pad bytes alternate 0xEC / 0x11.
  for (let pad = 0xec; bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
    appendBits(pad, 8, bits);
  }

  // Pack bits into codewords.
  const dataCodewords: number[] = Array.from({ length: bits.length >> 3 }, () => 0);
  for (const [index, bit] of bits.entries()) {
    dataCodewords[index >>> 3] |= bit << (7 - (index & 7));
  }

  const builder = new QrBuilder(version, errorCorrection);
  const modules = builder.build(dataCodewords);
  return { size: builder.size, modules, version };
}
