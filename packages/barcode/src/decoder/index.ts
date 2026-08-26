// Public, typed wrapper around the package-local Forge Web Script 1D decoder.
//
// All supported 1D decoder families run through package-local Forge Web Script
// graphs.

import { load as loadBarcodeNative, loadSync as loadBarcodeNativeSync } from '../fws/barcode-native.fws';
import { FWS_SYMBOLOGY } from '../fws/symbology';

import type { BarcodeSymbology } from '../encoder';

/** Snapshot and normalize module bits once for the owned FWS array ABI. */
function toFwsModules(modules: ArrayLike<number>): number[] {
  return Array.from(modules, (bit) => (bit === 1 ? 1 : 0));
}

function decodeNative(symbology: BarcodeSymbology, modules: number[]): string {
  return loadBarcodeNativeSync().decode_native(FWS_SYMBOLOGY[symbology], modules);
}

async function decodeNativeAsync(symbology: BarcodeSymbology, modules: number[]): Promise<string> {
  return (await loadBarcodeNative()).decode_native(FWS_SYMBOLOGY[symbology], modules);
}

/**
 * Decode a run of module bits (`1` = bar, `0` = space) of the given `symbology`
 * back into its payload, loading the native FWS graph synchronously on first
 * use.
 *
 * Returns `null` when the module run is not a valid symbol of `symbology` (bad
 * framing, an unrecognised pattern, or a failing check digit). The recovered
 * payload is the symbology's canonical form — e.g. recomputed check digits are
 * included, Code 39/93 text is upper-cased, and UPC-E is returned in its
 * `number system + digits + check` form.
 */
export function decodeBarcode(symbology: BarcodeSymbology, modules: ArrayLike<number>): string | null {
  return decodeNative(symbology, toFwsModules(modules)) || null;
}

/**
 * Decode a run of module bits back into its payload, loading the native FWS
 * graph asynchronously on first use. Initialisation and conversion failures
 * are returned as Promise rejections. See {@link decodeBarcode}.
 */
export async function decodeBarcodeAsync(
  symbology: BarcodeSymbology,
  modules: ArrayLike<number>,
): Promise<string | null> {
  return (await decodeNativeAsync(symbology, toFwsModules(modules))) || null;
}
