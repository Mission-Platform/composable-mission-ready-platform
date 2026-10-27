/**
 * Multi-memory bank configuration for WebAssembly targets.
 * Supports segregating guest heap, host interop channel, and scratch arenas.
 */
export interface WasmMemoryBank {
  readonly id: number;
  readonly name: string;
  readonly initialPages: number;
  readonly maximumPages?: number;
  readonly shared?: boolean;
}

export interface WasmMultiMemoryConfig {
  readonly banks: readonly WasmMemoryBank[];
}

export const DEFAULT_WASM_MULTI_MEMORY: WasmMultiMemoryConfig = {
  banks: [
    { id: 0, name: "heap", initialPages: 2, maximumPages: 256 },
    { id: 1, name: "interop", initialPages: 1, maximumPages: 16 },
  ],
};
