// Code scanner façade.
//
// This is the bridge between a raw image (a decoded file upload or a live camera
// frame) and the scanner's decoded result. The entire pipeline — binarise,
// locate, sample, and decode — runs in the linked Forge Web Script scanner graph.
// The adapter owns the graph instance and converts its versioned result envelope
// into the public {@link ScanResult} without exposing the FWS ABI to consumers.
import { scannerLog } from '../debug';
import { load as loadScanner, loadRaw, loadRawSync, loadSync as loadScannerSync } from '../fws/scanner.fws';
import { imageDataToContrastStretchLuma } from '../image';

import { parseResultEnvelope, resultEnvelopeLimits } from './result-envelope';

import type {
  ForgeScannerExports,
  ForgeScannerImports,
  ForgeScannerRawBytes,
  ForgeScannerRawExports,
  ForgeScannerRawImports,
} from '../fws/scanner.fws';
import type { ImageLike, Roi, ScanFormat, ScanMetadata, ScanOptions, ScanPoint, ScanResult } from '../types';

const textDecoder = new TextDecoder('utf-8', { fatal: true });
const textEncoder = new TextEncoder();

/**
 * Validates and extracts a single byte from a 3-character decimal slice.
 */
function parseTripletByte(value: string, index: number): number | null {
  const byte = Number.parseInt(value.slice(index * 3, index * 3 + 3), 10);
  if (!Number.isInteger(byte) || byte < 0 || byte > 255) return null;
  return byte;
}

/**
 * Decodes a 3-character decimal formatted byte string into a Uint8Array.
 */
function decodeTripletBytes(value: string): Uint8Array | null {
  if (value.length === 0 || value.length % 3 !== 0) return null;
  const bytes = new Uint8Array(value.length / 3);
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = parseTripletByte(value, index);
    if (byte === null) return null;
    bytes[index] = byte;
  }
  return bytes;
}

/**
 * Decodes a 3-character decimal formatted byte string into a UTF-8 string.
 */
function decodeTriplets(value: string): string {
  const bytes = decodeTripletBytes(value);
  if (bytes === null) return '';
  try {
    return textDecoder.decode(bytes);
  } catch {
    return '';
  }
}

/**
 * Decodes numeric triplet bytes into a UTF-8 string prefixed by status digit.
 */
function decodeUtf8(value: string): string {
  const decoded = decodeTriplets(value);
  return decoded.length > 0 ? `1${decoded}` : '';
}

const scannerImports: ForgeScannerImports = {
  'qr.decode.utf8': { decode_utf8: decodeUtf8, matrix_decode_utf8: decodeUtf8 },
};

let scanner: ForgeScannerExports | undefined;
let scannerPromise: Promise<ForgeScannerExports> | undefined;

type ResettableScannerExports = ForgeScannerExports & { readonly fws_reset?: () => void };

/**
 * Resets the allocator state of a WebAssembly scanner instance if supported.
 */
function resetScannerAllocator(artifact: ForgeScannerExports): void {
  const reset = (artifact as ResettableScannerExports).fws_reset;
  reset?.();
}

/**
 * Loads the WebAssembly scanner instance synchronously, caching the instance.
 */
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

/**
 * Decodes a UTF-8 string from WebAssembly linear memory and re-encodes it into new allocation.
 */
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

/**
 * Builds raw WebAssembly host import bindings for UTF-8 decoding functions.
 */
function rawScannerImports(getArtifact: () => RawScannerExports | undefined): ForgeScannerRawImports {
  const decode = (pointer: number, length: number): RawString => rawDecodeUtf8(getArtifact(), pointer, length);
  return { 'qr.decode.utf8': { decode_utf8: decode, matrix_decode_utf8: decode } };
}

/**
 * Loads the raw WebAssembly scanner artifact synchronously.
 */
function loadRawScannerSync(): RawScannerExports {
  const holder: { current?: RawScannerExports } = {};
  const artifact = loadRawSync(rawScannerImports(() => holder.current));
  holder.current = artifact;
  return artifact;
}

/**
 * Loads the raw WebAssembly scanner artifact asynchronously.
 */
