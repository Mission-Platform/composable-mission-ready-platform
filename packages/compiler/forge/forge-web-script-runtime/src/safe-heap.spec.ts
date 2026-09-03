import { describe, expect, it } from 'vitest';

import { ForgeWebScriptMemory } from './memory.ts';
import { createForgeWebScriptSafeHeap } from './safe-heap.ts';

describe('Forge Web Script safe heap', () => {
  it('expires region allocations and promotes values across suspension', () => {
    const heap = createForgeWebScriptSafeHeap(new ForgeWebScriptMemory());
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
    const heap = createForgeWebScriptSafeHeap(new ForgeWebScriptMemory());
    const region = heap.beginRegion();
    const allocation = heap.allocate(region, 4);
    const shared = heap.promote(allocation);
    heap.release(shared);
    expect(() => heap.release(shared)).toThrowError(/released/i);
    expect(() => heap.createShared(999, 4)).toThrowError(/exact runtime-owned/i);
  });
});
