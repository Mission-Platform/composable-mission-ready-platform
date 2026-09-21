import { describe, expect, it } from 'vitest';

import { compileFlintWasm } from './index.ts';
import { renderFlintWasmWat } from './wat.ts';

import type { FlintWasmModule } from './contracts.ts';

describe('WebAssembly Foreign Capability Emitter', () => {
  it('lowers foreign capabilities to Wasm imports with C ABI type signatures', () => {
    const ir: FlintWasmModule = {
      name: 'foreign_test',
      imports: [],
      sourceImports: [],
      foreignCapabilities: [
        {
          library: 'zstd',
          callingConvention: 'wasm-c-abi',
          functions: [
            {
              symbol: 'ZSTD_versionNumber',
              parameters: [],
              result: 'u32',
            },
            {
              symbol: 'ZSTD_compress',
              parameters: [
                { name: 'dst', type: 'CPtr<u8>' },
                { name: 'dstCapacity', type: 'c_size' },
                { name: 'src', type: 'CPtr<u8>' },
                { name: 'srcSize', type: 'c_size' },
                { name: 'compressionLevel', type: 'c_int' },
              ],
              result: 'c_size',
            },
          ],
        },
      ],
      functions: [
        {
          name: 'get_version',
          exported: true,
          parameters: [],
          result: { name: 'u32', span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } },
          body: [
            {
              kind: 'return',
              value: {
                kind: 'call',
                callee: 'ZSTD_versionNumber',
                arguments: [],
                span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
              },
              span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
            },
          ],
          span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        },
      ],
      span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
    };

    const result = compileFlintWasm({
      ir,
      optimizedIr: ir,
      abi: {},
      links: {},
      metadata: {
        compilerVersion: '1.0.0',
        optimization: 'debug',
        sourceFiles: ['foreign_test.flint'],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.wasm).toBeDefined();
    // Validate WebAssembly binary magic header \0asm\1\0\0\0
    expect(result.wasm?.slice(0, 8)).toEqual(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));

    // Validate WAT rendering contains foreign imports
    const wat = renderFlintWasmWat(ir);
    expect(wat).toContain('(import "zstd" "ZSTD_versionNumber" (func $ZSTD_versionNumber (result i32)))');
    expect(wat).toContain(
      '(import "zstd" "ZSTD_compress" (func $ZSTD_compress (param $dst i32) (param $dstCapacity i32) (param $src i32) (param $srcSize i32) (param $compressionLevel i32) (result i32)))',
    );
  });

  it('emits wasm64 foreign imports when memory64 is enabled', () => {
    const ir: FlintWasmModule = {
      name: 'foreign64_test',
      imports: [],
      sourceImports: [],
      foreignCapabilities: [
        {
          library: 'native_lib',
          callingConvention: 'wasm-c-abi',
          functions: [
            {
              symbol: 'process_buffer',
              parameters: [
                { name: 'ptr', type: 'CPtr<u8>' },
                { name: 'size', type: 'c_size' },
              ],
              result: 'c_size',
            },
          ],
        },
      ],
      functions: [
        {
          name: 'invoke_process',
          exported: true,
          parameters: [
            {
              name: 'buf',
              type: { name: 'u64', span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } },
              span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
            },
          ],
          result: { name: 'u64', span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } },
          body: [
            {
              kind: 'return',
              value: {
                kind: 'call',
                callee: 'process_buffer',
                arguments: [
                  {
                    kind: 'identifier',
                    name: 'buf',
                    span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                  },
                  {
                    kind: 'literal',
                    value: 1024,
                    type: 'i64',
                    span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
                  },
                ],
                span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
              },
              span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
            },
          ],
          span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        },
      ],
      span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
    };

    const result = compileFlintWasm({
      ir,
      optimizedIr: ir,
      abi: {},
      links: {},
      metadata: {
        compilerVersion: '1.0.0',
        optimization: 'debug',
        sourceFiles: ['foreign64_test.flint'],
      },
      targetFeatures: { memory64: true },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.wasm).toBeDefined();
    expect(result.wasm?.slice(0, 8)).toEqual(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
  });
});
