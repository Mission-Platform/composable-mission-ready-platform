import { describe, expect, it } from 'vitest';

import { FlintMemory } from './memory.ts';
import { createFlintSafeHeap, FlintTlsfAllocator } from './safe-heap.ts';
import { FlintTrap } from './traps.ts';

describe('Forge Web Script safe heap', () => {
  it('expires region allocations and promotes values across suspension', () => {
    const heap = createFlintSafeHeap(new FlintMemory());
    const region = heap.beginRegion();
    const allocation = heap.allocate(region, 8);
    expect(() => heap.prepareSuspension(region)).toThrowError(/region borrows/i);
    const shared = heap.promote(allocation);
    heap.prepareSuspension(region);
    heap.useShared(shared);
    heap.release(shared);
    expect(() => heap.useShared(shared)).toThrowError(/released/i);
    heap.endRegion(region);
  });

  it('rejects double release and raw/non-owned allocations', () => {
    const heap = createFlintSafeHeap(new FlintMemory());
    const region = heap.beginRegion();
    const allocation = heap.allocate(region, 4);
    const shared = heap.promote(allocation);
    heap.release(shared);
    expect(() => heap.release(shared)).toThrowError(/released/i);
    expect(() => heap.createShared(999, 4)).toThrowError(/exact runtime-owned/i);
  });

  it('allocates and coalesces memory blocks with O(1) TLSF dynamic allocator', () => {
    const memory = new FlintMemory(undefined, { initialPages: 4 });
    const tlsf = new FlintTlsfAllocator(memory, 65_536);

    const ptr1 = tlsf.allocate(64);
    const ptr2 = tlsf.allocate(128);
    const ptr3 = tlsf.allocate(256);

    memory.writeBytes(ptr1, new Uint8Array([1, 2, 3, 4]));
    memory.writeBytes(ptr2, new Uint8Array([5, 6, 7, 8]));
    expect(memory.readBytes(ptr1, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(memory.readBytes(ptr2, 4)).toEqual(new Uint8Array([5, 6, 7, 8]));

    // Deallocate in middle and coalescing check
    tlsf.deallocate(ptr2);
    tlsf.deallocate(ptr1);

    // Re-allocate should recycle coalesced block space
    const ptrRecycled = tlsf.allocate(160);
    expect(ptrRecycled).toBe(ptr1);

    tlsf.deallocate(ptr3);
    tlsf.deallocate(ptrRecycled);

    expect(() => tlsf.deallocate(ptrRecycled)).toThrow(FlintTrap);
  });

  it('manages scoped region arena bump allocation with O(1) instantaneous reset', () => {
    const memory = new FlintMemory(undefined, { initialPages: 2 });
    const heap = createFlintSafeHeap(memory);
    const region = heap.beginRegion();
    const arena = heap.beginArena(region, 1024);

    expect(arena.capacity).toBe(1024);
    expect(arena.usedBytes).toBe(0);
    expect(arena.remainingBytes).toBe(1024);

    const chunk1 = arena.allocate(100);
    expect(arena.usedBytes).toBe(100);
    memory.writeBytes(chunk1, new Uint8Array([42]));

    const chunk2 = arena.allocate(200);
    expect(arena.usedBytes).toBe(304);
    memory.writeBytes(chunk2, new Uint8Array([99]));

    expect(memory.readBytes(chunk1, 1)).toEqual(new Uint8Array([42]));
    expect(memory.readBytes(chunk2, 1)).toEqual(new Uint8Array([99]));

    arena.reset();
    expect(arena.usedBytes).toBe(0);
    expect(arena.remainingBytes).toBe(1024);

    const chunk3 = arena.allocate(50);
    expect(chunk3).toBe(chunk1);
    heap.endRegion(region);
  });
});
