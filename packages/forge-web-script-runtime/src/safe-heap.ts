import { ForgeWebScriptMemory, type ForgeWebScriptMemoryAddress } from './memory.js';
import { ForgeWebScriptTrap } from './traps.js';

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
    if (state.allocations.size !== 0)
      throw new ForgeWebScriptTrap('BorrowViolation', 'Region borrows cannot cross an async or iterator suspension.');
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
