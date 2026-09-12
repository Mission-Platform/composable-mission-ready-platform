export interface ForgeMsiExports {
  /** Encodes numeric text as MSI with its mod-10 check digit. */
  readonly encode_msi: (value: string) => string;
}

/** Compiler manifest describing the embedded MSI FWS artifact. */
export const manifest: Readonly<Record<string, unknown>>;
/** Loads the MSI artifact asynchronously. */
export function load(): Promise<ForgeMsiExports>;
/** Loads the MSI artifact synchronously. */
export function loadSync(): ForgeMsiExports;
