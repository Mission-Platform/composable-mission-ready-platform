export const BarcodeSymbology: {
  readonly Code128: 0;
  readonly Gs1_128: 1;
  readonly Code39: 2;
  readonly Code39Extended: 3;
  readonly Code93: 4;
  readonly Code93Extended: 5;
  readonly Ean13: 6;
  readonly Ean8: 7;
  readonly Upca: 8;
  readonly Upce: 9;
  readonly Itf: 10;
  readonly Itf14: 11;
  readonly Codabar: 12;
  readonly Msi: 13;
  readonly Pharmacode: 14;
};
export type BarcodeSymbology = (typeof BarcodeSymbology)[keyof typeof BarcodeSymbology];

export interface ForgeBarcodeNativeExports {
  readonly decode_native: (symbology: BarcodeSymbology, modules: ArrayLike<number>) => string;
  readonly encode_native: (symbology: BarcodeSymbology, value: string) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgeBarcodeNativeExports>;
export function loadSync(): ForgeBarcodeNativeExports;
