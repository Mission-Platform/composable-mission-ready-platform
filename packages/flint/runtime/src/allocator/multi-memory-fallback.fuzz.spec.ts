import { describe, expect, it } from 'vitest';

import { createFlintMultiMemory, FlintRegionalArena } from '../memory.js';

import { SegregatedSlabAllocator, SLAB_SIZE_CLASSES } from './slab.js';

/**
 * Deterministic PRNG (Xorshift32) for reproducible fuzzing seeds.
 */
class FuzzPrng {
  private state: number;

  public constructor(seed = 0x5a_f1_ca_11) {
    this.state = seed || 1;
  }

  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x1_00_00_00_00;
  }

  public nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  public nextBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = this.nextUint32() & 0xff;
    }
    return bytes;
  }

  public pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)] as T;
  }
}

describe('Multi-Memory Partitioned Fallback Fuzz Testing (Target 4)', () => {
  const prng = new FuzzPrng(0xfe_ed_fa_11);

  it('correctly initializes fallback mode when requested explicitly or when capabilities are absent', () => {
    // Explicit fallback
    const explicit = createFlintMultiMemory({ fallback: true });
    expect(explicit.isFallback).toBe(true);
    expect(explicit.mode).toBe('partitioned-fallback');

    // Implicit fallback (capability absent, allowFallback: true)
    const implicit = createFlintMultiMemory({ capabilities: [], allowFallback: true });
    expect(implicit.isFallback).toBe(true);
    expect(implicit.mode).toBe('partitioned-fallback');

    // Strict mode rejecting missing capability when allowFallback: false
    expect(() => {
      createFlintMultiMemory({ capabilities: [], allowFallback: false });
    }).toThrow(/not declared/);
  });

  // skipcq: JS-R1005
  it('fuzzes 3,000 randomized cross-partition allocation, read, write, and isolation operations', () => {
    const multiMemory = createFlintMultiMemory({
      mode: 'partitioned-fallback',
      guestHeap: { initialPages: 16 },
      foreignHeap: { initialPages: 16 },
      hostInterop: { initialPages: 16 },
      staticData: { initialPages: 16 },
    });

    const partitions = [
      { name: 'guestHeap' as const, mem: multiMemory.guestHeap },
      { name: 'foreignHeap' as const, mem: multiMemory.foreignHeap },
      { name: 'hostInterop' as const, mem: multiMemory.hostInterop },
      { name: 'staticData' as const, mem: multiMemory.staticData },
    ];

    interface TrackedAllocation {
      readonly partitionIndex: number;
      readonly pointer: number;
      readonly data: Uint8Array;
    }

    const liveAllocations: TrackedAllocation[] = [];

    for (let iteration = 0; iteration < 3000; iteration += 1) {
      const action = prng.nextInt(0, 3);

      if (action <= 1 || liveAllocations.length === 0) {
        // Allocate and write
        const partitionIndex = prng.nextInt(0, partitions.length - 1);
        const partition = partitions[partitionIndex];
        if (partition === undefined) continue;

        const size = prng.nextInt(4, 512);
        const payload = prng.nextBytes(size);

        const pointer = Number(partition.mem.allocate(size));
        partition.mem.writeBytes(pointer, payload);

        liveAllocations.push({
          partitionIndex,
          pointer,
          data: payload,
        });
      } else if (action === 2) {
        // Verify random live allocation content
        const index = prng.nextInt(0, liveAllocations.length - 1);
        const target = liveAllocations[index];
        if (target !== undefined) {
          const partition = partitions[target.partitionIndex];
          if (partition !== undefined) {
            const readBack = partition.mem.readBytes(target.pointer, target.data.length);
            expect(readBack).toEqual(target.data);
          }
        }
      } else {
        // Deallocate random live allocation
        const index = prng.nextInt(0, liveAllocations.length - 1);
        const target = liveAllocations[index];
        if (target !== undefined) {
          const partition = partitions[target.partitionIndex];
          if (partition !== undefined) {
            partition.mem.deallocate(target.pointer, target.data.length);
            liveAllocations.splice(index, 1);
          }
        }
      }
    }

    // Final verification of all remaining live allocations across all 4 partitions
    for (const item of liveAllocations) {
      const partition = partitions[item.partitionIndex];
      if (partition !== undefined) {
        const readBack = partition.mem.readBytes(item.pointer, item.data.length);
        expect(readBack).toEqual(item.data);
      }
    }
  });

  it('fuzzes strict partition boundary isolation preventing cross-partition access in fallback mode', async () => {
    const { FALLBACK_GUARD_PAGE_SIZE } = await import('../memory.js');
    const multiMemory = createFlintMultiMemory({ mode: 'partitioned-fallback' });

    // Writing beyond usable partition size (encroaching into guard page or next partition) must trap
    const usableSize = 67_108_864 - FALLBACK_GUARD_PAGE_SIZE;

    expect(() => {
      multiMemory.guestHeap.writeBytes(usableSize, new Uint8Array([1, 2, 3]));
    }).toThrow(/outside linear memory/);

    expect(() => {
      multiMemory.foreignHeap.writeBytes(usableSize, new Uint8Array([1, 2, 3]));
    }).toThrow(/outside linear memory/);

    expect(() => {
      multiMemory.hostInterop.writeBytes(usableSize, new Uint8Array([1, 2, 3]));
    }).toThrow(/outside linear memory/);

    expect(() => {
      multiMemory.staticData.writeBytes(usableSize, new Uint8Array([1, 2, 3]));
    }).toThrow(/outside linear memory/);
  });

  it('fuzzes DMA cross-memory transfers in fallback mode', () => {
    const multiMemory = createFlintMultiMemory({ mode: 'partitioned-fallback' });

    for (let index = 0; index < 200; index += 1) {
      const length = prng.nextInt(8, 2048);
      const original = prng.nextBytes(length);

      const guestPointer = multiMemory.guestHeap.allocate(length);
      multiMemory.guestHeap.writeBytes(guestPointer, original);

      // Transfer guest -> foreign
      const foreignPointer = multiMemory.transferToForeign(guestPointer, length);
      expect(multiMemory.foreignHeap.readBytes(foreignPointer, length)).toEqual(original);

      // Mutate in foreign
      const mutated = prng.nextBytes(length);
      multiMemory.foreignHeap.writeBytes(foreignPointer, mutated);

      // Transfer foreign -> guest
      const returnedGuestPointer = multiMemory.transferFromForeign(foreignPointer, length);
      expect(multiMemory.guestHeap.readBytes(returnedGuestPointer, length)).toEqual(mutated);

      // Transfer guest -> interop
      const interopPointer = multiMemory.transferToInterop(returnedGuestPointer, length);
      expect(multiMemory.hostInterop.readBytes(interopPointer, length)).toEqual(mutated);

      // Transfer interop -> guest
      const backFromInterop = multiMemory.transferFromInterop(interopPointer, length);
      expect(multiMemory.guestHeap.readBytes(backFromInterop, length)).toEqual(mutated);
    }
  });

  // skipcq: JS-R1005
  it('fuzzes SegregatedSlabAllocator across small and medium size classes in fallback partitions', () => {
    const multiMemory = createFlintMultiMemory({ mode: 'partitioned-fallback' });
    const slabAllocator = new SegregatedSlabAllocator(multiMemory.guestHeap.wasmMemory, 65_536);

    interface SlabAlloc {
      pointer: number;
      size: number;
      pattern: Uint8Array;
    }

    const slabAllocations: SlabAlloc[] = [];

    // Fuzz alloc/dealloc across all SLAB_SIZE_CLASSES including medium buckets up to 65536
    for (let index = 0; index < 1000; index += 1) {
      const sizeClass = prng.pick(SLAB_SIZE_CLASSES);
      const size = prng.nextInt(Math.max(1, sizeClass - 8), sizeClass);
      const pattern = prng.nextBytes(size);

      const pointer = slabAllocator.allocate(size);
      expect(pointer).toBeGreaterThan(0);

      new Uint8Array(multiMemory.guestHeap.wasmMemory.buffer).set(pattern, pointer);
      slabAllocations.push({ pointer, size, pattern });

      if (slabAllocations.length > 50 && prng.nextFloat() < 0.5) {
        const removeIndex = prng.nextInt(0, slabAllocations.length - 1);
        const item = slabAllocations[removeIndex];
        if (item !== undefined) {
          slabAllocator.deallocate(item.pointer, item.size);
          slabAllocations.splice(removeIndex, 1);
        }
      }
    }

    // Verify remaining slab allocations
    for (const item of slabAllocations) {
      const readBack = new Uint8Array(multiMemory.guestHeap.wasmMemory.buffer, item.pointer, item.size);
      expect(readBack).toEqual(item.pattern);
    }
  });

  it('fuzzes RegionalArena lifecycle within partitioned fallback memory', () => {
    const multiMemory = createFlintMultiMemory({ mode: 'partitioned-fallback' });

    for (let round = 0; round < 20; round += 1) {
      const arenaSize = 32 * 1024;
      FlintRegionalArena.withRegion(multiMemory.guestHeap, arenaSize, (arena) => {
        for (let a = 0; a < 100; a += 1) {
          const allocSize = prng.nextInt(4, 64);
          const pointer = arena.allocate(allocSize);
          expect(pointer).toBeGreaterThan(0);
        }
        arena.reset();
        const resetPointer = arena.allocate(16);
        expect(resetPointer).toBeGreaterThan(0);
      });
    }
  });
});
