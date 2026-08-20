// Public, typed wrapper around the package-local Forge Web Script matrix decoder.

import { load as loadMatrixDecoder, loadSync as loadMatrixDecoderSync } from '../fws/matrix-decoder.fws';
import type { MatrixCode } from '../encoder';

const SYMBOLOGY_ID: Record<MatrixCode['symbology'], 0 | 1 | 2 | 3> = {
  datamatrix: 0,
  gs1datamatrix: 1,
  datamatrixrectangular: 2,
  aztec: 3,
};

function unpackPayload(payload: string): string | null {
  if (payload.length === 0 || payload.length % 3 !== 0) return null;
  const bytes = new Uint8Array(payload.length / 3);
  for (let index = 0; index < bytes.length; index += 1) {
    const value = Number.parseInt(payload.slice(index * 3, index * 3 + 3), 10);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    bytes[index] = value;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function decodeWithArtifact(matrix: MatrixCode, erasures?: ArrayLike<number>): string | null {
  const symbology = SYMBOLOGY_ID[matrix.symbology];
  if (
    symbology === undefined
    || !Number.isInteger(matrix.width)
    || !Number.isInteger(matrix.height)
    || matrix.width <= 0
    || matrix.height <= 0
    || matrix.modules.length !== matrix.width * matrix.height
    || matrix.modules.some(module => module !== 0 && module !== 1)
    || (erasures !== undefined && erasures.length !== matrix.modules.length)
  ) {
    return null;
  }
  const artifact = loadMatrixDecoderSync();
  return unpackPayload(artifact.decode_matrix(symbology, matrix.width, matrix.height, matrix.modules, erasures ?? []));
}

/**
 * Decode a 2D matrix symbol back into its payload through the FWS decoder
 * artifact. Returns `null` when the symbol is malformed, unsupported, or too
 * damaged to recover.
 *
 * Reed-Solomon error correction repairs a symbol with a limited number of
 * flipped modules, so a lightly damaged {@link MatrixCode} still decodes.
 */
export function decodeMatrix(matrix: MatrixCode): string | null {
  return decodeWithArtifact(matrix);
}

/** Decode a matrix while marking low-confidence modules as Reed-Solomon erasures. */
export function decodeMatrixWithErasures(matrix: MatrixCode, erasures: ArrayLike<number>): string | null {
  return decodeWithArtifact(matrix, erasures);
}

/**
 * Decode a 2D matrix symbol asynchronously through the FWS decoder artifact.
 * See {@link decodeMatrix}.
 */
export function decodeMatrixAsync(matrix: MatrixCode): Promise<string | null> {
  return decodeMatrixAsyncWithErasures(matrix);
}

/** Asynchronous counterpart of {@link decodeMatrixWithErasures}. */
export async function decodeMatrixAsyncWithErasures(
  matrix: MatrixCode,
  erasures?: ArrayLike<number>,
): Promise<string | null> {
  const symbology = SYMBOLOGY_ID[matrix.symbology];
  if (
    symbology === undefined
    || !Number.isInteger(matrix.width)
    || !Number.isInteger(matrix.height)
    || matrix.width <= 0
    || matrix.height <= 0
    || matrix.modules.length !== matrix.width * matrix.height
    || matrix.modules.some(module => module !== 0 && module !== 1)
    || (erasures !== undefined && erasures.length !== matrix.modules.length)
  ) {
    return null;
  }
  const artifact = await loadMatrixDecoder();
  return unpackPayload(artifact.decode_matrix(symbology, matrix.width, matrix.height, matrix.modules, erasures ?? []));
}
