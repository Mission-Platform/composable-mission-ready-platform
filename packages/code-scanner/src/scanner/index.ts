// Code scanner façade.
//
// This is the bridge between a raw image (a decoded file upload or a live camera
// frame) and the scanner's decoded result. The entire pipeline — binarise,
// locate, sample, and decode — runs in the linked Forge Web Script scanner graph.
// The adapter owns the graph instance and converts its compact result wire format
// into the public {@link ScanResult} without exposing the FWS ABI to consumers.
import { scannerLog } from '../debug';
import { load as loadScanner, loadRaw, loadRawSync, loadSync as loadScannerSync } from '../fws/scanner.fws';
import { imageDataToContrastStretchLuma } from '../image';

import type {
  ForgeScannerExports,
  ForgeScannerImports,
  ForgeScannerRawBytes,
  ForgeScannerRawExports,
  ForgeScannerRawImports,
} from '../fws/scanner.fws';
import type { ImageLike, Roi, ScanFormat, ScanResult } from '../types';

const textDecoder = new TextDecoder('utf-8', { fatal: true });
const textEncoder = new TextEncoder();

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

type RawScannerExports = ForgeScannerRawExports;
type RawString = ForgeScannerRawBytes;

function rawDecodeUtf8(artifact: RawScannerExports | undefined, pointer: number, length: number): RawString {
  if (artifact === undefined) throw new Error('The raw scanner loader was not initialized.');
  const encoded = textDecoder.decode(new Uint8Array(artifact.memory.buffer, pointer, length));
  const decoded = decodeUtf8(encoded);
  if (decoded.length === 0) return [0, 0];
  const bytes = textEncoder.encode(decoded);
  const resultPointer = artifact.fws_alloc(bytes.byteLength);
  new Uint8Array(artifact.memory.buffer, resultPointer, bytes.byteLength).set(bytes);
  return [resultPointer, bytes.byteLength];
}

function rawScannerImports(getArtifact: () => RawScannerExports | undefined): ForgeScannerRawImports {
  const decode = (pointer: number, length: number): RawString => rawDecodeUtf8(getArtifact(), pointer, length);
  return { 'qr.decode.utf8': { decode_utf8: decode, matrix_decode_utf8: decode } };
}

function loadRawScannerSync(): RawScannerExports {
  let artifact: RawScannerExports | undefined;
  artifact = loadRawSync(rawScannerImports(() => artifact));
  return artifact;
}

async function loadRawScanner(): Promise<RawScannerExports> {
  let artifact: RawScannerExports | undefined;
  artifact = await loadRaw(rawScannerImports(() => artifact));
  return artifact;
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
  readonly modules: Int32Array;
  readonly erasures: Int32Array;
  readonly packed: Int32Array;
  readonly meta: Int32Array;
}

function createScratch(width: number, height: number): ScannerScratch {
  const capacity = Math.min(width * height, 1_048_576);
  return {
    modules: new Int32Array(capacity),
    erasures: new Int32Array(capacity),
    packed: new Int32Array(capacity + 1),
    meta: new Int32Array(16),
  };
}

function adaptedScanArguments(image: ImageLike): {
  readonly luma: Int32Array;
  readonly scratch: ScannerScratch;
  readonly width: number;
  readonly height: number;
} {
  const luma = imageDataToContrastStretchLuma(image);
  return {
    luma: new Int32Array(luma.data),
    scratch: createScratch(luma.width, luma.height),
    width: luma.width,
    height: luma.height,
  };
}

