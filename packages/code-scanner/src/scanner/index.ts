// Code scanner façade.
//
// This is the bridge between a raw image (a decoded file upload or a live camera
// frame) and the scanner's decoded result. The entire pipeline — binarise,
// locate, sample, and decode — runs in the linked Forge Web Script scanner graph.
// The adapter owns the graph instance and converts its compact result wire format
// into the public {@link ScanResult} without exposing the FWS ABI to consumers.
import { scannerLog } from '../debug';
import { load as loadScanner, loadSync as loadScannerSync } from '../fws/scanner.fws';
import { contrastStretchLuma, imageDataToLuma } from '../image';

import type { ForgeScannerExports, ForgeScannerImports } from '../fws/scanner.fws';
import type { ImageLike, Roi, ScanFormat, ScanResult } from '../types';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

function decodeUtf8(value: string): string {
  if (value.length === 0 || value.length % 3 !== 0) return '';
  const bytes = new Uint8Array(value.length / 3);
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = Number.parseInt(value.slice(index * 3, index * 3 + 3), 10);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) return '';
    bytes[index] = byte;
  }
  try {
    return `1${textDecoder.decode(bytes)}`;
  } catch {
    return '';
  }
}

const scannerImports: ForgeScannerImports = {
  'qr.decode.utf8': { decode_utf8: decodeUtf8, matrix_decode_utf8: decodeUtf8 },
};

let scanner: ForgeScannerExports | undefined;
let scannerPromise: Promise<ForgeScannerExports> | undefined;

type ResettableScannerExports = ForgeScannerExports & { readonly fws_reset?: () => void };

function resetScannerAllocator(artifact: ForgeScannerExports): void {
  const reset = (artifact as ResettableScannerExports).fws_reset;
  reset?.();
}

function loadScannerSyncCached(): ForgeScannerExports {
  scanner ??= loadScannerSync(scannerImports);
  return scanner;
}

/** Load the scanner lazily for callers that use the Promise-based API. */
function loadScannerCached(): Promise<ForgeScannerExports> {
  if (scanner !== undefined) return Promise.resolve(scanner);
  scannerPromise ??= loadScanner(scannerImports).then((loaded) => {
    scanner = loaded;
    return loaded;
  });
  return scannerPromise;
}

/**
 * Format tags emitted by the FWS `scan_and_decode` entry point, mapped to their
 * {@link ScanFormat} name.
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

/** Convert the compact FWS result wire format into the public scan result. */
function resultFromWire(encoded: string): ScanResult | null {
  if (encoded.length < 2) return null;
  const format = FORMAT_NAMES[Number(encoded[1])];
  if (format === undefined) return null;
  if (encoded[0] === 'L') return { format, value: null };
  if (encoded[0] === 'D') return { format, value: encoded.slice(2) };
  return null;
}

interface ScannerScratch {
  readonly modules: number[];
  readonly erasures: number[];
  readonly packed: number[];
  readonly meta: number[];
}

function createScratch(width: number, height: number): ScannerScratch {
  const capacity = Math.min(width * height, 1_048_576);
  return {
    modules: new Array<number>(capacity).fill(0),
    erasures: new Array<number>(capacity).fill(0),
    packed: new Array<number>(capacity + 1).fill(0),
    meta: new Array<number>(16).fill(0),
  };
}

function scanArguments(image: ImageLike): {
  readonly luma: number[];
  readonly scratch: ScannerScratch;
  readonly width: number;
  readonly height: number;
} {
  const luma = contrastStretchLuma(imageDataToLuma(image));
  return {
    luma: Array.from(luma.data),
    scratch: createScratch(luma.width, luma.height),
    width: luma.width,
    height: luma.height,
  };
}

/**
 * Run the FWS locate-and-decode over a luma image, returning the decoded
 * {@link ScanResult}, or `null` when no code is located.
 *
 * The luma is contrast-stretched first: the scanner binariser uses a single global
 * Otsu threshold, which separates clean uploads well but struggles with the
 * glare and uneven lighting of live camera frames. Stretching the dynamic range
 * up front gives that threshold a clean, bimodal histogram to work with.
 */