async function loadRawScanner(): Promise<RawScannerExports> {
  const holder: { current?: RawScannerExports } = {};
  const artifact = await loadRaw(rawScannerImports(() => holder.current));
  holder.current = artifact;
  return artifact;
}

/**
 * Format tags emitted by the FWS `scan_and_decode` entry point, mapped to their
 * {@link ScanFormat} name.
 */
const FORMAT_NAMES: Readonly<Record<number, ScanFormat>> = {
  0: 'AZTEC',
  1: 'CODABAR',
  2: 'CODE_39',
  3: 'CODE_93',
  4: 'CODE_128',
  5: 'DATA_MATRIX',
  6: 'EAN_8',
  7: 'EAN_13',
  8: 'ITF',
  9: 'MAXICODE',
  10: 'PDF_417',
  11: 'QR_CODE',
  12: 'RSS_14',
  13: 'RSS_EXPANDED',
  14: 'UPC_A',
  15: 'UPC_E',
};

const EMPTY_POINTS: readonly ScanPoint[] = Object.freeze([]);
const EMPTY_METADATA: ScanMetadata = Object.freeze({});

/**
 * Constructs an immutable ScanResult object with empty metadata and point arrays.
 */
function createScanResult(
  format: ScanFormat,
  text: string | null,
  rawBytes: Uint8Array | null,
  numBits: number,
): ScanResult {
  return {
    format,
    text,
    value: text,
    rawBytes,
    numBits,
    points: EMPTY_POINTS,
    metadata: EMPTY_METADATA,
    timestamp: Date.now(),
  };
}

const TRIPLET_FORMATS = new Set<ScanFormat>(['DATA_MATRIX', 'AZTEC', 'QR_CODE']);

/**
 * Extracts payload byte array based on format encoding characteristics.
 */
function extractPayloadBytes(payload: string, format: ScanFormat): Uint8Array {
  if (TRIPLET_FORMATS.has(format)) {
    const decoded = decodeTripletBytes(payload);
    if (decoded !== null) return decoded;
  }
  return textEncoder.encode(payload);
}

/**
 * Decodes the raw envelope payload into text and binary representations.
 */
function decodePayload(
  payload: string,
  format: ScanFormat,
): { readonly text: string | null; readonly rawBytes: Uint8Array | null } {
  const rawBytes = extractPayloadBytes(payload, format);
  try {
    return { text: textDecoder.decode(rawBytes), rawBytes };
  } catch {
    return { text: null, rawBytes };
  }
}

/**
 * Calculates the effective number of bits decoded in the payload.
 */
function resolveResultNumBits(envelopeNumBits: number, rawBytes: Uint8Array | null): number {
  if (envelopeNumBits > 0) return envelopeNumBits;
  return rawBytes === null ? 0 : rawBytes.byteLength * 8;
}

/** Convert the versioned FWS result envelope into the public scan result. */
function resultFromWire(encoded: string): ScanResult | null {
  const envelope = parseResultEnvelope(encoded);
  if (envelope === null) return null;
  const format = FORMAT_NAMES[envelope.formatId];
  if (format === undefined) return null;
  if (!envelope.decoded) return createScanResult(format, null, null, envelope.numBits);
  const decoded = decodePayload(envelope.payload, format);
  const numBits = resolveResultNumBits(envelope.numBits, decoded.rawBytes);
  return createScanResult(format, decoded.text, decoded.rawBytes, numBits);
}

interface ScannerScratch {
  readonly modules: Int32Array;
  readonly erasures: Int32Array;
  readonly packed: Int32Array;
  readonly meta: Int32Array;
}

/**
 * Allocates reusable scratch buffers for scanner locator and decoder passes.
 */
function createScratch(width: number, height: number): ScannerScratch {
  const capacity = Math.min(width * height, 1_048_576);
  return {
    modules: new Int32Array(capacity),
    erasures: new Int32Array(capacity),
    packed: new Int32Array(capacity + 1),
    meta: new Int32Array(16),
  };
}

/**
 * Prepares image arguments and allocations for adapted scanner invocation.
 */
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

