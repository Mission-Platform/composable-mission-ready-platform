// Public, typed wrapper around the Rust/WebAssembly QR Code encoder.
//
// A dependency-free byte-mode QR Code encoder: it encodes an arbitrary UTF-8
// string as a single byte-mode segment, selects the smallest QR version that
// fits the data at the requested error-correction level, and chooses the data
// mask with the lowest penalty score per the QR specification (ISO/IEC 18004).
//
// The heavy lifting runs in WebAssembly, compiled from the `crates/qr-code-encode`
// Rust crate (sharing `crates/qr-code-common`) and published as
// `@mission-platform/qr-code-encode-wasm`; the decoder counterpart lives in
// `../decoder`.
//
// The `-wasm` package inlines its wasm binary and instantiates it synchronously
// at import, so the encoders are ready to call with no initialisation step.
// This module owns the public `encodeQr` / `encodeQrAsync` helpers (plus the
// compact Micro QR / rMQR variants). It depends only on the shared types —
// never on the decoder — so the encode path stays pure (the two paths never
// form an import cycle). `index.ts` re-exports the public encode API.

import {
  encode as wasmEncode,
  encode_micro_qr as wasmEncodeMicroQr,
  encode_rmqr as wasmEncodeRmqr,
} from '@mission-platform/qr-code-encode-wasm';

import type { CompactQrMatrix, QrErrorCorrection, QrMatrix } from '../types';

/** Ordinal for each error-correction level, matching the wasm `encode` contract. */
const ECC_ORDINAL: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };

/**
 * Unpack the wasm encoder's packed `Uint8Array` (`[version, size, ...modules]`)
 * into a {@link QrMatrix}, throwing when the payload was too long to encode
 * (the wasm `encode` returns `undefined`, so a missing buffer signals overflow).
 */
function unpack(packed: Uint8Array | undefined): QrMatrix {
  if (packed === undefined || packed.length === 0) {
    throw new RangeError('Data too long for a QR Code at the chosen error-correction level');
  }
  const version = packed[0];
  const size = packed[1];
  const modules: boolean[][] = [];
  let offset = 2;
  for (let y = 0; y < size; y++) {
    const row: boolean[] = new Array<boolean>(size);
    for (let x = 0; x < size; x++) {
      row[x] = packed[offset++] !== 0;
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
  return unpack(wasmEncode(text, ECC_ORDINAL[errorCorrection]));
}

/**
 * Encode `text` into a QR Code matrix at the given error-correction level,
 * instantiating the WebAssembly encoder asynchronously on first use.
 *
 * @throws {RangeError} if the text is too long to fit in the largest (version
 *   40) QR Code at the chosen error-correction level.
 */
export function encodeQrAsync(text: string, errorCorrection: QrErrorCorrection = 'M'): Promise<QrMatrix> {
  return Promise.resolve(unpack(wasmEncode(text, ECC_ORDINAL[errorCorrection])));
}

/**
 * Unpack a compact-code encoder buffer (`[width, height, ...modules]`) into a
 * {@link CompactQrMatrix}, throwing when the payload did not fit (the wasm entry
 * points return `undefined`, so a missing buffer signals overflow).
 */
function unpackCompact(packed: Uint8Array | undefined, kind: string): CompactQrMatrix {
  if (packed === undefined || packed.length === 0) {
    throw new RangeError(`Data too long for a ${kind} at the chosen error-correction level`);
  }
  const width = packed[0];
  const height = packed[1];
  const modules: boolean[][] = [];
  let offset = 2;
  for (let y = 0; y < height; y++) {
    const row: boolean[] = new Array<boolean>(width);
    for (let x = 0; x < width; x++) {
      row[x] = packed[offset++] !== 0;
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
  return unpackCompact(wasmEncodeMicroQr(text, ECC_ORDINAL[errorCorrection]), 'Micro QR Code');
}

/**
 * Encode `text` into a **Micro QR Code** matrix, instantiating the WebAssembly
 * encoder asynchronously on first use. See {@link encodeMicroQr}.
 *
 * @throws {RangeError} if the text is too long for any Micro QR version at the
 *   chosen level (including any request for level `H`).
 */
export function encodeMicroQrAsync(text: string, errorCorrection: QrErrorCorrection = 'M'): Promise<CompactQrMatrix> {
  return Promise.resolve(unpackCompact(wasmEncodeMicroQr(text, ECC_ORDINAL[errorCorrection]), 'Micro QR Code'));
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
  return unpackCompact(wasmEncodeRmqr(text, ECC_ORDINAL[errorCorrection]), 'rMQR Code');
}

/**
 * Encode `text` into a **Rectangular Micro QR (rMQR) Code** matrix,
 * instantiating the WebAssembly encoder asynchronously on first use. See
 * {@link encodeRmqr}.
 *
 * @throws {RangeError} if the text is too long for any rMQR version at the
 *   chosen level.
 */
export function encodeRmqrAsync(text: string, errorCorrection: QrErrorCorrection = 'M'): Promise<CompactQrMatrix> {
  return Promise.resolve(unpackCompact(wasmEncodeRmqr(text, ECC_ORDINAL[errorCorrection]), 'rMQR Code'));
}
