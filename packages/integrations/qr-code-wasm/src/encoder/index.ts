// Public, typed wrapper around the package-local Flint QR encoder.
//
// The Flint graph uses byte mode for arbitrary UTF-8 strings, selects the
// smallest fitting symbol, and chooses the data mask with the lowest penalty.

import { load as loadQrCompactEncoder, loadSync as loadQrCompactEncoderSync } from '../fws/qr-compact-encoder.flint';
import { load as loadQrEncoder, loadSync as loadQrEncoderSync } from '../fws/qr-encoder.flint';

import type { CompactQrMatrix, QrErrorCorrection, QrMatrix } from '../types';

/** Ordinal for each error-correction level, matching the Flint encoder contract. */
const ECC_ORDINAL: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Validates that the encoder produced non-empty QR code output. */
function assertFitsQrLimits(version: number, size: number, moduleCount: number): void {
  if (version === 0 || size === 0 || moduleCount === 0) {
    throw new RangeError('Data too long for a QR Code at the chosen error-correction level');
  }
}

/** Validates that the QR Code metadata fields contain positive integers. */
function assertValidQrMetrics(version: number, size: number): void {
  if (!Number.isInteger(version) || !Number.isInteger(size) || size <= 0) {
    throw new RangeError('Malformed QR Code encoder result');
  }
}

/** Validates that the encoder result has non-zero version, size, and word list. */
function assertValidQrDimensions(encoded: { version: number; size: number; modules: readonly number[] }): void {
  assertFitsQrLimits(encoded.version, encoded.size, encoded.modules.length);
  assertValidQrMetrics(encoded.version, encoded.size);
  if (!Array.isArray(encoded.modules)) {
    throw new RangeError('Malformed QR Code encoder result');
  }
}

/** Checks whether a word is a valid unsigned 32-bit integer. */
function isValidWord32(word: number): boolean {
  return Number.isInteger(word) && word >= 0 && word <= 0xffffffff;
}

/** Validates that module words match expected array length and unsigned 32-bit integer ranges. */
function assertValidModuleWords(size: number, moduleWords: readonly number[]): void {
  const words = Math.ceil((size * size) / 32);
  if (moduleWords.length !== words || moduleWords.some((word) => !isValidWord32(word))) {
    throw new RangeError('Malformed QR Code encoder result');
  }
}

/** Unpacks 32-bit module words into a 2D boolean grid. */
function unpackModuleGrid(size: number, moduleWords: readonly number[]): boolean[][] {
  const modules: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = new Array<boolean>(size);
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const word = moduleWords[Math.floor(index / 32)] ?? 0;
      row[x] = ((word >>> (index % 32)) & 1) === 1;
    }
    modules.push(row);
  }
  return modules;
}

/** Read the Flint encoder's fixed-layout record and its module words. */
function unpack(encoded: { version: number; size: number; modules: readonly number[] }): QrMatrix {
  assertValidQrDimensions(encoded);
  const { version, size, modules: moduleWords } = encoded;
  assertValidModuleWords(size, moduleWords);
  return { size, modules: unpackModuleGrid(size, moduleWords), version };
}

/**
 * Encode `text` into a QR Code matrix at the given error-correction level,
 * instantiating the WebAssembly encoder synchronously on first use.
 *
 * @throws {RangeError} if the text is too long to fit in the largest (version
 *   40) QR Code at the chosen error-correction level.
 */
export function encodeQr(text: string, errorCorrection: QrErrorCorrection = 'M'): QrMatrix {
  const encoder = loadQrEncoderSync();
  return unpack(encoder.encode_qr(ECC_ORDINAL[errorCorrection], text));
}

/**
 * Encode `text` into a QR Code matrix at the given error-correction level,
 * instantiating the WebAssembly encoder asynchronously on first use.
 *
 * @throws {RangeError} if the text is too long to fit in the largest (version
 *   40) QR Code at the chosen error-correction level.
 */
export async function encodeQrAsync(text: string, errorCorrection: QrErrorCorrection = 'M'): Promise<QrMatrix> {
  const encoder = await loadQrEncoder();
  return unpack(encoder.encode_qr(ECC_ORDINAL[errorCorrection], text));
}

/** Locates comma delimiters separating width, height, and module bits. */
function findCompactSeparators(packed: string, kind: string): { first: number; second: number } {
  const first = packed.indexOf(',');
  const second = packed.indexOf(',', first + 1);
  if (first <= 0 || second <= first) {
    throw new RangeError(`Malformed ${kind} encoder result`);
  }
  return { first, second };
}

/** Validates that a parsed dimension is a positive integer. */
function isPositiveDimension(dimension: number): boolean {
  return Number.isInteger(dimension) && dimension > 0;
}

