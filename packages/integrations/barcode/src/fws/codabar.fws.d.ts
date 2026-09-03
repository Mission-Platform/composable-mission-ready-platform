export interface ForgeCodabarExports {
  /** Encodes Codabar text with automatic A start and stop framing. */
  readonly encode_codabar: (value: string) => string;
  /** Decodes exact Codabar module bits and returns the payload without framing. */
  readonly decode_codabar: (modules: ArrayLike<number>) => string;
}

/** Compiler manifest describing the embedded Codabar FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the Codabar artifact asynchronously. */
export function load(): Promise<ForgeCodabarExports>;
/** Loads the Codabar artifact synchronously. */
export function loadSync(): ForgeCodabarExports;
