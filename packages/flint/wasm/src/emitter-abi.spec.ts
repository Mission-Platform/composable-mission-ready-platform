import { describe, expect, it } from 'vitest';

import { index32, literal, metadata, moduleWith, span, wasmBytes, wasmModule } from './emitter-fixtures.js';
import { compileFlintWasm } from './emitter.js';

describe('Flint WASM Emitter Memory and ABI', () => {
  it('exports a working realloc ABI function', () => {
    const module = moduleWith([]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wasm).toBeDefined();
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    expect(exports.fws_realloc).toBeInstanceOf(Function);
    const pointer = exports.fws_alloc(4);
    const tail = exports.fws_alloc(4);
    new Uint8Array((exports.memory as WebAssembly.Memory).buffer).set([1, 2, 3, 4], pointer);
    expect(exports.fws_realloc(tail, 4, 2)).toBe(tail);
    const replacement = exports.fws_realloc(pointer, 4, 6);
    expect(replacement).not.toBe(pointer);
    expect(new Uint8Array((exports.memory as WebAssembly.Memory).buffer).slice(replacement, replacement + 4)).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it('sizes memory from static data and permits checked allocator growth', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'largeStaticValue',
        exported: true,
        parameters: [],
        result: { name: 'string', span },
        span,
        body: [{ kind: 'return', value: literal('x'.repeat(70_000)), span }],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    const memory = exports.memory as WebAssembly.Memory;
    expect(memory.buffer.byteLength).toBeGreaterThanOrEqual(2 * 65_536);
    expect(() => exports.fws_alloc(70_000)).not.toThrow();
    expect(memory.buffer.byteLength).toBeGreaterThanOrEqual(3 * 65_536);
  });

  it('validates target profiles and emits shared-memory modules only when enabled', () => {
    const module = { ...moduleWith([]), featureRequirements: { threads: true, atomics: true } };
    const denied = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { threads: true },
      metadata,
    });
    expect(denied.wasm).toBeUndefined();
    expect(denied.diagnostics.map(({ code }) => code)).toContain('FLINT-FEATURE-001');

    const enabled = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { threads: true, atomics: true },
      metadata,
    });
    expect(enabled.diagnostics).toEqual([]);
    expect(enabled.wat).toContain('(memory (export "memory") 1 1 shared)');
    expect(WebAssembly.validate(wasmBytes(enabled).buffer as ArrayBuffer)).toBe(true);
  });

  it('returns deterministic optimized and unoptimized debug artifacts', () => {
    const makeModule = (value: number): FlintWasmModule =>
      moduleWith([
        {
          kind: 'function',
          name: 'answer',
          exported: true,
          parameters: [],
          result: { name: 'i32', span },
          span,
          body: [{ kind: 'return', value: index32(value), span }],
        },
      ]);
    const result = compileFlintWasm({
      ir: makeModule(1),
      optimizedIr: makeModule(2),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.unoptimizedWat).toContain('i32.const 1');
    expect(result.unoptimizedWasm).toBeDefined();
    expect(result.wat).toContain('i32.const 2');
    expect(result.wasm).toBeDefined();
    expect(result.wasm).not.toEqual(result.unoptimizedWasm);
  });

  it('uses the memory64 limits encoding only for a memory64 target', () => {
    const result = compileFlintWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      targetFeatures: { memory64: true },
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('(memory (export "memory") i64 1)');
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
  });

  it('emits and validates atomic rmw operations under a threads+atomics profile', () => {
    const module = {
      ...moduleWith([
        {
          kind: 'function' as const,
          name: 'addAt',
          exported: true,
          parameters: [
            { name: 'address', type: { name: 'i32' as const, span } },
            { name: 'value', type: { name: 'i32' as const, span } },
          ],
          result: { name: 'i32' as const, span },
          span,
          body: [
            {
              kind: 'return' as const,
              value: {
                kind: 'atomic' as const,
                operation: 'add' as const,
                address: { kind: 'identifier' as const, name: 'address', span },
                value: { kind: 'identifier' as const, name: 'value', span },
                span,
              },
              span,
            },
          ],
        },
      ]),
      featureRequirements: { threads: true, atomics: true },
    };
    const denied = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      metadata,
    });
    expect(denied.wasm).toBeUndefined();
    expect(denied.diagnostics.map(({ code }) => code)).toContain('FLINT-FEATURE-001');

    const result = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { threads: true, atomics: true },
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('i32.atomic.rmw.add');
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
  });

  it('traps allocator overflow and deallocation outside the owned memory range', () => {
    const result = compileFlintWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports;
    const allocate = exports.fws_alloc as (size: number) => number;
    const deallocate = exports.fws_dealloc as (pointer: number, size: number) => void;

    expect(allocate(0)).toBe(1024);
    expect(() => allocate(0xff_ff_ff_ff)).toThrow(WebAssembly.RuntimeError);
    expect(() => deallocate(0, 1)).toThrow(WebAssembly.RuntimeError);
    expect(() => deallocate(1024, 0x00_01_00_00)).toThrow(WebAssembly.RuntimeError);
  });

  it('reallocates tails in place, copies non-tail prefixes, and traps invalid ranges', () => {
    const result = compileFlintWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports;
    const memory = exports.memory as WebAssembly.Memory;
    const allocate = exports.fws_alloc as (size: number) => number;
    const reallocate = exports.fws_realloc as (pointer: number, oldSize: number, newSize: number) => number;
    const first = allocate(4);
    allocate(4);
    new Uint8Array(memory.buffer).set([1, 2, 3, 4], first);

    const replacement = reallocate(first, 4, 6);
    expect(replacement).not.toBe(first);
    expect(new Uint8Array(memory.buffer, replacement, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));

    const tail = allocate(4);
    new Uint8Array(memory.buffer).set([5, 6, 7, 8], tail);
    expect(reallocate(tail, 4, 4)).toBe(tail);
    expect(reallocate(tail, 4, 0)).toBe(tail);
    expect(allocate(2)).toBe(tail);
    expect(() => reallocate(0, 1, 1)).toThrow(WebAssembly.RuntimeError);
    expect(() => reallocate(tail, 4, 0xff_ff_ff_ff)).toThrow(WebAssembly.RuntimeError);
  });

  it('resets the allocator high-water mark for reusable instances', () => {
    const result = compileFlintWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      metadata,
    });
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports;
    const allocate = exports.fws_alloc as (size: number) => number;
    const reset = exports.fws_reset as () => void;

    expect(allocate(8)).toBe(1024);
    expect(allocate(8)).toBe(1032);
    reset();
    expect(allocate(8)).toBe(1024);
  });
});
