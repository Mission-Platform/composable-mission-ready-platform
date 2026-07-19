// Public, typed wrapper around the Rust/WebAssembly 2D matrix barcode decoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/matrix-code-decode`
// Rust crate, sharing `crates/matrix-code-common`), the inverse of the encoder:
// it takes a {@link MatrixCode} and recovers the original payload. This façade
// mirrors the encoder's lazy-singleton loading so consumers never touch the raw
// wasm exports.

import wasmInit, {
  decode as wasmDecode,
  type InitInput,
  initSync as wasmInitSync,
  type SyncInitInput,
} from '../generated/decode/matrix-code-decode.js';
// The compiled decoder wasm binary (inlined as a base64 `data:` URI in the
// shipped build; a plain URL in dev/test — see `initMatrixDecode` below).
import wasmUrl from '../generated/decode/matrix-code-decode_bg.wasm?url';

import type { MatrixCode } from '../encoder';

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
 * so the synchronous {@link decodeMatrix} can be used afterwards.
 */
export function initMatrixDecodeSync(wasm: SyncInitInput): void {
  if (initialised) {
    return;
  }
  wasmInitSync({ module: wasm });
  initialised = true;
}

/**
 * Instantiate the WebAssembly module asynchronously, resolving once it is ready.
 * Called automatically by {@link decodeMatrixAsync}; call it yourself to warm the
 * module up front. Pass `input` to load from a custom source; omit it to use the
 * bundled/default binary.
 */
export function initMatrixDecode(input?: InitInput): Promise<void> {
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
      'The matrix-code decoder WebAssembly module is not initialised. Call `await initMatrixDecode()` ' +
        '(or `initMatrixDecodeSync(bytes)`) before the synchronous `decodeMatrix`, or use `decodeMatrixAsync`.',
    );
  }
}

/** Pack a {@link MatrixCode} into the decoder's `[width, height, ...modules]` buffer. */
function packMatrix(matrix: MatrixCode): Uint8Array {
  const packed = new Uint8Array(2 + matrix.modules.length);
  packed[0] = matrix.width;
  packed[1] = matrix.height;
  packed.set(matrix.modules, 2);
  return packed;
}

/**
 * Decode a 2D matrix symbol back into its payload, instantiating the WebAssembly
 * decoder synchronously on first use. Returns `null` when the symbol is too
 * damaged to recover or its symbology is unsupported.
 *
 * Reed-Solomon error correction repairs a symbol with a limited number of
 * flipped modules, so a lightly damaged {@link MatrixCode} still decodes.
 */
export function decodeMatrix(matrix: MatrixCode): string | null {
  ensureSyncInit();
  assertInitialised();
  return wasmDecode(matrix.symbology, packMatrix(matrix)) ?? null;
}

/**
 * Decode a 2D matrix symbol back into its payload, instantiating the WebAssembly
 * decoder asynchronously on first use. See {@link decodeMatrix}.
 */
export async function decodeMatrixAsync(matrix: MatrixCode): Promise<string | null> {
  await initMatrixDecode();
  return wasmDecode(matrix.symbology, packMatrix(matrix)) ?? null;
}
