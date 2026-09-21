/**
 * Generic dictionary describing a virtual module ABI manifest.
 */
interface FlintVirtualManifest {
  readonly [key: string]: unknown;
}

/**
 * Exported function and object members provided by a loaded virtual Flint module.
 */
interface FlintVirtualExports {
  readonly [key: string]: unknown;
}

declare module '*.flint' {
  export const manifest: FlintVirtualManifest;
  export const abiManifest: FlintVirtualManifest;
  /**
   * Asynchronously loads and instantiates the WebAssembly module with optional host imports.
   *
   * @param imports - Optional capability imports object.
   * @returns Promise resolving to the module exports.
   */
  export function load<TExports extends FlintVirtualExports = FlintVirtualExports>(
    imports?: Record<string, Record<string, (...arguments_: readonly unknown[]) => unknown>>,
  ): Promise<TExports>;
  /**
   * Synchronously loads and instantiates the WebAssembly module with optional host imports.
   *
   * @param imports - Optional capability imports object.
   * @returns Module exports.
   */
  export function loadSync<TExports extends FlintVirtualExports = FlintVirtualExports>(
    imports?: Record<string, Record<string, (...arguments_: readonly unknown[]) => unknown>>,
  ): TExports;
}

declare module '*.flint?flint-manifest' {
  const manifest: FlintVirtualManifest;
  export { manifest };
  export default manifest;
}

declare module '*.flint?flint-declarations' {
  export const declarations: string;
  export const graphMetadata: {
    readonly contentHash: string;
    readonly graphHash?: string;
    readonly linkMode?: 'static' | 'dynamic';
    readonly linkedModules?: readonly string[];
  };
  export const selfHostedMetadata: unknown;
  export default declarations;
}

declare module '*.flint?flint-wasm' {
  const wasm: Uint8Array;
  export default wasm;
}

declare module '*.flint?flint-artifact' {
  export const wasm: Uint8Array;
  export const manifest: FlintVirtualManifest;
  export const declarations: string;
  export const graphMetadata: {
    readonly contentHash: string;
    readonly graphHash?: string;
    readonly linkMode?: 'static' | 'dynamic';
    readonly linkedModules?: readonly string[];
  };
}

declare module '*.flint?flint-source-map' {
  const sourceMap: {
    readonly sourcesContent?: readonly string[];
    readonly [key: string]: unknown;
  };
  export { sourceMap };
  export default sourceMap;
}
