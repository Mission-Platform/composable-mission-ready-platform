import { FlintTrap } from './traps.js';

import type { FlintMemory, FlintMemoryAddress } from './memory.js';

export const FLINT_MEMORY_MODEL = 'region-arc-checked-linear' as const;

/**
 * Lifetime token identifying an active memory region.
 */
export interface FlintRegion {
  readonly id: number;
  readonly active: boolean;
}

/**
 * Descriptor tracking a memory allocation bound to a lifetime region.
 */
export interface FlintRegionAllocation {
  readonly pointer: FlintMemoryAddress;
  readonly length: number;
  readonly region: number;
}

/**
 * Handle reference identifying a reference-counted shared memory allocation.
 */
export interface FlintSharedHandle {
  readonly id: number;
  readonly pointer: FlintMemoryAddress;
  readonly length: number;
}

/**
 * Weak reference handle referencing a shared memory allocation without incrementing strong reference counts.
 * Mitigates monotonic memory leaks caused by cyclic data structures.
 */
export interface FlintWeakHandle {
  readonly id: number;
  readonly sharedId: number;
}

/**
 * Internal tracking state for an active lifetime region.
 */
interface RegionState {
  readonly id: number;
  active: boolean;
  readonly allocations: Map<number, number>;
}

/**
 * Internal tracking state for a reference-counted shared memory allocation.
 */
interface SharedState {
  readonly id: number;
  readonly pointer: FlintMemoryAddress;
  readonly length: number;
  references: number;
  weakReferences: number;
  released: boolean;
}

/**
 * High-performance scoped arena bump allocator for transient tasks.
 * Reclaims all allocated memory in an instant O(1) pointer reset.
 */
export class FlintRegionArena {
  public readonly basePointer: FlintMemoryAddress;
  public readonly capacity: number;
  public readonly memory: FlintMemory;
  private currentOffset = 0;

  /**
   * Initializes a bump-pointer memory arena.
   *
   * @param memory - Linear memory instance.
   * @param basePointer - Base address of arena buffer.
   * @param capacity - Total capacity in bytes.
   */
  public constructor(memory: FlintMemory, basePointer: FlintMemoryAddress, capacity: number) {
    this.memory = memory;
    this.basePointer = basePointer;
    this.capacity = capacity;
  }

  /**
   * Number of bytes allocated within the arena.
   */
  public get usedBytes(): number {
    return this.currentOffset;
  }

  /**
   * Number of remaining unallocated bytes in the arena buffer.
   */
  public get remainingBytes(): number {
    return this.capacity - this.currentOffset;
  }

  /**
   * Allocates a contiguous chunk of memory within the arena with the requested alignment.
   */
  // skipcq: JS-R1005
  public allocate(size: number, alignment = 8): FlintMemoryAddress {
    if (!Number.isSafeInteger(size) || size <= 0)
      throw new FlintTrap('MemoryExhausted', 'Arena allocation size must be positive.');
    const alignedOffset = (this.currentOffset + (alignment - 1)) & ~(alignment - 1);
    if (alignedOffset + size > this.capacity)
      throw new FlintTrap(
        'MemoryExhausted',
        `Arena capacity exhausted: requested ${size} bytes with ${this.remainingBytes} remaining.`,
      );
    this.currentOffset = alignedOffset + size;
    const base = typeof this.basePointer === 'bigint' ? Number(this.basePointer) : this.basePointer;
    return typeof this.basePointer === 'bigint' ? BigInt(base + alignedOffset) : base + alignedOffset;
  }

  /**
   * Resets the arena bump pointer back to 0 in O(1) time, reclaiming all transient allocations.
   */
  public reset(): void {
    this.currentOffset = 0;
  }
}

/**
 * Physical or free block descriptor within a TLSF memory pool.
 */
interface TlsfBlock {
  offset: number;
  size: number;
  isFree: boolean;
  prevPhysical?: TlsfBlock;
  nextPhysical?: TlsfBlock;
  prevFree?: TlsfBlock;
  nextFree?: TlsfBlock;
}

