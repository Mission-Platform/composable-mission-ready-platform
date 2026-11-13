import { unsignedLeb } from './leb128.js';

const encoder = new TextEncoder();

/** Canonical quiet NaN bit pattern for 32-bit floats (0x7fc00000 in little-endian). */
export const CANONICAL_F32_NAN_BYTES = Object.freeze([0x00, 0x00, 0xc0, 0x7f]);

/** Canonical quiet NaN bit pattern for 64-bit floats (0x7ff8000000000000 in little-endian). */
export const CANONICAL_F64_NAN_BYTES = Object.freeze([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf8, 0x7f]);

/** Appends a 32-bit floating point number in little-endian binary format, canonicalizing NaNs. */
export function appendF32(value: number): number[] {
  if (Number.isNaN(value)) {
    return [...CANONICAL_F32_NAN_BYTES];
  }
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setFloat32(0, value, true);
  return [...new Uint8Array(buffer)];
}

/** Appends a 64-bit floating point number in little-endian binary format, canonicalizing NaNs. */
export function appendF64(value: number): number[] {
  if (Number.isNaN(value)) {
    return [...CANONICAL_F64_NAN_BYTES];
  }
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, value, true);
  return [...new Uint8Array(buffer)];
}

/** Prefixes an array of bytecode elements with its count in LEB128 encoding. */
export function vector(values: readonly number[]): number[] {
  return [...unsignedLeb(values.length), ...values];
}

/** Encodes a UTF-8 string prefixed by its byte length in WebAssembly format. */
export function wasmString(value: string): number[] {
  const bytes = [...encoder.encode(value)];
  return [...unsignedLeb(bytes.length), ...bytes];
}
