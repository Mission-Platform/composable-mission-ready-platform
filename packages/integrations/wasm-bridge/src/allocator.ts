const textDecoder = new TextDecoder('utf-8');
const textEncoder = new TextEncoder();

/**
 * Interface representing a WebAssembly instance with an exported linear memory buffer
 * and optional allocation lifecycle exports.
 */
export interface WasmMemoryExports {
  readonly memory: WebAssembly.Memory;
  readonly malloc?: (size: number) => number;
  readonly free?: (ptr: number) => void;
  readonly fws_alloc?: (size: number) => number;
  readonly fws_free?: (ptr: number) => void;
  readonly fws_reset?: () => void;
}

/**
 * Parses a 3-character decimal triplet into a single byte (`0..255`).
 *
 * @param encoded - The string containing decimal triplets.
 * @param offset - Starting index of the 3-character triplet.
 * @returns The decoded byte value.
 * @throws {RangeError} If the slice cannot be parsed into an integer in `0..255`.
 */
export function parseTripletByte(encoded: string, offset: number): number {
  const byte = Number.parseInt(encoded.slice(offset, offset + 3), 10);
  if (Number.isNaN(byte) || byte < 0 || byte > 255) {
    throw new RangeError(`Invalid decimal triplet "${encoded.slice(offset, offset + 3)}" at index ${offset}`);
  }
  return byte;
}

/**
 * Decodes a string of 3-character decimal triplets into a `Uint8Array`.
 *
 * @param encoded - Decimal triplets representing raw bytes.
 * @param offset - Optional start index in `encoded`.
 * @param length - Optional length of characters to process.
 * @returns A decoded `Uint8Array` byte buffer.
 * @throws {RangeError} If the length is not a multiple of 3 or contains invalid bytes.
 */
export function decodeTripletBytes(
  encoded: string,
  offset: number = 0,
  length: number = encoded.length - offset,
): Uint8Array {
  if (length % 3 !== 0) {
    throw new RangeError(`Encoded triplet length must be a multiple of 3, got ${length}`);
  }
  const count = length / 3;
  const bytes = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    bytes[index] = parseTripletByte(encoded, offset + index * 3);
  }
  return bytes;
}

/**
 * Decodes a string of 3-character decimal triplets into an array of byte numbers.
 *
 * @param encoded - Decimal triplets representing raw bytes.
 * @param offset - Optional start index in `encoded`.
 * @param length - Optional length of characters to process.
 * @returns An array of decoded numbers.
 */
export function decodeTriplets(
  encoded: string,
  offset: number = 0,
  length: number = encoded.length - offset,
): number[] {
  return Array.from(decodeTripletBytes(encoded, offset, length));
}

/**
 * Decodes a string of 3-character decimal triplets into a UTF-8 decoded string.
 *
 * @param encoded - Decimal triplets representing UTF-8 encoded text.
 * @param offset - Optional start index in `encoded`.
 * @param length - Optional length of characters to process.
 * @returns Decoded UTF-8 string.
 */
export function decodeUtf8Triplets(
  encoded: string,
  offset: number = 0,
  length: number = encoded.length - offset,
): string {
  return textDecoder.decode(decodeTripletBytes(encoded, offset, length));
}

/**
 * Encodes a buffer or list of bytes into a string of 3-digit decimal triplets.
 *
 * @param bytes - Byte buffer or number array.
 * @returns 3-digit zero-padded decimal triplets.
 */
export function encodeTriplets(bytes: Uint8Array | readonly number[]): string {
  let result = '';
  for (const byte of bytes) {
    result += byte.toString(10).padStart(3, '0');
  }
  return result;
}

/**
 * Reads a UTF-8 string from a WebAssembly linear memory buffer at the specified offset and length.
 *
 * @param memory - WebAssembly linear memory.
 * @param ptr - Byte offset pointer into linear memory.
 * @param length - Length in bytes.
 * @returns Decoded UTF-8 string.
 */
export function rawReadUtf8(memory: WebAssembly.Memory, ptr: number, length: number): string {
  const bytes = new Uint8Array(memory.buffer, ptr, length);
  return textDecoder.decode(bytes);
}

/**
 * Writes a UTF-8 string into WebAssembly linear memory at the specified offset.
 *
 * @param memory - WebAssembly linear memory.
 * @param ptr - Byte offset pointer into linear memory.
 * @param text - Text to encode and write.
 * @returns Number of bytes written.
 */
export function rawWriteUtf8(memory: WebAssembly.Memory, ptr: number, text: string): number {
  const bytes = textEncoder.encode(text);
  new Uint8Array(memory.buffer, ptr, bytes.length).set(bytes);
  return bytes.length;
}

