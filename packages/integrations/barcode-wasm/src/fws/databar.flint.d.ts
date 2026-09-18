export interface ForgeDataBarExports {
  /** Validates a GTIN-14 value and its check digit. */
  readonly validate_databar_gtin: (value: string) => boolean;
}

/** Compiler manifest for the embedded GS1 DataBar Flint artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the GS1 DataBar Flint artifact asynchronously. */
export function load(): Promise<ForgeDataBarExports>;
/** Loads the GS1 DataBar Flint artifact synchronously. */
export function loadSync(): ForgeDataBarExports;
