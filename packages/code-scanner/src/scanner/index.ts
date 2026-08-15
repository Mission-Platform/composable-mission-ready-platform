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

// The `-wasm` package inlines its wasm binary and initializes it lazily on the
// first operation, keeping Promise-based consumers free of import-time work.
import {
  scan_and_decode as wasmScanAndDecode,
  scan_and_decode_all as wasmScanAndDecodeAll,
  scan_and_decode_roi as wasmScanAndDecodeRoi,
  type ScanOutcome,
} from '@mission-platform/code-scan-wasm';

import { scannerLog } from '../debug';
import { contrastStretchLuma, imageDataToLuma } from '../image';

import type { ImageLike, Roi, ScanFormat, ScanResult } from '../types';
import type * as ScannerWasm from '@mission-platform/code-scan-wasm';

type ScannerWasmModule = typeof ScannerWasm;

let scannerWasmPromise: Promise<ScannerWasmModule> | undefined;

/** Load the scanner lazily for callers that use the Promise-based API. */
function loadScannerWasm(): Promise<ScannerWasmModule> {
  scannerWasmPromise ??= import('@mission-platform/code-scan-wasm');
  return scannerWasmPromise;
}

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
 * Run the wasm locate-and-decode over a luma image, returning the decoded
 * {@link ScanResult}, or `null` when no code is located.
 *
 * The luma is contrast-stretched first: the wasm binariser uses a single global
 * Otsu threshold, which separates clean uploads well but struggles with the
 * glare and uneven lighting of live camera frames. Stretching the dynamic range
 * up front gives that threshold a clean, bimodal histogram to work with.
 */
function locateAndDecode(
  image: ImageLike,
  roi?: Roi,
  scanAndDecode: typeof wasmScanAndDecode = wasmScanAndDecode,
  scanAndDecodeRoi: typeof wasmScanAndDecodeRoi = wasmScanAndDecodeRoi,
): ScanResult | null {
  const luma = contrastStretchLuma(imageDataToLuma(image));
  scannerLog('scan: locating and decoding luma image', { width: luma.width, height: luma.height, roi });
  const outcome: ScanOutcome | undefined = roi
    ? scanAndDecodeRoi(
        luma.width,
        luma.height,
        luma.data,
        Math.max(0, Math.round(roi.x)),
        Math.max(0, Math.round(roi.y)),
        Math.max(0, Math.round(roi.width)),
        Math.max(0, Math.round(roi.height)),
      )
    : scanAndDecode(luma.width, luma.height, luma.data);
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
function locateAndDecodeAll(
  image: ImageLike,
  scanAndDecodeAll: typeof wasmScanAndDecodeAll = wasmScanAndDecodeAll,
): ScanResult[] {
  const luma = contrastStretchLuma(imageDataToLuma(image));
  scannerLog('scan: locating and decoding all codes', { width: luma.width, height: luma.height });
  const list = scanAndDecodeAll(luma.width, luma.height, luma.data);
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
  return locateAndDecode(image, roi);
}

/**
 * Locate and decode the first supported code in `image`, loading the
 * WebAssembly scanner asynchronously on first use. Initialisation and scan
 * failures are returned as Promise rejections.
 *
 * @param roi optional region of interest — see {@link scanImageData}.
 * @returns the {@link ScanResult}, or `null` when no code is found.
 */
export async function scanImageDataAsync(image: ImageLike, roi?: Roi): Promise<ScanResult | null> {
  const wasm = await loadScannerWasm();
  return locateAndDecode(image, roi, wasm.scan_and_decode, wasm.scan_and_decode_roi);
}

/**
 * Locate and decode *every* distinct code in `image` (not just the first),
 * instantiating the WebAssembly scanner synchronously on first use.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated;
 *   empty when nothing is decoded.
 */
export function scanImageDataAll(image: ImageLike): ScanResult[] {
  return locateAndDecodeAll(image);
}

/**
 * Locate and decode *every* distinct code in `image`, loading the WebAssembly
 * scanner asynchronously on first use. Initialisation and scan failures are
 * returned as Promise rejections.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated.
 */
export async function scanImageDataAllAsync(image: ImageLike): Promise<ScanResult[]> {
  const wasm = await loadScannerWasm();
  return locateAndDecodeAll(image, wasm.scan_and_decode_all);
}
