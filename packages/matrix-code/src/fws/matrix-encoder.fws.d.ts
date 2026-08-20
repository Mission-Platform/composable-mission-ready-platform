export type MatrixSymbologyId = 0 | 1 | 2 | 3;

export interface ForgeMatrixEncoderExports {
  /**
   * Encodes the payload and returns a packed string: "width,height,<row-major modules>".
   * Returns "" when the payload is invalid for the requested symbology.
   */
  readonly encode_matrix: (symbology: MatrixSymbologyId, data: string) => string;
  readonly __test_gf256_exp: (index: number) => number;
  readonly __test_gf256_mul: (a: number, b: number) => number;
  readonly __test_ascii_codewords: (data: string) => string;
  readonly __test_dm_10x10_message: (data: string) => string;
  readonly __test_pad_codeword_at: (position: number) => number;
  readonly __test_string_byte_at: (data: string, index: number) => number;
  readonly __test_byte_char3: (value: number) => string;
  readonly __test_bytes_get: (data: string, index: number) => number;
  readonly __test_dm_place_10x10: (data: string) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgeMatrixEncoderExports>;
export function loadSync(): ForgeMatrixEncoderExports;
