import { ForgeWebScriptTrap } from './traps.js';
import { createForgeWebScriptLogger, type ForgeWebScriptLogger } from './logging.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export interface ForgeWebScriptMemoryOptions {
  readonly initialPages?: number;
  readonly maximumPages?: number;
  /** Address representation requested by the FWS module; the host must enable memory64 for i64. */
  readonly addressBits?: 32 | 64;
  readonly shared?: boolean;
  readonly capabilities?: readonly string[];
  readonly logger?: ForgeWebScriptLogger;
}

export type ForgeWebScriptMemoryAddress = number | bigint;

export const FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES = {
  memory64: 'wasm.memory64',
  threads: 'wasm.threads',
  sharedMemory: 'wasm.shared-memory',
} as const;

export class ForgeWebScriptMemory {
  public readonly wasmMemory: WebAssembly.Memory;
  private readonly allocations = new Map<number, number>();
  private nextPointer: ForgeWebScriptMemoryAddress;
  public readonly addressBits: 32 | 64;
  public readonly shared: boolean;
  private readonly logger: ForgeWebScriptLogger;

  public constructor(memory?: WebAssembly.Memory, options: ForgeWebScriptMemoryOptions = {}) {
    this.addressBits = options.addressBits ?? 32;
    this.shared = options.shared ?? (typeof SharedArrayBuffer !== 'undefined' && memory?.buffer instanceof SharedArrayBuffer);
    this.logger = (options.logger ?? createForgeWebScriptLogger({ scope: 'fws' })).child('memory');
    const capabilities = options.capabilities;
    const has = (capability: string, legacyName: string): boolean =>
      capabilities === undefined || capabilities.includes(capability) || capabilities.includes(legacyName);
    if (this.addressBits === 64 && !has(FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.memory64, 'memory64'))
      throw new ForgeWebScriptTrap(
        'CapabilityDenied',
        `Capability '${FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.memory64}' is not declared.`,
        FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.memory64,
        { logger: this.logger },
      );
    if (this.shared && !has(FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.threads, 'threads'))
      throw new ForgeWebScriptTrap(
        'CapabilityDenied',
        `Capability '${FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.threads}' is not declared.`,
        FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.threads,
        { logger: this.logger },
      );
    if (this.shared && !has(FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.sharedMemory, 'shared-memory'))
      throw new ForgeWebScriptTrap(
        'CapabilityDenied',
        `Capability '${FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.sharedMemory}' is not declared.`,
        FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.sharedMemory,
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
      throw new ForgeWebScriptTrap('MemoryExhausted', 'Linear memory could not be created.', undefined, {
        cause: error,
        logger: this.logger,
      });
    }
    this.nextPointer = this.addressBits === 64 ? 8n : 8;
  }

  public get bytes(): Uint8Array {
    return new Uint8Array(this.wasmMemory.buffer);
  }

  private normalizeAddress(pointer: ForgeWebScriptMemoryAddress): number {
    if (typeof pointer === 'bigint') {
      if (pointer < 0n || pointer > BigInt(Number.MAX_SAFE_INTEGER))
        throw new ForgeWebScriptTrap('MemoryOutOfBounds', 'Memory address is outside the supported host range.', undefined, {
          logger: this.logger,
        });
      return Number(pointer);
    }
    if (!Number.isSafeInteger(pointer) || pointer < 0)
      throw new ForgeWebScriptTrap('MemoryOutOfBounds', 'Memory address is not a safe integer.', undefined, {
        logger: this.logger,
      });
    return pointer;
  }

