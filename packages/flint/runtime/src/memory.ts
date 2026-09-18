import { createFlintLogger, type FlintLogger } from './logging.js';
import { FlintTrap } from './traps.js';

import type { FlintTraceRecorder } from './trace.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export interface FlintMemoryOptions {
  readonly initialPages?: number;
  readonly maximumPages?: number;
  /** Address representation requested by the FWS module; the host must enable memory64 for i64. */
  readonly addressBits?: 32 | 64;
  readonly shared?: boolean;
  readonly capabilities?: readonly string[];
  readonly logger?: FlintLogger;
  readonly trace?: FlintTraceRecorder;
}

export type FlintMemoryAddress = number | bigint;

export const FLINT_MEMORY_CAPABILITIES = {
  memory64: 'wasm.memory64',
  threads: 'wasm.threads',
  sharedMemory: 'wasm.shared-memory',
  multiMemory: 'wasm.multi-memory',
} as const;

export class FlintMemory {
  public readonly wasmMemory: WebAssembly.Memory;
  private readonly allocations = new Map<number, number>();
  private nextPointer: FlintMemoryAddress;
  public readonly addressBits: 32 | 64;
  public readonly shared: boolean;
  private readonly logger: FlintLogger;
  private readonly trace?: FlintTraceRecorder;

  public constructor(memory?: WebAssembly.Memory, options: FlintMemoryOptions = {}) {
    this.addressBits = options.addressBits ?? 32;
    this.shared =
      options.shared ?? (typeof SharedArrayBuffer !== 'undefined' && memory?.buffer instanceof SharedArrayBuffer);
    this.logger = (options.logger ?? createFlintLogger({ scope: 'fws' })).child('memory');
    this.trace = options.trace;
    const capabilities = options.capabilities;
    const has = (capability: string, legacyName: string): boolean =>
      capabilities === undefined || capabilities.includes(capability) || capabilities.includes(legacyName);
    if (this.addressBits === 64 && !has(FLINT_MEMORY_CAPABILITIES.memory64, 'memory64'))
      throw new FlintTrap(
        'CapabilityDenied',
        `Capability '${FLINT_MEMORY_CAPABILITIES.memory64}' is not declared.`,
        FLINT_MEMORY_CAPABILITIES.memory64,
        { logger: this.logger },
      );
    if (this.shared && !has(FLINT_MEMORY_CAPABILITIES.threads, 'threads'))
      throw new FlintTrap(
        'CapabilityDenied',
        `Capability '${FLINT_MEMORY_CAPABILITIES.threads}' is not declared.`,
        FLINT_MEMORY_CAPABILITIES.threads,
        { logger: this.logger },
      );
    if (this.shared && !has(FLINT_MEMORY_CAPABILITIES.sharedMemory, 'shared-memory'))
      throw new FlintTrap(
        'CapabilityDenied',
        `Capability '${FLINT_MEMORY_CAPABILITIES.sharedMemory}' is not declared.`,
        FLINT_MEMORY_CAPABILITIES.sharedMemory,
        { logger: this.logger },
      );
    const descriptor = {
      initial: options.initialPages ?? 1,
      maximum: this.shared ? options.maximumPages : options.maximumPages,
      ...(this.shared ? { shared: true } : {}),
      ...(this.addressBits === 64 ? { address: 'i64' as const } : {}),
    } as WebAssembly.MemoryDescriptor;
    try {
      this.wasmMemory = memory ?? new WebAssembly.Memory(descriptor);
    } catch (error) {
      throw new FlintTrap('MemoryExhausted', 'Linear memory could not be created.', undefined, {
        cause: error,
        logger: this.logger,
      });
    }
    this.nextPointer = this.addressBits === 64 ? 8n : 8;
  }

  public get bytes(): Uint8Array {
    return new Uint8Array(this.wasmMemory.buffer);
  }

  private normalizeAddress(pointer: FlintMemoryAddress): number {
    if (typeof pointer === 'bigint') {
      if (pointer < 0n || pointer > BigInt(Number.MAX_SAFE_INTEGER))
        throw new FlintTrap('MemoryOutOfBounds', 'Memory address is outside the supported host range.', undefined, {
          logger: this.logger,
        });
      return Number(pointer);
    }
    if (!Number.isSafeInteger(pointer) || pointer < 0)
      throw new FlintTrap('MemoryOutOfBounds', 'Memory address is not a safe integer.', undefined, {
        logger: this.logger,
      });
    return pointer;
  }

