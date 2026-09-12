import { ForgeWebScriptTrap } from './traps.js';

import type { ForgeWebScriptMemory, ForgeWebScriptMemoryAddress } from './memory.js';

export const FORGE_WEB_SCRIPT_MEMORY_MODEL = 'region-arc-checked-linear' as const;

export interface ForgeWebScriptRegion {
  readonly id: number;
  readonly active: boolean;
}

export interface ForgeWebScriptRegionAllocation {
  readonly pointer: ForgeWebScriptMemoryAddress;
  readonly length: number;
  readonly region: number;
}

export interface ForgeWebScriptSharedHandle {
  readonly id: number;
  readonly pointer: ForgeWebScriptMemoryAddress;
  readonly length: number;
}

interface RegionState {
  readonly id: number;
  active: boolean;
  readonly allocations: Map<number, number>;
}

interface SharedState {
  readonly id: number;
  readonly pointer: ForgeWebScriptMemoryAddress;
  readonly length: number;
  references: number;
  released: boolean;
}

/**
 * Deterministic scoped heap for compiler-managed values. Raw fws_alloc calls
 * remain on ForgeWebScriptMemory and are never implicitly retained here.
 */
export class ForgeWebScriptSafeHeap {
  public readonly memory: ForgeWebScriptMemory;
  private nextRegion = 1;
  private nextHandle = 1;
  private readonly regions = new Map<number, RegionState>();
  private readonly shared = new Map<number, SharedState>();

  public constructor(memory: ForgeWebScriptMemory) {
    this.memory = memory;
  }

  public beginRegion(): ForgeWebScriptRegion {
    const id = this.nextRegion++;
    this.regions.set(id, { id, active: true, allocations: new Map() });
    return { id, active: true };
  }

  public allocate(region: ForgeWebScriptRegion, length: number): ForgeWebScriptRegionAllocation {
    const state = this.requireRegion(region);
    const pointer = this.memory.allocate(length);
    state.allocations.set(this.offset(pointer), length);
    return { pointer, length, region: state.id };
  }

  /** Checks a borrow immediately before use, preventing stale region pointers. */
  public borrow(allocation: ForgeWebScriptRegionAllocation): void {
    const state = this.regions.get(allocation.region);
    if (
      state === undefined ||
      !state.active ||
      state.allocations.get(this.offset(allocation.pointer)) !== allocation.length
    )
      throw new ForgeWebScriptTrap('RegionExpired', 'A region allocation was used after its region ended.');
    this.memory.checkRange(allocation.pointer, allocation.length);
  }

  /** Promote a value before an async/iterator suspension or another escape boundary. */
  public promote(allocation: ForgeWebScriptRegionAllocation): ForgeWebScriptSharedHandle {
    const state = this.requireRegion({ id: allocation.region, active: true });
    const offset = this.offset(allocation.pointer);
    if (state.allocations.get(offset) !== allocation.length)
      throw new ForgeWebScriptTrap('RegionExpired', 'A region allocation is no longer available for promotion.');
    state.allocations.delete(offset);
    return this.createShared(allocation.pointer, allocation.length);
  }

  /** A suspension is legal only after every region value has been promoted. */
  public prepareSuspension(region: ForgeWebScriptRegion): void {
    const state = this.requireRegion(region);
    if (state.allocations.size > 0)
      throw new ForgeWebScriptTrap('BorrowViolation', 'Region borrows cannot cross an async or iterator suspension.');
  }

  public beginArena(region: ForgeWebScriptRegion, capacity = 65_536): ForgeWebScriptRegionArena {
    const allocation = this.allocate(region, capacity);
    return new ForgeWebScriptRegionArena(this.memory, allocation.pointer, capacity);
  }

  public createTlsfAllocator(poolSize = 131_072): ForgeWebScriptTlsfAllocator {
    return new ForgeWebScriptTlsfAllocator(this.memory, poolSize);
  }

  public endRegion(region: ForgeWebScriptRegion): void {
    const state = this.requireRegion(region);
    state.active = false;
    for (const [pointer, length] of state.allocations) this.memory.deallocate(pointer, length);
    state.allocations.clear();
  }

  public createShared(pointer: ForgeWebScriptMemoryAddress, length: number): ForgeWebScriptSharedHandle {
    if (this.memory.allocationSize(pointer) !== length)
      throw new ForgeWebScriptTrap(
        'InvalidOwnership',
        'Shared handles may only wrap an exact runtime-owned allocation.',
      );
    const id = this.nextHandle++;
    this.shared.set(id, { id, pointer, length, references: 1, released: false });
    return { id, pointer, length };
  }

