// Public, typed wrapper around the package-local Forge Web Script QR encoder.
//
// The FWS graph uses byte mode for arbitrary UTF-8 strings, selects the
// smallest fitting symbol, and chooses the data mask with the lowest penalty.

import { load as loadQrCompactEncoder, loadSync as loadQrCompactEncoderSync } from '../fws/qr-compact-encoder.fws';
import { load as loadQrEncoder, loadSync as loadQrEncoderSync } from '../fws/qr-encoder.fws';

import type { CompactQrMatrix, QrErrorCorrection, QrMatrix } from '../types';

/** Ordinal for each error-correction level, matching the FWS encoder contract. */
const ECC_ORDINAL: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Read the FWS encoder's fixed-layout record and its module words. */
function unpack(encoded: { version: number; size: number; modules: readonly number[] }): QrMatrix {
  if (encoded.version === 0 || encoded.size === 0 || encoded.modules.length === 0) {
    throw new RangeError('Data too long for a QR Code at the chosen error-correction level');
  }
  const { version, size, modules: moduleWords } = encoded;
  if (!Number.isInteger(version) || !Number.isInteger(size) || size <= 0 || !Array.isArray(moduleWords)) {
    throw new RangeError('Malformed QR Code encoder result');
  }
  const words = Math.ceil((size * size) / 32);
  if (
    moduleWords.length !== words ||
    moduleWords.some((word) => !Number.isInteger(word) || word < 0 || word > 0xffffffff)
  )
    throw new RangeError('Malformed QR Code encoder result');
  const modules: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = new Array<boolean>(size);
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      row[x] = ((moduleWords[Math.floor(index / 32)]! >>> (index % 32)) & 1) === 1;
    }
    modules.push(row);
  }
  return { size, modules, version };
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

/**
 * Unpack a compact FWS encoder result (`width,height,row-major-bits`) into a
 * {@link CompactQrMatrix}.
 */
function unpackCompact(packed: string, kind: string): CompactQrMatrix {
  if (packed.length === 0) {
    throw new RangeError(`Data too long for a ${kind} at the chosen error-correction level`);
  }
  const firstSeparator = packed.indexOf(',');
  const secondSeparator = packed.indexOf(',', firstSeparator + 1);
  const width = Number.parseInt(packed.slice(0, firstSeparator), 10);
  const height = Number.parseInt(packed.slice(firstSeparator + 1, secondSeparator), 10);
  const bits = packed.slice(secondSeparator + 1);
  if (
    firstSeparator <= 0 ||
    secondSeparator <= firstSeparator ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    bits.length !== width * height
  ) {
    throw new RangeError(`Malformed ${kind} encoder result`);
  }
  const modules: boolean[][] = [];
  let offset = 0;
  for (let y = 0; y < height; y++) {
    const row: boolean[] = new Array<boolean>(width);
    for (let x = 0; x < width; x++) {
      row[x] = bits[offset++] === '1';
    }
    modules.push(row);
  }
  return { width, height, modules };
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