  public checkRange(pointer: FlintMemoryAddress, length: number): void {
    const offset = this.normalizeAddress(pointer);
    try {
      this.trace?.recordRangeCheck(offset, length, 0);
    } catch {
      // Trace collection is observational and must never affect guest behavior.
    }
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      offset > this.bytes.byteLength ||
      length > this.bytes.byteLength - offset
    )
      throw new FlintTrap(
        'MemoryOutOfBounds',
        `Memory range [${offset}, ${offset + length}) is outside linear memory.`,
        undefined,
        { logger: this.logger },
      );
  }

  public readBytes(pointer: FlintMemoryAddress, length: number): Uint8Array {
    this.checkRange(pointer, length);
    const offset = this.normalizeAddress(pointer);
    return this.bytes.slice(offset, offset + length);
  }

  public writeBytes(pointer: FlintMemoryAddress, value: Uint8Array): void {
    this.checkRange(pointer, value.byteLength);
    this.bytes.set(value, this.normalizeAddress(pointer));
  }

  public readString(pointer: FlintMemoryAddress, length: number): string {
    try {
      return textDecoder.decode(this.readBytes(pointer, length));
    } catch (error) {
      throw new FlintTrap('MemoryOutOfBounds', 'The memory range is not valid UTF-8.', undefined, {
        cause: error,
      });
    }
  }

  public writeString(pointer: FlintMemoryAddress, value: string): number {
    const bytes = textEncoder.encode(value);
    this.writeBytes(pointer, bytes);
    return bytes.byteLength;
  }

  public readBigUint64(pointer: FlintMemoryAddress): bigint {
    this.checkRange(pointer, 8);
    return new DataView(this.wasmMemory.buffer).getBigUint64(this.normalizeAddress(pointer), true);
  }

  public writeBigUint64(pointer: FlintMemoryAddress, value: bigint): void {
    this.checkRange(pointer, 8);
    new DataView(this.wasmMemory.buffer).setBigUint64(this.normalizeAddress(pointer), value, true);
  }

  public allocate(size: number): FlintMemoryAddress {
    if (!Number.isSafeInteger(size) || size < 0)
      throw new FlintTrap('MemoryExhausted', 'Allocation size must be a non-negative integer.');
    const pointer = this.nextPointer;
    const offset = this.normalizeAddress(pointer);
    if (size > Number.MAX_SAFE_INTEGER - offset)
      throw new FlintTrap('MemoryExhausted', 'Allocation range exceeds the supported address range.', undefined, {
        logger: this.logger,
      });
    if (size > this.bytes.byteLength - offset) {
      const pages = Math.ceil((offset + size - this.bytes.byteLength) / 65_536);
      try {
        this.wasmMemory.grow(pages);
      } catch (error) {
        throw new FlintTrap('MemoryExhausted', 'Linear memory could not grow for this allocation.', undefined, {
          cause: error,
          logger: this.logger,
        });
      }
    }
    this.nextPointer = this.addressBits === 64 ? BigInt(offset + size) : offset + size;
    this.allocations.set(offset, size);
    try {
      this.trace?.noteAllocation('allocate', size);
      this.trace?.recordMemory('allocate', offset, size, 0, 'owned');
    } catch {
      // Trace collection is observational and must never affect guest behavior.
    }
    return pointer;
  }

  public reallocate(pointer: FlintMemoryAddress, oldSize: number, newSize: number): FlintMemoryAddress {
    const offset = this.normalizeAddress(pointer);
    this.checkRange(pointer, oldSize);
    if (this.allocations.get(offset) !== oldSize)
      throw new FlintTrap(
        'InvalidOwnership',
        `Allocation [${offset}, ${offset + oldSize}) is not owned by this runtime.`,
        undefined,
        { logger: this.logger },
      );
    if (!Number.isSafeInteger(newSize) || newSize < 0)
      throw new FlintTrap('MemoryExhausted', 'Reallocation size must be a non-negative integer.', undefined, {
        logger: this.logger,
      });
    if (newSize > Number.MAX_SAFE_INTEGER - offset)
      throw new FlintTrap('MemoryExhausted', 'Reallocation range exceeds the supported address range.', undefined, {
        logger: this.logger,
      });

    const end = offset + oldSize;
    const highWater = this.normalizeAddress(this.nextPointer);
    if (end === highWater) {
      if (newSize > this.bytes.byteLength - offset) {
        const pages = Math.ceil((offset + newSize - this.bytes.byteLength) / 65_536);
        try {
          this.wasmMemory.grow(pages);
        } catch (error) {
          throw new FlintTrap('MemoryExhausted', 'Linear memory could not grow for this reallocation.', undefined, {
            cause: error,
            logger: this.logger,
          });
        }
      }
      this.nextPointer = this.addressBits === 64 ? BigInt(offset + newSize) : offset + newSize;
      this.allocations.set(offset, newSize);
      try {
        this.trace?.noteAllocation('reallocate', newSize - oldSize);
        this.trace?.recordMemory('reallocate', offset, newSize, 0, 'owned');
      } catch {
        // Trace collection is observational and must never affect guest behavior.
      }
      return pointer;
    }

    const replacement = this.allocate(newSize);
    const copyLength = Math.min(oldSize, newSize);
    if (copyLength > 0) this.writeBytes(replacement, this.readBytes(pointer, copyLength));
    this.deallocate(pointer, oldSize);
    return replacement;
  }

  public deallocate(pointer: FlintMemoryAddress, size: number): void {
    const offset = this.normalizeAddress(pointer);
    if (this.allocations.get(offset) !== size)
      throw new FlintTrap(
        'InvalidOwnership',
        `Allocation [${offset}, ${size}) is not owned by this runtime.`,
        undefined,
        { logger: this.logger },
      );
    this.allocations.delete(offset);
    try {
      this.trace?.noteAllocation('deallocate', size);
      this.trace?.recordMemory('deallocate', offset, size, 0, 'owned');
    } catch {
      // Trace collection is observational and must never affect guest behavior.
    }
  }

  /** Returns the exact caller-owned allocation size, when this runtime owns it. */
  public allocationSize(pointer: FlintMemoryAddress): number | undefined {
    return this.allocations.get(this.normalizeAddress(pointer));
  }
}