const TLSF_SLI = 2; // 4 second-level subdivisions (2^2)
const TLSF_SECOND_LEVELS = 1 << TLSF_SLI;
const TLSF_MIN_BLOCK_SIZE = 16;
const TLSF_MAX_FL = 28;

// skipcq: JS-D1001
const createSlBitmapInitial = (): number[] => Array.from({ length: TLSF_MAX_FL }, () => 0);
// skipcq: JS-D1001
const createFreeListsInitial = (): (TlsfBlock | undefined)[][] =>
  Array.from({ length: TLSF_MAX_FL }, () => Array.from<TlsfBlock | undefined>({ length: TLSF_SECOND_LEVELS }));

/**
 * Two-Level Segregated Fit (TLSF) memory allocator.
 * Guarantees O(1) allocation and deallocation time with immediate physical coalescing
 * and minimal fragmentation for embedded/real-time Wasm workloads.
 */
export class FlintTlsfAllocator {
  public readonly basePointer: FlintMemoryAddress;
  public readonly poolSize: number;
  private readonly memory: FlintMemory;
  private flBitmap = 0;
  private readonly slBitmap: number[] = createSlBitmapInitial();
  private readonly freeLists: (TlsfBlock | undefined)[][] = createFreeListsInitial();
  private readonly allocatedBlocks = new Map<number, TlsfBlock>();

  /**
   * Initializes a Two-Level Segregated Fit allocator pool.
   *
   * @param memory - Linear memory instance.
   * @param poolSize - Memory pool size in bytes.
   */
  public constructor(memory: FlintMemory, poolSize = 131_072) {
    this.memory = memory;
    this.poolSize = Math.max(poolSize, 1024);
    this.basePointer = this.memory.allocate(this.poolSize);

    const initialBlock: TlsfBlock = {
      offset: 0,
      size: this.poolSize,
      isFree: true,
    };
    this.insertFreeBlock(initialBlock);
  }

  /**
   * Allocates a memory block of at least the requested size in guaranteed O(1) time.
   */
  // skipcq: JS-R1005
  public allocate(size: number): FlintMemoryAddress {
    if (!Number.isSafeInteger(size) || size <= 0)
      throw new FlintTrap('MemoryExhausted', 'TLSF allocation size must be a positive integer.');
    const alignedSize = Math.max(TLSF_MIN_BLOCK_SIZE, (size + 7) & ~7);
    const block = this.findSuitableBlock(alignedSize);
    if (!block)
      throw new FlintTrap('MemoryExhausted', `TLSF heap exhausted: cannot satisfy allocation of ${size} bytes.`);

    this.removeFreeBlock(block);

    // Split block if remaining space is large enough
    if (block.size - alignedSize >= TLSF_MIN_BLOCK_SIZE) {
      const splitBlock: TlsfBlock = {
        offset: block.offset + alignedSize,
        size: block.size - alignedSize,
        isFree: true,
        prevPhysical: block,
        nextPhysical: block.nextPhysical,
      };
      if (block.nextPhysical) {
        block.nextPhysical.prevPhysical = splitBlock;
      }
      block.nextPhysical = splitBlock;
      block.size = alignedSize;
      this.insertFreeBlock(splitBlock);
    }

    block.isFree = false;
    this.allocatedBlocks.set(block.offset, block);
    const base = typeof this.basePointer === 'bigint' ? Number(this.basePointer) : this.basePointer;
    return typeof this.basePointer === 'bigint' ? BigInt(base + block.offset) : base + block.offset;
  }

