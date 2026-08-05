// Public, typed wrapper around the Rust/WebAssembly 2D matrix barcode encoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/matrix-code-encode`
// Rust crate, sharing `crates/matrix-code-common`, and published as
// `@mission-platform/matrix-code-encode-wasm`); this module provides an
// ergonomic, fully typed façade over the encoder. The decoder counterpart lives
// in `../decoder`.

// The `-wasm` package inlines its wasm binary and instantiates it synchronously
// at import, so `encode` is ready to call with no initialisation step.
import { encode as wasmEncode } from '@mission-platform/matrix-code-encode-wasm';

/**
 * The 2D matrix symbologies this encoder supports. Passed as the first argument
 * to {@link encodeMatrix}.
 *
 * - `datamatrix` — Data Matrix (ECC 200); single-data-region square symbols
 *   (10×10 … 26×26) with automatic sizing and Reed-Solomon error correction.
 * - `gs1datamatrix` — the same Data Matrix with a leading FNC1 codeword,
 *   marking the payload as a stream of GS1 Application Identifiers.
 * - `datamatrixrectangular` — the rectangular Data Matrix symbols (8×18 …
 *   16×48), for labels where a square symbol does not fit.
 * - `aztec` — Aztec Code (compact, 1–4 layers); a square symbol with a central
 *   bullseye finder and Reed-Solomon error correction, needing no quiet zone.
 */
export type MatrixSymbology = 'datamatrix' | 'gs1datamatrix' | 'datamatrixrectangular' | 'aztec';

/**
 * The result of {@link encodeMatrix}: a grid of module bits. Square symbologies
 * report `width === height`; the rectangular Data Matrix symbols do not.
 */
export interface MatrixCode {
  /** The symbology used to encode the payload. */
  symbology: MatrixSymbology;
  /** The symbol's width in modules (excludes any quiet zone). */
  width: number;
  /** The symbol's height in modules (excludes any quiet zone). */
  height: number;
  /** Module bits, row-major, `width * height` entries: `1` = dark, `0` = light. */
  modules: number[];
}

/** Turn the wasm `[width, height, ...modules]` buffer into a {@link MatrixCode}, or throw. */
function toMatrixCode(symbology: MatrixSymbology, packed: Uint8Array | undefined): MatrixCode {
  if (packed === undefined || packed.length < 2) {
    throw new RangeError(`Invalid payload for the "${symbology}" matrix symbology`);
  }
  const width = packed[0];
  const height = packed[1];
  const modules = Array.from(packed.subarray(2));
  if (modules.length !== width * height) {
    throw new RangeError(`Malformed "${symbology}" symbol: expected ${width * height} modules, got ${modules.length}`);
  }
  return { symbology, width, height, modules };
}

/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, instantiating
 * the WebAssembly encoder synchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology (empty, or
 *   too large for the supported symbols).
 */
export function encodeMatrix(symbology: MatrixSymbology, data: string): MatrixCode {
  return toMatrixCode(symbology, wasmEncode(symbology, data));
}

/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, instantiating
 * the WebAssembly encoder asynchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology.
 */
export function encodeMatrixAsync(symbology: MatrixSymbology, data: string): Promise<MatrixCode> {
  return Promise.resolve(toMatrixCode(symbology, wasmEncode(symbology, data)));
}
