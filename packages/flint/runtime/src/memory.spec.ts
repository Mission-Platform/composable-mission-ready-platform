import { describe, expect, it } from 'vitest';

import { createFlintMemory, createFlintMultiMemory, FLINT_MEMORY_CAPABILITIES } from './memory.js';
import { FlintTrap } from './traps.js';

const trapCode = (run: () => unknown): FlintTrap['code'] => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(FlintTrap);
    return (error as FlintTrap).code;
  }
  throw new Error('expected a Forge Web Script trap');
};

describe('Forge Web Script memory capabilities', () => {
  it('accepts bigint addresses at the host boundary', () => {
    const memory = createFlintMemory();
    const pointer = memory.allocate(4);
    memory.writeBytes(BigInt(pointer), new Uint8Array([1, 2, 3, 4]));
    expect(memory.readBytes(BigInt(pointer), 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('rejects shared memory and memory64 without explicit capabilities', () => {
    expect(() => createFlintMemory({ shared: true, capabilities: [] })).toThrow(FlintTrap);
    expect(() => createFlintMemory({ addressBits: 64, capabilities: [] })).toThrow(FlintTrap);
    expect(FLINT_MEMORY_CAPABILITIES.memory64).toBe('wasm.memory64');
  });

  it('resizes the current high-water allocation in place', () => {
    const memory = createFlintMemory();
    const pointer = memory.allocate(4);
    memory.writeBytes(pointer, new Uint8Array([1, 2, 3, 4]));

    expect(memory.reallocate(pointer, 4, 8)).toBe(pointer);
    expect(memory.readBytes(pointer, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));

    expect(memory.reallocate(pointer, 8, 2)).toBe(pointer);
    expect(memory.readBytes(pointer, 2)).toEqual(new Uint8Array([1, 2]));
  });

  it('allocates, copies the bounded prefix, and releases for non-tail allocations', () => {
    const memory = createFlintMemory();
    const first = memory.allocate(4);
    memory.allocate(4);
    memory.writeBytes(first, new Uint8Array([1, 2, 3, 4]));

    const replacement = memory.reallocate(first, 4, 6);

    expect(replacement).not.toBe(first);
    expect(memory.readBytes(replacement, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(() => memory.deallocate(first, 4)).toThrow(FlintTrap);
  });

  it('handles equal-size and zero-size reallocations deterministically', () => {
    const memory = createFlintMemory();
    const pointer = memory.allocate(4);
    memory.writeBytes(pointer, new Uint8Array([1, 2, 3, 4]));

    expect(memory.reallocate(pointer, 4, 4)).toBe(pointer);
    expect(memory.reallocate(pointer, 4, 0)).toBe(pointer);
    expect(memory.readBytes(pointer, 0)).toEqual(new Uint8Array());
    expect(memory.allocate(2)).toBe(pointer);
  });

  it('copies only the bounded prefix when a non-tail allocation shrinks', () => {
    const memory = createFlintMemory();
    const first = memory.allocate(6);
    memory.allocate(2);
    memory.writeBytes(first, new Uint8Array([1, 2, 3, 4, 5, 6]));

    const replacement = memory.reallocate(first, 6, 2);

    expect(memory.readBytes(replacement, 2)).toEqual(new Uint8Array([1, 2]));
    expect(trapCode(() => memory.reallocate(first, 6, 2))).toBe('InvalidOwnership');
  });

  it('rejects reallocations with invalid ownership without mutating the allocation', () => {
    const memory = createFlintMemory();
    const pointer = memory.allocate(4);

    expect(trapCode(() => memory.reallocate(pointer, 3, 8))).toBe('InvalidOwnership');
    expect(trapCode(() => memory.reallocate(memory.bytes.byteLength, 1, 1))).toBe('MemoryOutOfBounds');
    expect(trapCode(() => memory.reallocate(0, 0, 1))).toBe('InvalidOwnership');
    expect(trapCode(() => memory.reallocate(pointer, 4, -1))).toBe('MemoryExhausted');
    expect(trapCode(() => memory.reallocate(pointer, 4, Number.MAX_SAFE_INTEGER))).toBe('MemoryExhausted');
    expect(memory.reallocate(pointer, 4, 4)).toBe(pointer);
  });

  it('preserves the allocation on memory exhaustion', () => {
    const memory = createFlintMemory({ initialPages: 1, maximumPages: 1 });
    const pointer = memory.allocate(65_536 - 8);
    memory.writeBytes(pointer, new Uint8Array([7]));

    expect(trapCode(() => memory.reallocate(pointer, 65_528, 65_529))).toBe('MemoryExhausted');
    expect(memory.reallocate(pointer, 65_528, 65_528)).toBe(pointer);
    expect(memory.readBytes(pointer, 1)).toEqual(new Uint8Array([7]));
  });

  it('partitions linear memory into isolated guest heap, host interop, and static data', () => {
    expect(() => createFlintMultiMemory({ capabilities: [] })).toThrow(FlintTrap);

    const multi = createFlintMultiMemory({
      capabilities: [FLINT_MEMORY_CAPABILITIES.multiMemory],
    });

    expect(multi.getPartition(0)).toBe(multi.guestHeap);
    expect(multi.getPartition(1)).toBe(multi.hostInterop);
    expect(multi.getPartition(2)).toBe(multi.staticData);
    expect(multi.getPartition('guestHeap')).toBe(multi.guestHeap);
    expect(multi.getPartition('hostInterop')).toBe(multi.hostInterop);
    expect(multi.getPartition('staticData')).toBe(multi.staticData);

    const guestPtr = multi.guestHeap.allocate(4);
    multi.guestHeap.writeBytes(guestPtr, new Uint8Array([11, 22, 33, 44]));

    const interopPtr = multi.transferToInterop(guestPtr, 4);
    expect(multi.hostInterop.readBytes(interopPtr, 4)).toEqual(new Uint8Array([11, 22, 33, 44]));

    multi.hostInterop.writeBytes(interopPtr, new Uint8Array([99, 88, 77, 66]));
    const roundtripPtr = multi.transferFromInterop(interopPtr, 4);
    expect(multi.guestHeap.readBytes(roundtripPtr, 4)).toEqual(new Uint8Array([99, 88, 77, 66]));
  });
});