  /**
   * Deallocates a previously allocated TLSF memory block in O(1) time,
   * immediately coalescing with adjacent free blocks to eliminate fragmentation.
   */
  // skipcq: JS-R1005
  public deallocate(pointer: FlintMemoryAddress): void {
    const raw = typeof pointer === 'bigint' ? Number(pointer) : pointer;
    const base = typeof this.basePointer === 'bigint' ? Number(this.basePointer) : this.basePointer;
    const offset = raw - base;
    const block = this.allocatedBlocks.get(offset);
    if (!block || block.isFree)
      throw new FlintTrap('InvalidOwnership', `Invalid or duplicate TLSF deallocation at address ${raw}.`);

    // skipcq: JS-0105
    this.allocatedBlocks.delete(offset);
    block.isFree = true;

    // Coalesce with adjacent next block
    let merged = block;
    if (merged.nextPhysical?.isFree) {
      const next = merged.nextPhysical;
      this.removeFreeBlock(next);
      merged.size += next.size;
      merged.nextPhysical = next.nextPhysical;
      if (next.nextPhysical) next.nextPhysical.prevPhysical = merged;
    }

    // Coalesce with adjacent previous block
    if (merged.prevPhysical?.isFree) {
      const previous = merged.prevPhysical;
      this.removeFreeBlock(previous);
      previous.size += merged.size;
      previous.nextPhysical = merged.nextPhysical;
      if (merged.nextPhysical) merged.nextPhysical.prevPhysical = previous;
      merged = previous;
    }

    this.insertFreeBlock(merged);
  }

  /**
   * Computes the first-level and second-level list indices for a block size.
   *
   * @param size - Block size in bytes.
   * @returns First-level and second-level list coordinates.
   */
  private static mapping(size: number): { fl: number; sl: number } {
    const fl = 31 - Math.clz32(size);
    const sl = (size >> (fl - TLSF_SLI)) ^ TLSF_SECOND_LEVELS;
    return {
      fl: Math.min(fl, TLSF_MAX_FL - 1),
      sl: Math.min(sl, TLSF_SECOND_LEVELS - 1),
    };
  }

  /**
   * Inserts a freed block into the appropriate segregated free list.
   *
   * @param block - Freed memory block descriptor.
   */
  private insertFreeBlock(block: TlsfBlock): void {
    const { fl, sl } = FlintTlsfAllocator.mapping(block.size);
    const slList = this.freeLists[fl];
    if (slList === undefined) return;
    const head = slList[sl];
    block.prevFree = undefined;
    block.nextFree = head;
    if (head) head.prevFree = block;
    slList[sl] = block;

    this.flBitmap |= 1 << fl;
    this.slBitmap[fl] = (this.slBitmap[fl] ?? 0) | (1 << sl);
  }

  /**
   * Removes a block from its segregated free list.
   *
   * @param block - Memory block descriptor to unlink.
   */
  // skipcq: JS-R1005
  private removeFreeBlock(block: TlsfBlock): void {
    const { fl, sl } = FlintTlsfAllocator.mapping(block.size);
    const slList = this.freeLists[fl];
    if (block.prevFree) {
      block.prevFree.nextFree = block.nextFree;
    } else if (slList !== undefined) {
      slList[sl] = block.nextFree;
    }
    if (block.nextFree) {
      block.nextFree.prevFree = block.prevFree;
    }
    block.prevFree = undefined;
    block.nextFree = undefined;

    if (slList !== undefined && !slList[sl]) {
      this.slBitmap[fl] = (this.slBitmap[fl] ?? 0) & ~(1 << sl);
      if (this.slBitmap[fl] === 0) {
        this.flBitmap &= ~(1 << fl);
      }
    }
  }

  /**
   * Finds an available free block satisfying the requested allocation size in O(1) time.
   *
   * @param size - Minimum required block size.
   * @returns Free block descriptor or undefined if pool is exhausted.
   */
  private findSuitableBlock(size: number): TlsfBlock | undefined {
    let { fl, sl } = FlintTlsfAllocator.mapping(size);
    let slMask = (this.slBitmap[fl] ?? 0) & ~((1 << sl) - 1);
    if (slMask === 0) {
      const flMask = this.flBitmap & ~((1 << (fl + 1)) - 1);
      if (flMask === 0) return undefined;
      fl = 31 - Math.clz32(flMask & -flMask);
      slMask = this.slBitmap[fl] ?? 0;
    }
    sl = 31 - Math.clz32(slMask & -slMask);
    return this.freeLists[fl]?.[sl];
  }
}

/**
 * Deterministic scoped heap for compiler-managed values. Raw fws_alloc calls
 * remain on FlintMemory and are never implicitly retained here.
 */
