export interface ForgeCode39Exports {
  /** Encodes Code 39 text with automatic start and stop framing. */
  readonly encode_code39: (value: string) => string;
  /** Encodes 7-bit ASCII text using extended Code 39 shift sequences. */
  readonly encode_code39_extended: (value: string) => string;
  /** Decodes Code 39 module bits and returns the canonical payload without framing. */
  readonly decode_code39: (modules: ArrayLike<number>) => string;
  /** Decodes Code 39 full-ASCII module bits into the original 7-bit text. */
  readonly decode_code39_extended: (modules: ArrayLike<number>) => string;
}

/** Compiler manifest describing the embedded Code 39 FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the Code 39 artifact asynchronously. */
export function load(): Promise<ForgeCode39Exports>;
/** Loads the Code 39 artifact synchronously. */
export function loadSync(): ForgeCode39Exports;
