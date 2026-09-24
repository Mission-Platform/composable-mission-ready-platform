/** Structural representation of a Flint ABI Manifest. */
export interface FlintCAbiManifest {
  readonly format?: string;
  readonly languageVersion?: string;
  readonly abiVersion?: string;
  readonly entryModule?: string;
  readonly exports?: readonly unknown[];
  readonly imports?: readonly unknown[];
  readonly memory?: unknown;
  readonly [key: string]: unknown;
}

/**
 * Encodes arbitrary JavaScript primitive, array, and object data structures into canonical binary CBOR.
 */
export function encodeCbor(value: unknown): Uint8Array {
  const chunks: number[] = [];

  function encodeItem(item: unknown): void {
    if (item === null || item === undefined) {
      chunks.push(0xf6); // null
      return;
    }

    if (typeof item === "boolean") {
      chunks.push(item ? 0xf5 : 0xf4);
      return;
    }

    if (typeof item === "number") {
      if (Number.isInteger(item)) {
        if (item >= 0) {
          encodeUnsigned(0, item);
        } else {
          encodeUnsigned(1, -1 - item);
        }
      } else {
        // Encode 64-bit float (0xfb)
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setFloat64(0, item, false);
        chunks.push(0xfb, ...new Uint8Array(buffer));
      }
      return;
    }

    if (typeof item === "bigint") {
      if (item >= 0n) {
        encodeUnsignedBigInt(0, item);
      } else {
        encodeUnsignedBigInt(1, -1n - item);
      }
      return;
    }

    if (typeof item === "string") {
      const bytes = new TextEncoder().encode(item);
      encodeUnsigned(3, bytes.byteLength);
      chunks.push(...bytes);
      return;
    }

    if (item instanceof Uint8Array) {
      encodeUnsigned(2, item.byteLength);
      chunks.push(...item);
      return;
    }

    if (Array.isArray(item)) {
      encodeUnsigned(4, item.length);
      for (const element of item) {
        encodeItem(element);
      }
      return;
    }

    if (typeof item === "object") {
      const entries = Object.entries(item as Record<string, unknown>).filter(
        ([, value_]) => value_ !== undefined,
      );
      // Sort keys canonically by UTF-8 byte representation
      entries.sort(([leftKey], [rightKey]) =>
        leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0,
      );

      encodeUnsigned(5, entries.length);
      for (const [key, value_] of entries) {
        encodeItem(key);
        encodeItem(value_);
      }
      return;
    }

    throw new TypeError(`Unsupported CBOR type: ${typeof item}`);
  }

  function encodeUnsigned(major: number, value: number): void {
    const majorBits = major << 5;
    if (value < 24) {
      chunks.push(majorBits | value);
    } else if (value < 256) {
      chunks.push(majorBits | 24, value);
    } else if (value < 65_536) {
      chunks.push(majorBits | 25, (value >> 8) & 0xff, value & 0xff);
    } else if (value < 4_294_967_296) {
      chunks.push(
        majorBits | 26,
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
      );
    } else {
      encodeUnsignedBigInt(major, BigInt(value));
    }
  }

  function encodeUnsignedBigInt(major: number, value: bigint): void {
    const majorBits = major << 5;
    chunks.push(
      majorBits | 27,
      Number((value >> 56n) & 0xffn),
      Number((value >> 48n) & 0xffn),
      Number((value >> 40n) & 0xffn),
      Number((value >> 32n) & 0xffn),
      Number((value >> 24n) & 0xffn),
      Number((value >> 16n) & 0xffn),
      Number((value >> 8n) & 0xffn),
      Number(value & 0xffn),
    );
  }

  encodeItem(value);
  return new Uint8Array(chunks);
}

const FORBIDDEN_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);
const MAX_CBOR_DEPTH = 64;

/**
 * Options configuring CBOR decoding behavior and validation checks.
 */
export interface CborDecodeOptions {
  readonly strictCanonical?: boolean;
}

/**
 * Decodes canonical binary CBOR bytes into a JavaScript object structure.
 */
