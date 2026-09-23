import { describe, expect, it } from 'vitest';

import { canonicalizeSliceCallingConvention, encodeSliceRegisterTriplet } from './abi.js';

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
});
