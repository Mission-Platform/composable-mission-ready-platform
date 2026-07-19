// Public, typed wrapper around the Rust/WebAssembly 2D matrix barcode encoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/matrix-code-encode`
// Rust crate, sharing `crates/matrix-code-common`); this module provides an
// ergonomic, fully typed façade with a lazily-instantiated singleton so
// consumers never touch the raw wasm exports. The wasm is emitted under
// `../generated/encode`; the decoder counterpart lives in `../decoder`.

import wasmInit, {
  encode as wasmEncode,
  type InitInput,
  initSync as wasmInitSync,
  type SyncInitInput,
} from '../generated/encode/matrix-code-encode.js';
// The compiled encoder wasm binary. In a production bundle Vite inlines this as
// a base64 `data:` URI (the package raises `assetsInlineLimit`); in dev/test it
// resolves to a plain URL instead — see `initMatrix`/`initMatrixSync` below.
import wasmUrl from '../generated/encode/matrix-code-encode_bg.wasm?url';

/**
 * The 2D matrix symbologies this encoder supports. Passed as the first argument
 * to {@link encodeMatrix}.
 *
 * - `datamatrix` — Data Matrix (ECC 200); single-data-region square symbols
 *   (10×10 … 26×26) with automatic sizing and Reed-Solomon error correction.
 * - `gs1datamatrix` — the same Data Matrix with a leading FNC1 codeword,
 *   marking the payload as a stream of GS1 Application Identifiers.
 * - `datamatrixrectangular` — the rectangular Data Matrix symbols (8×18 …
 *   16×48), for labels where a square symbol does not fit.
 * - `aztec` — Aztec Code (compact, 1–4 layers); a square symbol with a central
 *   bullseye finder and Reed-Solomon error correction, needing no quiet zone.
 */
export type MatrixSymbology = 'datamatrix' | 'gs1datamatrix' | 'datamatrixrectangular' | 'aztec';

/**
 * The result of {@link encodeMatrix}: a grid of module bits. Square symbologies
 * report `width === height`; the rectangular Data Matrix symbols do not.
 */
export interface MatrixCode {
  /** The symbology used to encode the payload. */
  symbology: MatrixSymbology;
  /** The symbol's width in modules (excludes any quiet zone). */
  width: number;
  /** The symbol's height in modules (excludes any quiet zone). */
  height: number;
  /** Module bits, row-major, `width * height` entries: `1` = dark, `0` = light. */
  modules: number[];
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
 * Best-effort synchronous init used by the sync {@link encodeMatrix} entry
 * point. When the bundled wasm is an inlined `data:` URI (the shipped build) its
 * bytes are available immediately, so we can instantiate without any async
 * `fetch`; otherwise this is a no-op and the caller must have initialised the
 * module explicitly (see {@link initMatrix}/{@link initMatrixSync}).
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
 * so the synchronous {@link encodeMatrix} can be used afterwards.
 */
export function initMatrixSync(wasm: SyncInitInput): void {
  if (initialised) {
    return;
  }
  wasmInitSync({ module: wasm });
  initialised = true;
}

/**
 * Instantiate the WebAssembly module asynchronously, resolving once it is ready.
 * Called automatically by {@link encodeMatrixAsync}; call it yourself to warm
 * the module up front. Pass `input` (bytes, a URL, a `Response`, …) to load from
 * a custom source; omit it to use the bundled/default binary.
 */
export function initMatrix(input?: InitInput): Promise<void> {
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
      'The matrix-code WebAssembly module is not initialised. Call `await initMatrix()` (or ' +
        '`initMatrixSync(bytes)`) before the synchronous `encodeMatrix`, or use `encodeMatrixAsync`.',
    );
  }
}

/** Turn the wasm `[width, height, ...modules]` buffer into a {@link MatrixCode}, or throw. */
function toMatrixCode(symbology: MatrixSymbology, packed: Uint8Array | undefined): MatrixCode {
  if (packed === undefined || packed.length < 2) {
    throw new RangeError(`Invalid payload for the "${symbology}" matrix symbology`);
  }
  const width = packed[0];
  const height = packed[1];
  const modules = Array.from(packed.subarray(2));
  if (modules.length !== width * height) {
    throw new RangeError(`Malformed "${symbology}" symbol: expected ${width * height} modules, got ${modules.length}`);
  }
  return { symbology, width, height, modules };
}

/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, instantiating
 * the WebAssembly encoder synchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology (empty, or
 *   too large for the supported symbols).
 */
export function encodeMatrix(symbology: MatrixSymbology, data: string): MatrixCode {
  ensureSyncInit();
  assertInitialised();
  return toMatrixCode(symbology, wasmEncode(symbology, data));
}

/**
 * Encode `data` into a 2D matrix barcode of the given `symbology`, instantiating
 * the WebAssembly encoder asynchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology.
 */
export async function encodeMatrixAsync(symbology: MatrixSymbology, data: string): Promise<MatrixCode> {
  await initMatrix();
  return toMatrixCode(symbology, wasmEncode(symbology, data));
}