export class FlintSafeHeap {
  public readonly memory: FlintMemory;
  private nextRegion = 1;
  private nextHandle = 1;
  private nextWeakHandle = 1;
  private readonly regions = new Map<number, RegionState>();
  private readonly shared = new Map<number, SharedState>();
  private readonly weakHandles = new Map<number, number>();

  /**
   * Initializes a new FlintSafeHeap manager bound to linear memory.
   *
   * @param memory - Linear memory instance.
   */
  public constructor(memory: FlintMemory) {
    this.memory = memory;
  }

  /**
   * Opens a new lifetime region for scoped memory allocations.
   *
   // skipcq: JS-R1005
   * @returns Newly allocated lifetime region token.
   */
  public beginRegion(): FlintRegion {
    const id = this.nextRegion++;
    this.regions.set(id, { id, active: true, allocations: new Map() });
    return { id, active: true };
  }

  /**
   * Allocates a memory block bound to a specified lifetime region.
   *
   * @param region - Region owning the allocation.
   * @param length - Size in bytes to allocate.
   * @returns Region allocation descriptor.
   */
  public allocate(region: FlintRegion, length: number): FlintRegionAllocation {
    const state = this.requireRegion(region);
    // skipcq: JS-R1005
    const pointer = this.memory.allocate(length);
    state.allocations.set(FlintSafeHeap.offset(pointer), length);
    return { pointer, length, region: state.id };
  }

  /** Checks a borrow immediately before use, preventing stale region pointers. */
  public borrow(allocation: FlintRegionAllocation): void {
    const state = this.regions.get(allocation.region);
    if (
      state === undefined ||
      !state.active ||
      state.allocations.get(FlintSafeHeap.offset(allocation.pointer)) !== allocation.length
    )
      throw new FlintTrap('RegionExpired', 'A region allocation was used after its region ended.');
    this.memory.checkRange(allocation.pointer, allocation.length);
  }

  /** Promote a value before an async/iterator suspension or another escape boundary. */
  public promote(allocation: FlintRegionAllocation): FlintSharedHandle {
    const state = this.requireRegion({ id: allocation.region, active: true });
    const offset = FlintSafeHeap.offset(allocation.pointer);
    if (state.allocations.get(offset) !== allocation.length)
      throw new FlintTrap('RegionExpired', 'A region allocation is no longer available for promotion.');
    state.allocations.delete(offset);
    return this.createShared(allocation.pointer, allocation.length);
  }

  /** A suspension is legal only after every region value has been promoted. */
  public prepareSuspension(region: FlintRegion): void {
    const state = this.requireRegion(region);
    if (state.allocations.size > 0)
      throw new FlintTrap('BorrowViolation', 'Region borrows cannot cross an async or iterator suspension.');
  }

  /**
   * Initializes a high-performance bump-pointer arena bound to a lifetime region.
   *
   * @param region - Owning lifetime region.
   * @param capacity - Arena buffer capacity in bytes.
   * @returns Initialized FlintRegionArena.
   */
  public beginArena(region: FlintRegion, capacity = 65_536): FlintRegionArena {
    const allocation = this.allocate(region, capacity);
    return new FlintRegionArena(this.memory, allocation.pointer, capacity);
  }

  /**
   * Instantiates a Two-Level Segregated Fit (TLSF) O(1) allocator pool.
   *
   * @param poolSize - Size of the TLSF memory pool in bytes.
   * @returns Configured FlintTlsfAllocator instance.
   */
  public createTlsfAllocator(poolSize = 131_072): FlintTlsfAllocator {
    return new FlintTlsfAllocator(this.memory, poolSize);
  }

  /**
   * Closes a lifetime region and bulk-deallocates all allocations bound to it.
   *
   * @param region - Region to terminate.
   */
  // skipcq: JS-R1005
  public endRegion(region: FlintRegion): void {
    const state = this.requireRegion(region);
    state.active = false;
    for (const [pointer, length] of state.allocations) this.memory.deallocate(pointer, length);
    state.allocations.clear();
  }