// eslint-disable-next-line @typescript-eslint/no-unconstrained-generics
export function decodeCbor<T = unknown>(
  bytes: Uint8Array,
  options: CborDecodeOptions = {},
): T {
  let offset = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  function decodeItem(depth = 0): unknown {
    if (depth > MAX_CBOR_DEPTH) {
      throw new RangeError(
        `CBOR structure exceeds maximum nesting depth of ${MAX_CBOR_DEPTH}.`,
      );
    }

    if (offset >= bytes.length) {
      throw new RangeError("Unexpected end of CBOR payload.");
    }

    const initialByte = bytes[offset++];
    if (initialByte === undefined)
      throw new RangeError("Unexpected end of CBOR payload.");

    const major = initialByte >> 5;
    const additional = initialByte & 0x1f;

    let lengthOrValue: number | bigint = additional;
    switch (additional) {
      case 24: {
        if (offset >= bytes.length)
          throw new RangeError("Unexpected end of CBOR payload.");
        lengthOrValue = bytes[offset++] ?? 0;
        break;
      }
      case 25: {
        if (offset + 2 > bytes.length)
          throw new RangeError("Unexpected end of CBOR payload.");
        lengthOrValue = view.getUint16(offset, false);
        offset += 2;
        break;
      }
      case 26: {
        if (offset + 4 > bytes.length)
          throw new RangeError("Unexpected end of CBOR payload.");
        lengthOrValue = view.getUint32(offset, false);
        offset += 4;
        break;
      }
      case 27: {
        if (offset + 8 > bytes.length)
          throw new RangeError("Unexpected end of CBOR payload.");
        lengthOrValue = view.getBigUint64(offset, false);
        offset += 8;
        break;
      }
      default: {
        break;
      }
    }

    switch (major) {
      case 0: {
        return typeof lengthOrValue === "bigint"
          ? lengthOrValue
          : Number(lengthOrValue);
      }
      case 1: {
        return typeof lengthOrValue === "bigint"
          ? -1n - lengthOrValue
          : -1 - Number(lengthOrValue);
      }
      case 2: {
        const length = Number(lengthOrValue);
        if (
          !Number.isSafeInteger(length) ||
          length < 0 ||
          length > bytes.length - offset
        ) {
          throw new RangeError(`Invalid CBOR byte string length: ${length}.`);
        }
        const slice = bytes.subarray(offset, offset + length);
        offset += length;
        return slice;
      }
      case 3: {
        const length = Number(lengthOrValue);
        if (
          !Number.isSafeInteger(length) ||
          length < 0 ||
          length > bytes.length - offset
        ) {
          throw new RangeError(`Invalid CBOR text string length: ${length}.`);
        }
        const slice = bytes.subarray(offset, offset + length);
        offset += length;
        return new TextDecoder().decode(slice);
      }
      case 4: {
        const count = Number(lengthOrValue);
        if (
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > bytes.length - offset
        ) {
          throw new RangeError(`Invalid CBOR array length: ${count}.`);
        }
        const array: unknown[] = [];
        for (let index = 0; index < count; index += 1) {
          array.push(decodeItem(depth + 1));
        }
        return array;
      }
      case 5: {
        const count = Number(lengthOrValue);
        if (
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > (bytes.length - offset) / 2
        ) {
          throw new RangeError(`Invalid CBOR map length: ${count}.`);
        }
        const record = Object.create(null) as Record<string, unknown>;
        let lastKey: string | undefined;
        for (let index = 0; index < count; index += 1) {
          const rawKey = decodeItem(depth + 1);
          const key = String(rawKey);
          if (FORBIDDEN_OBJECT_KEYS.has(key)) {
            throw new TypeError(`Forbidden CBOR object key: ${key}`);
          }
          if (options.strictCanonical) {
            if (lastKey !== undefined) {
              if (key === lastKey) {
                throw new TypeError(`Duplicate CBOR map key: ${key}`);
              }
              if (key < lastKey) {
                throw new TypeError(
                  `Non-canonical CBOR key ordering: ${key} appeared after ${lastKey}`,
                );
              }
            }
            lastKey = key;
          }
          const itemValue = decodeItem(depth + 1);
          record[key] = itemValue;
        }
        return record;
      }
      case 7: {
        switch (additional) {
          case 20: {
            return false;
          }
          case 21: {
            return true;
          }
          case 27: {
            offset -= 8;
            const float = view.getFloat64(offset, false);
            offset += 8;
            return float;
          }
          default: {
            return undefined;
          }
        }
      }
      default: {
        throw new Error(`Unsupported major CBOR type: ${major}`);
      }
    }
  }

  return decodeItem() as T;
}

/**
 * Encodes a Flint ABI Manifest directly to binary CBOR byte array.
 */
export function encodeCborAbiManifest<T extends object = FlintCAbiManifest>(
  manifest: T,
): Uint8Array {
  return encodeCbor(manifest);
}

/**
 * Decodes a binary CBOR byte array into a Flint ABI Manifest.
 */
export function decodeCborAbiManifest<T extends object = FlintCAbiManifest>(
  bytes: Uint8Array,
  options?: CborDecodeOptions,
): T {
  return decodeCbor<T>(bytes, options);
}
