import type { MatrixCode } from '../encoder';
/**
 * Decode a 2D matrix symbol through the FWS decoder artifact. Returns `null`
 * when the symbol is malformed, unsupported, or too damaged to recover.
 *
 * Reed-Solomon error correction repairs a symbol with a limited number of
 * flipped modules, so a lightly damaged {@link MatrixCode} still decodes.
 */
export declare function decodeMatrix(matrix: MatrixCode): string | null;
/** Decode a matrix while marking low-confidence modules as Reed-Solomon erasures. */
export declare function decodeMatrixWithErasures(matrix: MatrixCode, erasures: ArrayLike<number>): string | null;
/**
 * Decode a 2D matrix symbol asynchronously through the FWS decoder artifact.
 * See {@link decodeMatrix}.
 */
export declare function decodeMatrixAsync(matrix: MatrixCode): Promise<string | null>;
/** Asynchronous counterpart of {@link decodeMatrixWithErasures}. */
export declare function decodeMatrixAsyncWithErasures(
  matrix: MatrixCode,
  erasures?: ArrayLike<number>,
): Promise<string | null>;
