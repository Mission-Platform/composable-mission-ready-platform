// Public, typed wrapper around the package-local Forge Web Script matrix encoder.

import { load as loadMatrixEncoder, loadSync as loadMatrixEncoderSync } from '../fws/matrix-encoder.fws';

/**
 * The 2D matrix symbologies this encoder supports. Passed as the first argument
 * to {@link encodeMatrix} / {@link encodeMatrixAsync}.
 */
export type MatrixSymbology = 'datamatrix' | 'gs1datamatrix' | 'datamatrixrectangular' | 'aztec';

const SYMBOLOGY_ID = {
  datamatrix: 0,
  gs1datamatrix: 1,
  datamatrixrectangular: 2,
  aztec: 3,
} as const;

/**
 * A packed matrix barcode: dimensions plus a row-major list of module bits
 * (`0` = light, `1` = dark).
 */
export interface MatrixCode {
  symbology: MatrixSymbology;
  width: number;
  height: number;
  modules: number[];
}

/** Turn the packed `[width, height, ...modules]` buffer into a {@link MatrixCode}, or throw. */
function toMatrixCode(symbology: MatrixSymbology, packed?: number[]): MatrixCode {
  if (packed === undefined || packed.length < 2) {
    throw new RangeError(`Invalid payload for the "${symbology}" matrix symbology`);
  }
  const width = packed[0];
  const height = packed[1];
  const modules = packed.slice(2);
  if (modules.length !== width * height) {
    throw new RangeError(`Malformed "${symbology}" symbol: expected ${width * height} modules, got ${modules.length}`);
  }
  return { symbology, width, height, modules };
}

/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, loading the
 * Forge encoder artifact synchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology (empty, or
 *   too large for the supported symbols).
 */
export function encodeMatrix(symbology: MatrixSymbology, data: string): MatrixCode {
  const encoder = loadMatrixEncoderSync();
  const packed = encoder.encode_matrix(SYMBOLOGY_ID[symbology], data);
  if (packed.length === 0) {
    return toMatrixCode(symbology);
  }
  const parts = packed.split(',');
  const width = Number.parseInt(parts[0], 10);
  const height = Number.parseInt(parts[1], 10);
  const modules = Array.from(parts[2]).map((c) => (c === '1' ? 1 : 0));
  return toMatrixCode(symbology, [width, height, ...modules]);
}

/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, loading the
 * Forge encoder artifact asynchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology.
 */
export async function encodeMatrixAsync(symbology: MatrixSymbology, data: string): Promise<MatrixCode> {
  const encoder = await loadMatrixEncoder();
  const packed = encoder.encode_matrix(SYMBOLOGY_ID[symbology], data);
  if (packed.length === 0) {
    return toMatrixCode(symbology);
  }
  const parts = packed.split(',');
  const width = Number.parseInt(parts[0], 10);
  const height = Number.parseInt(parts[1], 10);
  const modules = Array.from(parts[2]).map((c) => (c === '1' ? 1 : 0));
  return toMatrixCode(symbology, [width, height, ...modules]);
}
