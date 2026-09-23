import type { FlintWasmPrimitiveType } from '../contracts.js';

/**
 * Register representation of an unpacked slice passed directly across WebAssembly boundaries.
 */
export interface SliceRegisterTriplet {
  readonly pointer: number;
  readonly length: number;
  readonly capacity: number;
}

/**
 * Packs slice metadata into an unpacked `(ptr: i32, len: i32, cap: i32)` register triplet.
 */
export function encodeSliceRegisterTriplet(
  pointer: number,
  length: number,
  capacity: number = length,
): SliceRegisterTriplet {
  return {
    pointer: Math.trunc(pointer),
    length: Math.trunc(length),
    capacity: Math.trunc(capacity),
  };
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