  public checkRange(pointer: ForgeWebScriptMemoryAddress, length: number): void {
    const offset = this.normalizeAddress(pointer);
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      offset > this.bytes.byteLength ||
      length > this.bytes.byteLength - offset
    )
      throw new ForgeWebScriptTrap(
        'MemoryOutOfBounds',
        `Memory range [${offset}, ${offset + length}) is outside linear memory.`,
        undefined,
        { logger: this.logger },
      );
  }

  public readBytes(pointer: ForgeWebScriptMemoryAddress, length: number): Uint8Array {
    this.checkRange(pointer, length);
    const offset = this.normalizeAddress(pointer);
    return this.bytes.slice(offset, offset + length);
  }

  public writeBytes(pointer: ForgeWebScriptMemoryAddress, value: Uint8Array): void {
    this.checkRange(pointer, value.byteLength);
    this.bytes.set(value, this.normalizeAddress(pointer));
  }

  public readString(pointer: ForgeWebScriptMemoryAddress, length: number): string {
    try {
      return textDecoder.decode(this.readBytes(pointer, length));
    } catch (error) {
      throw new ForgeWebScriptTrap('MemoryOutOfBounds', 'The memory range is not valid UTF-8.', undefined, {
        cause: error,
      });
    }
  }

  public writeString(pointer: ForgeWebScriptMemoryAddress, value: string): number {
    const bytes = textEncoder.encode(value);
    this.writeBytes(pointer, bytes);
    return bytes.byteLength;
  }

  public readBigUint64(pointer: ForgeWebScriptMemoryAddress): bigint {
    this.checkRange(pointer, 8);
    return new DataView(this.wasmMemory.buffer).getBigUint64(this.normalizeAddress(pointer), true);
  }

  public writeBigUint64(pointer: ForgeWebScriptMemoryAddress, value: bigint): void {
    this.checkRange(pointer, 8);
    new DataView(this.wasmMemory.buffer).setBigUint64(this.normalizeAddress(pointer), value, true);
  }

  public allocate(size: number): ForgeWebScriptMemoryAddress {
    if (!Number.isSafeInteger(size) || size < 0)
      throw new ForgeWebScriptTrap('MemoryExhausted', 'Allocation size must be a non-negative integer.');
    const pointer = this.nextPointer;
    const offset = this.normalizeAddress(pointer);
    if (size > Number.MAX_SAFE_INTEGER - offset)
      throw new ForgeWebScriptTrap('MemoryExhausted', 'Allocation range exceeds the supported address range.', undefined, {
        logger: this.logger,
      });
    if (size > this.bytes.byteLength - offset) {
      const pages = Math.ceil((offset + size - this.bytes.byteLength) / 65_536);
      try {
        this.wasmMemory.grow(pages);
      } catch (error) {
        throw new ForgeWebScriptTrap(
          'MemoryExhausted',
          'Linear memory could not grow for this allocation.',
          undefined,
          { cause: error, logger: this.logger },
        );
      }
    }
    this.nextPointer = this.addressBits === 64 ? BigInt(offset + size) : offset + size;
    this.allocations.set(offset, size);
    return pointer;
  }

  public reallocate(
    pointer: ForgeWebScriptMemoryAddress,
    oldSize: number,
    newSize: number,
  ): ForgeWebScriptMemoryAddress {
    const offset = this.normalizeAddress(pointer);
    this.checkRange(pointer, oldSize);
    if (this.allocations.get(offset) !== oldSize)
      throw new ForgeWebScriptTrap(
        'InvalidOwnership',
        `Allocation [${offset}, ${offset + oldSize}) is not owned by this runtime.`,
        undefined,
        { logger: this.logger },
      );
    if (!Number.isSafeInteger(newSize) || newSize < 0)
      throw new ForgeWebScriptTrap('MemoryExhausted', 'Reallocation size must be a non-negative integer.', undefined, {
        logger: this.logger,
      });
    if (newSize > Number.MAX_SAFE_INTEGER - offset)
      throw new ForgeWebScriptTrap('MemoryExhausted', 'Reallocation range exceeds the supported address range.', undefined, {
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
          throw new ForgeWebScriptTrap(
            'MemoryExhausted',
            'Linear memory could not grow for this reallocation.',
            undefined,
            { cause: error, logger: this.logger },
          );
        }
      }
      this.nextPointer = this.addressBits === 64 ? BigInt(offset + newSize) : offset + newSize;
      this.allocations.set(offset, newSize);
      return pointer;
    }

    const replacement = this.allocate(newSize);
    const copyLength = Math.min(oldSize, newSize);
    if (copyLength > 0) this.writeBytes(replacement, this.readBytes(pointer, copyLength));
    this.deallocate(pointer, oldSize);
    return replacement;
  }

  public deallocate(pointer: ForgeWebScriptMemoryAddress, size: number): void {
    const offset = this.normalizeAddress(pointer);
    if (this.allocations.get(offset) !== size)
      throw new ForgeWebScriptTrap(
        'InvalidOwnership',
        `Allocation [${offset}, ${size}) is not owned by this runtime.`,
        undefined,
        { logger: this.logger },
      );
    this.allocations.delete(offset);
  }
}

export function createForgeWebScriptMemory(options?: ForgeWebScriptMemoryOptions): ForgeWebScriptMemory {
  return new ForgeWebScriptMemory(undefined, options);
}
