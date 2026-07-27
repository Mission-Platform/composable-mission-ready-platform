// Code scanner façade.
//
// This is the bridge between a raw image (a decoded file upload or a live camera
// frame) and the scanner's decoded result. The *entire* pipeline — binarise,
// locate the finder patterns, sample the module grid, and decode — runs in one
// WebAssembly call (compiled from the `crates/code-scan` Rust crate into
// `../generated/scan`), which links the QR, Data Matrix and 1D barcode decoders
// directly. This module owns that wasm instance and turns its `ScanOutcome` into
// a {@link ScanResult}; no second decoder wasm module and no re-crossing of the
// wasm↔JS boundary are involved.

import { scannerLog } from '../debug';
import scanInit, {
  initSync as scanInitSync,
  scan_and_decode as wasmScanAndDecode,
  scan_and_decode_all as wasmScanAndDecodeAll,
  scan_and_decode_roi as wasmScanAndDecodeRoi,
  type ScanOutcome,
} from '../generated/scan/code-scan.js';
// The compiled scanner wasm binary. In a production bundle Vite inlines this as
// a base64 `data:` URI (the package raises `assetsInlineLimit`); in dev/test it
// resolves to a plain URL instead — see `WasmModule` for how each is handled.
import scanWasmUrl from '../generated/scan/code-scan_bg.wasm?url';
import { contrastStretchLuma, imageDataToLuma } from '../image';
import { type AsyncInit, type InitInput, type SyncInit, type SyncInitInput, WasmModule } from '../wasm-module';

import type { ImageLike, Roi, ScanFormat, ScanResult } from '../types';

/**
 * Format tags emitted by the wasm `scan_and_decode` entry point (see the Rust
 * crate), mapped to their {@link ScanFormat} name.
 */
const FORMAT_NAMES: Readonly<Record<number, ScanFormat>> = {
  0: 'qr',
  1: 'datamatrix',
  2: 'barcode',
  3: 'aztec',
  4: 'pdf417',
  5: 'databar',
  6: 'maxicode',
};

/**
 * Convert a wasm-owned {@link ScanOutcome} into a {@link ScanResult}, reading its
 * fields out and freeing the underlying wasm struct.
 */
function outcomeToResult(outcome: ScanOutcome): ScanResult {
  const format = FORMAT_NAMES[outcome.format] ?? 'qr';
  const decoded = outcome.value;
  outcome.free();
  return { format, value: decoded ?? null };
}

/**
 * The lazily-instantiated scanner wasm module. Exported so the package entry
 * (`index.ts`) can re-export it and drive the `initCodeScanner*` helpers.
 */
export const scanner = new WasmModule(scanInit as AsyncInit, scanInitSync as SyncInit, scanWasmUrl, 'scanner');

/**
 * Run the wasm locate-and-decode over a luma image, returning the decoded
 * {@link ScanResult}, or `null` when no code is located.
 *
 * The luma is contrast-stretched first: the wasm binariser uses a single global
 * Otsu threshold, which separates clean uploads well but struggles with the
 * glare and uneven lighting of live camera frames. Stretching the dynamic range
 * up front gives that threshold a clean, bimodal histogram to work with.
 */
function locateAndDecode(image: ImageLike, roi?: Roi): ScanResult | null {
  const luma = contrastStretchLuma(imageDataToLuma(image));
  scannerLog('scan: locating and decoding luma image', { width: luma.width, height: luma.height, roi });
  const outcome: ScanOutcome | undefined = roi
    ? wasmScanAndDecodeRoi(
        luma.width,
        luma.height,
        luma.data,
        Math.max(0, Math.round(roi.x)),
        Math.max(0, Math.round(roi.y)),
        Math.max(0, Math.round(roi.width)),
        Math.max(0, Math.round(roi.height)),
      )
    : wasmScanAndDecode(luma.width, luma.height, luma.data);
  if (outcome === undefined) {
    scannerLog('scan: no code located in this frame');
    return null;
  }
  const result = outcomeToResult(outcome);
  if (result.value === null) {
    scannerLog(`scan: ${result.format} located but its payload could NOT be decoded (undecodable sample)`);
  } else {
    scannerLog(`scan: ${result.format} decoded successfully`, { value: result.value });
  }
  return result;
}

/**
 * Locate and decode *every* distinct code in `image` (see the wasm
 * `scan_and_decode_all`), returning them in discovery order with duplicates
 * removed. Only successfully decoded symbols are returned.
 */
function locateAndDecodeAll(image: ImageLike): ScanResult[] {
  const luma = contrastStretchLuma(imageDataToLuma(image));
  scannerLog('scan: locating and decoding all codes', { width: luma.width, height: luma.height });
  const list = wasmScanAndDecodeAll(luma.width, luma.height, luma.data);
  const results: ScanResult[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const outcome = list.get(index);
    if (outcome !== undefined) {
      results.push(outcomeToResult(outcome));
    }
  }
  list.free();
  scannerLog(`scan: decoded ${results.length} code(s)`);
  return results;
}

/**
 * Instantiate the scanner WebAssembly module synchronously from raw bytes (or a
 * precompiled `WebAssembly.Module`). Use this in non-bundled environments — e.g.
 * Node or a test runner — where the inlined `data:` URI isn't available, so the
 * synchronous {@link scanImageData} can be used afterwards.
 */
export function initCodeScannerSync(wasm: SyncInitInput): void {
  scanner.instantiateSync(wasm);
}

/**
 * Instantiate the scanner WebAssembly module asynchronously, resolving once it
 * is ready. Call it yourself to warm the module up front; {@link scanImageDataAsync}
 * calls it automatically.
 */
export function initCodeScanner(input?: InitInput): Promise<void> {
  return scanner.instantiate(input);
}

/**
 * Locate and decode the first supported code (QR, Data Matrix, Aztec or 1D
 * barcode) in `image`, instantiating the WebAssembly scanner synchronously on
 * first use.
 *
 * @param roi optional region of interest (image pixels) to restrict the scan to
 *   — cropped in wasm before binarisation, so surrounding clutter is ignored.
 * @returns the {@link ScanResult}, or `null` when no code is found. When a code
 *   is located but its payload can't be decoded, `result.value` is `null`.
 */
export function scanImageData(image: ImageLike, roi?: Roi): ScanResult | null {
  scanner.ensureSyncInit();
  scanner.assertInitialised();
  return locateAndDecode(image, roi);
}

/**
 * Locate and decode the first supported code in `image`, instantiating the
 * WebAssembly scanner asynchronously on first use.
 *
 * @param roi optional region of interest — see {@link scanImageData}.
 * @returns the {@link ScanResult}, or `null` when no code is found.
 */
export async function scanImageDataAsync(image: ImageLike, roi?: Roi): Promise<ScanResult | null> {
  await initCodeScanner();
  return locateAndDecode(image, roi);
}

/**
 * Locate and decode *every* distinct code in `image` (not just the first),
 * instantiating the WebAssembly scanner synchronously on first use.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated;
 *   empty when nothing is decoded.
 */
export function scanImageDataAll(image: ImageLike): ScanResult[] {
  scanner.ensureSyncInit();
  scanner.assertInitialised();
  return locateAndDecodeAll(image);
}

/**
 * Locate and decode *every* distinct code in `image`, instantiating the
 * WebAssembly scanner asynchronously on first use.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated.
 */
export async function scanImageDataAllAsync(image: ImageLike): Promise<ScanResult[]> {
  await initCodeScanner();
  return locateAndDecodeAll(image);
}
