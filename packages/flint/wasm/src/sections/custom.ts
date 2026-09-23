import { encodeCborAbiManifest, type FlintCAbiManifest } from '@mission-platform/flint-c-abi';

/**
 * Encodes a string as a length-prefixed UTF-8 WebAssembly byte sequence.
 */
function wasmString(value: string): number[] {
  const bytes = new TextEncoder().encode(value);
  return [...unsignedLeb(bytes.byteLength), ...bytes];
}

/**
 * Encodes an unsigned 32-bit integer as LEB128 variable-length byte sequence.
 */
function unsignedLeb(value: number): number[] {
  let remaining = value >>> 0;
  const bytes: number[] = [];
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (remaining !== 0);
  return bytes;
}

/**
 * Encodes a WebAssembly section with given section identifier and payload.
 */
function section(id: number, payload: readonly number[]): number[] {
  return [id, ...unsignedLeb(payload.length), ...payload];
}

/**
 * Standard WebAssembly custom section name for embedded binary CBOR ABI manifests.
 */
export const FLINT_ABI_V2_CUSTOM_SECTION = 'flint.abi.v2';

/**
 * Emits a binary WebAssembly custom section containing a compact CBOR ABI manifest (`flint.abi.v2`).
 */
export function encodeFlintAbiCustomSection(manifest: FlintCAbiManifest | object): number[] {
  const cborBytes = encodeCborAbiManifest(manifest);
  return section(0, [...wasmString(FLINT_ABI_V2_CUSTOM_SECTION), ...cborBytes]);
}
