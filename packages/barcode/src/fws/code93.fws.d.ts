export interface ForgeCode93Exports {
  /** Encodes Code 93 text and appends the two check characters. */
  readonly encode_code93: (value: string) => string;
  /** Encodes 7-bit ASCII text using extended Code 93 sequences. */
  readonly encode_code93_extended: (value: string) => string;
  /** Decodes Code 93 module bits after validating framing and C/K checksums. */
  readonly decode_code93: (modules: ArrayLike<number>) => string;
  /** Decodes full-ASCII Code 93 module bits into the original 7-bit text. */
  readonly decode_code93_extended: (modules: ArrayLike<number>) => string;
}

/** Compiler manifest describing the embedded Code 93 FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the Code 93 artifact asynchronously. */
export function load(): Promise<ForgeCode93Exports>;
/** Loads the Code 93 artifact synchronously. */
export function loadSync(): ForgeCode93Exports;