/**
 * Copies a byte array into WebAssembly linear memory.
 *
 * @param memory - WebAssembly linear memory.
 * @param ptr - Byte offset pointer into linear memory.
 * @param source - Byte array to copy.
 */
export function copyToWasmBuffer(
  memory: WebAssembly.Memory,
  ptr: number,
  source: Uint8Array | readonly number[],
): void {
  const target = new Uint8Array(memory.buffer, ptr, source.length);
  if (source instanceof Uint8Array) {
    target.set(source);
  } else {
    for (let index = 0; index < source.length; index++) {
      target[index] = source[index];
    }
  }
}

/**
 * Copies a byte array out of WebAssembly linear memory into a newly allocated `Uint8Array`.
 *
 * @param memory - WebAssembly linear memory.
 * @param ptr - Byte offset pointer into linear memory.
 * @param length - Number of bytes to copy.
 * @returns A fresh `Uint8Array` copy.
 */
export function copyFromWasmBuffer(memory: WebAssembly.Memory, ptr: number, length: number): Uint8Array {
  return new Uint8Array(memory.buffer.slice(ptr, ptr + length));
}

/**
 * Manages allocation and lifecycle of memory buffers inside a WebAssembly linear memory space.
 */
export class WasmMemoryBridge {
  private readonly exports: WasmMemoryExports;

  public constructor(instanceOrMemory: WasmMemoryExports | WebAssembly.Memory) {
    if ('memory' in instanceOrMemory && instanceOrMemory.memory instanceof WebAssembly.Memory) {
      this.exports = instanceOrMemory;
    } else if (instanceOrMemory instanceof WebAssembly.Memory) {
      this.exports = { memory: instanceOrMemory };
    } else {
      throw new TypeError('Expected WebAssembly.Memory or WasmMemoryExports with a valid memory instance');
    }
  }

  /**
   * Retrieves the underlying `WebAssembly.Memory` instance.
   */
  public get memory(): WebAssembly.Memory {
    return this.exports.memory;
  }

  /**
   * Retrieves the raw `ArrayBuffer` backing the linear memory.
   */
  public get buffer(): ArrayBuffer {
    return this.exports.memory.buffer;
  }

  /**
   * Allocates a buffer of `size` bytes within the WebAssembly instance if an allocator is available.
   *
   * @param size - Number of bytes to allocate.
   * @returns Byte offset pointer into linear memory.
   * @throws {Error} If no allocator method is exported on the WASM instance.
   */
  public allocate(size: number): number {
    if (typeof this.exports.fws_alloc === 'function') {
      return this.exports.fws_alloc(size);
    }
    if (typeof this.exports.malloc === 'function') {
      return this.exports.malloc(size);
    }
    throw new Error('WebAssembly instance does not export an allocator (fws_alloc or malloc)');
  }

  /**
   * Frees a previously allocated buffer within the WebAssembly instance.
   *
   * @param ptr - Byte offset pointer to free.
   */
  public free(ptr: number): void {
    if (typeof this.exports.fws_free === 'function') {
      this.exports.fws_free(ptr);
    } else if (typeof this.exports.free === 'function') {
      this.exports.free(ptr);
    }
  }

  /**
   * Resets temporary linear memory allocations if supported by the instance.
   */
  public reset(): void {
    if (typeof this.exports.fws_reset === 'function') {
      this.exports.fws_reset();
    }
  }

  /**
   * Returns a `Uint8Array` view into linear memory.
   */
  public getUint8View(ptr = 0, length?: number): Uint8Array {
    return new Uint8Array(this.exports.memory.buffer, ptr, length);
  }

  /**
   * Returns an `Int32Array` view into linear memory.
   */
  public getInt32View(ptr = 0, length?: number): Int32Array {
    return new Int32Array(this.exports.memory.buffer, ptr, length);
  }

  /**
   * Copies bytes into linear memory.
   */
  public write(ptr: number, source: Uint8Array | readonly number[]): void {
    copyToWasmBuffer(this.exports.memory, ptr, source);
  }

  /**
   * Reads a copy of bytes from linear memory.
   */
  public read(ptr: number, length: number): Uint8Array {
    return copyFromWasmBuffer(this.exports.memory, ptr, length);
  }

  /**
   * Writes a UTF-8 string into linear memory.
   */
  public writeUtf8(ptr: number, text: string): number {
    return rawWriteUtf8(this.exports.memory, ptr, text);
  }

  /**
   * Reads a UTF-8 string from linear memory.
   */
  public readUtf8(ptr: number, length: number): string {
    return rawReadUtf8(this.exports.memory, ptr, length);
  }
}
