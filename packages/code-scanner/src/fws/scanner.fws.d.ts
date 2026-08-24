export interface ForgeScannerImports {
  readonly 'qr.decode.utf8': {
    readonly decode_utf8: (value: string) => string;
    readonly matrix_decode_utf8: (value: string) => string;
  };
}

export type ForgeScannerRawBytes = readonly [pointer: number, length: number];

export interface ForgeScannerRawImports {
  readonly 'qr.decode.utf8': {
    readonly decode_utf8: (pointer: number, length: number) => ForgeScannerRawBytes;
    readonly matrix_decode_utf8: (pointer: number, length: number) => ForgeScannerRawBytes;
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

export interface ForgeScannerRawExports {
  readonly memory: WebAssembly.Memory;
  readonly scan_and_decode: (
    width: number,
    height: number,
    luma: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => ForgeScannerRawBytes;
  readonly scan_and_decode_roi: (
    width: number,
    height: number,
    luma: number,
    roiX: number,
    roiY: number,
    roiWidth: number,
    roiHeight: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => ForgeScannerRawBytes;
  readonly scan_and_decode_all: (
    width: number,
    height: number,
    luma: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => ForgeScannerRawBytes;
  readonly scan_and_decode_bytes: (
    width: number,
    height: number,
    luma: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => ForgeScannerRawBytes;
  readonly scan_and_decode_bytes_roi: (
    width: number,
    height: number,
    luma: number,
    roiX: number,
    roiY: number,
    roiWidth: number,
    roiHeight: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => ForgeScannerRawBytes;
  readonly scan_and_decode_all_bytes: (
    width: number,
    height: number,
    luma: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => ForgeScannerRawBytes;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(imports?: ForgeScannerImports): Promise<ForgeScannerExports>;
export function loadSync(imports?: ForgeScannerImports): ForgeScannerExports;
export function loadRaw(imports?: ForgeScannerRawImports): Promise<ForgeScannerRawExports>;
export function loadRawSync(imports?: ForgeScannerRawImports): ForgeScannerRawExports;
