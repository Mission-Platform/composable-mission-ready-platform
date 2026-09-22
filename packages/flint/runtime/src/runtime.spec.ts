import { describe, expect, it } from 'vitest';

import { validateFlintAbiManifest } from './abi.ts';
import { createFlintHost } from './host.ts';
import { createFlintLogger } from './logging.ts';
import { createFlintMemory } from './memory.ts';
import { FlintTrap } from './traps.ts';

const manifest = {
  format: 'forge-web-script-module' as const,
  languageVersion: '1.0' as const,
  abiVersion: '1.2' as const,
  moduleName: 'runtime',
  exports: [{ name: 'read', parameters: [], result: 'i32' as const }],
  imports: [
    {
      capability: 'clock.now',
      alias: 'now',
      function: { name: 'now', parameters: [], result: 'i64' as const },
    },
  ],
  requiredCapabilities: ['clock.now'],
  memory: {
    pageSize: 65_536 as const,
    addressType: 'u32' as const,
    ownership: 'caller-owned' as const,
    stringEncoding: 'utf8' as const,
    byteArrayRepresentation: 'pointer-length' as const,
    allocatorExport: 'fws_alloc' as const,
    deallocatorExport: 'fws_dealloc' as const,
    reallocatorExport: 'fws_realloc' as const,
  },
  valueRepresentations: {
    bool: 'bool-i32' as const,
    bytes: 'pointer-length-u32' as const,
    f32: 'f32' as const,
    f64: 'f64' as const,
    i32: 'i32' as const,
    i64: 'i64' as const,
    string: 'pointer-length-u32' as const,
    u32: 'u32' as const,
    u64: 'u64' as const,
    unit: 'unit' as const,
  },
  trapModel: 'explicit-trap' as const,
};