  /**
   * Promotes an allocated memory range to a reference-counted shared handle.
   *
   * @param pointer - Base memory address.
   * @param length - Size in bytes.
   * @returns New shared allocation handle.
   */
  public createShared(pointer: FlintMemoryAddress, length: number): FlintSharedHandle {
    if (this.memory.allocationSize(pointer) !== length)
      throw new FlintTrap('InvalidOwnership', 'Shared handles may only wrap an exact runtime-owned allocation.');
    const id = this.nextHandle++;
    this.shared.set(id, { id, pointer, length, references: 1, weakReferences: 0, released: false });
    return { id, pointer, length };
  }

  /**
   * Increments the reference count for a shared memory handle.
   *
   * @param handle - Shared handle to retain.
   */
  public retain(handle: FlintSharedHandle): void {
    const state = this.requireShared(handle);
    state.references += 1;
  }

  /**
   * Creates a non-owning weak reference handle to a shared allocation.
   *
   * @param handle - Shared handle to reference weakly.
   * @returns New weak reference handle.
   */
  public createWeak(handle: FlintSharedHandle): FlintWeakHandle {
    const state = this.requireShared(handle);
    state.weakReferences += 1;
    const weakId = this.nextWeakHandle++;
    this.weakHandles.set(weakId, handle.id);
    return { id: weakId, sharedId: handle.id };
  }

  /**
   * Attempts to upgrade a weak reference handle to an active shared handle.
   * Returns undefined if the underlying shared allocation was already released.
   *
   * @param weak - Weak reference handle to upgrade.
   * @returns Active shared handle or undefined if dead.
   */
  public upgradeWeak(weak: FlintWeakHandle): FlintSharedHandle | undefined {
    const sharedId = this.weakHandles.get(weak.id);
    if (sharedId === undefined) return undefined;
    const state = this.shared.get(sharedId);
    if (state === undefined || state.released || state.references <= 0) {
      return undefined;
    }
    state.references += 1;
    return { id: state.id, pointer: state.pointer, length: state.length };
  }

  /**
   * Decrements the weak reference count and cleans up weak handle tracking state.
   *
   * @param weak - Weak reference handle to release.
   */
  public releaseWeak(weak: FlintWeakHandle): void {
    const sharedId = this.weakHandles.get(weak.id);
    if (sharedId !== undefined) {
      this.weakHandles.delete(weak.id);
      const state = this.shared.get(sharedId);
      if (state !== undefined) {
        state.weakReferences = Math.max(0, state.weakReferences - 1);
        if (state.released && state.weakReferences === 0) {
          this.shared.delete(sharedId);
        }
      }
    }
  }

  /**
   * Decrements the reference count for a shared handle, freeing memory when count reaches zero.
   *
   * @param handle - Shared handle to release.
   */
  // skipcq: JS-R1005
  public release(handle: FlintSharedHandle): void {
    const state = this.shared.get(handle.id);
    if (state === undefined || state.released)
      throw new FlintTrap('DoubleRelease', `Shared handle ${handle.id} was released too many times.`);
    if (state.pointer !== handle.pointer || state.length !== handle.length)
      throw new FlintTrap('InvalidOwnership', `Shared handle ${handle.id} does not match its allocation.`);
    state.references -= 1;
    if (state.references === 0) {
      state.released = true;
      this.memory.deallocate(state.pointer, state.length);
      if (state.weakReferences === 0) {
        this.shared.delete(handle.id);
      }
    }
  }

  /**
   * Asserts that a shared handle remains valid and has not been freed.
   *
   * @param handle - Shared handle to verify.
   */
  public useShared(handle: FlintSharedHandle): void {
    const state = this.requireShared(handle);
    this.memory.checkRange(state.pointer, state.length);
  }

  /**
   * Validates and retrieves the state for an active lifetime region.
   *
   * @param region - Lifetime region token.
   * @returns Active region state.
   */
  private requireRegion(region: FlintRegion): RegionState {
    const state = this.regions.get(region.id);
    if (state === undefined || !state.active) throw new FlintTrap('RegionExpired', `Region ${region.id} has expired.`);
    return state;
  }

