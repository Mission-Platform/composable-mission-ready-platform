export interface ForgeScannerImports {
  readonly 'qr.decode.utf8': {
    readonly decode_utf8: (value: string) => string;
    readonly matrix_decode_utf8: (value: string) => string;
  };
}

export interface ForgeScannerExports {
  readonly scan_and_decode: (
    width: number,
    height: number,
    luma: ArrayLike<number>,
    modules: ArrayLike<number>,
    erasures: ArrayLike<number>,
    packed: ArrayLike<number>,
    meta: ArrayLike<number>,
  ) => string;
  readonly scan_and_decode_roi: (
    width: number,
    height: number,
    luma: ArrayLike<number>,
    roiX: number,
    roiY: number,
    roiWidth: number,
    roiHeight: number,
    modules: ArrayLike<number>,
    erasures: ArrayLike<number>,
    packed: ArrayLike<number>,
    meta: ArrayLike<number>,
  ) => string;
  readonly scan_and_decode_all: (
    width: number,
    height: number,
    luma: ArrayLike<number>,
    modules: ArrayLike<number>,
    erasures: ArrayLike<number>,
    packed: ArrayLike<number>,
    meta: ArrayLike<number>,
  ) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(imports?: ForgeScannerImports): Promise<ForgeScannerExports>;
export function loadSync(imports?: ForgeScannerImports): ForgeScannerExports;
