export interface ForgeCode128Exports {
  /** Encodes printable ASCII using Code B or the even-digit Code C fast path. */
  readonly encode_code128: (value: string) => string;
  /** Encodes printable ASCII as GS1-128 with a leading FNC1 symbol. */
  readonly encode_gs1_128: (value: string) => string;
  /** Decodes Code 128 module bits after validating framing and checksum. */
  readonly decode_code128: (modules: ArrayLike<number>) => string;
  /** Decodes GS1-128 module bits and removes FNC1 separators. */
  readonly decode_gs1_128: (modules: ArrayLike<number>) => string;
}

/** Compiler manifest describing the embedded Code 128 FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the Code 128 artifact asynchronously. */
export function load(): Promise<ForgeCode128Exports>;
/** Loads the Code 128 artifact synchronously. */
export function loadSync(): ForgeCode128Exports;
