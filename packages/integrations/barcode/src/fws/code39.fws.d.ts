export interface ForgeCode39Exports {
  /** Encodes Code 39 text with automatic start and stop framing. */
  readonly encode_code39: (value: string) => string;
  /** Encodes 7-bit ASCII text using extended Code 39 shift sequences. */
  readonly encode_code39_extended: (value: string) => string;
}

/** Compiler manifest describing the embedded Code 39 FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the Code 39 artifact asynchronously. */
export function load(): Promise<ForgeCode39Exports>;
/** Loads the Code 39 artifact synchronously. */
export function loadSync(): ForgeCode39Exports;
