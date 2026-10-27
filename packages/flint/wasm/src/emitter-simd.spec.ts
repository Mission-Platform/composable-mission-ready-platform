import { describe, expect, it } from 'vitest';

import {
  countInstruction,
  index32,
  literal,
  metadata,
  moduleWith,
  span,
  wasmBytes,
  wasmModule,
} from './emitter-fixtures.js';
import { compileFlintWasm } from './emitter.js';

describe('Flint WASM Emitter SIMD and String Operations', () => {
  it('inlines bounds-checked byte access for bytes pointer-length tuples', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'readByte',
        exported: true,
        parameters: [
          { name: 'data', type: { name: 'bytes', span } },
          { name: 'index', type: { name: 'i32', span } },
        ],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'bytes_byte_at',
              standardLibrary: 'bytes-byte-at',
              arguments: [
                { kind: 'identifier', name: 'data', span },
                { kind: 'identifier', name: 'index', span },
              ],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    const memory = exports.memory as WebAssembly.Memory;
    const allocate = exports.fws_alloc as (size: number) => number;
    const pointer = allocate(3);
    new Uint8Array(memory.buffer).set([7, 129, 255], pointer);
    expect(exports.readByte(pointer, 3, 0)).toBe(7);
    expect(exports.readByte(pointer, 3, 1)).toBe(129);
    expect(exports.readByte(pointer, 3, 2)).toBe(255);
    expect(() => exports.readByte(pointer, 3, -1)).toThrow(WebAssembly.RuntimeError);
    expect(() => exports.readByte(pointer, 3, 3)).toThrow(WebAssembly.RuntimeError);
  });

  it('inlines bounds-checked byte access for string pointer-length tuples', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'readStringByte',
        exported: true,
        parameters: [
          { name: 'value', type: { name: 'string', span } },
          { name: 'index', type: { name: 'i32', span } },
        ],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_byte_at',
              standardLibrary: 'string-byte-at',
              arguments: [
                { kind: 'identifier', name: 'value', span },
                { kind: 'identifier', name: 'index', span },
              ],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(wasmBytes(result), [0x2d, 0x00, 0x00])).toBeGreaterThan(5);
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    const memory = exports.memory as WebAssembly.Memory;
    const allocate = exports.fws_alloc as (size: number) => number;
    const pointer = allocate(3);
    new Uint8Array(memory.buffer).set([7, 129, 255], pointer);
    expect(exports.readStringByte(pointer, 3, 0)).toBe(7);
    expect(exports.readStringByte(pointer, 3, 1)).toBe(129);
    expect(exports.readStringByte(pointer, 3, 2)).toBe(255);
    expect(() => exports.readStringByte(pointer, 3, -1)).toThrow(WebAssembly.RuntimeError);
    expect(() => exports.readStringByte(pointer, 3, 3)).toThrow(WebAssembly.RuntimeError);
  });

  it('executes compiler-owned regex matching without capability imports', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'matches',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_full_match',
              standardLibrary: 'full-match',
              arguments: [
                { kind: 'literal', value: 'a+', type: 'string', span },
                { kind: 'literal', value: 'aaa', type: 'string', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'rejects',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_full_match',
              standardLibrary: 'full-match',
              arguments: [
                { kind: 'literal', value: 'a+', type: 'string', span },
                { kind: 'literal', value: 'bbb', type: 'string', span },
              ],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wasm).toBeDefined();
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports;
    expect(Object.keys(exports).toSorted()).toEqual([
      'fws_alloc',
      'fws_dealloc',
      'fws_realloc',
      'fws_reset',
      'matches',
      'memory',
      'rejects',
    ]);
    expect((exports.matches as () => number)()).toBe(1);
    expect((exports.rejects as () => number)()).toBe(0);
  });

  it('distinguishes prefix and search matching semantics', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'prefixOk',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_prefix_match',
              standardLibrary: 'prefix-match',
              arguments: [
                { kind: 'literal', value: 'ab', type: 'string', span },
                { kind: 'literal', value: 'abcd', type: 'string', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'fullFail',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_full_match',
              standardLibrary: 'full-match',
              arguments: [
                { kind: 'literal', value: 'ab', type: 'string', span },
                { kind: 'literal', value: 'abcd', type: 'string', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'searchOk',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_search',
              standardLibrary: 'search',
              arguments: [
                { kind: 'literal', value: 'cd', type: 'string', span },
                { kind: 'literal', value: 'abcd', type: 'string', span },
                { kind: 'literal', value: 0, type: 'i32', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'searchMiss',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_search',
              standardLibrary: 'search',
              arguments: [
                { kind: 'literal', value: 'cd', type: 'string', span },
                { kind: 'literal', value: 'abcd', type: 'string', span },
                { kind: 'literal', value: 3, type: 'i32', span },
              ],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports;
    expect((exports.prefixOk as () => number)()).toBe(1);
    expect((exports.fullFail as () => number)()).toBe(0);
    expect((exports.searchOk as () => number)()).toBe(1);
    expect((exports.searchMiss as () => number)()).toBe(0);
  });

  it('returns capture start and end offsets from compiled bytecode', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'start',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_full_capture_start',
              standardLibrary: 'full-capture-start',
              arguments: [
                { kind: 'literal', value: String.raw`a(\d+)b`, type: 'string', span },
                { kind: 'literal', value: 'a123b', type: 'string', span },
                { kind: 'literal', value: 1, type: 'i32', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'end',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_full_capture_end',
              standardLibrary: 'full-capture-end',
              arguments: [
                { kind: 'literal', value: String.raw`a(\d+)b`, type: 'string', span },
                { kind: 'literal', value: 'a123b', type: 'string', span },
                { kind: 'literal', value: 1, type: 'i32', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'missing',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_full_capture_start',
              standardLibrary: 'full-capture-start',
              arguments: [
                { kind: 'literal', value: String.raw`a(\d+)b`, type: 'string', span },
                { kind: 'literal', value: 'axxb', type: 'string', span },
                { kind: 'literal', value: 1, type: 'i32', span },
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'searchStart',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'regex_search_capture_start',
              standardLibrary: 'search-capture-start',
              arguments: [
                { kind: 'literal', value: String.raw`(\d+)`, type: 'string', span },
                { kind: 'literal', value: 'xx42yy', type: 'string', span },
                { kind: 'literal', value: 0, type: 'i32', span },
                { kind: 'literal', value: 1, type: 'i32', span },
              ],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(wasmBytes(result), [0xfc, 0x0a, 0x00, 0x00])).toBeGreaterThanOrEqual(2);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports;
    expect((exports.start as () => number)()).toBe(1);
    expect((exports.end as () => number)()).toBe(4);
    expect((exports.missing as () => number)()).toBe(-1);
    expect((exports.searchStart as () => number)()).toBe(2);
  });

  it('executes deterministic string and byte helpers inside standalone WASM', () => {
    const functions: FlintWasmModule['functions'] = [
      {
        kind: 'function',
        name: 'length',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_length',
              standardLibrary: 'string-length',
              arguments: [literal('abc')],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'byte',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_byte_at',
              standardLibrary: 'string-byte-at',
              arguments: [literal('abc'), index32(1)],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'starts',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_starts_with',
              standardLibrary: 'string-starts-with',
              arguments: [literal('abcd'), literal('ab')],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'parsed',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_to_i32',
              standardLibrary: 'string-to-i32',
              arguments: [literal('-42')],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'sliceByte',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_byte_at',
              standardLibrary: 'string-byte-at',
              arguments: [
                {
                  kind: 'call',
                  callee: 'string_slice',
                  standardLibrary: 'string-slice',
                  arguments: [literal('abcd'), index32(1), index32(4)],
                  span,
                },
                index32(0),
              ],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'loop',
        exported: true,
        parameters: [{ name: 'limit', type: { name: 'i32', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          { kind: 'let', name: 'index', type: { name: 'i32', span }, value: index32(0), span },
          {
            kind: 'while',
            condition: {
              kind: 'binary',
              operator: '<',
              left: { kind: 'identifier', name: 'index', span },
              right: { kind: 'identifier', name: 'limit', span },
              span,
            },
            body: [
              {
                kind: 'assignment',
                name: 'index',
                value: {
                  kind: 'binary',
                  operator: '+',
                  left: { kind: 'identifier', name: 'index', span },
                  right: index32(1),
                  span,
                },
                span,
              },
            ],
            span,
          },
          { kind: 'return', value: { kind: 'identifier', name: 'index', span }, span },
        ],
      },
    ];
    const result = compileFlintWasm({
      ir: moduleWith(functions),
      optimizedIr: moduleWith(functions),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    expect(countInstruction(wasmBytes(result), [0xfc, 0x0a, 0x00, 0x00])).toBeGreaterThanOrEqual(2);
    expect(exports.length()).toBe(3);
    expect(exports.byte()).toBe(98);
    expect(exports.starts()).toBe(1);
    expect(exports.parsed()).toBe(-42);
    expect(exports.sliceByte()).toBe(98);
    expect(exports.loop(7)).toBe(7);
  });

  it('uses SIMD for long string prefix checks while preserving scalar tails', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'longMatch',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_starts_with',
              standardLibrary: 'string-starts-with',
              arguments: [literal('abcdefghijklmnopABCDEFGHIJKLMNOP'), literal('abcdefghijklmnopABCDEFGHIJKLMNOP')],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'longMismatch',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_starts_with',
              standardLibrary: 'string-starts-with',
              arguments: [literal('abcdefghijklmnopABCDEFGHIJKLMNOP'), literal('abcdefghijklmnopABCDEFGHIJKLMNOX')],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'shortTail',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_starts_with',
              standardLibrary: 'string-starts-with',
              arguments: [literal('abc'), literal('ab')],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { simd: true },
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(wasmBytes(result), [0xfd, 0x00, 0x00, 0x00])).toBeGreaterThanOrEqual(2);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    expect(exports.longMatch()).toBe(1);
    expect(exports.longMismatch()).toBe(0);
    expect(exports.shortTail()).toBe(1);
  });

  it('inlines pointer-length string length without a runtime call', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'length',
        exported: true,
        parameters: [{ name: 'value', type: { name: 'string', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'string_length',
              standardLibrary: 'string-length',
              arguments: [{ kind: 'identifier', name: 'value', span }],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(wasmBytes(result), [0x10, 0x02])).toBe(0);
    const instance = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    const memory = instance.memory as WebAssembly.Memory;
    const pointer = (instance.fws_alloc as (size: number) => number)(3);
    new Uint8Array(memory.buffer).set([1, 2, 3], pointer);
    expect(instance.length(pointer, 3)).toBe(3);
    expect(instance.length(pointer, 0)).toBe(0);
  });

  it('traps string helpers on invalid pointer-length and slice ranges', () => {
    const invalid = (
      callee: string,
      standardLibrary: 'string-length' | 'string-slice',
      arguments_: FlintWasmExpression[],
    ) => ({
      kind: 'function' as const,
      name: callee,
      exported: true,
      parameters: [],
      result: { name: standardLibrary === 'string-length' ? ('i32' as const) : ('string' as const), span },
      span,
      body: [
        {
          kind: 'return' as const,
          value: { kind: 'call' as const, callee, standardLibrary, arguments: arguments_, span },
          span,
        },
      ],
    });

    const module = moduleWith([
      invalid('badLength', 'string-length', [index32(0), index32(1)]),
      invalid('badSlice', 'string-slice', [literal('abc'), index32(3), index32(1)]),
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    expect(() => exports.badLength()).toThrow(WebAssembly.RuntimeError);
    expect(() => exports.badSlice()).toThrow(WebAssembly.RuntimeError);
  });

  it('emits bulk memory instructions for memory.copy and memory.fill and executes correctly', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'testBulkMemory',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          // fws_alloc(64)
          {
            kind: 'let',
            name: 'buf',
            type: { name: 'i32', span },
            value: {
              kind: 'call',
              callee: 'fws_alloc',
              standardLibrary: 'memory-alloc',
              arguments: [index32(64)],
              span,
            },
            span,
          },
          // memory-fill: dest=buf, val=42, size=16
          {
            kind: 'expression-statement',
            expression: {
              kind: 'call',
              callee: 'fws_memory_fill',
              standardLibrary: 'memory-fill',
              arguments: [{ kind: 'identifier', name: 'buf', span }, index32(42), index32(16)],
              span,
            },
            span,
          },
          // memory-copy: dest=buf+16, src=buf, size=16
          {
            kind: 'expression-statement',
            expression: {
              kind: 'call',
              callee: 'fws_memory_copy',
              standardLibrary: 'memory-copy',
              arguments: [
                {
                  kind: 'binary',
                  operator: '+',
                  left: { kind: 'identifier', name: 'buf', span },
                  right: index32(16),
                  span,
                },
                { kind: 'identifier', name: 'buf', span },
                index32(16),
              ],
              span,
            },
            span,
          },
          // return u32 at buf+16
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'fws_memory_load_u32',
              standardLibrary: 'memory-load-u32',
              arguments: [
                {
                  kind: 'binary',
                  operator: '+',
                  left: { kind: 'identifier', name: 'buf', span },
                  right: index32(16),
                  span,
                },
              ],
              span,
            },
            span,
          },
        ],
      },
    ]);

    const result = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('memory.fill');
    expect(result.wat).toContain('memory.copy');

    const instance = new WebAssembly.Instance(wasmModule(result), {});
    const testFunction = instance.exports.testBulkMemory as () => number;
    expect(testFunction()).toBe(0x2a_2a_2a_2a);
  });

  it('emits v128 SIMD vector instructions and executes them in WebAssembly runtime', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'testSimd',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          // let ptr = fws_alloc(32)
          {
            kind: 'let',
            name: 'ptr',
            type: { name: 'i32', span },
            value: {
              kind: 'call',
              callee: 'fws_alloc',
              standardLibrary: 'memory-alloc',
              arguments: [index32(32)],
              span,
            },
            span,
          },
          // v1 = simd-i8x16-splat(7)
          {
            kind: 'let',
            name: 'v1',
            type: { name: 'v128', span },
            value: {
              kind: 'call',
              callee: 'fws_simd_i8x16_splat',
              standardLibrary: 'simd-i8x16-splat',
              arguments: [index32(7)],
              span,
            },
            span,
          },
          // simd-v128-store(ptr, v1)
          {
            kind: 'expression-statement',
            expression: {
              kind: 'call',
              callee: 'fws_simd_v128_store',
              standardLibrary: 'simd-v128-store',
              arguments: [
                { kind: 'identifier', name: 'ptr', span },
                { kind: 'identifier', name: 'v1', span },
              ],
              span,
            },
            span,
          },
          // vLoaded = simd-v128-load(ptr)
          {
            kind: 'let',
            name: 'vLoaded',
            type: { name: 'v128', span },
            value: {
              kind: 'call',
              callee: 'fws_simd_v128_load',
              standardLibrary: 'simd-v128-load',
              arguments: [{ kind: 'identifier', name: 'ptr', span }],
              span,
            },
            span,
          },
          // vTarget = simd-i8x16-splat(7)
          {
            kind: 'let',
            name: 'vTarget',
            type: { name: 'v128', span },
            value: {
              kind: 'call',
              callee: 'fws_simd_i8x16_splat',
              standardLibrary: 'simd-i8x16-splat',
              arguments: [index32(7)],
              span,
            },
            span,
          },
          // vEq = simd-i8x16-eq(vLoaded, vTarget)
          {
            kind: 'let',
            name: 'vEq',
            type: { name: 'v128', span },
            value: {
              kind: 'call',
              callee: 'fws_simd_i8x16_eq',
              standardLibrary: 'simd-i8x16-eq',
              arguments: [
                { kind: 'identifier', name: 'vLoaded', span },
                { kind: 'identifier', name: 'vTarget', span },
              ],
              span,
            },
            span,
          },
          // mask = simd-i8x16-bitmask(vEq) -> should be 0xFFFF (65535)
          {
            kind: 'let',
            name: 'mask',
            type: { name: 'i32', span },
            value: {
              kind: 'call',
              callee: 'fws_simd_i8x16_bitmask',
              standardLibrary: 'simd-i8x16-bitmask',
              arguments: [{ kind: 'identifier', name: 'vEq', span }],
              span,
            },
            span,
          },
          {
            kind: 'return',
            value: { kind: 'identifier', name: 'mask', span },
            span,
          },
        ],
      },
    ]);

    const result = compileFlintWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      metadata: { ...metadata, targetFeatures: { simd: true } },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.targetFeatures.simd).toBe(true);
    expect(result.wat).toContain('i8x16.splat');
    expect(result.wat).toContain('v128.store');
    expect(result.wat).toContain('v128.load');
    expect(result.wat).toContain('i8x16.eq');
    expect(result.wat).toContain('i8x16.bitmask');

    const instance = new WebAssembly.Instance(wasmModule(result), {});
    const testFunction = instance.exports.testSimd as () => number;
    expect(testFunction()).toBe(0xff_ff);
  });
});
