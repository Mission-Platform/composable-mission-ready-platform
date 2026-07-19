// QR Code decoder façade.
//
// The decoder recovers the format info, unmasks the data region, reads the
// codewords and Reed-Solomon-corrects up to the level's error capacity, so it
// tolerates a damaged matrix. It is compiled from the `crates/qr-code-decode`
// Rust crate into a wasm module emitted under `../generated/decode`.
//
// This module owns the decoder wasm instance (`decoder`) and the public
// `decodeQr` / `decodeQrAsync` helpers, plus the package-wide initialisation
// helpers (`initQr` / `initQrSync`) that instantiate both wasm modules. For that
// coordination it imports the encoder's singleton (`../encoder`) — a one-way
// dependency (the encoder never imports the decoder), so the two paths still
// never form an import cycle. `index.ts` re-exports the public decode + init API.

import { encoder } from '../encoder';
import decodeInit, { decode as wasmDecode, initSync as decodeInitSync } from '../generated/decode/qr-code-decode.js';
// The compiled decoder wasm binary. In a production bundle Vite inlines this as
// a base64 `data:` URI (the package raises `assetsInlineLimit`); in dev/test it
// resolves to a plain URL instead — see `WasmModule` for how each is handled.
import decodeWasmUrl from '../generated/decode/qr-code-decode_bg.wasm?url';
import type { QrMatrix } from '../types';
import { WasmModule, type AsyncInit, type SyncInit, type SyncInitInput } from '../wasm-module';

/**
 * The lazily-instantiated decoder wasm module. Exported so the package entry
 * (`index.ts`) can re-export it; it is also driven by the co-located
 * `initQr`/`initQrSync` helpers below alongside the encoder singleton.
 */
export const decoder = new WasmModule(decodeInit as AsyncInit, decodeInitSync as SyncInit, decodeWasmUrl, 'decoder');

/** Pack a {@link QrMatrix} into the decoder's `[size, ...modules]` buffer. */
function packMatrix(matrix: QrMatrix): Uint8Array {
  const { size, modules } = matrix;
  const packed = new Uint8Array(1 + size * size);
  packed[0] = size;
  let offset = 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      packed[offset++] = modules[y][x] ? 1 : 0;
    }
  }
  return packed;
}

/**
 * Decode a {@link QrMatrix} back into its original text, instantiating the
 * WebAssembly decoder synchronously on first use.
 *
 * The decoder recovers the format info, unmasks the data region, reads the
 * codewords, and Reed-Solomon-corrects up to the level's error capacity, so it
 * tolerates a damaged matrix. Only the byte-mode segment produced by `encodeQr`
 * is supported.
 *
 * @returns the decoded text, or `null` when the matrix cannot be decoded.
 */
export function decodeQr(matrix: QrMatrix): string | null {
  decoder.ensureSyncInit();
  decoder.assertInitialised();
  return wasmDecode(packMatrix(matrix)) ?? null;
}

/**
 * Decode a {@link QrMatrix} back into its original text, instantiating the
 * WebAssembly decoder asynchronously on first use.
 *
 * @returns the decoded text, or `null` when the matrix cannot be decoded.
 */
export async function decodeQrAsync(matrix: QrMatrix): Promise<string | null> {
  await decoder.instantiate();
  return wasmDecode(packMatrix(matrix)) ?? null;
}

/**
 * Instantiate the encoder WebAssembly module synchronously from raw bytes (or a
 * precompiled `WebAssembly.Module`), and optionally the decoder module too. Use
 * this in non-bundled environments — e.g. Node or a test runner — where the
 * inlined `data:` URI isn't available, so the synchronous
 * {@link decodeQr} (and the encoder's `encodeQr`) can be used afterwards.
 */
export function initQrSync(encode: SyncInitInput, decode?: SyncInitInput): void {
  encoder.instantiateSync(encode);
  if (decode !== undefined) {
    decoder.instantiateSync(decode);
  }
}

/**
 * Instantiate both WebAssembly modules (encoder + decoder) asynchronously,
 * resolving once they are ready. Called automatically by the `*Async` helpers;
 * call it yourself to warm the modules up front.
 */
export function initQr(): Promise<void> {
  return Promise.all([encoder.instantiate(), decoder.instantiate()]).then(() => undefined);
}
