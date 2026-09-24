import { FlintTrap } from '../traps.js';

/**
 * Standard power-of-two size classes for segregated small and medium object slab allocation.
 */
export const SLAB_SIZE_CLASSES = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16_384, 32_768, 65_536] as const;

export type SlabSizeClass = (typeof SLAB_SIZE_CLASSES)[number];

/**
 * Allocation slab managing fixed-size slots for a specific size class.
 */
export interface SlabBlock {
  readonly sizeClass: SlabSizeClass;
  readonly basePointer: number;
  readonly capacity: number;
  readonly freeList: number[];
  readonly allocatedSlots: Set<number>;
  allocatedCount: number;
}

/**
 * Atomic spinlock providing mutually exclusive access to shared WebAssembly memory structures.
 */
export class FlintAtomicSpinLock {
  private readonly lockView: Int32Array;
  private readonly lockIndex: number;

  public constructor(lockBuffer: ArrayBufferLike = new SharedArrayBuffer(4), lockIndex = 0) {
    this.lockView = new Int32Array(lockBuffer);
    this.lockIndex = lockIndex;
  }

  /**
   * Acquires the spinlock, spinning until the lock is successfully claimed.
   */
  public acquire(): void {
    if (typeof Atomics === 'undefined') return;
    while (Atomics.compareExchange(this.lockView, this.lockIndex, 0, 1) !== 0) {
      // Spin until lock acquired
    }
  }

  /**
   * Releases the spinlock by resetting the lock state to zero.
   */
  public release(): void {
    if (typeof Atomics === 'undefined') return;
    Atomics.store(this.lockView, this.lockIndex, 0);
  }

  /**
   * Executes a callback within a mutually exclusive critical section protected by this lock.
   */
  public withLock<T>(action: () => T): T {
    this.acquire();
    try {
      return action();
    } finally {
      this.release();
    }
  }
}

/**
 * Configuration options for the segregated slab allocator.
 */
export interface SegregatedSlabAllocatorOptions {
  readonly baseHeapOffset?: number;
  readonly enableCanaries?: boolean;
  readonly isShared?: boolean;
  readonly lock?: FlintAtomicSpinLock;
}

export const SLAB_CANARY_TAG = 0xde_ad_be_ef;

/**
 * Segregated $O(1)$ size-class slab allocator.
 */
export class SegregatedSlabAllocator {
  private readonly memory: WebAssembly.Memory;
  private readonly slabs = new Map<SlabSizeClass, SlabBlock[]>();
  private readonly enableCanaries: boolean;
  private readonly lock?: FlintAtomicSpinLock;
  private nextHeapPointer: number;

  // skipcq: JS-R1005
  public constructor(
    memory: WebAssembly.Memory,
    optionsOrBaseOffset: SegregatedSlabAllocatorOptions | number = 65_536,
  ) {
    this.memory = memory;
    if (typeof optionsOrBaseOffset === 'number') {
      this.nextHeapPointer = optionsOrBaseOffset;
      this.enableCanaries = false;
    } else {
      this.nextHeapPointer = optionsOrBaseOffset.baseHeapOffset ?? 65_536;
      this.enableCanaries = optionsOrBaseOffset.enableCanaries ?? false;
      if (optionsOrBaseOffset.isShared || optionsOrBaseOffset.lock !== undefined) {
        this.lock = optionsOrBaseOffset.lock ?? new FlintAtomicSpinLock();
      }
    }

    for (const sizeClass of SLAB_SIZE_CLASSES) {
      this.slabs.set(sizeClass, []);
    }
  }

  /**
   * Allocates a small object of the requested size using an appropriate size-class slab.
   */
  public allocate(size: number): number {
    if (this.lock !== undefined) {
      return this.lock.withLock(() => this.allocateInternal(size));
    }
    return this.allocateInternal(size);
  }

  /**
   * Internal allocation routine finding or provisioning a slab of the target size class.
   */
  // skipcq: JS-R1005
  private allocateInternal(size: number): number {
    const sizeClass = this.findSizeClass(size);
    if (sizeClass === undefined) {
      // Fallback for large allocations: direct bump from top with 16-byte SIMD alignment
      const pointer = this.nextHeapPointer;
      this.nextHeapPointer += Math.trunc((size + 15) / 16) * 16;
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

    targetSlab.allocatedSlots.add(slot);
    targetSlab.allocatedCount += 1;

    if (this.enableCanaries) {
      const view = new DataView(this.memory.buffer);
      const canaryOffset = slot + targetSlab.sizeClass - 4;
      if (canaryOffset + 4 <= this.memory.buffer.byteLength) {
        view.setUint32(canaryOffset, SLAB_CANARY_TAG, true);
      }
    }

    return slot;
  }

  /**
   * Allocates contiguous memory for an array of count * elementSize with checked multiplication guards.
   */
  // skipcq: JS-R1005
  public allocateArray(count: number, elementSize: number): number {
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(elementSize) || elementSize < 0) {
      throw new FlintTrap('MemoryExhausted', 'Array count and elementSize must be non-negative safe integers.');
    }
    if (count === 0 || elementSize === 0) {
      return 0x8; // Zero-sized sentinel pointer
    }
    const maxBytes = 0x7f_ff_ff_ff;
    if (count > Math.floor(maxBytes / elementSize)) {
      throw new FlintTrap(
        'MemoryExhausted',
        `Array allocation size overflows bounds: count=${count} * elementSize=${elementSize} exceeds max capacity.`,
      );
    }
    return this.allocate(count * elementSize);
  }

