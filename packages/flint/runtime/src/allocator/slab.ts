import { FlintTrap } from '../traps.js';

/**
 * Standard power-of-two size classes for segregated small object slab allocation.
 */
export const SLAB_SIZE_CLASSES = [16, 32, 64, 128, 256, 512, 1024, 2048] as const;

export type SlabSizeClass = (typeof SLAB_SIZE_CLASSES)[number];

/**
 * Allocation slab managing fixed-size slots for a specific size class.
 */
export interface SlabBlock {
  readonly sizeClass: SlabSizeClass;
  readonly basePointer: number;
  readonly capacity: number;
  readonly freeList: number[];
  allocatedCount: number;
}

/**
 * Segregated $O(1)$ size-class slab allocator.
 */
export class SegregatedSlabAllocator {
  private readonly memory: WebAssembly.Memory;
  private readonly slabs = new Map<SlabSizeClass, SlabBlock[]>();
  private nextHeapPointer: number;

  public constructor(memory: WebAssembly.Memory, baseHeapOffset = 65_536) {
    this.memory = memory;
    this.nextHeapPointer = baseHeapOffset;

    for (const sizeClass of SLAB_SIZE_CLASSES) {
      this.slabs.set(sizeClass, []);
    }
  }

  /**
   * Allocates a small object of the requested size using an appropriate size-class slab.
   */
  public allocate(size: number): number {
    const sizeClass = this.findSizeClass(size);
    if (sizeClass === undefined) {
      // Fallback for large allocations: direct bump from top
      const pointer = this.nextHeapPointer;
      this.nextHeapPointer += Math.trunc((size + 7) / 8) * 8;
      this.ensureCapacity(this.nextHeapPointer);
      return pointer;
    }

    const slabList = this.slabs.get(sizeClass) ?? [];
    let targetSlab = slabList.find((slab) => slab.freeList.length > 0);

    if (targetSlab === undefined) {
      targetSlab = this.createSlab(sizeClass);
      slabList.push(targetSlab);
    }

    const slot = targetSlab.freeList.pop();
    if (slot === undefined) {
      throw new FlintTrap('MemoryExhausted', `No available slots in slab for size class ${sizeClass}`);
    }

    targetSlab.allocatedCount += 1;
    return slot;
  }

  /**
   * Frees a small object previously allocated in a slab.
   */
  public deallocate(pointer: number, size: number): void {
    const sizeClass = this.findSizeClass(size);
    if (sizeClass === undefined) return;

    const slabList = this.slabs.get(sizeClass) ?? [];
    for (const slab of slabList) {
      const slabEnd = slab.basePointer + slab.capacity * slab.sizeClass;
      if (pointer >= slab.basePointer && pointer < slabEnd) {
        slab.freeList.push(pointer);
        slab.allocatedCount = Math.max(0, slab.allocatedCount - 1);
        return;
      }
    }
  }

  private findSizeClass(size: number): SlabSizeClass | undefined {
    for (const sizeClass of SLAB_SIZE_CLASSES) {
      if (size <= sizeClass) return sizeClass;
    }
    return undefined;
  }

  private createSlab(sizeClass: SlabSizeClass, slotCount = 64): SlabBlock {
    const basePointer = this.nextHeapPointer;
    const slabByteSize = sizeClass * slotCount;
    this.nextHeapPointer += slabByteSize;
    this.ensureCapacity(this.nextHeapPointer);

    const freeList: number[] = [];
    for (let index = slotCount - 1; index >= 0; index -= 1) {
      freeList.push(basePointer + index * sizeClass);
    }

    return {
      sizeClass,
      basePointer,
      capacity: slotCount,
      freeList,
      allocatedCount: 0,
    };
  }

  private ensureCapacity(requiredEndPointer: number): void {
    const currentBytes = this.memory.buffer.byteLength;
    if (requiredEndPointer > currentBytes) {
      const pagesNeeded = Math.ceil((requiredEndPointer - currentBytes) / 65_536);
      this.memory.grow(pagesNeeded);
    }
  }
}

/**
 * Regional bump allocator arena providing $O(1)$ allocation and instant bulk reset.
 */
export class RegionalBumpArena {
  public readonly memory: WebAssembly.Memory;
  private readonly basePointer: number;
  private currentOffset = 0;
  private readonly capacity: number;

  public constructor(memory: WebAssembly.Memory, basePointer: number, capacity: number = 65_536) {
    this.memory = memory;
    this.basePointer = basePointer;
    this.capacity = capacity;
  }

  /**
   * Allocates `size` bytes from the current regional arena in $O(1)$ time.
   */
  public allocate(size: number): number {
    const alignedSize = Math.trunc((size + 7) / 8) * 8;
    if (this.currentOffset + alignedSize > this.capacity) {
      throw new FlintTrap('MemoryExhausted', 'Regional bump arena exhausted capacity.');
    }
    const pointer = this.basePointer + this.currentOffset;
    this.currentOffset += alignedSize;
    return pointer;
  }

  /**
   * Resets the regional bump pointer in $O(1)$ time on scope exit.
   */
  public reset(): void {
    this.currentOffset = 0;
  }

  /**
   * Current allocated byte count within the arena.
   */
  public get allocatedBytes(): number {
    return this.currentOffset;
  }
}