describe('Forge Web Script runtime', () => {
  it('validates the ABI and invokes only declared, matching capabilities', () => {
    expect(validateFlintAbiManifest(manifest)).toEqual({ valid: true, errors: [] });
    const host = createFlintHost(manifest, {
      'clock.now': {
        signature: { name: 'now', parameters: [], result: 'i64' },
        call: () => 7n,
      },
    });
    expect(host.invoke('now', [])).toBe(7n);
    expect(() => host.invoke('missing', [])).toThrowError(FlintTrap);
  });

  it('rejects manifests that omit or misname the required reallocator export', () => {
    const invalidManifest = {
      ...manifest,
      memory: { ...manifest.memory, reallocatorExport: 'fws_resize' },
    } as unknown as typeof manifest;
    expect(validateFlintAbiManifest(invalidManifest)).toEqual({
      valid: false,
      errors: ['Allocator exports do not match the v1.2 ABI.'],
    });
    const omittedManifest = { ...manifest, memory: { ...manifest.memory } } as unknown as typeof manifest;
    delete (omittedManifest.memory as { reallocatorExport?: string }).reallocatorExport;
    expect(validateFlintAbiManifest(omittedManifest)).toEqual({
      valid: false,
      errors: ['Allocator exports do not match the v1.2 ABI.'],
    });
  });

  it('validates owned Array<i32> carriers and rejects unsupported collection elements', () => {
    const arrayManifest = {
      ...manifest,
      exports: [
        {
          name: 'read',
          parameters: [
            {
              name: 'values',
              type: 'i32' as const,
              reference: 'Array',
              arguments: [{ name: 'i32' as const }],
              ownership: 'owned' as const,
            },
          ],
          result: 'i32' as const,
        },
      ],
      enumDeclarations: [
        { name: 'State', exported: true, representation: 'i32' as const, variants: [{ name: 'Ready', value: 4 }] },
      ],
      collectionLayouts: [
        {
          type: 'Array<i32>',
          kind: 'array' as const,
          elementType: 'i32',
          representation: 'contiguous' as const,
          ownership: 'owned' as const,
        },
      ],
    };
    expect(validateFlintAbiManifest(arrayManifest)).toEqual({ valid: true, errors: [] });
    const invalid = {
      ...arrayManifest,
      exports: [
        {
          ...arrayManifest.exports[0],
          parameters: [{ ...arrayManifest.exports[0].parameters[0], arguments: [{ name: 'string' as const }] }],
        },
      ],
    };
    expect(validateFlintAbiManifest(invalid)).toEqual({
      valid: false,
      errors: ['Unsupported collection element type; only Array<i32> is supported.'],
    });
  });

  it('denies absent capabilities and converts host exceptions', () => {
    expect(() => createFlintHost(manifest, {})).toThrowError(FlintTrap);
    expect(() =>
      createFlintHost(manifest, {
        'clock.now': {
          signature: { name: 'now', parameters: [], result: 'i64' },
          call: () => {
            throw new Error('secret host detail');
          },
        },
      }).invoke('now', []),
    ).toThrow(/Capability 'clock.now' failed/);
  });

  it('keeps host and trap events scoped without changing the returned value', () => {
    const events: string[] = [];
    const logger = createFlintLogger({
      minimumLevel: 'debug',
      sink: (event) => events.push(`${event.scope}:${event.message}`),
    });
    const host = createFlintHost(
      manifest,
      {
        'clock.now': {
          signature: { name: 'now', parameters: [], result: 'i64' },
          call: () => 9n,
        },
      },
      { logger },
    );

    expect(host.invoke('now', [])).toBe(9n);
    expect(events).toContain('fws.host:capability.invoke');
    expect(events.some((event) => event.startsWith('fws.host:'))).toBe(true);
  });

  it('bounds checks pointer-length values, preserves UTF-8, and enforces ownership', () => {
    const memory = createFlintMemory();
    const value = new TextEncoder().encode('héllo');
    const pointer = memory.allocate(value.byteLength);
    memory.writeBytes(pointer, value);
    expect(memory.readString(pointer, value.byteLength)).toBe('héllo');
    expect(memory.readBytes(memory.bytes.byteLength, 0)).toEqual(new Uint8Array());
    expect(() => memory.readBytes(memory.bytes.byteLength, 1)).toThrowError(FlintTrap);
    memory.deallocate(pointer, value.byteLength);
    expect(() => memory.deallocate(pointer, value.byteLength)).toThrowError(FlintTrap);
  });

  it('strictly validates foreign host call arity, parameter types, and async rejection handling', async () => {
    const foreignManifest = {
      ...manifest,
      imports: [],
      requiredCapabilities: [],
      foreignCapabilities: [
        {
          abi: 'C' as const,
          library: 'native_lib',
          callingConvention: 'wasm-c-abi' as const,
          memoryModel: 'shared' as const,
          functions: [
            {
              symbol: 'add_numbers',
              parameters: [
                { name: 'a', type: 'c_int', wasmType: 'i32', cType: 'int' },
                { name: 'b', type: 'c_int', wasmType: 'i32', cType: 'int' },
              ],
              result: { wasmType: 'i32', cType: 'int' },
            },
            {
              symbol: 'async_op',
              parameters: [{ name: 'id', type: 'c_int', wasmType: 'i32', cType: 'int' }],
              result: { wasmType: 'i32', cType: 'int' },
            },
          ],
        },
      ],
    };

    const host = createFlintHost(
      foreignManifest,
      {},
      {
        foreignRegistry: {
          native_lib: {
            library: 'native_lib',
            call: (symbol, arguments_) => {
              if (symbol === 'add_numbers') {
                const [a, b] = arguments_ as [number, number];
                return a + b;
              }
              if (symbol === 'async_op') {
                return Promise.reject(new Error('async foreign failure'));
              }
              throw new Error(`Unknown symbol: ${symbol}`);
            },
          },
        },
      },
    );

    // Valid call
    expect(host.invokeForeign?.('native_lib', 'add_numbers', [10, 20])).toBe(30);

    // Arity validation: too few arguments
    expect(() => host.invokeForeign?.('native_lib', 'add_numbers', [10])).toThrowError(
      /Foreign function 'add_numbers' in capability 'native_lib' received an invalid argument count: expected 2, got 1/,
    );

    // Arity validation: too many arguments
    expect(() => host.invokeForeign?.('native_lib', 'add_numbers', [10, 20, 30])).toThrowError(
      /Foreign function 'add_numbers' in capability 'native_lib' received an invalid argument count: expected 2, got 3/,
    );

    // Type validation: string passed instead of number for c_int
    expect(() => host.invokeForeign?.('native_lib', 'add_numbers', [10, 'invalid' as unknown as number])).toThrowError(
      /Foreign function 'add_numbers' parameter 'b' expected Wasm type 'i32', got 'string'/,
    );

    // Async rejection handling converted to FlintHostError
    await expect(host.invokeForeign?.('native_lib', 'async_op', [42])).rejects.toThrow(
      /Capability 'native_lib' failed/,
    );
  });
});
