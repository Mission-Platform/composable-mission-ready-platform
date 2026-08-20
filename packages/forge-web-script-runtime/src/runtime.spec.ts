import { describe, expect, it } from 'vitest';

import { validateForgeWebScriptAbiManifest } from './abi.ts';
import { createForgeWebScriptHost } from './host.ts';
import { createForgeWebScriptMemory } from './memory.ts';
import { createForgeWebScriptLogger } from './logging.ts';
import { ForgeWebScriptTrap } from './traps.ts';

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
    expect(validateForgeWebScriptAbiManifest(manifest)).toEqual({ valid: true, errors: [] });
    const host = createForgeWebScriptHost(manifest, {
      'clock.now': {
        signature: { name: 'now', parameters: [], result: 'i64' },
        call: () => 7n,
      },
    });
    expect(host.invoke('now', [])).toBe(7n);
    expect(() => host.invoke('missing', [])).toThrowError(ForgeWebScriptTrap);
  });

  it('rejects manifests that omit or misname the required reallocator export', () => {
    const invalidManifest = {
      ...manifest,
      memory: { ...manifest.memory, reallocatorExport: 'fws_resize' },
    } as unknown as typeof manifest;
    expect(validateForgeWebScriptAbiManifest(invalidManifest)).toEqual({
      valid: false,
      errors: ['Allocator exports do not match the v1.2 ABI.'],
    });
    const omittedManifest = { ...manifest, memory: { ...manifest.memory } } as unknown as typeof manifest;
    delete (omittedManifest.memory as { reallocatorExport?: string }).reallocatorExport;
    expect(validateForgeWebScriptAbiManifest(omittedManifest)).toEqual({
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
    expect(validateForgeWebScriptAbiManifest(arrayManifest)).toEqual({ valid: true, errors: [] });
    const invalid = {
      ...arrayManifest,
      exports: [
        {
          ...arrayManifest.exports[0],
          parameters: [{ ...arrayManifest.exports[0].parameters[0], arguments: [{ name: 'string' as const }] }],
        },
      ],
    };
    expect(validateForgeWebScriptAbiManifest(invalid)).toEqual({
      valid: false,
      errors: ['Unsupported collection element type; only Array<i32> is supported.'],
    });
  });

  it('denies absent capabilities and converts host exceptions', () => {
    expect(() => createForgeWebScriptHost(manifest, {})).toThrowError(ForgeWebScriptTrap);
    expect(() =>
      createForgeWebScriptHost(manifest, {
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
    const logger = createForgeWebScriptLogger({
      minimumLevel: 'debug',
      sink: (event) => events.push(`${event.scope}:${event.message}`),
    });
    const host = createForgeWebScriptHost(
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
    const memory = createForgeWebScriptMemory();
    const value = new TextEncoder().encode('héllo');
    const pointer = memory.allocate(value.byteLength);
    memory.writeBytes(pointer, value);
    expect(memory.readString(pointer, value.byteLength)).toBe('héllo');
    expect(memory.readBytes(memory.bytes.byteLength, 0)).toEqual(new Uint8Array());
    expect(() => memory.readBytes(memory.bytes.byteLength, 1)).toThrowError(ForgeWebScriptTrap);
    memory.deallocate(pointer, value.byteLength);
    expect(() => memory.deallocate(pointer, value.byteLength)).toThrowError(ForgeWebScriptTrap);
  });
});
