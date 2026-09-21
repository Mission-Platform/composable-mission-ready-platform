export interface ForgePharmacodeExports {
  /** Encodes a value in the inclusive Pharmacode range 3..131070. */
  readonly encode_pharmacode: (value: string) => string;
}

/** Compiler manifest describing the embedded Pharmacode Flint artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the Pharmacode artifact asynchronously. */
export function load(): Promise<ForgePharmacodeExports>;
/** Loads the Pharmacode artifact synchronously. */
export function loadSync(): ForgePharmacodeExports;