export function createFlintMemory(options?: FlintMemoryOptions): FlintMemory {
  return new FlintMemory(undefined, options);
}

export type FlintMemoryPartitionName = 'guestHeap' | 'hostInterop' | 'staticData';

export interface FlintMultiMemoryOptions {
  readonly guestHeap?: FlintMemoryOptions;
  readonly hostInterop?: FlintMemoryOptions;
  readonly staticData?: FlintMemoryOptions;
  readonly capabilities?: readonly string[];
  readonly logger?: FlintLogger;
  readonly trace?: FlintTraceRecorder;
}

/**
 * WebAssembly multi-memory segregation coordinator.
 * Isolates memory into dedicated spaces for guest execution (Memory 0),
 * host interop buffer (Memory 1), and static constants/tables (Memory 2).
 */
export class FlintMultiMemory {
  public readonly guestHeap: FlintMemory;
  public readonly hostInterop: FlintMemory;
  public readonly staticData: FlintMemory;
  public readonly capabilities: readonly string[];
  private readonly logger: FlintLogger;

  public constructor(options: FlintMultiMemoryOptions = {}) {
    this.logger = (options.logger ?? createFlintLogger({ scope: 'fws' })).child('multi-memory');
    this.capabilities = options.capabilities ?? [];

    const has = (capability: string): boolean =>
      options.capabilities === undefined || options.capabilities.includes(capability);

    if (!has(FLINT_MEMORY_CAPABILITIES.multiMemory)) {
      throw new FlintTrap(
        'CapabilityDenied',
        `Capability '${FLINT_MEMORY_CAPABILITIES.multiMemory}' is not declared.`,
        FLINT_MEMORY_CAPABILITIES.multiMemory,
        { logger: this.logger },
      );
    }

    const baseCaps = options.capabilities;
    this.guestHeap = new FlintMemory(undefined, {
      ...options.guestHeap,
      capabilities: options.guestHeap?.capabilities ?? baseCaps,
      logger: this.logger.child('guestHeap'),
      trace: options.trace,
    });
    this.hostInterop = new FlintMemory(undefined, {
      ...options.hostInterop,
      capabilities: options.hostInterop?.capabilities ?? baseCaps,
      logger: this.logger.child('hostInterop'),
      trace: options.trace,
    });
    this.staticData = new FlintMemory(undefined, {
      ...options.staticData,
      capabilities: options.staticData?.capabilities ?? baseCaps,
      logger: this.logger.child('staticData'),
      trace: options.trace,
    });
  }

  /**
   * Returns the requested memory partition by index (0, 1, 2) or logical name.
   */
  public getPartition(partition: 0 | 1 | 2 | FlintMemoryPartitionName): FlintMemory {
    if (partition === 0 || partition === 'guestHeap') return this.guestHeap;
    if (partition === 1 || partition === 'hostInterop') return this.hostInterop;
    if (partition === 2 || partition === 'staticData') return this.staticData;
    throw new FlintTrap('MemoryOutOfBounds', `Unknown memory partition: ${String(partition)}`, undefined, {
      logger: this.logger,
    });
  }

  /**
   * Safely copies a memory range from the guest heap into the host interop buffer.
   */
  public transferToInterop(pointer: FlintMemoryAddress, length: number): FlintMemoryAddress {
    const bytes = this.guestHeap.readBytes(pointer, length);
    const destination = this.hostInterop.allocate(length);
    this.hostInterop.writeBytes(destination, bytes);
    return destination;
  }

  /**
   * Safely copies a memory range from the host interop buffer into the guest heap.
   */
  public transferFromInterop(pointer: FlintMemoryAddress, length: number): FlintMemoryAddress {
    const bytes = this.hostInterop.readBytes(pointer, length);
    const destination = this.guestHeap.allocate(length);
    this.guestHeap.writeBytes(destination, bytes);
    return destination;
  }
}

/**
 * Creates an isolated multi-memory instance with dedicated guest heap, host interop, and static partitions.
 */
export function createFlintMultiMemory(options?: FlintMultiMemoryOptions): FlintMultiMemory {
  return new FlintMultiMemory(options);
}
