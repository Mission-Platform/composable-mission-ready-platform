import { encodeBarcode, encodeBarcodeAsync, type BarcodeSymbology } from '../encoder';

import { load as loadBarcode, loadSync as loadBarcodeSync } from './barcode.fws';
import { loadSync as loadCodabarSync, load as loadCodabar } from './codabar.fws';
import { loadSync as loadCode128Sync, load as loadCode128 } from './code128.fws';
import { loadSync as loadCode39Sync, load as loadCode39 } from './code39.fws';
import { loadSync as loadCode93Sync, load as loadCode93 } from './code93.fws';
import { load as loadDataBar, loadSync as loadDataBarSync } from './databar.fws';
import { loadSync as loadItfSync, load as loadItf } from './itf.fws';
import { loadSync as loadMsiSync, load as loadMsi } from './msi.fws';
import { loadSync as loadPharmacodeSync, load as loadPharmacode } from './pharmacode.fws';

import type { ForgeBarcodeExports } from './barcode.fws';
import type { ForgeDataBarExports } from './databar.fws';

/** Variable-length symbologies supported by the direct barcode FWS adapter. */
export type VariableBarcodeSymbology = Extract<
  BarcodeSymbology,
  | 'code128'
  | 'gs1-128'
  | 'code39'
  | 'code39ext'
  | 'code93'
  | 'code93ext'
  | 'itf'
  | 'itf14'
  | 'codabar'
  | 'msi'
  | 'pharmacode'
>;

type NativeVariableBarcodeSymbology = Extract<
  VariableBarcodeSymbology,
  | 'code128'
  | 'gs1-128'
  | 'code39'
  | 'code39ext'
  | 'code93'
  | 'code93ext'
  | 'codabar'
  | 'itf'
  | 'itf14'
  | 'msi'
  | 'pharmacode'
>;

/**
 * Asserts that the encoder returned a non-empty module-bit string.
 */
function assertEncoded(value: string, symbology: NativeVariableBarcodeSymbology): string {
  if (value.length === 0) {
    throw new RangeError(`Unable to encode ${symbology} barcode.`);
  }
  return value;
}

const NATIVE_VARIABLE_ENCODERS: Record<NativeVariableBarcodeSymbology, (value: string) => string> = {
  code128: (value) => loadCode128Sync().encode_code128(value),
  'gs1-128': (value) => loadCode128Sync().encode_gs1_128(value),
  code39: (value) => loadCode39Sync().encode_code39(value),
  code39ext: (value) => loadCode39Sync().encode_code39_extended(value),
  code93: (value) => loadCode93Sync().encode_code93(value),
  code93ext: (value) => loadCode93Sync().encode_code93_extended(value),
  codabar: (value) => loadCodabarSync().encode_codabar(value),
  itf: (value) => loadItfSync().encode_itf(value),
  itf14: (value) => loadItfSync().encode_itf14(value),
  msi: (value) => loadMsiSync().encode_msi(value),
  pharmacode: (value) => loadPharmacodeSync().encode_pharmacode(value),
};

const NATIVE_VARIABLE_ASYNC_ENCODERS: Record<NativeVariableBarcodeSymbology, (value: string) => Promise<string>> = {
  code128: async (value) => (await loadCode128()).encode_code128(value),
  'gs1-128': async (value) => (await loadCode128()).encode_gs1_128(value),
  code39: async (value) => (await loadCode39()).encode_code39(value),
  code39ext: async (value) => (await loadCode39()).encode_code39_extended(value),
  code93: async (value) => (await loadCode93()).encode_code93(value),
  code93ext: async (value) => (await loadCode93()).encode_code93_extended(value),
  codabar: async (value) => (await loadCodabar()).encode_codabar(value),
  itf: async (value) => (await loadItf()).encode_itf(value),
  itf14: async (value) => (await loadItf()).encode_itf14(value),
  msi: async (value) => (await loadMsi()).encode_msi(value),
  pharmacode: async (value) => (await loadPharmacode()).encode_pharmacode(value),
};

/**
 * Checks whether the given symbology is natively supported by dedicated FWS graphs.
 */
function isNativeVariableBarcode(symbology: VariableBarcodeSymbology): symbology is NativeVariableBarcodeSymbology {
  return symbology in NATIVE_VARIABLE_ENCODERS;
}

