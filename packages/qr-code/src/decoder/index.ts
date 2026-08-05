// QR Code decoder façade.
//
// The decoder recovers the format info, unmasks the data region, reads the
// codewords and Reed-Solomon-corrects up to the level's error capacity, so it
// tolerates a damaged matrix. It is compiled from the `crates/qr-code-decode`
// Rust crate and published as `@mission-platform/qr-code-decode-wasm`.
//
// The `-wasm` package inlines its wasm binary and instantiates it synchronously
// at import, so `decode` is ready to call with no initialisation step. This
// module owns the public `decodeQr` / `decodeQrAsync` helpers, which `index.ts`
// re-exports.

import { decode as wasmDecode } from '@mission-platform/qr-code-decode-wasm';

import type { QrMatrix } from '../types';

/** Pack a {@link QrMatrix} into the decoder's `[size, ...modules]` buffer. */
function packMatrix(matrix: QrMatrix): Uint8Array {
  const { size, modules } = matrix;
  const packed = new Uint8Array(1 + size * size);
  packed[0] = size;
  let offset = 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      packed[offset++] = modules[y][x] ? 1 : 0;
    }
  }
  return packed;
}

/**
 * Decode a {@link QrMatrix} back into its original text, instantiating the
 * WebAssembly decoder synchronously on first use.
 *
 * The decoder recovers the format info, unmasks the data region, reads the
 * codewords, and Reed-Solomon-corrects up to the level's error capacity, so it
 * tolerates a damaged matrix. Only the byte-mode segment produced by `encodeQr`
 * is supported.
 *
 * @returns the decoded text, or `null` when the matrix cannot be decoded.
 */
export function decodeQr(matrix: QrMatrix): string | null {
  return wasmDecode(packMatrix(matrix)) ?? null;
}

/**
 * Decode a {@link QrMatrix} back into its original text, instantiating the
 * WebAssembly decoder asynchronously on first use.
 *
 * @returns the decoded text, or `null` when the matrix cannot be decoded.
 */
export function decodeQrAsync(matrix: QrMatrix): Promise<string | null> {
  return Promise.resolve(wasmDecode(packMatrix(matrix)) ?? null);
}
