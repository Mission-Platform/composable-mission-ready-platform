// Public, typed wrapper around the Rust/WebAssembly 2D matrix barcode decoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/matrix-code-decode`
// Rust crate, sharing `crates/matrix-code-common`, and published as
// `@mission-platform/matrix-code-decode-wasm`), the inverse of the encoder: it
// takes a {@link MatrixCode} and recovers the original payload. This façade
// mirrors the encoder so consumers never touch the raw wasm exports.

// The `-wasm` package inlines its wasm binary and instantiates it synchronously
// at import, so `decode` is ready to call with no initialisation step.
import { decode as wasmDecode } from '@mission-platform/matrix-code-decode-wasm';

import type { MatrixCode } from '../encoder';

/** Pack a {@link MatrixCode} into the decoder's `[width, height, ...modules]` buffer. */
function packMatrix(matrix: MatrixCode): Uint8Array {
  const packed = new Uint8Array(2 + matrix.modules.length);
  packed[0] = matrix.width;
  packed[1] = matrix.height;
  packed.set(matrix.modules, 2);
  return packed;
}

/**
 * Decode a 2D matrix symbol back into its payload, instantiating the WebAssembly
 * decoder synchronously on first use. Returns `null` when the symbol is too
 * damaged to recover or its symbology is unsupported.
 *
 * Reed-Solomon error correction repairs a symbol with a limited number of
 * flipped modules, so a lightly damaged {@link MatrixCode} still decodes.
 */
export function decodeMatrix(matrix: MatrixCode): string | null {
  return wasmDecode(matrix.symbology, packMatrix(matrix)) ?? null;
}

/**
 * Decode a 2D matrix symbol back into its payload, instantiating the WebAssembly
 * decoder asynchronously on first use. See {@link decodeMatrix}.
 */
export function decodeMatrixAsync(matrix: MatrixCode): Promise<string | null> {
  return Promise.resolve(wasmDecode(matrix.symbology, packMatrix(matrix)) ?? null);
}
