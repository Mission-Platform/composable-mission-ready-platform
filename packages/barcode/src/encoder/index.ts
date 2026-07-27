// Public, typed wrapper around the Rust/WebAssembly 1D (linear) barcode encoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/barcode-encode`
// Rust crate, sharing `crates/barcode-common`); this module provides an
// ergonomic, fully typed façade with a lazily-instantiated singleton so
// consumers never touch the raw wasm exports. The wasm is emitted under
// `../generated/encode`; the decoder counterpart lives in `../decoder`.

import wasmInit, {
  encode as wasmEncode,
  type InitInput,
  initSync as wasmInitSync,
  type SyncInitInput,
} from '../generated/encode/barcode-encode.js';
// The compiled encoder wasm binary. In a production bundle Vite inlines this as
// a base64 `data:` URI (the package raises `assetsInlineLimit`); in dev/test it
// resolves to a plain URL instead — see `initBarcode`/`initBarcodeSync` below.
import wasmUrl from '../generated/encode/barcode-encode_bg.wasm?url';

/**
 * The linear symbologies this encoder supports. Passed as the first argument to
 * {@link encodeBarcode}.
 *
 * - `code128` — high density; Code B for printable ASCII, Code C for even-length
 *   digit strings.
 * - `gs1-128` — Code 128 with a leading FNC1 (a stream of GS1 Application
 *   Identifiers).
 * - `code39` / `code39ext` — alphanumeric, self-checking (auto-framed with `*`);
 *   the `ext` variant encodes the full 7-bit ASCII range via shift characters.
 * - `code93` / `code93ext` — compact, self-checking (two check characters); the
 *   `ext` variant encodes the full 7-bit ASCII range.
 * - `ean13` / `ean8` / `upca` — fixed-length retail digit codes; the trailing
 *   check digit is computed when omitted, or verified when supplied.
 * - `upce` — the zero-suppressed UPC; 6 digits (number system `0`) or a full
 *   7/8-digit `number system + digits [+ check]` form.
 * - `itf` — Interleaved 2 of 5; requires an even number of digits.
 * - `itf14` — the fixed 14-digit GTIN-14 (13 digits + computed check, or 14 with
 *   verified check).
 * - `codabar` — digits plus `-$:/.+` (auto-framed with `A` start/stop).
 * - `msi` — MSI / Modified Plessey (digits, with an appended mod-10 check).
 * - `pharmacode` — the Laetus pharmaceutical binary code (`3`–`131070`).
 */
export type BarcodeSymbology =
  | 'code128'
  | 'gs1-128'
  | 'code39'
  | 'code39ext'
  | 'code93'
  | 'code93ext'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'itf'
  | 'itf14'
  | 'codabar'
  | 'msi'
  | 'pharmacode';

/** The result of {@link encodeBarcode}: a run of module bits with its width. */
export interface Barcode {
  /** The symbology used to encode the payload. */
  symbology: BarcodeSymbology;
  /** Module bits, one per unit-width module: `1` = bar, `0` = space. */
  modules: number[];
  /** Total width in modules (`modules.length`); excludes any quiet zone. */
  width: number;
}

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

/**
 * Best-effort synchronous init used by the sync {@link encodeBarcode} entry
 * point. When the bundled wasm is an inlined `data:` URI (the shipped build) its
 * bytes are available immediately, so we can instantiate without any async
 * `fetch`; otherwise this is a no-op and the caller must have initialised the
 * module explicitly (see {@link initBarcode}/{@link initBarcodeSync}).
 */
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
 * so the synchronous {@link encodeBarcode} can be used afterwards.
 */
export function initBarcodeSync(wasm: SyncInitInput): void {
  if (initialised) {
    return;
  }
  wasmInitSync({ module: wasm });
  initialised = true;
}

/**
 * Instantiate the WebAssembly module asynchronously, resolving once it is ready.
 * Called automatically by {@link encodeBarcodeAsync}; call it yourself to warm
 * the module up front. Pass `input` (bytes, a URL, a `Response`, …) to load from
 * a custom source; omit it to use the bundled/default binary.
 */
export function initBarcode(input?: InitInput): Promise<void> {
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
        // Allow a later retry rather than caching the rejection forever.
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
      'The barcode WebAssembly module is not initialised. Call `await initBarcode()` (or ' +
        '`initBarcodeSync(bytes)`) before the synchronous `encodeBarcode`, or use `encodeBarcodeAsync`.',
    );
  }
}

/** Turn the wasm module-bit buffer into a {@link Barcode}, or throw when invalid. */
function toBarcode(symbology: BarcodeSymbology, modules: Uint8Array | undefined): Barcode {
  if (modules === undefined || modules.length === 0) {
    throw new RangeError(`Invalid payload for the "${symbology}" barcode symbology`);
  }
  return { symbology, modules: [...modules], width: modules.length };
}

/**
 * Encode `data` into a linear barcode of the given `symbology`, instantiating
 * the WebAssembly encoder synchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology (bad
 *   characters, wrong length, failing check digit, …).
 */
export function encodeBarcode(symbology: BarcodeSymbology, data: string): Barcode {
  ensureSyncInit();
  assertInitialised();
  return toBarcode(symbology, wasmEncode(symbology, data));
}

/**
 * Encode `data` into a linear barcode of the given `symbology`, instantiating
 * the WebAssembly encoder asynchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology.
 */
export async function encodeBarcodeAsync(symbology: BarcodeSymbology, data: string): Promise<Barcode> {
  await initBarcode();
  return toBarcode(symbology, wasmEncode(symbology, data));
}
