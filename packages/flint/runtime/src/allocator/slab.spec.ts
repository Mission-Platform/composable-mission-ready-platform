import { describe, expect, it } from 'vitest';

import { RegionalBumpArena, SegregatedSlabAllocator } from './slab.js';

describe('Segregated Slab Allocator and Regional Bump Arena', () => {
  it('allocates and deallocates small objects with zero fragmentation in O(1) time', () => {
    const memory = new WebAssembly.Memory({ initial: 2, maximum: 10 });
    const allocator = new SegregatedSlabAllocator(memory, 65_536);

    const pointer1 = allocator.allocate(16);
    const pointer2 = allocator.allocate(16);
    const pointer3 = allocator.allocate(64);

    expect(pointer1).toBeGreaterThanOrEqual(65_536);
    expect(pointer2).not.toBe(pointer1);
    expect(pointer3).toBeGreaterThan(pointer2);

    allocator.deallocate(pointer1, 16);
    const pointer1Reused = allocator.allocate(16);
    expect(pointer1Reused).toBe(pointer1);
  });

  it('allocates regional bump memory and resets in O(1) time', () => {
    const memory = new WebAssembly.Memory({ initial: 2, maximum: 10 });
    const arena = new RegionalBumpArena(memory, 65_536, 16_384);

    const pointer1 = arena.allocate(32);
    const pointer2 = arena.allocate(64);

    expect(pointer1).toBe(65_536);
    expect(pointer2).toBe(65_536 + 32);
    expect(arena.allocatedBytes).toBe(96);

    arena.reset();
    expect(arena.allocatedBytes).toBe(0);

    const pointer3 = arena.allocate(32);
    expect(pointer3).toBe(65_536);
  });
});
