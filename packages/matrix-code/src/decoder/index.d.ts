import type { MatrixCode } from '../encoder';
/**
 * Decode a 2D matrix symbol back into its payload, instantiating the WebAssembly
 * decoder synchronously on first use. Returns `null` when the symbol is too
 * damaged to recover or its symbology is unsupported.
 *
 * Reed-Solomon error correction repairs a symbol with a limited number of
 * flipped modules, so a lightly damaged {@link MatrixCode} still decodes.
 */
export declare function decodeMatrix(matrix: MatrixCode): string | null;
/**
 * Decode a 2D matrix symbol back into its payload, instantiating the WebAssembly
 * decoder asynchronously on first use. See {@link decodeMatrix}.
 */
export declare function decodeMatrixAsync(matrix: MatrixCode): Promise<string | null>;
