// Self-contained, synchronously-initialised wrapper around the wasm-pack
// (bundler target) glue for the `code-scan` Rust crate.
//
// wasm-pack emits the wasm-bindgen bindings into `src/wasm/*`, keeping the
// `_bg.wasm` binary as a separate file. This module inlines that binary as a
// base64 string at tsdown build time (see the inline plugin in
// `tsdown.config.ts`), decodes it, and instantiates the module *synchronously*
// at import — wiring the instance into the generated bindings exactly like the
// bundler-target entry would — so consumers just import the ready-to-use scan
// functions and result classes with no async initialisation step.
import * as bindings from "./wasm/code-scan_bg.js";
import wasmBase64 from "./wasm/code-scan_bg.wasm";

import type * as WasmApi from "./wasm/code-scan.js";

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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

// The wasm binary imports its JS helpers from the `_bg.js` module, so hand that
// namespace in as the import object, then give the bindings the live instance
// exports and run the wasm-bindgen start hook.
const glue = bindings as unknown as typeof WasmApi & {
  __wbg_set_wasm(value: unknown): void;
};
const instance = new WebAssembly.Instance(
  new WebAssembly.Module(toArrayBuffer(toBytes(String(wasmBase64)))),
  {
    "./code-scan_bg.js": bindings as unknown as WebAssembly.ModuleImports,
  },
);
glue.__wbg_set_wasm(instance.exports);
(instance.exports as { __wbindgen_start: () => void }).__wbindgen_start();

/** The decoded result of a single located symbol (`format` tag + `value`). */
export const ScanOutcome: typeof WasmApi.ScanOutcome = glue.ScanOutcome;
export type ScanOutcome = WasmApi.ScanOutcome;

/** An indexed list of {@link ScanOutcome}s returned by `scan_and_decode_all`. */
export const ScanOutcomeList: typeof WasmApi.ScanOutcomeList =
  glue.ScanOutcomeList;
export type ScanOutcomeList = WasmApi.ScanOutcomeList;

/** A human-readable build stamp for the scanner wasm build. */
export const build_info: typeof WasmApi.build_info = glue.build_info;

/** Locate the first supported code and return a tagged `[format, ...payload]` buffer. */
export const scan: typeof WasmApi.scan = glue.scan;

/** Locate **and decode** the first supported code (QR → Data Matrix → 1D barcode). */
export const scan_and_decode: typeof WasmApi.scan_and_decode =
  glue.scan_and_decode;

/** Locate and decode **every** distinct code in the image (deduplicated). */
export const scan_and_decode_all: typeof WasmApi.scan_and_decode_all =
  glue.scan_and_decode_all;

/** Locate and decode the first supported code inside a rectangular region of interest. */
export const scan_and_decode_roi: typeof WasmApi.scan_and_decode_roi =
  glue.scan_and_decode_roi;

/** Locate and sample a 1D barcode, returning its flat run of module bits. */
export const scan_barcode: typeof WasmApi.scan_barcode = glue.scan_barcode;

/** Locate and sample a Data Matrix symbol, returning its packed `[size, ...modules]`. */
export const scan_matrix: typeof WasmApi.scan_matrix = glue.scan_matrix;

/** Locate and sample a QR symbol, returning its packed `[size, ...modules]`. */
export const scan_qr: typeof WasmApi.scan_qr = glue.scan_qr;

/**
 * Initialise optional in-browser diagnostics. The Rust tracing hook is
 * process-global, so repeated calls are harmless when another scanner has
 * already installed the dispatcher.
 */
export const start: typeof WasmApi.start = (...arguments_) => {
  try {
    return glue.start(...arguments_);
  } catch (error) {
    if (String(error).includes("SetGlobalDefaultError")) {
      return;
    }
    throw error;
  }
};