/** Parses and validates the numeric width and height dimensions of a compact result. */
function parseCompactDimensions(
  packed: string,
  first: number,
  second: number,
  kind: string,
): { width: number; height: number } {
  const width = Number.parseInt(packed.slice(0, first), 10);
  const height = Number.parseInt(packed.slice(first + 1, second), 10);
  if (!isPositiveDimension(width) || !isPositiveDimension(height)) {
    throw new RangeError(`Malformed ${kind} encoder result`);
  }
  return { width, height };
}

/** Asserts that the module bit stream length matches the expected width * height area. */
function assertCompactBitLength(bits: string, width: number, height: number, kind: string): void {
  if (bits.length !== width * height) {
    throw new RangeError(`Malformed ${kind} encoder result`);
  }
}

/** Parses and validates the header and bit string of a compact encoder result. */
function parseCompactHeader(packed: string, kind: string): { width: number; height: number; bits: string } {
  const { first, second } = findCompactSeparators(packed, kind);
  const { width, height } = parseCompactDimensions(packed, first, second, kind);
  const bits = packed.slice(second + 1);
  assertCompactBitLength(bits, width, height, kind);
  return { width, height, bits };
}

/** Unpacks a row-major bit string into a 2D boolean grid. */
function unpackCompactGrid(width: number, height: number, bits: string): boolean[][] {
  const modules: boolean[][] = [];
  let offset = 0;
  for (let y = 0; y < height; y++) {
    const row: boolean[] = new Array<boolean>(width);
    for (let x = 0; x < width; x++) {
      row[x] = bits[offset++] === '1';
    }
    modules.push(row);
  }
  return modules;
}

/**
 * Unpack a compact Flint encoder result (`width,height,row-major-bits`) into a
 * {@link CompactQrMatrix}.
 */
function unpackCompact(packed: string, kind: string): CompactQrMatrix {
  if (packed.length === 0) {
    throw new RangeError(`Data too long for a ${kind} at the chosen error-correction level`);
  }
  const { width, height, bits } = parseCompactHeader(packed, kind);
  return { width, height, modules: unpackCompactGrid(width, height, bits) };
}

/**
 * Encode `text` into a **Micro QR Code** matrix (ISO/IEC 18004), instantiating
 * the WebAssembly encoder synchronously on first use.
 *
 * The smallest fitting version (M1–M4, 11×11 to 17×17) is chosen automatically.
 * Micro QR supports only error-correction levels `L`, `M` and `Q`; requesting
 * `H` always throws (no Micro QR version provides it).
 *
 * @throws {RangeError} if the text is too long for any Micro QR version at the
 *   chosen level (including any request for level `H`).
 */
export function encodeMicroQr(text: string, errorCorrection: QrErrorCorrection = 'M'): CompactQrMatrix {
  return unpackCompact(loadQrCompactEncoderSync().encode_micro_qr(ECC_ORDINAL[errorCorrection], text), 'Micro QR Code');
}

/**
 * Encode `text` into a **Micro QR Code** matrix, instantiating the WebAssembly
 * encoder asynchronously on first use. See {@link encodeMicroQr}.
 *
 * @throws {RangeError} if the text is too long for any Micro QR version at the
 *   chosen level (including any request for level `H`).
 */
export async function encodeMicroQrAsync(
  text: string,
  errorCorrection: QrErrorCorrection = 'M',
): Promise<CompactQrMatrix> {
  const encoder = await loadQrCompactEncoder();
  return unpackCompact(encoder.encode_micro_qr(ECC_ORDINAL[errorCorrection], text), 'Micro QR Code');
}

/**
 * Encode `text` into a **Rectangular Micro QR (rMQR) Code** matrix
 * (ISO/IEC 23941), instantiating the WebAssembly encoder synchronously on first
 * use.
 *
 * The smallest fitting version (of the 32 sizes from R7×43 to R17×139) is chosen
 * automatically. rMQR supports only error-correction levels `M` and `H`, so
 * `L`/`M` map to `M` and `Q`/`H` map to `H`.
 *
 * @throws {RangeError} if the text is too long for any rMQR version at the
 *   chosen level.
 */
export function encodeRmqr(text: string, errorCorrection: QrErrorCorrection = 'M'): CompactQrMatrix {
  return unpackCompact(loadQrCompactEncoderSync().encode_rmqr(ECC_ORDINAL[errorCorrection], text), 'rMQR Code');
}

/**
 * Encode `text` into a **Rectangular Micro QR (rMQR) Code** matrix,
 * instantiating the WebAssembly encoder asynchronously on first use. See
 * {@link encodeRmqr}.
 *
 * @throws {RangeError} if the text is too long for any rMQR version at the
 *   chosen level.
 */
export async function encodeRmqrAsync(
  text: string,
  errorCorrection: QrErrorCorrection = 'M',
): Promise<CompactQrMatrix> {
  const encoder = await loadQrCompactEncoder();
  return unpackCompact(encoder.encode_rmqr(ECC_ORDINAL[errorCorrection], text), 'rMQR Code');
}