const FORMAT_IDS: Readonly<Record<ScanFormat, number>> = Object.freeze({
  AZTEC: 0,
  CODABAR: 1,
  CODE_39: 2,
  CODE_93: 3,
  CODE_128: 4,
  DATA_MATRIX: 5,
  EAN_8: 6,
  EAN_13: 7,
  ITF: 8,
  MAXICODE: 9,
  PDF_417: 10,
  QR_CODE: 11,
  RSS_14: 12,
  RSS_EXPANDED: 13,
  UPC_A: 14,
  UPC_E: 15,
});

const ROI_KEYS: readonly (keyof Roi)[] = ['x', 'y', 'width', 'height'];

/** Type guard checking if an object represents a region of interest. */
function isRoi(value: unknown): value is Roi {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return ROI_KEYS.every((key) => key in candidate);
}

/**
 * Normalizes user-supplied options or region-of-interest into a unified ScanOptions structure.
 */
function normalizeScanOptions(optionsOrRoi: ScanOptions | Roi | undefined): ScanOptions {
  if (optionsOrRoi === undefined) return {};
  if (isRoi(optionsOrRoi)) return { roi: optionsOrRoi };
  return optionsOrRoi;
}

/**
 * Extracts unique numeric format IDs requested in the scan options.
 */
function possibleFormatIds(options: ScanOptions): readonly number[] {
  if (options.formats === undefined || options.formats.length === 0) return [-1];
  return [
    ...new Set(
      options.formats
        .map((format) => FORMAT_IDS[format])
        .filter((format): format is number => Number.isInteger(format)),
    ),
  ];
}

/**
 * Emits diagnostic logs for detected scan results.
 */
function logScanResult(result: ScanResult | null): ScanResult | null {
  if (result === null) {
    scannerLog('scan: no code located in this frame');
    return null;
  }
  if (result.text === null) {
    scannerLog(`scan: ${result.format} located but its payload could NOT be decoded (undecodable sample)`);
  } else {
    scannerLog(`scan: ${result.format} decoded successfully`, { value: result.text });
  }
  return result;
}

interface ScanFlagOptions {
  readonly tryHarder?: boolean;
  readonly alsoInverted?: boolean;
  readonly pureBarcode?: boolean;
}

/**
 * Normalizes boolean scan options into integer flag arguments.
 */
function resolveScanFlags(options: ScanFlagOptions) {
  return {
    tryHarder: options.tryHarder === false ? 0 : 1,
    alsoInverted: options.alsoInverted === false ? 0 : 1,
    pureBarcode: options.pureBarcode === true ? 1 : 0,
  };
}

/**
 * Executes a single scan attempt with adapted typed arrays.
 */
function executeAdaptedScan(
  artifact: ForgeScannerExports,
  width: number,
  height: number,
  luma: Int32Array,
  scratch: ScannerScratch,
  roi: Roi | undefined,
  possibleFormat: number,
  options: ScanOptions,
): string {
  const flags = resolveScanFlags(options);
  if (roi !== undefined) {
    return artifact.scan_and_decode_roi_with_options(
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
      possibleFormat,
      flags.tryHarder,
      flags.alsoInverted,
      flags.pureBarcode,
    );
  }
  return artifact.scan_and_decode_with_options(
    width,
    height,
    luma,
    scratch.modules,
    scratch.erasures,
    scratch.packed,
    scratch.meta,
    possibleFormat,
    flags.tryHarder,
    flags.alsoInverted,
    flags.pureBarcode,
  );
}

/**
 * Runs the single-symbol detection and decoding pipeline over an image using adapted arrays.
 */
function locateAndDecodeAdapted(
  image: ImageLike,
  optionsOrRoi: ScanOptions | Roi | undefined,
  artifact: ForgeScannerExports,
): ScanResult | null {
  resetScannerAllocator(artifact);
  const { luma, scratch, width, height } = adaptedScanArguments(image);
  const options = normalizeScanOptions(optionsOrRoi);
  scannerLog('scan: locating and decoding luma image', { width, height, roi: options.roi, formats: options.formats });
  for (const possibleFormat of possibleFormatIds(options)) {
    const encoded = executeAdaptedScan(
      artifact,
      width,
      height,
      luma,
      scratch,
      options.roi,
      possibleFormat,
      options,
    );
    const result = resultFromWire(encoded);
    if (result !== null) return logScanResult(result);
  }
  return logScanResult(null);
}