function locateAndDecode(image: ImageLike, roi: Roi | undefined, artifact: ForgeScannerExports): ScanResult | null {
  resetScannerAllocator(artifact);
  const { luma, scratch, width, height } = scanArguments(image);
  scannerLog('scan: locating and decoding luma image', { width, height, roi });
  const encoded = roi
    ? artifact.scan_and_decode_roi(
        width,
        height,
        luma,
        Math.max(0, Math.round(roi.x)),
        Math.max(0, Math.round(roi.y)),
        Math.max(0, Math.round(roi.width)),
        Math.max(0, Math.round(roi.height)),
        scratch.modules,
        scratch.erasures,
        scratch.packed,
        scratch.meta,
      )
    : artifact.scan_and_decode(width, height, luma, scratch.modules, scratch.erasures, scratch.packed, scratch.meta);
  const result = resultFromWire(encoded);
  if (result === null) {
    scannerLog('scan: no code located in this frame');
    return null;
  }
  if (result.value === null) {
    scannerLog(`scan: ${result.format} located but its payload could NOT be decoded (undecodable sample)`);
  } else {
    scannerLog(`scan: ${result.format} decoded successfully`, { value: result.value });
  }
  return result;
}

/**
 * Locate and decode *every* distinct code in `image` (see the FWS
 * `scan_and_decode_all`), returning them in discovery order with duplicates
 * removed. Only successfully decoded symbols are returned.
 */
function locateAndDecodeAll(image: ImageLike, artifact: ForgeScannerExports): ScanResult[] {
  resetScannerAllocator(artifact);
  const { luma, scratch, width, height } = scanArguments(image);
  scannerLog('scan: locating and decoding all codes', { width, height });
  const encoded = artifact.scan_and_decode_all(
    width,
    height,
    luma,
    scratch.modules,
    scratch.erasures,
    scratch.packed,
    scratch.meta,
  );
  const results: ScanResult[] = [];
  for (const item of encoded.split('\u001E')) {
    const result = resultFromWire(item);
    if (result !== null) results.push(result);
  }
  scannerLog(`scan: decoded ${results.length} code(s)`);
  return results;
}

/**
 * Locate and decode the first supported code in `image`, instantiating the
 * scanner graph synchronously on first use.
 *
 * @param roi optional region of interest (image pixels) to restrict the scan to
 *   — cropped before binarisation, so surrounding clutter is ignored.
 * @returns the {@link ScanResult}, or `null` when no code is found. When a code
 *   is located but its payload can't be decoded, `result.value` is `null`.
 */
export function scanImageData(image: ImageLike, roi?: Roi): ScanResult | null {
  return locateAndDecode(image, roi, loadScannerSyncCached());
}

/**
 * Locate and decode the first supported code in `image`, loading the scanner
 * graph asynchronously on first use. Initialisation and scan
 * failures are returned as Promise rejections.
 *
 * @param roi optional region of interest — see {@link scanImageData}.
 * @returns the {@link ScanResult}, or `null` when no code is found.
 */
export async function scanImageDataAsync(image: ImageLike, roi?: Roi): Promise<ScanResult | null> {
  return locateAndDecode(image, roi, await loadScannerCached());
}

/**
 * Locate and decode *every* distinct code in `image` (not just the first),
 * instantiating the scanner graph synchronously on first use.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated;
 *   empty when nothing is decoded.
 */
export function scanImageDataAll(image: ImageLike): ScanResult[] {
  return locateAndDecodeAll(image, loadScannerSyncCached());
}

/**
 * Locate and decode *every* distinct code in `image`, loading the scanner graph
 * asynchronously on first use. Initialisation and scan failures are
 * returned as Promise rejections.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated.
 */
export async function scanImageDataAllAsync(image: ImageLike): Promise<ScanResult[]> {
  return locateAndDecodeAll(image, await loadScannerCached());
}
