import type { FlintWasmPrimitiveType } from '../contracts.js';

export const MAX_SLICE_ADDRESS = 0xff_ff_ff_ff;
export const ZERO_SIZED_TYPE_SENTINEL_POINTER = 0x8;
export const MAX_ARRAY_ALLOCATION_BYTES = 0x7f_ff_ff_ff;

/**
 * Computes the total byte size required for an array allocation of count * elementSize.
 * Enforces checked multiplication and throws a RangeError on integer overflow or bounds violation.
 */
export function computeArrayAllocationSize(
  count: number,
  elementSize: number,
  maxBytes: number = MAX_ARRAY_ALLOCATION_BYTES,
): number {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(`Array element count must be a non-negative safe integer: got ${count}`);
  }
  if (!Number.isSafeInteger(elementSize) || elementSize < 0) {
    throw new RangeError(`Array element size must be a non-negative safe integer: got ${elementSize}`);
  }
  if (count === 0 || elementSize === 0) {
    return 0;
  }
  if (count > Math.floor(maxBytes / elementSize)) {
    throw new RangeError(
      `Array allocation size overflows bounds: count=${count} * elementSize=${elementSize} exceeds max permitted bytes (${maxBytes})`,
    );
  }
  return count * elementSize;
}

/**
 * Computes capacity for a slice descriptor given total buffer byte size and element byte size.
 * Safely handles zero-sized types (elementSize === 0) by returning infinite/unbounded capacity without division by zero.
 */
export function computeSliceCapacity(bufferBytes: number, elementSize: number): number {
  if (!Number.isFinite(bufferBytes) || bufferBytes < 0) return 0;
  if (!Number.isFinite(elementSize) || elementSize < 0) return 0;
  if (elementSize === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.trunc(bufferBytes / elementSize);
}

/**
 * Register representation of an unpacked slice passed directly across WebAssembly boundaries.
 */
export interface SliceRegisterTriplet {
  readonly pointer: number;
  readonly length: number;
  readonly capacity: number;
}

/**
 * Validates that slice register triplets satisfy spatial bounds and unsigned arithmetic non-wrapping invariants.
 */
export function validateSliceBounds(pointer: number, length: number, capacity: number): boolean {
  if (!Number.isFinite(pointer) || !Number.isFinite(length) || !Number.isFinite(capacity)) {
    return false;
  }
  if (pointer < 0 || length < 0 || capacity < 0) {
    return false;
  }
  if (length > capacity) {
    return false;
  }
  if (pointer + capacity > MAX_SLICE_ADDRESS) {
    return false;
  }
  return true;
}

/**
 * Packs slice metadata into an unpacked `(ptr: i32, len: i32, cap: i32)` register triplet.
 * Enforces unsigned bounds and non-overflow invariants to prevent wraparound exploits.
 */
export function encodeSliceRegisterTriplet(
  pointer: number,
  length: number,
  capacity: number = length,
): SliceRegisterTriplet {
  const p = Math.trunc(pointer);
  const l = Math.trunc(length);
  const c = Math.trunc(capacity);

  if (!validateSliceBounds(p, l, c)) {
    throw new RangeError(
      `Invalid slice bounds: pointer=0x${p.toString(16)}, length=${l}, capacity=${c} exceeds memory bounds or violates len <= cap invariant.`,
    );
  }

  return {
    pointer: p,
    length: l,
    capacity: c,
  };
}

/**
 * Decodes and validates an unpacked `(ptr: i32, len: i32, cap: i32)` register triplet received across boundary.
 */
export function decodeSliceRegisterTriplet(
  pointer: number,
  length: number,
  capacity: number = length,
): SliceRegisterTriplet {
  return encodeSliceRegisterTriplet(pointer, length, capacity);
}

/**
 * Lowers a slice or bytes type into unpacked WebAssembly register types.
 */
export function canonicalizeSliceCallingConvention(type: FlintWasmPrimitiveType): readonly FlintWasmPrimitiveType[] {
  if (type === 'string' || type === 'bytes') {
    return ['i32', 'i32', 'i32'];
  }
  return [type];
}

/**
 * Aggregate field layout descriptor.
 */
export interface AggregateFieldDescriptor {
  readonly name: string;
  readonly offset: number;
  readonly size: number;
}

/**
 * Aggregate struct layout descriptor.
 */
export interface AggregateLayoutDescriptor {
  readonly size: number;
  readonly alignment: number;
  readonly fields: readonly AggregateFieldDescriptor[];
}

/**
 * Zero-initializes all padding bytes within an aggregate struct buffer before ABI transmission.
 * Prevents uninitialized memory and confidential data leakage across trust boundaries.
 *
 * @param buffer - Raw buffer containing serialized aggregate.
 * @param layout - Aggregate layout descriptor.
 * @param baseOffset - Starting offset within the buffer (defaults to 0).
 * @returns Cleaned buffer with zeroed padding.
 */
export function sanitizeAggregatePadding(
  buffer: Uint8Array,
  layout: AggregateLayoutDescriptor,
  baseOffset = 0,
): Uint8Array {
  if (baseOffset + layout.size > buffer.byteLength) {
    throw new RangeError(
      `Aggregate layout size (${layout.size} bytes at offset ${baseOffset}) exceeds buffer length (${buffer.byteLength} bytes).`,
    );
  }

  // Identify all field byte ranges
  const fieldOccupied = new Uint8Array(layout.size);
  for (const field of layout.fields) {
    if (field.offset + field.size <= layout.size) {
      for (let index = field.offset; index < field.offset + field.size; index += 1) {
        fieldOccupied[index] = 1;
      }
    }
  }

  // Zero-out any padding byte intervals
  for (let index = 0; index < layout.size; index += 1) {
    if (fieldOccupied[index] === 0) {
      buffer[baseOffset + index] = 0x00;
    }
  }

  return buffer;
}