/**
 * Filters decoded scan results according to requested format options.
 */
function filterResults(results: ScanResult[], options: ScanOptions | undefined): ScanResult[] {
  if (options?.formats === undefined || options.formats.length === 0) return results;
  const formats = new Set(options.formats);
  return results.filter((result) => formats.has(result.format));
}

/**
 * Runs multi-symbol detection and decoding over an image using adapted arrays.
 */
function locateAndDecodeAllAdapted(
  image: ImageLike,
  artifact: ForgeScannerExports,
  options?: ScanOptions,
): ScanResult[] {
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
  return filterResults(results, options);
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

/**
 * Allocates a 4-byte aligned integer array in WebAssembly linear memory.
 */
function allocateArray(artifact: RawScannerExports, length: number): number {
  const current = artifact.fws_alloc(0);
  const padding = (4 - (current % 4)) % 4;
  if (padding > 0) artifact.fws_alloc(padding);
  return artifact.fws_alloc((length + 1) * 4);
}

/**
 * Writes an array of 32-bit integers into WebAssembly linear memory preceded by length.
 */
function writeArray(artifact: RawScannerExports, pointer: number, length: number, values?: ArrayLike<number>): void {
  const view = new Int32Array(artifact.memory.buffer, pointer, length + 1);
  view.fill(0);
  view[0] = length;
  if (values !== undefined) {
    for (let index = 0; index < length; index += 1) view[index + 1] = values[index];
  }
}

/**
 * Allocates fresh scratch and luma buffers in raw WebAssembly linear memory.
 */
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

/**
 * Copies raw luma image bytes directly into WebAssembly linear memory.
 */
function writeRawLuma(artifact: RawScannerExports, pointer: number, luma: Uint8Array): void {
  new Uint8Array(artifact.memory.buffer, pointer, luma.length).set(luma);
}

/**
 * Reuses or allocates WebAssembly memory buffers for scanning a frame.
 */
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

/**
 * Extracts contrast-stretched luma byte data and dimensions from an image.
 */
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
 * Validates that the input is a valid pointer-length pair.
 */
function validateRawPointerPair(encoded: unknown): readonly [number, number] {
  if (!Array.isArray(encoded) || encoded.length < 2) {
    throw new TypeError('The raw scanner result is not a pointer-length pair.');
  }
  const pointer = encoded[0];
  const length = encoded[1];
  const validPointer = Number.isSafeInteger(pointer) && pointer >= 0;
  const validLength = Number.isSafeInteger(length) && length >= 0;
  if (!validPointer || !validLength) {
    throw new RangeError('The raw scanner result is not a valid pointer-length pair.');
  }
  return [pointer, length];
}

/**
 * Validates that pointer and length stay within linear memory bounds and envelope limits.
 */
function validateRawBufferBounds(bufferByteLength: number, pointer: number, length: number): void {
  const inBounds = pointer <= bufferByteLength && length <= bufferByteLength - pointer;
  if (!inBounds) {
    throw new RangeError('The raw scanner result is outside linear memory.');
  }
  if (length > resultEnvelopeLimits.maxLength) {
    throw new RangeError('The raw scanner result exceeds the supported envelope size.');
  }
}

/**
 * Decodes a raw pointer-length string from WebAssembly linear memory.
 */
function decodeRawString(artifact: RawScannerExports, encoded: unknown): string {
  const [pointer, length] = validateRawPointerPair(encoded);
  validateRawBufferBounds(artifact.memory.buffer.byteLength, pointer, length);
  return textDecoder.decode(new Uint8Array(artifact.memory.buffer, pointer, length));
}

/**
 * Parses a raw pointer-length result from WebAssembly linear memory into a ScanResult.
 */
function resultFromRaw(artifact: RawScannerExports, encoded: unknown): ScanResult | null {
  return resultFromWire(decodeRawString(artifact, encoded));
}

/**
 * Executes a single raw scan attempt using linear memory pointers.
 */
function executeRawScan(
  artifact: RawScannerExports,
  width: number,
  height: number,
  memory: ScannerMemory,
  roi: Roi | undefined,
  possibleFormat: number,
  options: ScanOptions,
): unknown {
  const flags = resolveScanFlags(options);
  if (roi !== undefined) {
    return artifact.scan_and_decode_roi_with_options(
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
      possibleFormat,
      flags.tryHarder,
      flags.alsoInverted,
      flags.pureBarcode,
    );
  }
  return artifact.scan_and_decode_with_options(
    width,
    height,
    memory.luma,
    memory.modules,
    memory.erasures,
    memory.packed,
    memory.meta,
    possibleFormat,
    flags.tryHarder,
    flags.alsoInverted,
    flags.pureBarcode,
  );
}

/**
 * Runs single-symbol detection and decoding over linear memory.
 */
function locateAndDecode(
  image: ImageLike,
  optionsOrRoi: ScanOptions | Roi | undefined,
  artifact: RawScannerExports,
  cached: { memory?: ScannerMemory },
): ScanResult | null {
  const { luma, width, height } = scanArguments(image);
  const memory = prepareScanMemory(artifact, width, height, luma, cached);
  const options = normalizeScanOptions(optionsOrRoi);
  scannerLog('scan: locating and decoding luma image', { width, height, roi: options.roi, formats: options.formats });
  for (const possibleFormat of possibleFormatIds(options)) {
    const encoded = executeRawScan(artifact, width, height, memory, options.roi, possibleFormat, options);
    const result = resultFromRaw(artifact, encoded);
    if (result !== null) return logScanResult(result);
  }
  return logScanResult(null);
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
  options?: ScanOptions,
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
  return filterResults(results, options);
}

export interface ScannerRawPointerSession {
  readonly memory: WebAssembly.Memory;
  readonly reset: () => void;
  readonly scan: (image: ImageLike, options?: ScanOptions | Roi) => ScanResult | null;
  readonly scanAll: (image: ImageLike, options?: ScanOptions) => ScanResult[];
}

/**
 * Wraps a raw WebAssembly scanner instance into an interactive session.
 */
function createRawPointerSession(artifact: RawScannerExports): ScannerRawPointerSession {
  const cached: { memory?: ScannerMemory } = {};
  return {
    memory: artifact.memory,
    reset: () => {
      artifact.fws_reset();
      cached.memory = undefined;
    },
    scan: (image, options) => locateAndDecode(image, options, artifact, cached),
    scanAll: (image, options) => locateAndDecodeAll(image, artifact, cached, options),
  };
}

/**
 * Creates a synchronous raw pointer session for low-level memory inspection.
 */
export function createScannerRawPointerSession(): ScannerRawPointerSession {
  return createRawPointerSession(loadRawScannerSync());
}

/**
 * Creates an asynchronous raw pointer session for low-level memory inspection.
 */
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
 *   is located but its payload can't be decoded, `result.text` is `null`.
 */
export function scanImageData(image: ImageLike, options?: ScanOptions | Roi): ScanResult | null {
  return locateAndDecodeAdapted(image, options, loadScannerSyncCached());
}

/**
 * Locate and decode the first supported code in `image`, loading the scanner
 * graph asynchronously on first use. Initialisation and scan
 * failures are returned as Promise rejections.
 *
 * @param roi optional region of interest — see {@link scanImageData}.
 * @returns the {@link ScanResult}, or `null` when no code is found.
 */
export async function scanImageDataAsync(image: ImageLike, options?: ScanOptions | Roi): Promise<ScanResult | null> {
  return locateAndDecodeAdapted(image, options, await loadScannerCached());
}

/**
 * Locate and decode *every* distinct code in `image` (not just the first),
 * instantiating the scanner graph synchronously on first use.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated;
 *   empty when nothing is decoded.
 */
export function scanImageDataAll(image: ImageLike, options?: ScanOptions): ScanResult[] {
  return locateAndDecodeAllAdapted(image, loadScannerSyncCached(), options);
}

/**
 * Locate and decode *every* distinct code in `image`, loading the scanner graph
 * asynchronously on first use. Initialisation and scan failures are
 * returned as Promise rejections.
 *
 * @returns the decoded {@link ScanResult}s in discovery order, deduplicated.
 */
export async function scanImageDataAllAsync(image: ImageLike, options?: ScanOptions): Promise<ScanResult[]> {
  return locateAndDecodeAllAdapted(image, await loadScannerCached(), options);
}
