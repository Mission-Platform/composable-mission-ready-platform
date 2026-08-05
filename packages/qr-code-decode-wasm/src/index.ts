// Self-contained, synchronously-initialised wrapper around the wasm-pack
// (bundler target) glue for the `qr-code-decode` Rust crate.
//
// wasm-pack emits the wasm-bindgen bindings into `src/wasm/*`, keeping the
// `_bg.wasm` binary as a separate file. This module inlines that binary as a
// base64 string at tsdown build time (see the inline plugin in
// `tsdown.config.ts`), decodes it, and instantiates the module *synchronously*
// at import — wiring the instance into the generated bindings exactly like the
// bundler-target entry would — so consumers just import the ready-to-use
// `decode` function with no async initialisation step.
import * as bindings from "./wasm/qr-code-decode_bg.js";
import wasmBase64 from "./wasm/qr-code-decode_bg.wasm";

import type * as WasmApi from "./wasm/qr-code-decode.js";

/**
 * Decode a base64 string to bytes. Prefers the native `Uint8Array.fromBase64`
 * (available on recent runtimes) and falls back to `Buffer` (Node) or `atob`
 * (browser) so the inlined wasm can be instantiated on any target.
 */
function toBytes(base64: string): Uint8Array {
  const constructor = Uint8Array as typeof Uint8Array & {
    fromBase64?: (value: string) => Uint8Array;
  };
  if (typeof constructor.fromBase64 === "function") {
    return constructor.fromBase64(base64);
  }
  const runtime = globalThis as {
    Buffer?: { from(input: string, encoding: string): Uint8Array };
    atob?: (data: string) => string;
  };
  if (runtime.Buffer !== undefined) {
    return new Uint8Array(runtime.Buffer.from(base64, "base64"));
  }
  const binary = runtime.atob!(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }
  return bytes;
}

// The wasm binary imports its JS helpers from the `_bg.js` module, so hand that
// namespace in as the import object, then give the bindings the live instance
// exports and run the wasm-bindgen start hook.
const glue = bindings as unknown as typeof WasmApi & {
  __wbg_set_wasm(value: unknown): void;
};
const instance = new WebAssembly.Instance(
  new WebAssembly.Module(toBytes(wasmBase64)),
  {
    "./qr-code-decode_bg.js": bindings as unknown as WebAssembly.ModuleImports,
  },
);
glue.__wbg_set_wasm(instance.exports);
(instance.exports as { __wbindgen_start: () => void }).__wbindgen_start();

/**
 * Decode a packed `[size, ...modules]` QR Code matrix (row-major, `1` = dark)
 * back into its original text. Returns `undefined` when the matrix cannot be
 * decoded. The wasm module is already instantiated, so this is fully
 * synchronous.
 */
export const decode: typeof WasmApi.decode = glue.decode;
