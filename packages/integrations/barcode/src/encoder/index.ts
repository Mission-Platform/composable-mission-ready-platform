// Public, typed wrapper around the package-local Forge Web Script barcode graphs.

import { load as loadBarcodeNative, loadSync as loadBarcodeNativeSync } from '../fws/barcode-native.fws';
import { FWS_SYMBOLOGY } from '../fws/symbology';

import type { BarcodeSymbology } from './types';

export type { BarcodeSymbology } from './types';

/** The result of {@link encodeBarcode}: module bits with their total width. */
export interface Barcode {
  /** The symbology used to encode the payload. */
  symbology: BarcodeSymbology;
  /** Module bits, one per unit-width module: `1` = bar, `0` = space. */
  modules: number[];
  /** Total width in modules (`modules.length`), excluding a quiet zone. */
  width: number;
}

/** Convert a direct FWS module-bit string into the public barcode contract. */
function toFwsBarcode(symbology: BarcodeSymbology, modules: string): Barcode {
  if (modules.length === 0) {
    throw new RangeError(`Invalid payload for the "${symbology}" barcode symbology`);
  }
  return {
    symbology,
    modules: [...modules].map((bit) => (bit === '1' ? 1 : 0)),
    width: modules.length,
  };
}

function encodeNative(symbology: BarcodeSymbology, data: string): string {
  return loadBarcodeNativeSync().encode_native(FWS_SYMBOLOGY[symbology], data);
}

async function encodeNativeAsync(symbology: BarcodeSymbology, data: string): Promise<string> {
  return (await loadBarcodeNative()).encode_native(FWS_SYMBOLOGY[symbology], data);
}

/**
 * Encode `data` into a linear barcode using the package-local FWS graph.
 *
 * @throws {RangeError} when the payload is invalid for the selected symbology.
 */
export function encodeBarcode(symbology: BarcodeSymbology, data: string): Barcode {
  return toFwsBarcode(symbology, encodeNative(symbology, data));
}

/** Encode `data` asynchronously using the package-local FWS graph. */
export async function encodeBarcodeAsync(symbology: BarcodeSymbology, data: string): Promise<Barcode> {
  return toFwsBarcode(symbology, await encodeNativeAsync(symbology, data));
}
