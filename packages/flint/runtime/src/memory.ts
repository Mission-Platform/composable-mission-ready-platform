import { createFlintLogger, type FlintLogger } from './logging.js';
import { FlintTrap } from './traps.js';

import type { FlintTraceRecorder } from './trace.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Detects whether the host JavaScript environment natively supports WebAssembly multi-memory.
 */
export function isMultiMemorySupported(): boolean {
  if (typeof WebAssembly === 'undefined' || WebAssembly.Module === undefined) return false;
  try {
    return Boolean(
      new WebAssembly.Module(
        new Uint8Array([
          0x00,
          0x61,
          0x73,
          0x6d,
          0x01,
          0x00,
          0x00,
          0x00, // magic + version
          0x05,
          0x05,
          0x02,
          0x00,
          0x01,
          0x00,
          0x01, // 2 memories: (memory 1) (memory 1)
        ]),
      ),
    );
  } catch {
    return false;
  }
}

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
  readonly memory?: WebAssembly.Memory;
  readonly initialPointer?: number;
  readonly partitionOffset?: number;
  readonly partitionSize?: number;
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

export const FALLBACK_GUARD_PAGE_SIZE = 65_536;

/**
 * Manages WebAssembly linear memory allocations, bounds checking, and binary I/O.
 */
export class FlintMemory {
  public readonly wasmMemory: WebAssembly.Memory;
  private readonly allocations = new Map<number, number>();
  private nextPointer: FlintMemoryAddress;
  public readonly addressBits: 32 | 64;
  public readonly shared: boolean;
  public readonly partitionOffset: number;
  public readonly partitionSize?: number;
  private readonly logger: FlintLogger;
  private readonly trace?: FlintTraceRecorder;

