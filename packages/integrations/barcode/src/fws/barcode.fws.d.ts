export interface ForgeBarcodeExports {
  /** Encodes the seven-digit EAN-8 payload and returns module bits. */
  readonly encode_ean8: (value: string) => string;
  /** Encodes the twelve-digit EAN-13 payload and returns module bits. */
  readonly encode_ean13: (value: string) => string;
  /** Encodes the UPC-A payload through the EAN-13 layout. */
  readonly encode_upca: (value: string) => string;
}

/** Compiler manifest describing the embedded barcode FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the barcode artifact asynchronously. */
export function load(): Promise<ForgeBarcodeExports>;
/** Loads the barcode artifact synchronously. */
export function loadSync(): ForgeBarcodeExports;
