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
/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, loading the
 * Forge Web Script encoder artifact synchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology (empty, or
 *   too large for the supported symbols).
 */
export declare function encodeMatrix(symbology: MatrixSymbology, data: string): MatrixCode;
/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, loading the
 * Forge Web Script encoder artifact asynchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology.
 */
export declare function encodeMatrixAsync(symbology: MatrixSymbology, data: string): Promise<MatrixCode>;
