import { describe, expect, it } from 'vitest';

import { createFlintAbiManifest } from './manifest.ts';
import { parseFlint } from './parser.ts';

describe('Flint ABI Manifest with Foreign Capabilities', () => {
  it('serializes foreignCapabilities with C ABI signatures and wasm32 types', () => {
    const source = `
      foreign "C" capability "scanner_engine" {
        fn scan_barcode_c(
          image: CPtr<u8>,
          width: c_uint,
          height: c_uint,
          result_out: MutCPtr<u32>
        ) -> c_int;

        fn get_version() -> CPtr<c_char>;
      }

      export fn noop() -> i32 {
        return 0;
      }
    `;

    const parsed = parseFlint(source, 'manifest_test.flint');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    if (!parsed.module) throw new Error('Expected parsed module to be defined');

    const manifest = createFlintAbiManifest(parsed.module);
    expect(manifest.foreignCapabilities).toBeDefined();
    expect(manifest.foreignCapabilities).toEqual([
      {
        library: 'scanner_engine',
        callingConvention: 'wasm-c-abi',
        memoryModel: 'shared',
        functions: [
          {
            symbol: 'scan_barcode_c',
            parameters: [
              { name: 'image', cType: 'CPtr<u8>', wasmType: 'i32' },
              { name: 'width', cType: 'c_uint', wasmType: 'i32' },
              { name: 'height', cType: 'c_uint', wasmType: 'i32' },
              { name: 'result_out', cType: 'MutCPtr<u32>', wasmType: 'i32' },
            ],
            result: { cType: 'c_int', wasmType: 'i32' },
          },
          {
            symbol: 'get_version',
            parameters: [],
            result: { cType: 'CPtr<c_char>', wasmType: 'i32' },
          },
        ],
      },
    ]);
  });

  it('serializes foreignCapabilities with wasm64 pointer and size types when memory64 is enabled', () => {
    const source = `
      foreign "C" capability "native_crypto" {
        fn sha256_hash(
          data: CPtr<u8>,
          len: c_size,
          out: MutCPtr<u8>
        ) -> c_ulonglong;
      }

      export fn noop() -> i32 {
        return 0;
      }
    `;

    const parsed = parseFlint(source, 'crypto.flint');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    if (!parsed.module) throw new Error('Expected parsed module to be defined');

    const manifest64 = createFlintAbiManifest(parsed.module, {
      targetFeatures: ['memory64'],
    });

    expect(manifest64.foreignCapabilities).toBeDefined();
    expect(manifest64.foreignCapabilities?.[0].functions[0]).toEqual({
      symbol: 'sha256_hash',
      parameters: [
        { name: 'data', cType: 'CPtr<u8>', wasmType: 'i64' },
        { name: 'len', cType: 'c_size', wasmType: 'i64' },
        { name: 'out', cType: 'MutCPtr<u8>', wasmType: 'i64' },
      ],
      result: { cType: 'c_ulonglong', wasmType: 'i64' },
    });
  });

  it('omits foreignCapabilities property when no foreign blocks are declared', () => {
    const source = `
      export fn add(a: i32, b: i32) -> i32 {
        return a + b;
      }
    `;
    const parsed = parseFlint(source, 'pure.flint');
    if (!parsed.module) throw new Error('Expected parsed module to be defined');
    const manifest = createFlintAbiManifest(parsed.module);
    expect(manifest.foreignCapabilities).toBeUndefined();
  });

  it('aligns aggregate layouts and reference carriers with specified TargetPlatform', () => {
    const source = `
      struct Header {
        len: c_size;
        count: c_long;
      }

      export fn get_header(h: Header) -> Header {
        return h;
      }
    `;
    const parsed = parseFlint(source, 'header.flint');
    if (!parsed.module) throw new Error('Expected parsed module to be defined');

    // 64-bit target: pointerSize = 8, longSize = 8 on Linux x86_64
    const manifest64 = createFlintAbiManifest(parsed.module, {
      targetPlatform: 'x86_64-unknown-linux-gnu',
    });
    expect(manifest64.memory.addressType).toBe('u64');
    expect(manifest64.exports[0].parameters[0].type).toBe('i64');
    expect(manifest64.exports[0].result).toBe('i64');
    const structLayout64 = manifest64.aggregateLayouts?.find((l) => l.name === 'Header');
    expect(structLayout64?.size).toBe(16);
    expect(structLayout64?.alignment).toBe(8);

    // 32-bit target: pointerSize = 4, longSize = 4 on wasm32
    const manifest32 = createFlintAbiManifest(parsed.module, {
      targetPlatform: 'wasm32-unknown-unknown',
    });
    expect(manifest32.memory.addressType).toBe('u32');
    expect(manifest32.exports[0].parameters[0].type).toBe('i32');
    expect(manifest32.exports[0].result).toBe('i32');
    const structLayout32 = manifest32.aggregateLayouts?.find((l) => l.name === 'Header');
    expect(structLayout32?.size).toBe(8);
    expect(structLayout32?.alignment).toBe(4);
  });
});
