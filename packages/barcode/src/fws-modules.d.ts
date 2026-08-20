/**
 * Declaration-stage fallback for package-local Forge Web Script imports.
 * Concrete `*.fws.d.ts` files provide the precise export surface in normal
 * package compilation; this shared contract keeps framework component DTS
 * staging aware of the generated barcode dispatcher and family contracts.
 */
declare module '*.fws' {
  interface ForgeBarcodeFwsExports {
    readonly [name: string]: ((value: string) => string) | ((modules: ArrayLike<number>) => string);
  }

  /** Manifest metadata emitted for the embedded FWS artifact. */
  export const manifest: Readonly<Record<string, unknown>>;
  /** Load the embedded FWS artifact asynchronously. */
  export function load(): Promise<ForgeBarcodeFwsExports>;
  /** Load the embedded FWS artifact synchronously. */
  export function loadSync(): ForgeBarcodeFwsExports;
}
