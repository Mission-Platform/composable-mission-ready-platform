import { createFlintLogger, type FlintLogger } from './logging.js';
import { FlintTrap } from './traps.js';

import type { FlintTraceRecorder } from './trace.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Configuration options for creating and sizing a Flint linear memory instance.
 */
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

/**
 * Memory address pointer representation supporting both 32-bit (number) and 64-bit (bigint) addresses.
 */
export type FlintMemoryAddress = number | bigint;

export const FLINT_MEMORY_CAPABILITIES = {
  memory64: 'wasm.memory64',
  threads: 'wasm.threads',
  sharedMemory: 'wasm.shared-memory',
  multiMemory: 'wasm.multi-memory',
} as const;

/**
 * Manages WebAssembly linear memory allocations, bounds checking, and binary I/O.
 */
export class FlintMemory {
  public readonly wasmMemory: WebAssembly.Memory;
  private readonly allocations = new Map<number, number>();
  private nextPointer: FlintMemoryAddress;
  public readonly addressBits: 32 | 64;
  public readonly shared: boolean;
  private readonly logger: FlintLogger;
  private readonly trace?: FlintTraceRecorder;

  /**
   * Initializes a new FlintMemory manager instance.
   *
   * @param memory - Optional existing WebAssembly.Memory instance.
   * @param options - Configuration options for memory sizing and bounds.
   */
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

  /**
   * Returns a live byte array view over the underlying WebAssembly linear memory buffer.
   */
  public get bytes(): Uint8Array {
    return new Uint8Array(this.wasmMemory.buffer);
  }

  /**
   * Normalizes an address value into a numeric index and performs bounds check.
   *
   * @param pointer - Memory address pointer.
   * @returns Normalized numeric offset.
   */
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

  /**
   * Asserts that a memory range lies strictly within active allocated bounds.
   *
   * @param pointer - Start address.
   * @param length - Range length in bytes.
   * @throws {FlintTrap} If the range exceeds memory bounds.
   */
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

  /**
   * Reads a byte slice from linear memory.
   *
   * @param pointer - Memory address to read from.
   * @param length - Number of bytes to read.
   * @returns Copied byte array.
   */
  public readBytes(pointer: FlintMemoryAddress, length: number): Uint8Array {
    this.checkRange(pointer, length);
    const offset = this.normalizeAddress(pointer);
    return this.bytes.slice(offset, offset + length);
  }

  /**
   * Writes bytes into linear memory at the specified address.
   *
   * @param pointer - Destination address.
   * @param value - Bytes to write.
   */
  public writeBytes(pointer: FlintMemoryAddress, value: Uint8Array): void {
    this.checkRange(pointer, value.byteLength);
    this.bytes.set(value, this.normalizeAddress(pointer));
  }

  /**
   * Decodes a UTF-8 string from linear memory.
   *
   * @param pointer - Memory address of string.
   * @param length - Byte length of string.
   * @returns Decoded UTF-8 string.
   */
  public readString(pointer: FlintMemoryAddress, length: number): string {
    try {
      return textDecoder.decode(this.readBytes(pointer, length));
    } catch (error) {
      throw new FlintTrap('MemoryOutOfBounds', 'The memory range is not valid UTF-8.', undefined, {
        cause: error,
      });
    }
  }

  /**
   * Encodes a UTF-8 string and writes it to linear memory.
   *
   * @param pointer - Destination memory address.
   * @param value - String value to encode and write.
   * @returns Number of bytes written.
   */
  public writeString(pointer: FlintMemoryAddress, value: string): number {
    const bytes = textEncoder.encode(value);
    this.writeBytes(pointer, bytes);
    return bytes.byteLength;
  }

  /**
   * Reads a 64-bit unsigned integer from linear memory.
   *
   * @param pointer - Memory address.
   * @returns 64-bit unsigned integer.
   */
  public readBigUint64(pointer: FlintMemoryAddress): bigint {
    this.checkRange(pointer, 8);
    return new DataView(this.wasmMemory.buffer).getBigUint64(this.normalizeAddress(pointer), true);
  }

  /**
   * Writes a 64-bit unsigned integer to linear memory.
   *
   * @param pointer - Destination address.
   * @param value - 64-bit unsigned integer value.
   */
  public writeBigUint64(pointer: FlintMemoryAddress, value: bigint): void {
    this.checkRange(pointer, 8);
    new DataView(this.wasmMemory.buffer).setBigUint64(this.normalizeAddress(pointer), value, true);
  }

  /**
   * Allocates a contiguous block of bytes on the linear memory heap.
   *
   * @param size - Size in bytes to allocate.
   * @returns Allocated base address pointer.
   */
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

  /**
   * Reallocates an existing memory block to a new size, growing or migrating as needed.
   *
   * @param pointer - Existing allocation address.
   * @param oldSize - Previous allocation size in bytes.
   * @param newSize - New requested allocation size in bytes.
   * @returns Reallocated base address pointer.
   */
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

  /**
   * Deallocates a previously allocated memory block.
   *
   * @param pointer - Memory address to free.
   * @param size - Size of the allocated block.
   */
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

/**
 * Creates a configured FlintMemory instance.
 *
 * @param options - Memory creation and sizing options.
 * @returns Initialized FlintMemory instance.
 */
export function createFlintMemory(options?: FlintMemoryOptions): FlintMemory {
  return new FlintMemory(undefined, options);
}

/**
 * Names of dedicated linear memory partitions for multi-memory modules.
 */
export type FlintMemoryPartitionName = 'guestHeap' | 'hostInterop' | 'staticData';

/**
 * Options configuring multiple independent linear memory partitions.
 */
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

  /**
   * Initializes multi-memory partitions according to the provided configuration options.
   *
   * @param options - Multi-memory partition options.
   */
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