/**
 * Synchronously encodes a variable barcode using its dedicated native FWS graph.
 */
function encodeNativeVariableBarcode(symbology: NativeVariableBarcodeSymbology, value: string): string {
  const encoder = NATIVE_VARIABLE_ENCODERS[symbology];
  if (encoder === undefined) {
    throw new RangeError(`Unable to encode ${symbology} barcode.`);
  }
  return assertEncoded(encoder(value), symbology);
}

/**
 * Asynchronously encodes a variable barcode using its dedicated native FWS graph.
 */
async function encodeNativeVariableBarcodeAsync(
  symbology: NativeVariableBarcodeSymbology,
  value: string,
): Promise<string> {
  const encoder = NATIVE_VARIABLE_ASYNC_ENCODERS[symbology];
  if (encoder === undefined) {
    throw new RangeError(`Unable to encode ${symbology} barcode.`);
  }
  return assertEncoded(await encoder(value), symbology);
}

/** Encodes a supported variable-length barcode through its native FWS graph when available. */
export function encodeVariableBarcodeFws(symbology: VariableBarcodeSymbology, value: string): string {
  if (isNativeVariableBarcode(symbology)) {
    return encodeNativeVariableBarcode(symbology, value);
  }
  return encodeBarcode(symbology, value).modules.join('');
}

/** Asynchronously encodes a supported variable-length barcode through FWS. */
export async function encodeVariableBarcodeFwsAsync(
  symbology: VariableBarcodeSymbology,
  value: string,
): Promise<string> {
  if (isNativeVariableBarcode(symbology)) {
    return encodeNativeVariableBarcodeAsync(symbology, value);
  }
  return (await encodeBarcodeAsync(symbology, value)).modules.join('');
}

/** Encodes an EAN-8 payload through WebAssembly exports. */
function encodeEan8With(wasm: ForgeBarcodeExports, value: string): string {
  return wasm.encode_ean8(value);
}

/** Encodes an EAN-13 payload through WebAssembly exports. */
function encodeEan13With(wasm: ForgeBarcodeExports, value: string): string {
  return wasm.encode_ean13(value);
}

/** Encodes a UPC-A payload through WebAssembly exports. */
function encodeUpcaWith(wasm: ForgeBarcodeExports, value: string): string {
  return wasm.encode_upca(value);
}

/** Validates a GS1 DataBar payload through WebAssembly exports. */
function validateDataBarWith(wasm: ForgeDataBarExports, value: string): boolean {
  return Boolean(wasm.validate_databar_gtin(value));
}

/** Encodes a seven-digit EAN-8 payload and computes its check digit in FWS. */
export function encodeEan8Fws(value: string): string {
  return encodeEan8With(loadBarcodeSync(), value);
}

/** Asynchronously encodes a seven-digit EAN-8 payload with the FWS loader. */
export async function encodeEan8FwsAsync(value: string): Promise<string> {
  return encodeEan8With(await loadBarcode(), value);
}

/** Encodes a twelve-digit EAN-13 payload and computes its check digit in FWS. */
export function encodeEan13Fws(value: string): string {
  return encodeEan13With(loadBarcodeSync(), value);
}

/** Asynchronously encodes a twelve-digit EAN-13 payload with the FWS loader. */
export async function encodeEan13FwsAsync(value: string): Promise<string> {
  return encodeEan13With(await loadBarcode(), value);
}

/** Encodes a UPC-A payload through the zero-prefixed EAN-13 FWS graph. */
export function encodeUpcaFws(value: string): string {
  return encodeUpcaWith(loadBarcodeSync(), value);
}

/** Asynchronously encodes a UPC-A payload through FWS. */
export async function encodeUpcaFwsAsync(value: string): Promise<string> {
  return encodeUpcaWith(await loadBarcode(), value);
}

/** Validates a GS1 DataBar/RSS-14 GTIN-14 value in the package-local FWS graph. */
export function validateGs1DataBarValue(value: string): boolean {
  return validateDataBarWith(loadDataBarSync(), value);
}

/** Asynchronously validates a GS1 DataBar/RSS-14 GTIN-14 value through FWS. */
export async function validateGs1DataBarValueAsync(value: string): Promise<boolean> {
  return validateDataBarWith(await loadDataBar(), value);
}