  /**
   * Initializes a new FlintMemory manager instance.
   *
   * @param memory - Optional existing WebAssembly.Memory instance.
   * @param options - Configuration options for memory sizing and bounds.
   */
  // skipcq: JS-R1005
  public constructor(memory?: WebAssembly.Memory, options: FlintMemoryOptions = {}) {
    const targetMemory = memory ?? options.memory;
    this.addressBits = options.addressBits ?? 32;
    this.shared =
      options.shared ?? (typeof SharedArrayBuffer !== 'undefined' && targetMemory?.buffer instanceof SharedArrayBuffer);
    this.partitionOffset = options.partitionOffset ?? 0;
    this.partitionSize = options.partitionSize;
    this.logger = (options.logger ?? createFlintLogger({ scope: 'fws' })).child('memory');
    this.trace = options.trace;
    const capabilities = options.capabilities;
    // skipcq: JS-D1001
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
      this.wasmMemory = targetMemory ?? new WebAssembly.Memory(descriptor);
    } catch (error) {
      throw new FlintTrap('MemoryExhausted', 'Linear memory could not be created.', undefined, {
        cause: error,
        logger: this.logger,
      });
    }
    const defaultPointer =
      targetMemory === undefined
        ? this.addressBits === 64
          ? 8n
          : 8
        : this.addressBits === 64
          ? BigInt(this.wasmMemory.buffer.byteLength)
          : this.wasmMemory.buffer.byteLength;
    this.nextPointer = options.initialPointer ?? defaultPointer;
  }

  /**
   * Returns a live byte array view over the underlying WebAssembly linear memory buffer.
   */
  public get bytes(): Uint8Array {
    if (this.partitionOffset > 0 || this.partitionSize !== undefined) {
      const buffer = this.wasmMemory.buffer;
      const size = this.partitionSize ?? Math.max(0, buffer.byteLength - this.partitionOffset);
      const start = Math.min(this.partitionOffset, buffer.byteLength);
      const end = Math.min(this.partitionOffset + size, buffer.byteLength);
      return new Uint8Array(buffer, start, Math.max(0, end - start));
    }
    return new Uint8Array(this.wasmMemory.buffer);
  }

  /**
   * Normalizes an address value into a numeric index and performs bounds check.
   *
   * @param pointer - Memory address pointer.
   * @returns Normalized numeric offset.
   */
  // skipcq: JS-R1005
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
  // skipcq: JS-R1005
  public checkRange(pointer: FlintMemoryAddress, length: number): void {
    const offset = this.normalizeAddress(pointer);
    try {
      this.trace?.recordRangeCheck(offset, length, 0);
    } catch {
      // Trace collection is observational and must never affect guest behavior.
    }
    const maxBound = this.partitionSize ?? this.wasmMemory.buffer.byteLength;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      offset > maxBound ||
      length > maxBound - offset ||
      this.partitionOffset + offset + length > this.wasmMemory.buffer.byteLength
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
    const rawBuffer = new Uint8Array(this.wasmMemory.buffer);
    const absOffset = this.partitionOffset + offset;
    return rawBuffer.slice(absOffset, absOffset + length);
  }

  /**
   * Writes bytes into linear memory at the specified address.
   *
   * @param pointer - Destination address.
   * @param value - Bytes to write.
   */
  public writeBytes(pointer: FlintMemoryAddress, value: Uint8Array): void {
    this.checkRange(pointer, value.byteLength);
    const offset = this.normalizeAddress(pointer);
    const rawBuffer = new Uint8Array(this.wasmMemory.buffer);
    const absOffset = this.partitionOffset + offset;
    rawBuffer.set(value, absOffset);
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
   * Reads a null-terminated UTF-8 C string from linear memory starting at pointer.
   *
   * @param pointer - Starting memory address.
   * @param maxLength - Maximum number of bytes to search for null terminator (default: 4096).
   * @returns Decoded string excluding the null terminator.
   * @throws {FlintTrap} If null terminator is not found within maxLength or memory bounds.
   */
  // skipcq: JS-R1005
  public readCString(pointer: FlintMemoryAddress, maxLength = 4096): string {
    const offset = this.normalizeAddress(pointer);
    const memoryBytes = this.bytes;
    if (offset >= memoryBytes.byteLength) {
      throw new FlintTrap('MemoryOutOfBounds', `Memory address ${offset} is outside linear memory bounds.`, undefined, {
        logger: this.logger,
      });
    }
    const limit = Math.min(maxLength, memoryBytes.byteLength - offset);
    const terminatorIndex = memoryBytes.subarray(offset, offset + limit).indexOf(0x00);
    if (terminatorIndex === -1) {
      throw new FlintTrap(
        'MemoryOutOfBounds',
        `Null terminator not found within bounds (${limit} bytes scanned).`,
        undefined,
        { logger: this.logger },
      );
    }
    try {
      return textDecoder.decode(memoryBytes.subarray(offset, offset + terminatorIndex));
    } catch (error) {
      throw new FlintTrap('MemoryOutOfBounds', 'The C string is not valid UTF-8.', undefined, {
        cause: error,
        logger: this.logger,
      });
    }
  }

  /**
   * Writes a null-terminated UTF-8 C string to linear memory.
   *
   * @param pointer - Destination memory address.
   * @param value - String value to encode and write.
   * @returns Total number of bytes written including the null terminator.
   */
  public writeCString(pointer: FlintMemoryAddress, value: string): number {
    const encoded = textEncoder.encode(value);
    const totalBytes = encoded.byteLength + 1;
    this.checkRange(pointer, totalBytes);
    const offset = this.normalizeAddress(pointer);
    const rawBuffer = new Uint8Array(this.wasmMemory.buffer);
    const absOffset = this.partitionOffset + offset;
    rawBuffer.set(encoded, absOffset);
    rawBuffer[absOffset + encoded.byteLength] = 0x00;
    return totalBytes;
  }

  /**
   * Reads a 64-bit unsigned integer from linear memory.
   *
   * @param pointer - Memory address.
   * @returns 64-bit unsigned integer.
   */
  public readBigUint64(pointer: FlintMemoryAddress): bigint {
    this.checkRange(pointer, 8);
    const absOffset = this.partitionOffset + this.normalizeAddress(pointer);
    return new DataView(this.wasmMemory.buffer).getBigUint64(absOffset, true);
  }

  /**
   * Writes a 64-bit unsigned integer to linear memory.
   *
   * @param pointer - Destination address.
   * @param value - 64-bit unsigned integer value.
   */
  public writeBigUint64(pointer: FlintMemoryAddress, value: bigint): void {
    this.checkRange(pointer, 8);
    const absOffset = this.partitionOffset + this.normalizeAddress(pointer);
    new DataView(this.wasmMemory.buffer).setBigUint64(absOffset, value, true);
  }

  /**
   * Expands linear memory by the specified number of WebAssembly pages (64KB each).
   *
   * @param pages - Number of pages to grow.
   * @returns Previous memory size in pages.
   */
  public grow(pages: number): number {
    try {
      const previous = this.wasmMemory.grow(pages);
      if (previous === -1 || previous < 0) {
        throw new FlintTrap('MemoryExhausted', 'Linear memory could not grow (returned -1).', undefined, {
          logger: this.logger,
        });
      }
      return previous;
    } catch (error) {
      if (error instanceof FlintTrap) throw error;
      throw new FlintTrap('MemoryExhausted', 'Linear memory could not grow.', undefined, {
        cause: error,
        logger: this.logger,
      });
    }
  }

  /**
   * Allocates a contiguous block of bytes on the linear memory heap.
   *
   * @param size - Size in bytes to allocate.
   * @returns Allocated base address pointer.
   */
  // skipcq: JS-R1005
  public allocate(size: number): FlintMemoryAddress {
    if (!Number.isSafeInteger(size) || size < 0)
      throw new FlintTrap('MemoryExhausted', 'Allocation size must be a non-negative integer.');
    if (size === 0) {
      const sentinel = this.addressBits === 64 ? 8n : 8;
      this.allocations.set(8, 0);
      return sentinel;
    }
    const pointer = this.nextPointer;
    const offset = this.normalizeAddress(pointer);
    const maxBound = this.partitionSize ?? Number.MAX_SAFE_INTEGER;
    if (size > maxBound - offset)
      throw new FlintTrap('MemoryExhausted', 'Allocation range exceeds the supported address range.', undefined, {
        logger: this.logger,
      });
    const absoluteEnd = this.partitionOffset + offset + size;
    if (absoluteEnd > this.wasmMemory.buffer.byteLength) {
      const pages = Math.ceil((absoluteEnd - this.wasmMemory.buffer.byteLength) / 65_536);
      try {
        const previous = this.wasmMemory.grow(pages);
        if (previous === -1 || previous < 0) {
          throw new FlintTrap('MemoryExhausted', 'Linear memory could not grow for this allocation.', undefined, {
            logger: this.logger,
          });
        }
      } catch (error) {
        if (error instanceof FlintTrap) throw error;
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
   * Allocates contiguous memory for an array of count * elementSize elements with checked multiplication guards.
   *
   * @param count - Number of array elements.
   * @param elementSize - Byte size of each element.
   * @returns Allocated base address pointer.
   */
  // skipcq: JS-R1005
  public allocateArray(count: number, elementSize: number): FlintMemoryAddress {
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(elementSize) || elementSize < 0) {
      throw new FlintTrap('MemoryExhausted', 'Array count and elementSize must be non-negative safe integers.');
    }
    if (count === 0 || elementSize === 0) {
      return this.addressBits === 64 ? 8n : 8;
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
   * Reallocates an existing memory block to a new size, growing or migrating as needed.
   *
   * @param pointer - Existing allocation address.
   * @param oldSize - Previous allocation size in bytes.
   * @param newSize - New requested allocation size in bytes.
   * @returns Reallocated base address pointer.
   */
  // skipcq: JS-R1005
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
    const maxBound = this.partitionSize ?? Number.MAX_SAFE_INTEGER;
    if (newSize > maxBound - offset)
      throw new FlintTrap('MemoryExhausted', 'Reallocation range exceeds the supported address range.', undefined, {
        logger: this.logger,
      });

    const end = offset + oldSize;
    const highWater = this.normalizeAddress(this.nextPointer);
    if (end === highWater) {
      const absoluteEnd = this.partitionOffset + offset + newSize;
      if (absoluteEnd > this.wasmMemory.buffer.byteLength) {
        const pages = Math.ceil((absoluteEnd - this.wasmMemory.buffer.byteLength) / 65_536);
        try {
          const previous = this.wasmMemory.grow(pages);
          if (previous === -1 || previous < 0) {
            throw new FlintTrap('MemoryExhausted', 'Linear memory could not grow for this reallocation.', undefined, {
              logger: this.logger,
            });
          }
        } catch (error) {
          if (error instanceof FlintTrap) throw error;
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
  // skipcq: JS-R1005
  public deallocate(pointer: FlintMemoryAddress, size: number): void {
    if (size === 0) {
      return;
    }
    const offset = this.normalizeAddress(pointer);
    if (this.allocations.get(offset) !== size)
      throw new FlintTrap(
        'InvalidOwnership',
        `Allocation [${offset}, ${size}) is not owned by this runtime.`,
        undefined,
        { logger: this.logger },
      );
    this.allocations.delete(offset);
    const highWater = this.normalizeAddress(this.nextPointer);
    if (offset + size === highWater) {
      this.nextPointer = this.addressBits === 64 ? BigInt(offset) : offset;
    }
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

  /**
   * Validates that the specified pointer range falls completely within the active memory boundaries.
   *
   * @param pointer - Base address of the memory range.
   * @param length - Length in bytes of the memory range.
   * @returns True if valid; throws FlintTrap('MemoryOutOfBounds') otherwise.
   */
  public validatePointerRange(pointer: FlintMemoryAddress, length: number): boolean {
    const offset = this.normalizeAddress(pointer);
    const maxBound = this.partitionSize ?? this.bytes.byteLength;
    if (length < 0 || offset < 0 || offset + length > maxBound) {
      throw new FlintTrap(
        'MemoryOutOfBounds',
        `Memory range [${offset}, ${offset + length}) exceeds buffer boundary of ${maxBound} bytes.`,
        undefined,
        { logger: this.logger },
      );
    }
    return true;
  }

  /**
   * Performs a bounded cross-memory DMA transfer between this memory and another FlintMemory instance.
   * Emulates WebAssembly `memory.copy` semantics across memory instances with strict bounds validation.
   *
   * @param sourceOffset - Starting byte offset in this (source) memory.
   * @param targetMemory - Target destination FlintMemory instance.
   * @param targetOffset - Starting byte offset in target memory.
   * @param length - Number of bytes to copy.
   */
  public copyBetweenMemories(
    sourceOffset: FlintMemoryAddress,
    targetMemory: FlintMemory,
    targetOffset: FlintMemoryAddress,
    length: number,
  ): void {
    if (length <= 0) return;
    this.validatePointerRange(sourceOffset, length);
    targetMemory.validatePointerRange(targetOffset, length);

    const sourceBytes = this.readBytes(sourceOffset, length);
    targetMemory.writeBytes(targetOffset, sourceBytes);
  }
}

/**
 * Creates a configured FlintMemory instance.
 *
 * @param memoryOrOptions - Existing WebAssembly.Memory or memory creation options.
 * @param options - Memory creation and sizing options if memory instance provided.
 * @returns Initialized FlintMemory instance.
 */
export function createFlintMemory(
  memoryOrOptions?: WebAssembly.Memory | FlintMemoryOptions,
  options?: FlintMemoryOptions,
): FlintMemory {
  if (memoryOrOptions instanceof WebAssembly.Memory) {
    return new FlintMemory(memoryOrOptions, options);
  }
  return new FlintMemory(undefined, memoryOrOptions);
}

/**
 * Names of dedicated linear memory partitions for multi-memory modules.
 */
export type FlintMemoryPartitionName = 'guestHeap' | 'foreignHeap' | 'hostInterop' | 'staticData';

/**
 * Options configuring multiple independent linear memory partitions.
 */
export interface FlintMultiMemoryOptions {
  readonly guestHeap?: FlintMemoryOptions;
  readonly foreignHeap?: FlintMemoryOptions;
  readonly hostInterop?: FlintMemoryOptions;
  readonly staticData?: FlintMemoryOptions;
  readonly capabilities?: readonly string[];
  readonly logger?: FlintLogger;
  readonly trace?: FlintTraceRecorder;
  readonly mode?: 'auto' | 'multi-memory' | 'partitioned-fallback';
  readonly fallback?: boolean;
  readonly allowFallback?: boolean;
}

/**
 * WebAssembly multi-memory segregation coordinator.
 * Isolates memory into dedicated spaces for guest execution (Memory 0),
 * foreign untrusted C/Rust heap (Memory 1), host interop buffer (Memory 2),
 * and static constants/tables (Memory 3).
 *
 * Supports native multi-memory hardware isolation as well as zero-allocation
 * partitioned single-memory fallback emulation for runtimes without multi-memory (e.g. Safari / WebKit).
 */
export class FlintMultiMemory {
  public readonly guestHeap: FlintMemory;
  public readonly foreignHeap: FlintMemory;
  public readonly hostInterop: FlintMemory;
  public readonly staticData: FlintMemory;
  public readonly capabilities: readonly string[];
  public readonly mode: 'multi-memory' | 'partitioned-fallback';
  public readonly isFallback: boolean;
  private readonly logger: FlintLogger;

  /**
   * Initializes multi-memory partitions according to the provided configuration options.
   *
   * @param options - Multi-memory partition options.
   */
  // skipcq: JS-R1005
  public constructor(options: FlintMultiMemoryOptions = {}) {
    this.logger = (options.logger ?? createFlintLogger({ scope: 'fws' })).child('multi-memory');
    this.capabilities = options.capabilities ?? [];

    // skipcq: JS-D1001
    const has = (capability: string): boolean =>
      options.capabilities === undefined || options.capabilities.includes(capability);

    const isCapabilityDeclared = has(FLINT_MEMORY_CAPABILITIES.multiMemory);
    const isHostSupported = isMultiMemorySupported();

    const wantsFallback =
      options.fallback === true ||
      options.mode === 'partitioned-fallback' ||
      (options.allowFallback === true && !isCapabilityDeclared) ||
      (!isHostSupported && options.allowFallback !== false);

    if (!wantsFallback && !isCapabilityDeclared) {
      throw new FlintTrap(
        'CapabilityDenied',
        `Capability '${FLINT_MEMORY_CAPABILITIES.multiMemory}' is not declared.`,
        FLINT_MEMORY_CAPABILITIES.multiMemory,
        { logger: this.logger },
      );
    }

    if (wantsFallback) {
      this.mode = 'partitioned-fallback';
      this.isFallback = true;
      const baseCaps = options.capabilities;
      const partitionWindowSize = 67_108_864; // 64 MiB per partition window
      const usablePartitionSize = partitionWindowSize - FALLBACK_GUARD_PAGE_SIZE;

      const initialPages = Math.max(
        64,
        (options.guestHeap?.initialPages ?? 1) +
          (options.foreignHeap?.initialPages ?? 1) +
          (options.hostInterop?.initialPages ?? 1) +
          (options.staticData?.initialPages ?? 1),
      );
      const sharedWasmMemory = new WebAssembly.Memory({ initial: initialPages });

      this.guestHeap = new FlintMemory(sharedWasmMemory, {
        ...options.guestHeap,
        capabilities: options.guestHeap?.capabilities ?? baseCaps,
        logger: this.logger.child('guestHeap'),
        trace: options.trace,
        partitionOffset: 0,
        partitionSize: usablePartitionSize,
        initialPointer: options.guestHeap?.initialPointer ?? 65_536,
      });

      this.foreignHeap = new FlintMemory(sharedWasmMemory, {
        ...options.foreignHeap,
        capabilities: options.foreignHeap?.capabilities ?? baseCaps,
        logger: this.logger.child('foreignHeap'),
        trace: options.trace,
        partitionOffset: partitionWindowSize,
        partitionSize: usablePartitionSize,
        initialPointer: options.foreignHeap?.initialPointer ?? 8,
      });

      this.hostInterop = new FlintMemory(sharedWasmMemory, {
        ...options.hostInterop,
        capabilities: options.hostInterop?.capabilities ?? baseCaps,
        logger: this.logger.child('hostInterop'),
        trace: options.trace,
        partitionOffset: partitionWindowSize * 2,
        partitionSize: usablePartitionSize,
        initialPointer: options.hostInterop?.initialPointer ?? 8,
      });

      this.staticData = new FlintMemory(sharedWasmMemory, {
        ...options.staticData,
        capabilities: options.staticData?.capabilities ?? baseCaps,
        logger: this.logger.child('staticData'),
        trace: options.trace,
        partitionOffset: partitionWindowSize * 3,
        partitionSize: usablePartitionSize,
        initialPointer: options.staticData?.initialPointer ?? 8,
      });
    } else {
      this.mode = 'multi-memory';
      this.isFallback = false;
      const baseCaps = options.capabilities;
      this.guestHeap = new FlintMemory(options.guestHeap?.memory, {
        ...options.guestHeap,
        capabilities: options.guestHeap?.capabilities ?? baseCaps,
        logger: this.logger.child('guestHeap'),
        trace: options.trace,
      });
      this.foreignHeap = new FlintMemory(options.foreignHeap?.memory, {
        ...options.foreignHeap,
        capabilities: options.foreignHeap?.capabilities ?? baseCaps,
        logger: this.logger.child('foreignHeap'),
        trace: options.trace,
      });
      this.hostInterop = new FlintMemory(options.hostInterop?.memory, {
        ...options.hostInterop,
        capabilities: options.hostInterop?.capabilities ?? baseCaps,
        logger: this.logger.child('hostInterop'),
        trace: options.trace,
      });
      this.staticData = new FlintMemory(options.staticData?.memory, {
        ...options.staticData,
        capabilities: options.staticData?.capabilities ?? baseCaps,
        logger: this.logger.child('staticData'),
        trace: options.trace,
      });
    }
  }

  /**
   * Returns the requested memory partition by index or logical name.
   */
  // skipcq: JS-R1005
  public getPartition(partition: number | FlintMemoryPartitionName): FlintMemory {
    if (partition === 0 || partition === 'guestHeap') return this.guestHeap;
    if (partition === 1 || partition === 'foreignHeap') return this.foreignHeap;
    if (partition === 2 || partition === 'hostInterop') return this.hostInterop;
    if (partition === 3 || partition === 'staticData') return this.staticData;
    throw new FlintTrap('MemoryOutOfBounds', `Unknown memory partition: ${String(partition)}`, undefined, {
      logger: this.logger,
    });
  }

  /**
   * Safely copies a memory range from the guest heap into the host interop buffer.
   */
  public transferToInterop(pointer: FlintMemoryAddress, length: number): FlintMemoryAddress {
    const destination = this.hostInterop.allocate(length);
    this.guestHeap.copyBetweenMemories(pointer, this.hostInterop, destination, length);
    return destination;
  }

  /**
   * Safely copies a memory range from the host interop buffer into the guest heap.
   */
  public transferFromInterop(pointer: FlintMemoryAddress, length: number): FlintMemoryAddress {
    const destination = this.guestHeap.allocate(length);
    this.hostInterop.copyBetweenMemories(pointer, this.guestHeap, destination, length);
    return destination;
  }

  /**
   * Bounded cross-memory DMA transfer from guest heap (Memory 0) to foreign C/Rust heap (Memory 1).
   */
  public transferToForeign(pointer: FlintMemoryAddress, length: number): FlintMemoryAddress {
    const destination = this.foreignHeap.allocate(length);
    this.guestHeap.copyBetweenMemories(pointer, this.foreignHeap, destination, length);
    return destination;
  }

  /**
   * Bounded cross-memory DMA transfer from foreign C/Rust heap (Memory 1) back to guest heap (Memory 0).
   */
  public transferFromForeign(pointer: FlintMemoryAddress, length: number): FlintMemoryAddress {
    const destination = this.guestHeap.allocate(length);
    this.foreignHeap.copyBetweenMemories(pointer, this.guestHeap, destination, length);
    return destination;
  }
}

/**
 * Scoped regional bump allocator pool (Tier 1) providing O(1) allocation
 * and deterministic bulk deallocation upon scope exit.
 */
export class FlintRegionalArena {
  private readonly memory: FlintMemory;
  private readonly startOffset: number;
  private readonly capacity: number;
  private currentOffset: number;
  private readonly logger: FlintLogger;

  public constructor(memory: FlintMemory, size = 65_536) {
    this.memory = memory;
    this.capacity = size;
    this.startOffset = Number(memory.allocate(size));
    this.currentOffset = this.startOffset;
    this.logger = createFlintLogger({ scope: 'fws.arena' });
  }

  /**
   * Allocates an aligned chunk within this arena in O(1) time.
   *
   * @param size - Size in bytes.
   * @param alignment - Natural alignment requirement (default: 8).
   * @returns Byte offset in linear memory.
   */
  public allocate(size: number, alignment = 8): number {
    const aligned = (this.currentOffset + alignment - 1) & ~(alignment - 1);
    if (aligned + size > this.startOffset + this.capacity) {
      throw new FlintTrap('MemoryExhausted', 'Regional arena capacity exceeded.', undefined, {
        logger: this.logger,
      });
    }
    this.currentOffset = aligned + size;
    return aligned;
  }

  /**
   * Encodes a string as a null-terminated UTF-8 C string, bump-allocates space in the arena,
   * writes the bytes followed by 0x00, and returns the allocated pointer address.
   *
   * @param value - String value to write.
   * @returns Allocated base address pointer in linear memory.
   */
  public writeCString(value: string): number {
    const encoded = textEncoder.encode(value);
    const totalBytes = encoded.byteLength + 1;
    const pointer = this.allocate(totalBytes, 1);
    this.memory.writeCString(pointer, value);
    return pointer;
  }

  /**
   * Bulk-resets the arena bump pointer back to the start in O(1) time.
   */
  public reset(): void {
    this.currentOffset = this.startOffset;
  }

  /**
   * Releases the arena backing buffer back to the parent memory allocator.
   */
  public dispose(): void {
    this.memory.deallocate(this.startOffset, this.capacity);
  }

  /**
   * Executes a scoped closure with an arena, automatically disposing upon exit.
   */
  public static withRegion<T>(memory: FlintMemory, size: number, action: (arena: FlintRegionalArena) => T): T {
    const arena = new FlintRegionalArena(memory, size);
    try {
      return action(arena);
    } finally {
      arena.dispose();
    }
  }
}

/**
 * Creates an isolated multi-memory instance with dedicated guest heap, host interop, and static partitions.
 */
export function createFlintMultiMemory(options?: FlintMultiMemoryOptions): FlintMultiMemory {
  return new FlintMultiMemory(options);
}
