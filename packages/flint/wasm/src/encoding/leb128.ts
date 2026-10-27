/**
 * Encodes an unsigned 32-bit integer into a WebAssembly LEB128 byte array.
 */
export function unsignedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = value >>> 0;
  do {
    const byte = remaining & 0x7f;
    remaining >>>= 7;
    result.push(remaining === 0 ? byte : byte | 0x80);
  } while (remaining !== 0);
  return result;
}

/** Alias for unsignedLeb. */
export function unsignedLeb128(value: number): number[] {
  return unsignedLeb(value);
}

/**
 * Encodes a signed 32-bit or 64-bit integer into a WebAssembly LEB128 byte array.
 */
// skipcq: JS-R1005
export function signedLeb(value: number | bigint): number[] {
  const result: number[] = [];
  let remaining = BigInt(value);
  let more = true;
  while (more) {
    const byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    more = !((remaining === 0n && (byte & 0x40) === 0) || (remaining === -1n && (byte & 0x40) !== 0));
    result.push(more ? byte | 0x80 : byte);
  }
  return result;
}

/** Alias for signedLeb. */
export function signedLeb128(value: number | bigint): number[] {
  return signedLeb(value);
}