  /**
   * Frees a small object previously allocated in a slab.
   * Defends against Use-After-Free, Double-Free, red-zone canary corruption, and misaligned pointer corruptions.
   */
  public deallocate(pointer: number, size: number): void {
    if (this.lock !== undefined) {
      return this.lock.withLock(() => this.deallocateInternal(pointer, size));
    }
    return this.deallocateInternal(pointer, size);
  }

  /**
   * Internal deallocation routine validating slab ownership, canary, and returning slot to free list.
   */
  // skipcq: JS-R1005
  private deallocateInternal(pointer: number, size: number): void {
    const sizeClass = this.findSizeClass(size);
    if (sizeClass === undefined) return;

    const slabList = this.slabs.get(sizeClass) ?? [];
    for (const slab of slabList) {
      const slabEnd = slab.basePointer + slab.capacity * slab.sizeClass;
      if (pointer >= slab.basePointer && pointer < slabEnd) {
        if ((pointer - slab.basePointer) % slab.sizeClass !== 0) {
          throw new FlintTrap(
            'InvalidOwnership',
            `Misaligned deallocation pointer 0x${pointer.toString(16)} for size class ${slab.sizeClass}.`,
          );
        }

        if (!slab.allocatedSlots.has(pointer)) {
          if (slab.freeList.includes(pointer)) {
            throw new FlintTrap(
              'DoubleRelease',
              `Double-free detected for pointer 0x${pointer.toString(16)} in size class ${slab.sizeClass}.`,
            );
          }
          throw new FlintTrap(
            'InvalidOwnership',
            `Pointer 0x${pointer.toString(16)} was not allocated from this slab.`,
          );
        }

        if (this.enableCanaries) {
          const view = new DataView(this.memory.buffer);
          const canaryOffset = pointer + slab.sizeClass - 4;
          if (canaryOffset + 4 <= this.memory.buffer.byteLength) {
            const canary = view.getUint32(canaryOffset, true);
            if (canary !== SLAB_CANARY_TAG) {
              throw new FlintTrap(
                'InvalidOwnership',
                `Adjacent heap buffer overflow detected: canary corrupted at 0x${pointer.toString(16)}.`,
              );
            }
          }
        }

        slab.allocatedSlots.delete(pointer);
        slab.freeList.push(pointer);
        slab.allocatedCount = Math.max(0, slab.allocatedCount - 1);

        // Zero out payload bytes to mitigate Use-After-Free data leakage
        new Uint8Array(this.memory.buffer, pointer, slab.sizeClass).fill(0);
        return;
      }
    }
  }

  /**
   * Finds the smallest matching segregated slab size class for a requested byte size.
   */
  // skipcq: JS-0105
  private findSizeClass(size: number): SlabSizeClass | undefined {
    for (const sizeClass of SLAB_SIZE_CLASSES) {
      if (size <= sizeClass) return sizeClass;
    }
    return undefined;
  }

  /**
   * Allocates a new contiguous slab block for the given size class and populates its free list.
   */
  private createSlab(sizeClass: SlabSizeClass): SlabBlock {
    const slotCount = sizeClass <= 2048 ? 64 : sizeClass <= 16_384 ? 16 : 4;
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
      allocatedSlots: new Set<number>(),
      allocatedCount: 0,
    };
  }

  /**
   * Grows the underlying WebAssembly linear memory if the required end offset exceeds current capacity.
   */
  // skipcq: JS-R1005
  private ensureCapacity(requiredEndPointer: number): void {
    const currentBytes = this.memory.buffer.byteLength;
    if (requiredEndPointer > currentBytes) {
      const pagesNeeded = Math.ceil((requiredEndPointer - currentBytes) / 65_536);
      try {
        const previous = this.memory.grow(pagesNeeded);
        if (previous === -1 || previous < 0) {
          throw new FlintTrap('MemoryExhausted', 'Slab allocator linear memory could not grow (returned -1).');
        }
      } catch (error) {
        if (error instanceof FlintTrap) throw error;
        throw new FlintTrap('MemoryExhausted', 'Slab allocator linear memory could not grow.', undefined, {
          cause: error,
        });
      }
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

  public constructor(memory: WebAssembly.Memory, basePointer: number, capacity = 65_536) {
    this.memory = memory;
    this.basePointer = basePointer;
    this.capacity = capacity;
  }

  /**
   * Allocates `size` bytes from the current regional arena in $O(1)$ time with optional alignment (default 8 bytes, supports 16 for SIMD).
   */
  public allocate(size: number, alignment = 8): number {
    const alignMask = alignment - 1;
    const alignedOffset = (this.currentOffset + alignMask) & ~alignMask;
    const alignedSize = (size + alignMask) & ~alignMask;
    if (alignedOffset + alignedSize > this.capacity) {
      throw new FlintTrap('MemoryExhausted', 'Regional bump arena exhausted capacity.');
    }
    const pointer = this.basePointer + alignedOffset;
    this.currentOffset = alignedOffset + alignedSize;
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
