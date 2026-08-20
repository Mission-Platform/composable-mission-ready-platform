export type MatrixSymbologyId = 0 | 1 | 2 | 3;

export interface ForgeMatrixDecoderExports {
  /**
   * Decodes a validated symbol and returns its UTF-8 payload as ASCII decimal
   * triplets. An empty string denotes an invalid or unrecoverable symbol.
   */
  readonly decode_matrix: (
    symbology: MatrixSymbologyId,
    width: number,
    height: number,
    modules: ArrayLike<number>,
    erasures: ArrayLike<number>,
  ) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgeMatrixDecoderExports>;
export function loadSync(): ForgeMatrixDecoderExports;