  public retain(handle: ForgeWebScriptSharedHandle): void {
    const state = this.requireShared(handle);
    state.references += 1;
  }

  public release(handle: ForgeWebScriptSharedHandle): void {
    const state = this.shared.get(handle.id);
    if (state === undefined || state.released)
      throw new ForgeWebScriptTrap('DoubleRelease', `Shared handle ${handle.id} was released too many times.`);
    if (state.pointer !== handle.pointer || state.length !== handle.length)
      throw new ForgeWebScriptTrap('InvalidOwnership', `Shared handle ${handle.id} does not match its allocation.`);
    state.references -= 1;
    if (state.references === 0) {
      state.released = true;
      this.memory.deallocate(state.pointer, state.length);
    }
  }

  public useShared(handle: ForgeWebScriptSharedHandle): void {
    const state = this.requireShared(handle);
    this.memory.checkRange(state.pointer, state.length);
  }

  private requireRegion(region: ForgeWebScriptRegion): RegionState {
    const state = this.regions.get(region.id);
    if (state === undefined || !state.active)
      throw new ForgeWebScriptTrap('RegionExpired', `Region ${region.id} has expired.`);
    return state;
  }

  private requireShared(handle: ForgeWebScriptSharedHandle): SharedState {
    const state = this.shared.get(handle.id);
    if (state === undefined || state.released)
      throw new ForgeWebScriptTrap('UseAfterRelease', `Shared handle ${handle.id} was released.`);
    if (state.pointer !== handle.pointer || state.length !== handle.length)
      throw new ForgeWebScriptTrap('InvalidOwnership', `Shared handle ${handle.id} does not match its allocation.`);
    if (state.references <= 0)
      throw new ForgeWebScriptTrap('DoubleRelease', `Shared handle ${handle.id} was released too many times.`);
    return state;
  }

  private offset(pointer: ForgeWebScriptMemoryAddress): number {
    return typeof pointer === 'bigint' ? Number(pointer) : pointer;
  }
}

export function createForgeWebScriptSafeHeap(memory: ForgeWebScriptMemory): ForgeWebScriptSafeHeap {
  return new ForgeWebScriptSafeHeap(memory);
}

/**
 * High-performance scoped arena bump allocator for transient tasks.
 * Reclaims all allocated memory in an instant O(1) pointer reset.
 */
export class ForgeWebScriptRegionArena {
  public readonly basePointer: ForgeWebScriptMemoryAddress;
  public readonly capacity: number;
  public readonly memory: ForgeWebScriptMemory;
  private currentOffset = 0;

  public constructor(memory: ForgeWebScriptMemory, basePointer: ForgeWebScriptMemoryAddress, capacity: number) {
    this.memory = memory;
    this.basePointer = basePointer;
    this.capacity = capacity;
  }

  public get usedBytes(): number {
    return this.currentOffset;
  }

  public get remainingBytes(): number {
    return this.capacity - this.currentOffset;
  }

