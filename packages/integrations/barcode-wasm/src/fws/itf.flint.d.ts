export interface ForgeItfExports {
  /** Encodes an even-length numeric payload as Interleaved 2 of 5. */
  readonly encode_itf: (value: string) => string;
  /** Encodes or validates a 13/14-digit ITF-14 GTIN payload. */
  readonly encode_itf14: (value: string) => string;
}

/** Compiler manifest describing the embedded ITF Flint artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the ITF artifact asynchronously. */
export function load(): Promise<ForgeItfExports>;
/** Loads the ITF artifact synchronously. */
export function loadSync(): ForgeItfExports;