  /**
   * Validates and retrieves the state for a shared allocation handle.
   *
   * @param handle - Shared handle.
   * @returns Active shared state.
   */
  // skipcq: JS-R1005
  private requireShared(handle: FlintSharedHandle): SharedState {
    const state = this.shared.get(handle.id);
    if (state === undefined || state.released)
      throw new FlintTrap('UseAfterRelease', `Shared handle ${handle.id} was released.`);
    if (state.pointer !== handle.pointer || state.length !== handle.length)
      throw new FlintTrap('InvalidOwnership', `Shared handle ${handle.id} does not match its allocation.`);
    if (state.references <= 0)
      throw new FlintTrap('DoubleRelease', `Shared handle ${handle.id} was released too many times.`);
    return state;
  }

  /**
   * Converts a memory address to a normalized numeric byte offset.
   *
   * @param pointer - Memory address.
   * @returns Numeric byte offset.
   */
  private static offset(pointer: FlintMemoryAddress): number {
    return typeof pointer === 'bigint' ? Number(pointer) : pointer;
  }
}

/**
 * Factory function creating a new FlintSafeHeap manager.
 *
 * @param memory - Linear memory instance.
 * @returns Initialized FlintSafeHeap instance.
 */
export function createFlintSafeHeap(memory: FlintMemory): FlintSafeHeap {
  return new FlintSafeHeap(memory);
}

/**
 * Dynamic function table slot handle tracking table index and generational token.
 */
export interface FlintTableSlotHandle {
  readonly slotIndex: number;
  readonly generation: number;
  readonly functionIndex: number;
}

/**
 * Dynamic WebAssembly function table manager providing slot allocation, generation tracking,
 * and immediate nullification upon closure release to prevent stale function dispatch.
 */
export class FlintDynamicTableManager {
  private readonly table: WebAssembly.Table;
  private readonly generations = new Map<number, number>();
  private readonly activeSlots = new Set<number>();
  private readonly freeList: number[] = [];
  private nextSlot: number;

  public constructor(table: WebAssembly.Table, initialOffset = 1) {
    this.table = table;
    this.nextSlot = initialOffset;
  }

  /**
   * Allocates a table slot for a dynamic function/closure index with a fresh generation token.
   */
  // skipcq: JS-R1005
  public allocateSlot(functionReference: Function | number): FlintTableSlotHandle {
    let slotIndex: number;
    const poppedSlot = this.freeList.pop();
    if (poppedSlot === undefined) {
      slotIndex = this.nextSlot++;
      if (slotIndex >= this.table.length) {
        this.table.grow(Math.max(16, slotIndex - this.table.length + 1));
      }
    } else {
      slotIndex = poppedSlot;
    }

    const currentGen = (this.generations.get(slotIndex) ?? 0) + 1;
    this.generations.set(slotIndex, currentGen);
    this.activeSlots.add(slotIndex);

    try {
      // eslint-disable-next-line unicorn/no-null
      this.table.set(slotIndex, typeof functionReference === 'function' ? functionReference : null);
    } catch {
      // Best-effort table slot initialization
    }

    const functionIndex = typeof functionReference === 'number' ? functionReference : slotIndex;
    return { slotIndex, generation: currentGen, functionIndex };
  }

  /**
   * Validates if a table slot handle matches the active generation.
   */
  public isValid(handle: FlintTableSlotHandle): boolean {
    if (!this.activeSlots.has(handle.slotIndex)) return false;
    return this.generations.get(handle.slotIndex) === handle.generation;
  }

  /**
   * Nullifies and frees a table slot, preventing stale calls from reaching recycled closures.
   */
  public freeSlot(handle: FlintTableSlotHandle): void {
    if (!this.isValid(handle)) {
      throw new FlintTrap(
        'InvalidOwnership',
        `Table slot ${handle.slotIndex} generation ${handle.generation} is not active.`,
      );
    }
    this.activeSlots.delete(handle.slotIndex);
    try {
      // eslint-disable-next-line unicorn/no-null
      this.table.set(handle.slotIndex, null);
    } catch {
      // Nullify table slot
    }
    this.freeList.push(handle.slotIndex);
  }
}