function locateAndDecodeAdapted(
  image: ImageLike,
  roi: Roi | undefined,
  artifact: ForgeScannerExports,
): ScanResult | null {
  resetScannerAllocator(artifact);
  const { luma, scratch, width, height } = adaptedScanArguments(image);
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

function locateAndDecodeAllAdapted(image: ImageLike, artifact: ForgeScannerExports): ScanResult[] {
  resetScannerAllocator(artifact);
  const { luma, scratch, width, height } = adaptedScanArguments(image);
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

interface ScannerMemory {
  readonly luma: number;
  readonly modules: number;
  readonly erasures: number;
  readonly packed: number;
  readonly meta: number;
  readonly lumaLength: number;
  readonly scratchCapacity: number;
}

function allocateArray(artifact: RawScannerExports, length: number): number {
  const current = artifact.fws_alloc(0);
  const padding = (4 - (current % 4)) % 4;
  if (padding > 0) artifact.fws_alloc(padding);
  return artifact.fws_alloc((length + 1) * 4);
}

function writeArray(artifact: RawScannerExports, pointer: number, length: number, values?: ArrayLike<number>): void {
  const view = new Int32Array(artifact.memory.buffer, pointer, length + 1);
  view.fill(0);
  view[0] = length;
  if (values !== undefined) {
    for (let index = 0; index < length; index += 1) view[index + 1] = values[index];
  }
}

function allocateScanMemory(
  artifact: RawScannerExports,
  width: number,
  height: number,
  luma: Uint8Array,
): ScannerMemory {
  const capacity = Math.min(width * height, 1_048_576);
  const memory = {
    luma: artifact.fws_alloc(luma.length),
    modules: allocateArray(artifact, capacity),
    erasures: allocateArray(artifact, capacity),
    packed: allocateArray(artifact, capacity + 1),
    meta: allocateArray(artifact, 16),
    lumaLength: luma.length,
    scratchCapacity: capacity,
  };
  writeRawLuma(artifact, memory.luma, luma);
  writeArray(artifact, memory.modules, capacity);
  writeArray(artifact, memory.erasures, capacity);
  writeArray(artifact, memory.packed, capacity + 1);
  writeArray(artifact, memory.meta, 16);
  return memory;
}

function writeRawLuma(artifact: RawScannerExports, pointer: number, luma: Uint8Array): void {
  new Uint8Array(artifact.memory.buffer, pointer, luma.length).set(luma);
}

function prepareScanMemory(
  artifact: RawScannerExports,
  width: number,
  height: number,
  luma: Uint8Array,
  cached: { memory?: ScannerMemory },
): ScannerMemory {
  artifact.fws_reset();
  const capacity = Math.min(width * height, 1_048_576);
  const existing = cached.memory;
  if (existing !== undefined && existing.lumaLength === luma.length && existing.scratchCapacity === capacity) {
    writeRawLuma(artifact, existing.luma, luma);
    writeArray(artifact, existing.modules, capacity);
    writeArray(artifact, existing.erasures, capacity);
    writeArray(artifact, existing.packed, capacity + 1);
    writeArray(artifact, existing.meta, 16);
    return existing;
  }
  const memory = allocateScanMemory(artifact, width, height, luma);
  cached.memory = memory;
  return memory;
}

function scanArguments(image: ImageLike): {
  readonly luma: Uint8Array;
  readonly width: number;
  readonly height: number;
} {
  const luma = imageDataToContrastStretchLuma(image);
  return {
    luma: luma.data,
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
function decodeRawString(artifact: RawScannerExports, encoded: unknown): string {
  if (!Array.isArray(encoded) || encoded.length < 2) {
    throw new TypeError('The raw scanner result is not a pointer-length pair.');
  }
  const pointer = encoded[0];
  const length = encoded[1];
  if (!Number.isSafeInteger(pointer) || pointer < 0 || !Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('The raw scanner result is not a valid pointer-length pair.');
  }
  const buffer = artifact.memory.buffer;
  if (pointer > buffer.byteLength || length > buffer.byteLength - pointer) {
    throw new RangeError('The raw scanner result is outside linear memory.');
  }
  return textDecoder.decode(new Uint8Array(buffer, pointer, length));
}

function resultFromRaw(artifact: RawScannerExports, encoded: unknown): ScanResult | null {
  return resultFromWire(decodeRawString(artifact, encoded));
}

function locateAndDecode(
  image: ImageLike,
  roi: Roi | undefined,
  artifact: RawScannerExports,
  cached: { memory?: ScannerMemory },
): ScanResult | null {
  const { luma, width, height } = scanArguments(image);
  const memory = prepareScanMemory(artifact, width, height, luma, cached);
  scannerLog('scan: locating and decoding luma image', { width, height, roi });
  const encoded = roi
    ? artifact.scan_and_decode_bytes_roi(
        width,
        height,
        memory.luma,
        Math.max(0, Math.round(roi.x)),
        Math.max(0, Math.round(roi.y)),
        Math.max(0, Math.round(roi.width)),
        Math.max(0, Math.round(roi.height)),
        memory.modules,
        memory.erasures,
        memory.packed,
        memory.meta,
      )
    : artifact.scan_and_decode_bytes(
        width,
        height,
        memory.luma,
        memory.modules,
        memory.erasures,
        memory.packed,
        memory.meta,
      );
  const result = resultFromRaw(artifact, encoded);
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
function locateAndDecodeAll(
  image: ImageLike,
  artifact: RawScannerExports,
  cached: { memory?: ScannerMemory },
): ScanResult[] {
  const { luma, width, height } = scanArguments(image);
  const memory = prepareScanMemory(artifact, width, height, luma, cached);
  scannerLog('scan: locating and decoding all codes', { width, height });
  const encoded = artifact.scan_and_decode_all_bytes(
    width,
    height,
    memory.luma,
    memory.modules,
    memory.erasures,
    memory.packed,
    memory.meta,
  );
  const results: ScanResult[] = [];
  for (const item of decodeRawString(artifact, encoded).split('\u001E')) {
    const result = resultFromWire(item);
    if (result !== null) results.push(result);
  }
  scannerLog(`scan: decoded ${results.length} code(s)`);
  return results;
}

export interface ScannerRawPointerSession {
  readonly memory: WebAssembly.Memory;
  readonly reset: () => void;
  readonly scan: (image: ImageLike, roi?: Roi) => ScanResult | null;
  readonly scanAll: (image: ImageLike) => ScanResult[];
}

function createRawPointerSession(artifact: RawScannerExports): ScannerRawPointerSession {
  const cached: { memory?: ScannerMemory } = {};
  return {
    memory: artifact.memory,
    reset: () => {
      artifact.fws_reset();
      cached.memory = undefined;
    },
    scan: (image, roi) => locateAndDecode(image, roi, artifact, cached),
    scanAll: (image) => locateAndDecodeAll(image, artifact, cached),
  };
}

export function createScannerRawPointerSession(): ScannerRawPointerSession {
  return createRawPointerSession(loadRawScannerSync());
}

export async function createScannerRawPointerSessionAsync(): Promise<ScannerRawPointerSession> {
  return createRawPointerSession(await loadRawScanner());
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
  return locateAndDecodeAdapted(image, roi, loadScannerSyncCached());
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
  return locateAndDecodeAdapted(image, roi, await loadScannerCached());
}

/**
 * Locate and decode *every* distinct code in `image` (not just the first),
 * instantiating the scanner graph synchronously on first use.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated;
 *   empty when nothing is decoded.
 */
export function scanImageDataAll(image: ImageLike): ScanResult[] {
  return locateAndDecodeAllAdapted(image, loadScannerSyncCached());
}

/**
 * Locate and decode *every* distinct code in `image`, loading the scanner graph
 * asynchronously on first use. Initialisation and scan failures are
 * returned as Promise rejections.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated.
 */
export async function scanImageDataAllAsync(image: ImageLike): Promise<ScanResult[]> {
  return locateAndDecodeAllAdapted(image, await loadScannerCached());
}
