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
});
