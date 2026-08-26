import { encodeBarcode, encodeBarcodeAsync, type BarcodeSymbology } from '../encoder';

import { load as loadBarcode, loadSync as loadBarcodeSync } from './barcode.fws';
import { loadSync as loadCodabarSync, load as loadCodabar  } from './codabar.fws';
import { loadSync as loadCode128Sync, load as loadCode128  } from './code128.fws';
import { loadSync as loadCode39Sync, load as loadCode39  } from './code39.fws';
import { loadSync as loadCode93Sync, load as loadCode93  } from './code93.fws';
import { load as loadDataBar, loadSync as loadDataBarSync } from './databar.fws';
import { loadSync as loadItfSync, load as loadItf  } from './itf.fws';
import { loadSync as loadMsiSync, load as loadMsi  } from './msi.fws';
import { loadSync as loadPharmacodeSync, load as loadPharmacode  } from './pharmacode.fws';

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

function assertEncoded(value: string, symbology: NativeVariableBarcodeSymbology): string {
  if (value.length === 0) {
    throw new RangeError(`Unable to encode ${symbology} barcode.`);
  }
  return value;
}

function encodeNativeVariableBarcode(symbology: NativeVariableBarcodeSymbology, value: string): string {
  switch (symbology) {
    case 'code128': {
      return assertEncoded(loadCode128Sync().encode_code128(value), symbology);
    }
    case 'gs1-128': {
      return assertEncoded(loadCode128Sync().encode_gs1_128(value), symbology);
    }
    case 'code39': {
      return assertEncoded(loadCode39Sync().encode_code39(value), symbology);
    }
    case 'code39ext': {
      return assertEncoded(loadCode39Sync().encode_code39_extended(value), symbology);
    }
    case 'code93': {
      return assertEncoded(loadCode93Sync().encode_code93(value), symbology);
    }
    case 'code93ext': {
      return assertEncoded(loadCode93Sync().encode_code93_extended(value), symbology);
    }
    case 'codabar': {
      return assertEncoded(loadCodabarSync().encode_codabar(value), symbology);
    }
    case 'itf': {
      return assertEncoded(loadItfSync().encode_itf(value), symbology);
    }
    case 'itf14': {
      return assertEncoded(loadItfSync().encode_itf14(value), symbology);
    }
    case 'msi': {
      return assertEncoded(loadMsiSync().encode_msi(value), symbology);
    }
    case 'pharmacode': {
      return assertEncoded(loadPharmacodeSync().encode_pharmacode(value), symbology);
    }
  }
}

async function encodeNativeVariableBarcodeAsync(
  symbology: NativeVariableBarcodeSymbology,
  value: string,
): Promise<string> {
  switch (symbology) {
    case 'code128': {
      return assertEncoded((await loadCode128()).encode_code128(value), symbology);
    }
    case 'gs1-128': {
      return assertEncoded((await loadCode128()).encode_gs1_128(value), symbology);
    }
    case 'code39': {
      return assertEncoded((await loadCode39()).encode_code39(value), symbology);
    }
    case 'code39ext': {
      return assertEncoded((await loadCode39()).encode_code39_extended(value), symbology);
    }
    case 'code93': {
      return assertEncoded((await loadCode93()).encode_code93(value), symbology);
    }
    case 'code93ext': {
      return assertEncoded((await loadCode93()).encode_code93_extended(value), symbology);
    }
    case 'codabar': {
      return assertEncoded((await loadCodabar()).encode_codabar(value), symbology);
    }
    case 'itf': {
      return assertEncoded((await loadItf()).encode_itf(value), symbology);
    }
    case 'itf14': {
      return assertEncoded((await loadItf()).encode_itf14(value), symbology);
    }
    case 'msi': {
      return assertEncoded((await loadMsi()).encode_msi(value), symbology);
    }
    case 'pharmacode': {
      return assertEncoded((await loadPharmacode()).encode_pharmacode(value), symbology);
    }
  }
}

