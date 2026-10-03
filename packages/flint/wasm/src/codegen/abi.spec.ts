import { describe, expect, it } from 'vitest';

import {
  canonicalizeSliceCallingConvention,
  decodeSliceRegisterTriplet,
  encodeSliceRegisterTriplet,
  validateSliceBounds,
} from './abi.js';

describe('Zero-copy slice calling conventions', () => {
  it('encodes register triplets (pointer, length, capacity)', () => {
    const triplet = encodeSliceRegisterTriplet(1024, 64, 128);
    expect(triplet.pointer).toBe(1024);
    expect(triplet.length).toBe(64);
    expect(triplet.capacity).toBe(128);
  });

  it('canonicalizes slice types to WebAssembly (i32, i32, i32) triplets', () => {
    expect(canonicalizeSliceCallingConvention('string')).toEqual(['i32', 'i32', 'i32']);
    expect(canonicalizeSliceCallingConvention('bytes')).toEqual(['i32', 'i32', 'i32']);
    expect(canonicalizeSliceCallingConvention('i32')).toEqual(['i32']);
    expect(canonicalizeSliceCallingConvention('i64')).toEqual(['i64']);
  });

  it('rejects slice arithmetic wraparound and invalid spatial bounds', () => {
    expect(validateSliceBounds(0xff_ff_00_00, 0x00_02_00_00, 0x00_02_00_00)).toBe(false);
    expect(validateSliceBounds(100, 200, 150)).toBe(false); // length > capacity
    expect(validateSliceBounds(-1, 10, 10)).toBe(false);
    expect(validateSliceBounds(10, -5, 10)).toBe(false);
    expect(validateSliceBounds(0, 1024, 1024)).toBe(true);

    expect(() => encodeSliceRegisterTriplet(0xff_ff_00_00, 0x00_02_00_00, 0x00_02_00_00)).toThrow(RangeError);
    expect(() => encodeSliceRegisterTriplet(100, 200, 150)).toThrow(RangeError);
    expect(decodeSliceRegisterTriplet(1024, 32, 64)).toEqual({ pointer: 1024, length: 32, capacity: 64 });
  });
});
