export interface ForgeItfExports {
  /** Encodes an even-length numeric payload as Interleaved 2 of 5. */
  readonly encode_itf: (value: string) => string;
  /** Encodes or validates a 13/14-digit ITF-14 GTIN payload. */
  readonly encode_itf14: (value: string) => string;
  /** Decodes framed ITF module bits, returning an empty string when invalid. */
  readonly decode_itf: (modules: ArrayLike<number>) => string;
  /** Decodes framed ITF-14 module bits using the legacy ITF behavior. */
  readonly decode_itf14: (modules: ArrayLike<number>) => string;
}

/** Compiler manifest describing the embedded ITF FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the ITF artifact asynchronously. */
export function load(): Promise<ForgeItfExports>;
/** Loads the ITF artifact synchronously. */
export function loadSync(): ForgeItfExports;
