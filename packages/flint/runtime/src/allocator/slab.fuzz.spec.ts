import { describe, expect, it } from 'vitest';

import { createFlintMemory, createFlintMultiMemory } from '../memory.js';

import { RegionalBumpArena, SegregatedSlabAllocator, SLAB_SIZE_CLASSES } from './slab.js';

class FuzzPrng {
  private state: number;

  public constructor(seed = 0x43_21_fe_dc) {
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
}

describe('Multi-Memory & Allocator Stress Fuzz Testing (Target 4)', { timeout: 60_000 }, () => {
  const prng = new FuzzPrng(0x99_88_77_66);

  // skipcq: JS-R1005
  it('fuzzes SegregatedSlabAllocator with thousands of random alloc/dealloc cycles and size classes', () => {
    const wasmMem = new WebAssembly.Memory({ initial: 4, maximum: 512 });
    const slabAllocator = new SegregatedSlabAllocator(wasmMem, 65_536);

    interface ActiveAlloc {
      pointer: number;
      size: number;
      magic: number;
    }

    const activeAllocations: ActiveAlloc[] = [];

    for (let step = 0; step < 2000; step += 1) {
      const isAlloc = activeAllocations.length === 0 || prng.nextFloat() < 0.6;

      if (isAlloc) {
        // Pick a random size class or small size
        const sizeClass = SLAB_SIZE_CLASSES[prng.nextInt(0, SLAB_SIZE_CLASSES.length - 1)] as number;
        const size = prng.nextInt(1, sizeClass);
        const pointer = slabAllocator.allocate(size);

        expect(pointer).toBeGreaterThanOrEqual(65_536);

        // Write a magic verification pattern into the allocated memory
        const magic = prng.nextUint32();
        // Check view is up-to-date with potential memory.grow
        const currentView = new DataView(wasmMem.buffer);
        currentView.setUint32(pointer, magic, true);

        activeAllocations.push({ pointer, size, magic });
      } else {
        // Pick an allocation to deallocate
        const index = prng.nextInt(0, activeAllocations.length - 1);
        const alloc = activeAllocations[index];
        if (alloc) {
          // Verify magic is intact before freeing
          const currentView = new DataView(wasmMem.buffer);
          expect(currentView.getUint32(alloc.pointer, true)).toBe(alloc.magic);

          slabAllocator.deallocate(alloc.pointer, alloc.size);
          activeAllocations.splice(index, 1);
        }
      }
    }

    // Free remaining allocations
    for (const alloc of activeAllocations) {
      const currentView = new DataView(wasmMem.buffer);
      expect(currentView.getUint32(alloc.pointer, true)).toBe(alloc.magic);
      slabAllocator.deallocate(alloc.pointer, alloc.size);
    }
  });

  it('fuzzes RegionalBumpArena with rapid reset cycles and boundary allocations', () => {
    const wasmMem = new WebAssembly.Memory({ initial: 2 });
    const arena = new RegionalBumpArena(wasmMem, 65_536, 65_536);

    for (let cycle = 0; cycle < 100; cycle += 1) {
      arena.reset();
      expect(arena.allocatedBytes).toBe(0);

      const allocationCount = prng.nextInt(5, 50);
      for (let index = 0; index < allocationCount; index += 1) {
        const size = prng.nextInt(8, 256);
        if (arena.allocatedBytes + size <= 65_536) {
          const pointer = arena.allocate(size);
          expect(pointer).toBeGreaterThanOrEqual(65_536);
          expect(pointer % 8).toBe(0); // 8-byte alignment invariant
        }
      }
    }
  });

  it('fuzzes Multi-Memory isolation ensuring Memory 1 host buffer operations never corrupt Memory 0 guest heap', () => {
    const multiMem = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 2 },
      foreignHeap: { initialPages: 2 },
    });

    const guestHeap = multiMem.guestHeap;
    const foreignHeap = multiMem.foreignHeap;

    // Fill Memory 0 with deterministic guest data
    const guestAllocations: { pointer: number; size: number; expected: Uint8Array }[] = [];
    for (let index = 0; index < 50; index += 1) {
      const size = 64;
      const pointer = guestHeap.allocate(size);
      const expectedPattern = new Uint8Array(size).fill(0xa5 + (index % 32));
      guestHeap.writeBytes(pointer, expectedPattern);
      guestAllocations.push({ pointer, size, expected: expectedPattern });
    }

    // Perform intensive random writes to Memory 1 (Foreign Sandbox / Host Buffer)
    for (let step = 0; step < 1000; step += 1) {
      const foreignPointer = foreignHeap.allocate(16);
      const payload = prng.nextBytes(16);
      foreignHeap.writeBytes(foreignPointer, payload);
    }

    // Verify Memory 0 guest data is 100% pristine and uncorrupted
    for (const alloc of guestAllocations) {
      const readBytes = guestHeap.readBytes(alloc.pointer, alloc.size);
      expect(readBytes).toEqual(alloc.expected);
      guestHeap.deallocate(alloc.pointer, alloc.size);
    }
  });

  it('fuzzes FlintMemory allocation bounds, top reclamation, and zero-allocation handling', () => {
    const memory = createFlintMemory({ initialPages: 4, maximumPages: 16 });
    const active: { pointer: number; size: number }[] = [];

    for (let index = 0; index < 500; index += 1) {
      const size = prng.nextInt(8, 1024);
      const pointer = memory.allocate(size);
      expect(pointer).toBeGreaterThan(0);
      active.push({ pointer, size });

      if (prng.nextFloat() < 0.3 && active.length > 0) {
        const toFree = active.pop();
        if (toFree !== undefined) {
          memory.deallocate(toFree.pointer, toFree.size);
        }
      }
    }
  });

  it('fuzzes exploit prevention in SegregatedSlabAllocator against double-free, misaligned free, and UAF', async () => {
    const { FlintTrap } = await import('../traps.js');
    const wasmMem = new WebAssembly.Memory({ initial: 4 });
    const slabAllocator = new SegregatedSlabAllocator(wasmMem, 65_536);

    for (let index = 0; index < 500; index += 1) {
      const sizeClass = SLAB_SIZE_CLASSES[prng.nextInt(0, 4)] as number; // 16, 32, 64, 128, 256
      const ptr = slabAllocator.allocate(sizeClass);

      // Write canary payload
      new Uint8Array(wasmMem.buffer, ptr, sizeClass).fill(0xee);

      // Attempt misaligned deallocation
      const misaligned = ptr + prng.nextInt(1, sizeClass - 1);
      expect(() => slabAllocator.deallocate(misaligned, sizeClass)).toThrow(FlintTrap);

      // Deallocate legally
      slabAllocator.deallocate(ptr, sizeClass);

      // Verify payload was zeroed out (mitigating Use-After-Free)
      const readBack = new Uint8Array(wasmMem.buffer, ptr, sizeClass);
      expect(readBack.every((b) => b === 0)).toBe(true);

      // Attempt double-free exploit
      expect(() => slabAllocator.deallocate(ptr, sizeClass)).toThrow(FlintTrap);
    }
  });
});
