import { describe, expect, it } from 'vitest';

import { compileForgeWebScript } from '../compiler.ts';
import { createForgeWebScriptAbiManifest } from '../manifest.ts';
import { parseForgeWebScript } from '../parser.ts';

import { codecMigrationFixture } from './codec-migration.ts';

describe('Forge Web Script codec migration fixture', () => {
  it('keeps a codec-shaped export explicit and deterministic', () => {
    const artifact = compileForgeWebScript({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: codecMigrationFixture.requestedCapabilities,
      optimization: 'release',
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
    expect(WebAssembly.validate(artifact.wasm!)).toBe(true);
    expect(artifact.contentHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(artifact.esmSource).toContain('export const manifest =');
    expect(artifact.declarations).toContain('readonly encode_payload: (payload: string) => ForgeWebScriptBytes;');

    const repeat = compileForgeWebScript({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: codecMigrationFixture.requestedCapabilities,
      optimization: 'release',
    });
    expect(repeat.contentHash).toBe(artifact.contentHash);
    expect(repeat.esmSource).toBe(artifact.esmSource);
    expect(repeat.declarations).toBe(artifact.declarations);

    const module = parseForgeWebScript(codecMigrationFixture.source, 'barcode-migration.fws').module!;
    expect(createForgeWebScriptAbiManifest(module)).toMatchObject({
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
    const artifact = compileForgeWebScript({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: [],
    });

    expect(artifact.wasm).toBeUndefined();
    expect(artifact.diagnostics.map(({ code }) => code)).toContain('FWS-ABI-002');
  });

  it('round-trips caller-owned byte output through an injectable codec host', () => {
    const artifact = compileForgeWebScript({
      source: codecMigrationFixture.source,
      fileName: 'barcode-migration.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: codecMigrationFixture.requestedCapabilities,
    });
    const wasmModule = new WebAssembly.Module(artifact.wasm!);
    let wasmExports: WebAssembly.Exports | undefined;
    let observedInput: [number, number] | undefined;
    const instance = new WebAssembly.Instance(wasmModule, {
      'codec.barcode.encode': {
        encode(pointer: number, length: number): [number, number] {
          observedInput = [pointer, length];
          const allocate = wasmExports!.fws_alloc as (size: number) => number;
          const outputPointer = allocate(length + 1);
          const output = new Uint8Array(wasmExports!.memory.buffer, outputPointer, length + 1);
          output[0] = length;
          for (let index = 0; index < length; index += 1) output[index + 1] = index % 2;
          return [outputPointer, output.length];
        },
      },
    });
    wasmExports = instance.exports;

    const encodePayload = wasmExports.encode_payload as (pointer: number, length: number) => [number, number];
    const result = encodePayload(256, 4);
    expect(observedInput).toEqual([256, 4]);
    expect(result[1]).toBe(5);
    expect(new Uint8Array(wasmExports.memory.buffer, result[0], result[1])).toEqual(new Uint8Array([4, 0, 1, 0, 1]));
  });
});
