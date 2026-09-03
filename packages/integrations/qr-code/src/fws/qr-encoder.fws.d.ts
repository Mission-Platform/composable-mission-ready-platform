export interface ForgeQrEncoderExports {
  readonly encode_qr: (ecc: number, text: string) => EncodedQR;
  readonly __test_interleave: (ecc: number, data: string) => string;
  readonly __test_tables: (ecc: number) => string;
  readonly __test_gf256_mul: (a: number, b: number) => number;
  readonly __test_rs_remainder: (data: string, count: number) => string;
}

export interface EncodedQR {
  readonly version: number;
  readonly size: number;
  readonly modules: readonly number[];
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgeQrEncoderExports>;
export function loadSync(): ForgeQrEncoderExports;
