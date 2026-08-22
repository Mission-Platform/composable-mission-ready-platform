export interface ForgeQrCompactEncoderExports {
  /** Returns `width,height,row-major-bits`, or an empty string on overflow. */
  readonly encode_micro_qr: (ecc: number, text: string) => string;
  /** Returns `width,height,row-major-bits`, or an empty string on overflow. */
  readonly encode_rmqr: (ecc: number, text: string) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgeQrCompactEncoderExports>;
export function loadSync(): ForgeQrCompactEncoderExports;
