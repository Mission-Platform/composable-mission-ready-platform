export interface ForgeBarcodeExports {
  /** Encodes the seven-digit EAN-8 payload and returns module bits. */
  readonly encode_ean8: (value: string) => string;
  /** Encodes the twelve-digit EAN-13 payload and returns module bits. */
  readonly encode_ean13: (value: string) => string;
  /** Encodes the UPC-A payload through the EAN-13 layout. */
  readonly encode_upca: (value: string) => string;
  /** Encodes UPC-E from six digits, with optional system and check digit. */
  readonly encode_upce: (value: string) => string;
  /** Decodes UPC-A module bits, returning the twelve-digit payload. */
  readonly decode_upca: (modules: ArrayLike<number>) => string;
  /** Decodes UPC-E module bits to number system, six digits, and check digit. */
  readonly decode_upce: (modules: ArrayLike<number>) => string;
  /** Decodes EAN-8 module bits, returning an empty string for invalid data. */
  readonly decode_ean8: (modules: ArrayLike<number>) => string;
  /** Decodes EAN-13 module bits, returning an empty string for invalid data. */
  readonly decode_ean13: (modules: ArrayLike<number>) => string;
}

/** Compiler manifest describing the embedded barcode FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the barcode artifact asynchronously. */
export function load(): Promise<ForgeBarcodeExports>;
/** Loads the barcode artifact synchronously. */
export function loadSync(): ForgeBarcodeExports;