/** Encodes a supported variable-length barcode through its native FWS graph when available. */
export function encodeVariableBarcodeFws(symbology: VariableBarcodeSymbology, value: string): string {
  if (
    symbology === 'code128' ||
    symbology === 'gs1-128' ||
    symbology === 'code39' ||
    symbology === 'code39ext' ||
    symbology === 'code93' ||
    symbology === 'code93ext' ||
    symbology === 'codabar' ||
    symbology === 'itf' ||
    symbology === 'itf14' ||
    symbology === 'msi' ||
    symbology === 'pharmacode'
  ) {
    return encodeNativeVariableBarcode(symbology, value);
  }
  return encodeBarcode(symbology, value).modules.join('');
}

/** Asynchronously encodes a supported variable-length barcode through FWS. */
export async function encodeVariableBarcodeFwsAsync(
  symbology: VariableBarcodeSymbology,
  value: string,
): Promise<string> {
  if (
    symbology === 'code128' ||
    symbology === 'gs1-128' ||
    symbology === 'code39' ||
    symbology === 'code39ext' ||
    symbology === 'code93' ||
    symbology === 'code93ext' ||
    symbology === 'codabar' ||
    symbology === 'itf' ||
    symbology === 'itf14' ||
    symbology === 'msi' ||
    symbology === 'pharmacode'
  ) {
    return encodeNativeVariableBarcodeAsync(symbology, value);
  }
  return (await encodeBarcodeAsync(symbology, value)).modules.join('');
}

function encodeEan8With(wasm: ForgeBarcodeExports, value: string): string {
  return wasm.encode_ean8(value);
}

function encodeEan13With(wasm: ForgeBarcodeExports, value: string): string {
  return wasm.encode_ean13(value);
}

function encodeUpcaWith(wasm: ForgeBarcodeExports, value: string): string {
  return wasm.encode_upca(value);
}

function normalizeModuleBits(value: string | ArrayLike<number>): number[] {
  if (typeof value === 'string') {
    return Array.from(value, (bit) => (bit === '1' ? 1 : 0));
  }
  return Array.from(value, (bit) => (bit === 1 ? 1 : 0));
}

function decodeEan8With(wasm: ForgeBarcodeExports, value: string | ArrayLike<number>): string {
  return wasm.decode_ean8(normalizeModuleBits(value));
}

function decodeEan13With(wasm: ForgeBarcodeExports, value: string | ArrayLike<number>): string {
  return wasm.decode_ean13(normalizeModuleBits(value));
}

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

/** Decodes EAN-8 module bits and returns the payload with its check digit. */
export function decodeEan8Fws(value: string | ArrayLike<number>): string {
  return decodeEan8With(loadBarcodeSync(), value);
}

/** Asynchronously decodes EAN-8 module bits through FWS. */
export async function decodeEan8FwsAsync(value: string | ArrayLike<number>): Promise<string> {
  return decodeEan8With(await loadBarcode(), value);
}

/** Decodes EAN-13 module bits and validates parity and check digit. */
export function decodeEan13Fws(value: string | ArrayLike<number>): string {
  return decodeEan13With(loadBarcodeSync(), value);
}

/** Asynchronously decodes EAN-13 module bits through FWS. */
export async function decodeEan13FwsAsync(value: string | ArrayLike<number>): Promise<string> {
  return decodeEan13With(await loadBarcode(), value);
}

/** Validates a GS1 DataBar/RSS-14 GTIN-14 value in the package-local FWS graph. */
export function validateGs1DataBarValue(value: string): boolean {
  return validateDataBarWith(loadDataBarSync(), value);
}

/** Asynchronously validates a GS1 DataBar/RSS-14 GTIN-14 value through FWS. */
export async function validateGs1DataBarValueAsync(value: string): Promise<boolean> {
  return validateDataBarWith(await loadDataBar(), value);
}
