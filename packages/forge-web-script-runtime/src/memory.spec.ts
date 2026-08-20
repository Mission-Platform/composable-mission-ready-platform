import { describe, expect, it } from 'vitest';

import { createForgeWebScriptMemory, FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES } from './memory.js';
import { ForgeWebScriptTrap } from './traps.js';

describe('Forge Web Script memory capabilities', () => {
  const trapCode = (run: () => unknown): ForgeWebScriptTrap['code'] => {
    try {
      run();
    } catch (error) {
      expect(error).toBeInstanceOf(ForgeWebScriptTrap);
      return (error as ForgeWebScriptTrap).code;
    }
    throw new Error('expected a Forge Web Script trap');
  };
  it('accepts bigint addresses at the host boundary', () => {
    const memory = createForgeWebScriptMemory();
    const pointer = memory.allocate(4);
    memory.writeBytes(BigInt(pointer), new Uint8Array([1, 2, 3, 4]));
    expect(memory.readBytes(BigInt(pointer), 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('rejects shared memory and memory64 without explicit capabilities', () => {
    expect(() => createForgeWebScriptMemory({ shared: true, capabilities: [] })).toThrow(ForgeWebScriptTrap);
    expect(() => createForgeWebScriptMemory({ addressBits: 64, capabilities: [] })).toThrow(ForgeWebScriptTrap);
    expect(FORGE_WEB_SCRIPT_MEMORY_CAPABILITIES.memory64).toBe('wasm.memory64');
  });

  it('resizes the current high-water allocation in place', () => {
    const memory = createForgeWebScriptMemory();
    const pointer = memory.allocate(4);
    memory.writeBytes(pointer, new Uint8Array([1, 2, 3, 4]));

    expect(memory.reallocate(pointer, 4, 8)).toBe(pointer);
    expect(memory.readBytes(pointer, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));

    expect(memory.reallocate(pointer, 8, 2)).toBe(pointer);
    expect(memory.readBytes(pointer, 2)).toEqual(new Uint8Array([1, 2]));
  });

  it('allocates, copies the bounded prefix, and releases for non-tail allocations', () => {
    const memory = createForgeWebScriptMemory();
    const first = memory.allocate(4);
    memory.allocate(4);
    memory.writeBytes(first, new Uint8Array([1, 2, 3, 4]));

    const replacement = memory.reallocate(first, 4, 6);

    expect(replacement).not.toBe(first);
    expect(memory.readBytes(replacement, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(() => memory.deallocate(first, 4)).toThrow(ForgeWebScriptTrap);
  });

  it('handles equal-size and zero-size reallocations deterministically', () => {
    const memory = createForgeWebScriptMemory();
    const pointer = memory.allocate(4);
    memory.writeBytes(pointer, new Uint8Array([1, 2, 3, 4]));

    expect(memory.reallocate(pointer, 4, 4)).toBe(pointer);
    expect(memory.reallocate(pointer, 4, 0)).toBe(pointer);
    expect(memory.readBytes(pointer, 0)).toEqual(new Uint8Array());
    expect(memory.allocate(2)).toBe(pointer);
  });

  it('copies only the bounded prefix when a non-tail allocation shrinks', () => {
    const memory = createForgeWebScriptMemory();
    const first = memory.allocate(6);
    memory.allocate(2);
    memory.writeBytes(first, new Uint8Array([1, 2, 3, 4, 5, 6]));

    const replacement = memory.reallocate(first, 6, 2);

    expect(memory.readBytes(replacement, 2)).toEqual(new Uint8Array([1, 2]));
    expect(trapCode(() => memory.reallocate(first, 6, 2))).toBe('InvalidOwnership');
  });

  it('rejects reallocations with invalid ownership without mutating the allocation', () => {
    const memory = createForgeWebScriptMemory();
    const pointer = memory.allocate(4);

    expect(trapCode(() => memory.reallocate(pointer, 3, 8))).toBe('InvalidOwnership');
    expect(trapCode(() => memory.reallocate(memory.bytes.byteLength, 1, 1))).toBe('MemoryOutOfBounds');
    expect(trapCode(() => memory.reallocate(0, 0, 1))).toBe('InvalidOwnership');
    expect(trapCode(() => memory.reallocate(pointer, 4, -1))).toBe('MemoryExhausted');
    expect(trapCode(() => memory.reallocate(pointer, 4, Number.MAX_SAFE_INTEGER))).toBe('MemoryExhausted');
    expect(memory.reallocate(pointer, 4, 4)).toBe(pointer);
  });

  it('preserves the allocation on memory exhaustion', () => {
    const memory = createForgeWebScriptMemory({ initialPages: 1, maximumPages: 1 });
    const pointer = memory.allocate(65_536 - 8);
    memory.writeBytes(pointer, new Uint8Array([7]));

    expect(trapCode(() => memory.reallocate(pointer, 65_528, 65_529))).toBe('MemoryExhausted');
    expect(memory.reallocate(pointer, 65_528, 65_528)).toBe(pointer);
    expect(memory.readBytes(pointer, 1)).toEqual(new Uint8Array([7]));
  });
});
