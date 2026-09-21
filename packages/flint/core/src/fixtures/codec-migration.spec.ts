import { describe, expect, it } from 'vitest';

import { compileFlint } from '../compiler.ts';
import { createFlintAbiManifest } from '../manifest.ts';
import { parseFlint } from '../parser.ts';

import { codecMigrationFixture } from './codec-migration.ts';

describe('Forge Web Script codec migration fixture', () => {
  it('keeps a codec-shaped export explicit and deterministic', () => {
    const artifact = compileFlint({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.flint',
      compilerVersion: '0.1.0',
      requestedCapabilities: codecMigrationFixture.requestedCapabilities,
      optimization: 'release',
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
    const wasm = artifact.wasm ?? new Uint8Array();
    expect(WebAssembly.validate(wasm)).toBe(true);
    expect(artifact.contentHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(artifact.esmSource).toContain('export const manifest =');
    expect(artifact.declarations).toContain('readonly encode_payload: (payload: string) => FlintBytes;');

    const repeat = compileFlint({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.flint',
      compilerVersion: '0.1.0',
      requestedCapabilities: codecMigrationFixture.requestedCapabilities,
      optimization: 'release',
    });
    expect(repeat.contentHash).toBe(artifact.contentHash);
    expect(repeat.esmSource).toBe(artifact.esmSource);
    expect(repeat.declarations).toBe(artifact.declarations);

    const module = parseFlint(codecMigrationFixture.source, 'barcode-migration.flint').module;
    if (module === undefined) throw new Error('Expected module to be defined');
    expect(createFlintAbiManifest(module)).toMatchObject({
      moduleName: 'barcode-migration',
      requiredCapabilities: ['codec.barcode.encode'],
      exports: [
        {
          name: 'encode_payload',
          parameters: [{ name: 'payload', type: 'string', passing: 'immutable-reference' }],
          result: 'bytes',
        },
      ],
      imports: [
        {
          capability: 'codec.barcode.encode',
          alias: 'encode',
          function: { result: 'bytes' },
        },
      ],
    });
  });

  it('rejects the migration module when its codec capability is not approved', () => {
    const artifact = compileFlint({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.flint',
      compilerVersion: '0.1.0',
      requestedCapabilities: [],
    });

    expect(artifact.wasm).toBeUndefined();
    expect(artifact.diagnostics.map(({ code }) => code)).toContain('FLINT-ABI-002');
  });

  it('round-trips caller-owned byte output through an injectable codec host', () => {
    const artifact = compileFlint({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.flint',
      compilerVersion: '0.1.0',
      requestedCapabilities: codecMigrationFixture.requestedCapabilities,
    });
    const wasmModule = new WebAssembly.Module(artifact.wasm ?? new Uint8Array());
    const instanceReference: { current?: WebAssembly.Instance } = {};
    let observedInput: [number, number] | undefined;
    const instance = new WebAssembly.Instance(wasmModule, {
      'codec.barcode.encode': {
        encode(pointer: number, length: number): [number, number] {
          observedInput = [pointer, length];
          const allocate =
            (instanceReference.current?.exports.fws_alloc as ((size: number) => number) | undefined) ?? (() => 0);
          const outputPointer = allocate(length + 1);
          const mem =
            (instanceReference.current?.exports.memory as WebAssembly.Memory | undefined) ??
            new WebAssembly.Memory({ initial: 1 });
          const output = new Uint8Array(mem.buffer, outputPointer, length + 1);
          output[0] = length;
          for (let index = 0; index < length; index += 1) output[index + 1] = index % 2;
          return [outputPointer, output.length];
        },
      },
    });
    instanceReference.current = instance;
    const wasmExports = instance.exports;

    const encodePayload = wasmExports.encode_payload as (pointer: number, length: number) => [number, number];
    const result = encodePayload(256, 4);
    expect(observedInput).toEqual([256, 4]);
    expect(result[1]).toBe(5);
    expect(new Uint8Array(wasmExports.memory.buffer, result[0], result[1])).toEqual(new Uint8Array([4, 0, 1, 0, 1]));
  });
});