  /**
   * Allocates a contiguous chunk of memory within the arena with the requested alignment.
   */
  public allocate(size: number, alignment = 8): ForgeWebScriptMemoryAddress {
    if (!Number.isSafeInteger(size) || size <= 0)
      throw new ForgeWebScriptTrap('MemoryExhausted', 'Arena allocation size must be positive.');
    const alignedOffset = (this.currentOffset + (alignment - 1)) & ~(alignment - 1);
    if (alignedOffset + size > this.capacity)
      throw new ForgeWebScriptTrap(
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

const createSlBitmapInitial = (): number[] => Array.from({ length: TLSF_MAX_FL }, () => 0);
const createFreeListsInitial = (): (TlsfBlock | undefined)[][] =>
  Array.from({ length: TLSF_MAX_FL }, () => Array.from<TlsfBlock | undefined>({ length: TLSF_SECOND_LEVELS }));

/**
 * Two-Level Segregated Fit (TLSF) memory allocator.
 * Guarantees O(1) allocation and deallocation time with immediate physical coalescing
 * and minimal fragmentation for embedded/real-time Wasm workloads.
 */
export class ForgeWebScriptTlsfAllocator {
  public readonly basePointer: ForgeWebScriptMemoryAddress;
  public readonly poolSize: number;
  private readonly memory: ForgeWebScriptMemory;
  private flBitmap = 0;
  private readonly slBitmap: number[] = createSlBitmapInitial();
  private readonly freeLists: (TlsfBlock | undefined)[][] = createFreeListsInitial();
  private readonly allocatedBlocks = new Map<number, TlsfBlock>();

  public constructor(memory: ForgeWebScriptMemory, poolSize = 131_072) {
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
  public allocate(size: number): ForgeWebScriptMemoryAddress {
    if (!Number.isSafeInteger(size) || size <= 0)
      throw new ForgeWebScriptTrap('MemoryExhausted', 'TLSF allocation size must be a positive integer.');
    const alignedSize = Math.max(TLSF_MIN_BLOCK_SIZE, (size + 7) & ~7);
    const block = this.findSuitableBlock(alignedSize);
    if (!block)
      throw new ForgeWebScriptTrap(
        'MemoryExhausted',
        `TLSF heap exhausted: cannot satisfy allocation of ${size} bytes.`,
      );

    this.removeFreeBlock(block);
    block.isFree = false;

    // Split block if remaining space is at least TLSF_MIN_BLOCK_SIZE
    const remainder = block.size - alignedSize;
    if (remainder >= TLSF_MIN_BLOCK_SIZE) {
      const splitBlock: TlsfBlock = {
        offset: block.offset + alignedSize,
        size: remainder,
        isFree: true,
        prevPhysical: block,
        nextPhysical: block.nextPhysical,
      };
      if (block.nextPhysical) block.nextPhysical.prevPhysical = splitBlock;
      block.nextPhysical = splitBlock;
      block.size = alignedSize;
      this.insertFreeBlock(splitBlock);
    }

    this.allocatedBlocks.set(block.offset, block);
    const base = typeof this.basePointer === 'bigint' ? Number(this.basePointer) : this.basePointer;
    return typeof this.basePointer === 'bigint' ? BigInt(base + block.offset) : base + block.offset;
  }

  /**
   * Deallocates a previously allocated TLSF memory block in O(1) time,
   * immediately coalescing with adjacent free blocks to eliminate fragmentation.
   */
  public deallocate(pointer: ForgeWebScriptMemoryAddress): void {
    const raw = typeof pointer === 'bigint' ? Number(pointer) : pointer;
    const base = typeof this.basePointer === 'bigint' ? Number(this.basePointer) : this.basePointer;
    const offset = raw - base;
    const block = this.allocatedBlocks.get(offset);
    if (!block || block.isFree)
      throw new ForgeWebScriptTrap('InvalidOwnership', `Invalid or duplicate TLSF deallocation at address ${raw}.`);

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

  private static mapping(size: number): { fl: number; sl: number } {
    const fl = 31 - Math.clz32(size);
    const sl = (size >> (fl - TLSF_SLI)) ^ TLSF_SECOND_LEVELS;
    return {
      fl: Math.min(fl, TLSF_MAX_FL - 1),
      sl: Math.min(sl, TLSF_SECOND_LEVELS - 1),
    };
  }

  private insertFreeBlock(block: TlsfBlock): void {
    const { fl, sl } = ForgeWebScriptTlsfAllocator.mapping(block.size);
    const head = this.freeLists[fl]![sl];
    block.prevFree = undefined;
    block.nextFree = head;
    if (head) head.prevFree = block;
    this.freeLists[fl]![sl] = block;

    this.flBitmap |= 1 << fl;
    this.slBitmap[fl]! |= 1 << sl;
  }

  private removeFreeBlock(block: TlsfBlock): void {
    const { fl, sl } = ForgeWebScriptTlsfAllocator.mapping(block.size);
    if (block.prevFree) {
      block.prevFree.nextFree = block.nextFree;
    } else {
      this.freeLists[fl]![sl] = block.nextFree;
    }
    if (block.nextFree) {
      block.nextFree.prevFree = block.prevFree;
    }
    block.prevFree = undefined;
    block.nextFree = undefined;

    if (!this.freeLists[fl]![sl]) {
      this.slBitmap[fl]! &= ~(1 << sl);
      if (this.slBitmap[fl] === 0) {
        this.flBitmap &= ~(1 << fl);
      }
    }
  }

  private findSuitableBlock(size: number): TlsfBlock | undefined {
    let { fl, sl } = ForgeWebScriptTlsfAllocator.mapping(size);
    let slMask = this.slBitmap[fl]! & ~((1 << sl) - 1);
    if (slMask === 0) {
      const flMask = this.flBitmap & ~((1 << (fl + 1)) - 1);
      if (flMask === 0) return undefined;
      fl = 31 - Math.clz32(flMask & -flMask);
      slMask = this.slBitmap[fl]!;
    }
    sl = 31 - Math.clz32(slMask & -slMask);
    return this.freeLists[fl]![sl];
  }
}
