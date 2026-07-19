// Public, typed wrapper around the Rust/WebAssembly 1D (linear) barcode decoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/barcode-decode`
// Rust crate, sharing `crates/barcode-common`); this module provides an
// ergonomic, fully typed façade with a lazily-instantiated singleton mirroring
// the encoder. Given a clean run of module bits (as produced by
// {@link encodeBarcode}), it recovers the original payload for every supported
// {@link BarcodeSymbology}.

import wasmInit, {
  decode as wasmDecode,
  type InitInput,
  initSync as wasmInitSync,
  type SyncInitInput,
} from '../generated/decode/barcode-decode.js';
// The compiled decoder wasm binary (inlined as a base64 `data:` URI in the
// shipped build; a plain URL in dev/test — see `initBarcodeDecode` below).
import wasmUrl from '../generated/decode/barcode-decode_bg.wasm?url';

import type { BarcodeSymbology } from '../encoder';

/** `true` once the wasm module has been instantiated and its exports are live. */
let initialised = false;
/** Memoised in-flight async initialisation, so concurrent callers share one load. */
let initPromise: Promise<void> | undefined;

/**
 * Decode a base64 string to bytes. Prefers the native `Uint8Array.fromBase64`
 * (available on recent runtimes) and falls back to `Buffer` (Node) or `atob`
 * (browser) so the inlined wasm can be instantiated on any target.
 */
function decodeBase64(base64: string): Uint8Array {
  const constructor = Uint8Array as typeof Uint8Array & {
    fromBase64?: (value: string) => Uint8Array;
  };
  if (typeof constructor.fromBase64 === 'function') {
    return constructor.fromBase64(base64);
  }
  const runtime = globalThis as {
    Buffer?: { from(input: string, encoding: string): Uint8Array };
    atob?: (data: string) => string;
  };
  if (runtime.Buffer !== undefined) {
    return new Uint8Array(runtime.Buffer.from(base64, 'base64'));
  }
  const binary = runtime.atob!(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Best-effort synchronous init from the inlined `data:` URI (shipped build). */
function ensureSyncInit(): void {
  if (initialised || !wasmUrl.startsWith('data:')) {
    return;
  }
  wasmInitSync({ module: decodeBase64(wasmUrl.slice(wasmUrl.indexOf(',') + 1)) });
  initialised = true;
}

/**
 * Instantiate the WebAssembly module synchronously from raw bytes (or a
 * precompiled `WebAssembly.Module`). Use this in non-bundled environments —
 * e.g. Node or a test runner — where the inlined `data:` URI isn't available,
 * so the synchronous {@link decodeBarcode} can be used afterwards.
 */
export function initBarcodeDecodeSync(wasm: SyncInitInput): void {
  if (initialised) {
    return;
  }
  wasmInitSync({ module: wasm });
  initialised = true;
}

/**
 * Instantiate the WebAssembly module asynchronously, resolving once it is ready.
 * Called automatically by {@link decodeBarcodeAsync}; call it yourself to warm
 * the module up front. Pass `input` to load from a custom source; omit it to use
 * the bundled/default binary.
 */
export function initBarcodeDecode(input?: InitInput): Promise<void> {
  if (initialised) {
    return Promise.resolve();
  }
  if (!initPromise) {
    const source: InitInput | undefined =
      input ?? (wasmUrl.startsWith('data:') ? decodeBase64(wasmUrl.slice(wasmUrl.indexOf(',') + 1)) : wasmUrl);
    initPromise = wasmInit(source === undefined ? undefined : { module_or_path: source })
      .then(() => {
        initialised = true;
      })
      .catch((error: unknown) => {
        initPromise = undefined;
        throw error;
      });
  }
  return initPromise;
}

/** Guard the synchronous entry point with a clear error when uninitialised. */
function assertInitialised(): void {
  if (!initialised) {
    throw new Error(
      'The barcode decoder WebAssembly module is not initialised. Call `await initBarcodeDecode()` ' +
        '(or `initBarcodeDecodeSync(bytes)`) before the synchronous `decodeBarcode`, or use `decodeBarcodeAsync`.',
    );
  }
}

/**
 * Decode a run of module bits (`1` = bar, `0` = space) of the given `symbology`
 * back into its payload, instantiating the WebAssembly decoder synchronously on
 * first use.
 *
 * Returns `null` when the module run is not a valid symbol of `symbology` (bad
 * framing, an unrecognised pattern, or a failing check digit). The recovered
 * payload is the symbology's canonical form — e.g. recomputed check digits are
 * included, Code 39/93 text is upper-cased, and UPC-E is returned in its
 * `number system + digits + check` form.
 */
export function decodeBarcode(symbology: BarcodeSymbology, modules: ArrayLike<number>): string | null {
  ensureSyncInit();
  assertInitialised();
  return wasmDecode(symbology, Uint8Array.from(modules)) ?? null;
}

/**
 * Decode a run of module bits back into its payload, instantiating the
 * WebAssembly decoder asynchronously on first use. See {@link decodeBarcode}.
 */
export async function decodeBarcodeAsync(
  symbology: BarcodeSymbology,
  modules: ArrayLike<number>,
): Promise<string | null> {
  await initBarcodeDecode();
  return wasmDecode(symbology, Uint8Array.from(modules)) ?? null;
}
