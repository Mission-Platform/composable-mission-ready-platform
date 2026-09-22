import { describe, expect, it } from 'vitest';

import { renderFlintWasmWat, toWatType } from './wat.js';

import type { FlintWasmModule } from './emitter.js';

describe('WebAssembly WAT renderer and type mappings', () => {
  it('maps pointer types and C types correctly under memory32 vs memory64 in toWatType', () => {
    // 32-bit (default)
    expect(toWatType('CPtr<u8>', false)).toBe('i32');
    expect(toWatType('MutCPtr<u8>', false)).toBe('i32');
    expect(toWatType('COpaquePtr', false)).toBe('i32');
    expect(toWatType('c_size', false)).toBe('i32');
    expect(toWatType('c_ssize', false)).toBe('i32');
    expect(toWatType('c_long', false)).toBe('i32');
    expect(toWatType('c_ulong', false)).toBe('i32');

    // 64-bit (memory64)
    expect(toWatType('CPtr<u8>', true)).toBe('i64');
    expect(toWatType('MutCPtr<u8>', true)).toBe('i64');
    expect(toWatType('COpaquePtr', true)).toBe('i64');
    expect(toWatType('c_size', true)).toBe('i64');
    expect(toWatType('c_ssize', true)).toBe('i64');
    expect(toWatType('c_long', true)).toBe('i64');
    expect(toWatType('c_ulong', true)).toBe('i64');

    // Invariant primitives
    expect(toWatType('f32', false)).toBe('f32');
    expect(toWatType('f32', true)).toBe('f32');
    expect(toWatType('f64', false)).toBe('f64');
    expect(toWatType('f64', true)).toBe('f64');
    expect(toWatType('i64', false)).toBe('i64');
    expect(toWatType('i64', true)).toBe('i64');
  });

  it('renders foreign imports with 64-bit parameters and return types when memory64 is enabled', () => {
    const dummySpan = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
    const module: FlintWasmModule = {
      name: 'foreign_memory64',
      span: dummySpan,
      functions: [],
      imports: [],
      foreignCapabilities: [
        {
          abi: 'C',
          library: 'libc',
          callingConvention: 'wasm-c-abi',
          functions: [
            {
              name: 'memcpy',
              parameters: [
                { name: 'dest', type: { name: 'CPtr' } },
                { name: 'src', type: { name: 'CPtr' } },
                { name: 'n', type: { name: 'c_size' } },
              ],
              result: { name: 'CPtr' },
            },
          ],
        },
      ],
    };

    const wat64 = renderFlintWasmWat(module, {
      targetFeatures: { memory64: true },
    });

    expect(wat64).toContain('(param $dest i64)');
    expect(wat64).toContain('(param $src i64)');
    expect(wat64).toContain('(param $n i64)');
    expect(wat64).toContain('(result i64)');

    const wat32 = renderFlintWasmWat(module, {
      targetFeatures: { memory64: false },
    });

    expect(wat32).toContain('(param $dest i32)');
    expect(wat32).toContain('(param $src i32)');
    expect(wat32).toContain('(param $n i32)');
    expect(wat32).toContain('(result i32)');
  });
});
