// Public, typed wrapper around the Rust/WebAssembly 1D (linear) barcode encoder.
//
// The heavy lifting runs in WebAssembly (compiled from the `crates/barcode-encode`
// Rust crate, sharing `crates/barcode-common`, and published as
// `@mission-platform/barcode-encode-wasm`); this module provides an ergonomic,
// fully typed façade over the encoder. The decoder counterpart lives in
// `../decoder`.

// The `-wasm` package inlines its wasm binary and initializes it lazily on the
// first operation, keeping Promise-based consumers free of import-time work.
import { encode as wasmEncode } from '@mission-platform/barcode-encode-wasm';

import type * as EncoderWasm from '@mission-platform/barcode-encode-wasm';

type EncoderWasmModule = typeof EncoderWasm;

let encoderWasmPromise: Promise<EncoderWasmModule> | undefined;

/** Load the encoder lazily for callers that use the Promise-based API. */
function loadEncoderWasm(): Promise<EncoderWasmModule> {
  encoderWasmPromise ??= import('@mission-platform/barcode-encode-wasm');
  return encoderWasmPromise;
}

/**
 * The linear symbologies this encoder supports. Passed as the first argument to
 * {@link encodeBarcode}.
 *
 * - `code128` — high density; Code B for printable ASCII, Code C for even-length
 *   digit strings.
 * - `gs1-128` — Code 128 with a leading FNC1 (a stream of GS1 Application
 *   Identifiers).
 * - `code39` / `code39ext` — alphanumeric, self-checking (auto-framed with `*`);
 *   the `ext` variant encodes the full 7-bit ASCII range via shift characters.
 * - `code93` / `code93ext` — compact, self-checking (two check characters); the
 *   `ext` variant encodes the full 7-bit ASCII range.
 * - `ean13` / `ean8` / `upca` — fixed-length retail digit codes; the trailing
 *   check digit is computed when omitted, or verified when supplied.
 * - `upce` — the zero-suppressed UPC; 6 digits (number system `0`) or a full
 *   7/8-digit `number system + digits [+ check]` form.
 * - `itf` — Interleaved 2 of 5; requires an even number of digits.
 * - `itf14` — the fixed 14-digit GTIN-14 (13 digits + computed check, or 14 with
 *   verified check).
 * - `codabar` — digits plus `-$:/.+` (auto-framed with `A` start/stop).
 * - `msi` — MSI / Modified Plessey (digits, with an appended mod-10 check).
 * - `pharmacode` — the Laetus pharmaceutical binary code (`3`–`131070`).
 */
export type BarcodeSymbology =
  | 'code128'
  | 'gs1-128'
  | 'code39'
  | 'code39ext'
  | 'code93'
  | 'code93ext'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'itf'
  | 'itf14'
  | 'codabar'
  | 'msi'
  | 'pharmacode';

/** The result of {@link encodeBarcode}: a run of module bits with its width. */
export interface Barcode {
  /** The symbology used to encode the payload. */
  symbology: BarcodeSymbology;
  /** Module bits, one per unit-width module: `1` = bar, `0` = space. */
  modules: number[];
  /** Total width in modules (`modules.length`); excludes any quiet zone. */
  width: number;
}

/** Turn the wasm module-bit buffer into a {@link Barcode}, or throw when invalid. */
function toBarcode(symbology: BarcodeSymbology, modules: Uint8Array | undefined): Barcode {
  if (modules === undefined || modules.length === 0) {
    throw new RangeError(`Invalid payload for the "${symbology}" barcode symbology`);
  }
  return { symbology, modules: [...modules], width: modules.length };
}

/**
 * Encode `data` into a linear barcode of the given `symbology`, instantiating
 * the WebAssembly encoder synchronously on first use.
 *
 * @throws {RangeError} if the payload is invalid for the symbology (bad
 *   characters, wrong length, failing check digit, …).
 */
export function encodeBarcode(symbology: BarcodeSymbology, data: string): Barcode {
  return toBarcode(symbology, wasmEncode(symbology, data));
}

/**
 * Encode `data` into a linear barcode of the given `symbology`, loading the
 * WebAssembly encoder asynchronously on first use.
 *
 * Rejects with a {@link RangeError} if the payload is invalid for the symbology
 * or if WebAssembly initialisation fails.
 */
export async function encodeBarcodeAsync(symbology: BarcodeSymbology, data: string): Promise<Barcode> {
  const wasm = await loadEncoderWasm();
  return toBarcode(symbology, wasm.encode(symbology, data));
}
