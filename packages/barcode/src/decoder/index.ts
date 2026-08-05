// Public, typed wrapper around the Rust/WebAssembly 1D (linear) barcode decoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/barcode-decode`
// Rust crate, sharing `crates/barcode-common`, and published as
// `@mission-platform/barcode-decode-wasm`); this module provides an ergonomic,
// fully typed façade mirroring the encoder. Given a clean run of module bits (as
// produced by {@link encodeBarcode}), it recovers the original payload for every
// supported {@link BarcodeSymbology}.

// The `-wasm` package inlines its wasm binary and instantiates it synchronously
// at import, so `decode` is ready to call with no initialisation step.
import { decode as wasmDecode } from '@mission-platform/barcode-decode-wasm';

import type { BarcodeSymbology } from '../encoder';

/**
 * Decode a run of module bits (`1` = bar, `0` = space) of the given `symbology`
 * back into its payload, instantiating the WebAssembly decoder synchronously on
 * first use.
 *
 * Returns `null` when the module run is not a valid symbol of `symbology` (bad
 * framing, an unrecognised pattern, or a failing check digit). The recovered
 * payload is the symbology's canonical form — e.g. recomputed check digits are
 * included, Code 39/93 text is upper-cased, and UPC-E is returned in its
 * `number system + digits + check` form.
 */
export function decodeBarcode(symbology: BarcodeSymbology, modules: ArrayLike<number>): string | null {
  return wasmDecode(symbology, Uint8Array.from(modules)) ?? null;
}

/**
 * Decode a run of module bits back into its payload, instantiating the
 * WebAssembly decoder asynchronously on first use. See {@link decodeBarcode}.
 */
export function decodeBarcodeAsync(symbology: BarcodeSymbology, modules: ArrayLike<number>): Promise<string | null> {
  return Promise.resolve(wasmDecode(symbology, Uint8Array.from(modules)) ?? null);
}
