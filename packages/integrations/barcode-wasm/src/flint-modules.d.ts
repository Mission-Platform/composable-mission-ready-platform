/**
 * Declaration-stage fallback for package-local Flint imports.
 * Concrete `*.flint.d.ts` files provide the precise export surface in normal
 * package compilation; this shared contract keeps framework component DTS
 * staging aware of the generated barcode dispatcher and family contracts.
 */
declare module '*.flint' {
  interface ForgeBarcodeFlintExports {
    readonly [name: string]: ((value: string) => string) | ((modules: ArrayLike<number>) => string);
  }

  /** Manifest metadata emitted for the embedded Flint artifact. */
  export const manifest: Readonly<Record<string, unknown>>;
  /** Load the embedded Flint artifact asynchronously. */
  export function load(): Promise<ForgeBarcodeFlintExports>;
  /** Load the embedded Flint artifact synchronously. */
  export function loadSync(): ForgeBarcodeFlintExports;
}

declare module '*.flt' {
  interface ForgeBarcodeFlintExports {
    readonly [name: string]: ((value: string) => string) | ((modules: ArrayLike<number>) => string);
  }

  export const manifest: Readonly<Record<string, unknown>>;
  export function load(): Promise<ForgeBarcodeFlintExports>;
  export function loadSync(): ForgeBarcodeFlintExports;
}
