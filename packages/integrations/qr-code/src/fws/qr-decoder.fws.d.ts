export interface ForgeQrDecoderImports {
  readonly 'qr.decode.utf8': {
    readonly decode_utf8: (value: string) => string;
  };
}

export interface ForgeQrDecoderExports {
  /** Returns "1" + decoded text on success, or "" on decode failure. */
  readonly decode_qr: (packed: ArrayLike<number>) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(imports?: ForgeQrDecoderImports): Promise<ForgeQrDecoderExports>;
export function loadSync(imports?: ForgeQrDecoderImports): ForgeQrDecoderExports;
