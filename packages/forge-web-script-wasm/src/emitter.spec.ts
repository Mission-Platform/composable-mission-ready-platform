import { describe, expect, it } from 'vitest';

import { compileForgeWebScriptWasm } from './emitter.js';

import type {
  ForgeWebScriptWasmExpression,
  ForgeWebScriptWasmModule,
  ForgeWebScriptWasmSourceSpan,
} from './contracts.js';

const span: ForgeWebScriptWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };

function moduleWith(functions: ForgeWebScriptWasmModule['functions']): ForgeWebScriptWasmModule {
  return {
    kind: 'module',
    name: 'backend-spec',
    imports: [],
    sourceImports: [],
    functions,
    span,
  } as ForgeWebScriptWasmModule;
}

const metadata = { compilerVersion: 'test', optimization: 'debug' as const, sourceFiles: ['entry.fws'] };
const literal = (value: string) => ({ kind: 'literal' as const, value, type: 'string' as const, span });
const i32 = (value: number) => ({ kind: 'literal' as const, value, type: 'i32' as const, span });
const countInstruction = (bytes: Uint8Array, instruction: readonly number[]): number => {
  let count = 0;
  for (let index = 0; index <= bytes.length - instruction.length; index += 1) {
    if (instruction.every((byte, offset) => bytes[index + offset] === byte)) count += 1;
  }
  return count;
};

describe('Forge Web Script WASM backend', () => {
  it('emits valid deterministic bytes, WAT, and UTF-8 pointer-length literals', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'message',
        exported: true,
        parameters: [],
        result: { name: 'string', span },
        span,
        body: [{ kind: 'return', value: { kind: 'literal', value: 'hé', type: 'string', span }, span }],
      },
    ]);
    const input = { ir: module, optimizedIr: module, abi: {}, links: {}, metadata };
    const first = compileForgeWebScriptWasm(input);
    const second = compileForgeWebScriptWasm(input);
    expect(first.diagnostics).toHaveLength(0);
    expect(first.wasm).toBeDefined();
    expect(WebAssembly.validate(first.wasm!.buffer as ArrayBuffer)).toBe(true);
    expect(first.wasm).toEqual(second.wasm);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.wat).toContain('(result i32)');
  });

  it('exports a working realloc ABI function', () => {
    const module = moduleWith([]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wasm).toBeDefined();
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(exports.fws_realloc).toBeInstanceOf(Function);
    const pointer = exports.fws_alloc(4);
    const tail = exports.fws_alloc(4);
    new Uint8Array((exports.memory as WebAssembly.Memory).buffer).set([1, 2, 3, 4], pointer);
    expect(exports.fws_realloc(tail, 4, 2)).toBe(tail);
    const replacement = exports.fws_realloc(pointer, 4, 6);
    expect(replacement).not.toBe(pointer);
    expect(
      Array.from(new Uint8Array((exports.memory as WebAssembly.Memory).buffer).slice(replacement, replacement + 4)),
    ).toEqual([1, 2, 3, 4]);
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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    const memory = exports.memory as WebAssembly.Memory;
    expect(memory.buffer.byteLength).toBeGreaterThanOrEqual(2 * 65_536);
    expect(() => exports.fws_alloc(70_000)).not.toThrow();
    expect(memory.buffer.byteLength).toBeGreaterThanOrEqual(3 * 65_536);
  });

  it('lowers checked switch dispatch through br_table and routes out-of-range values to default', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'dispatch',
        exported: true,
        parameters: [{ name: 'value', type: { name: 'i32', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'switch',
            value: { kind: 'identifier', name: 'value', span },
            cases: [
              { value: 0, body: [{ kind: 'return', value: i32(10), span }] },
              { value: 2, body: [{ kind: 'return', value: i32(20), span }] },
            ],
            defaultCase: [{ kind: 'return', value: i32(-1), span }],
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('br_table');
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(exports.dispatch(0)).toBe(10);
    expect(exports.dispatch(2)).toBe(20);
    expect(exports.dispatch(1)).toBe(-1);
    expect(exports.dispatch(99)).toBe(-1);
  });

  it('lowers sparse switch dispatch through equality guards without a padded br_table', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'sparseDispatch',
        exported: true,
        parameters: [{ name: 'value', type: { name: 'i32', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'switch',
            value: { kind: 'identifier', name: 'value', span },
            cases: [
              { value: -100_000, body: [{ kind: 'return', value: i32(10), span }] },
              { value: 100_000, body: [{ kind: 'return', value: i32(20), span }] },
            ],
            defaultCase: [{ kind: 'return', value: i32(-1), span }],
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).not.toContain('br_table');
    expect(result.wat).toContain('i32.eq');
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(exports.sparseDispatch(-100_000)).toBe(10);
    expect(exports.sparseDispatch(100_000)).toBe(20);
    expect(exports.sparseDispatch(0)).toBe(-1);
  });

  it('emits balanced block/end structure for non-empty and empty switch statements', () => {
    // Non-empty switch: should have balanced blocks
    const nonEmptyModule = moduleWith([
      {
        kind: 'function',
        name: 'nonEmptySwitch',
        exported: true,
        parameters: [{ name: 'value', type: { name: 'i32', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'switch',
            value: { kind: 'identifier', name: 'value', span },
            cases: [{ value: 0, body: [{ kind: 'return', value: i32(42), span }] }],
            defaultCase: [{ kind: 'return', value: i32(-1), span }],
            span,
          },
        ],
      },
    ]);
    const nonEmptyResult = compileForgeWebScriptWasm({
      ir: nonEmptyModule,
      optimizedIr: nonEmptyModule,
      abi: {},
      links: {},
      metadata,
    });
    expect(nonEmptyResult.diagnostics).toEqual([]);
    // Verify that the WAT contains the expected switch structure with br_table
    expect(nonEmptyResult.wat).toContain('block ;; switch-exit');
    expect(nonEmptyResult.wat).toContain('block ;; switch-default');
    expect(nonEmptyResult.wat).toContain('br_table');
    // Count switch-exit and switch-default blocks to ensure they are closed
    const nonEmptyWat = nonEmptyResult.wat;
    const switchExitCount = (nonEmptyWat.match(/block ;; switch-exit/g) ?? []).length;
    const switchDefaultCount = (nonEmptyWat.match(/block ;; switch-default/g) ?? []).length;
    expect(switchExitCount).toBe(1);
    expect(switchDefaultCount).toBe(1);

    // Empty switch: should also have balanced blocks
    const emptyModule = moduleWith([
      {
        kind: 'function',
        name: 'emptySwitch',
        exported: true,
        parameters: [{ name: 'value', type: { name: 'i32', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'switch',
            value: { kind: 'identifier', name: 'value', span },
            cases: [],
            defaultCase: [
              { kind: 'expression-statement', expression: { kind: 'identifier', name: 'value', span }, span },
            ],
            span,
          },
          { kind: 'return', value: i32(-1), span },
        ],
      },
    ]);
    const emptyResult = compileForgeWebScriptWasm({
      ir: emptyModule,
      optimizedIr: emptyModule,
      abi: {},
      links: {},
      metadata,
    });
    expect(emptyResult.diagnostics).toEqual([]);
    // Verify that the WAT contains the expected switch structure without br_table
    expect(emptyResult.wat).toContain('block ;; switch-exit');
    expect(emptyResult.wat).toContain('block ;; switch-default');
    expect(emptyResult.wat).not.toContain('br_table');
    const emptyWat = emptyResult.wat;
    const emptyExitCount = (emptyWat.match(/block ;; switch-exit/g) ?? []).length;
    const emptyDefaultCount = (emptyWat.match(/block ;; switch-default/g) ?? []).length;
    expect(emptyExitCount).toBe(1);
    expect(emptyDefaultCount).toBe(1);
  });

  it('executes vector literal growth, indexed access, and bounds checking through runtime helpers', () => {
    const vectorType = { name: 'i32' as const, reference: 'Vector' as const, arguments: [{ name: 'i32' as const }] };
    const module = moduleWith([
      {
        kind: 'function',
        name: 'vectorValue',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'let',
            name: 'values',
            type: { ...vectorType, span },
            value: { kind: 'vector-literal', elements: [i32(7), i32(11)], type: { ...vectorType, span }, span },
            span,
          },
          {
            kind: 'return',
            value: {
              kind: 'index',
              receiver: { kind: 'identifier', name: 'values', span },
              index: i32(1),
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(countInstruction(result.wasm!, [0xfc, 0x0a, 0x00, 0x00])).toBeGreaterThanOrEqual(1);
    expect(exports.vectorValue()).toBe(11);
  });

  it('executes fixed-array initialization and indexed mutation with contiguous layout', () => {
    const arrayType = {
      name: 'i32' as const,
      reference: 'Array' as const,
      arguments: [{ name: 'i32' as const }],
      length: 2,
    };
    const module = moduleWith([
      {
        kind: 'function',
        name: 'arrayValue',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'let',
            name: 'values',
            type: { ...arrayType, span },
            value: { kind: 'array-literal', elements: [i32(3), i32(5)], type: { ...arrayType, span }, span },
            span,
          },
          { kind: 'assignment', name: 'values', index: i32(0), value: i32(9), span },
          {
            kind: 'return',
            value: { kind: 'index', receiver: { kind: 'identifier', name: 'values', span }, index: i32(0), span },
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(exports.arrayValue()).toBe(9);
  });

  it('inlines bounds-checked scalar collection access for array and vector handles', () => {
    const arrayType = { name: 'i32' as const, reference: 'Array' as const, arguments: [{ name: 'i32' as const }] };
    const vectorType = { name: 'i32' as const, reference: 'Vector' as const, arguments: [{ name: 'i32' as const }] };
    const module = moduleWith([
      {
        kind: 'function',
        name: 'arrayRead',
        exported: true,
        parameters: [
          { name: 'values', type: { ...arrayType, span } },
          { name: 'index', type: { name: 'i32', span } },
        ],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'index',
              receiver: { kind: 'identifier', name: 'values', span },
              index: { kind: 'identifier', name: 'index', span },
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'arrayWrite',
        exported: true,
        parameters: [
          { name: 'values', type: { ...arrayType, span } },
          { name: 'index', type: { name: 'i32', span } },
          { name: 'value', type: { name: 'i32', span } },
        ],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'assignment',
            name: 'values',
            index: { kind: 'identifier', name: 'index', span },
            value: { kind: 'identifier', name: 'value', span },
            span,
          },
          {
            kind: 'return',
            value: {
              kind: 'index',
              receiver: { kind: 'identifier', name: 'values', span },
              index: { kind: 'identifier', name: 'index', span },
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'vectorRead',
        exported: true,
        parameters: [
          { name: 'values', type: { ...vectorType, span } },
          { name: 'index', type: { name: 'i32', span } },
        ],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'index',
              receiver: { kind: 'identifier', name: 'values', span },
              index: { kind: 'identifier', name: 'index', span },
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'arrayLength',
        exported: true,
        parameters: [{ name: 'values', type: { ...arrayType, span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'array_length',
              standardLibrary: 'array-length',
              arguments: [{ kind: 'identifier', name: 'values', span }],
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'vectorLength',
        exported: true,
        parameters: [{ name: 'values', type: { ...vectorType, span } }],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'vector_length',
              standardLibrary: 'vector-length',
              arguments: [{ kind: 'identifier', name: 'values', span }],
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    const memory = exports.memory as WebAssembly.Memory;
    const allocate = exports.fws_alloc as (size: number) => number;
    const array = allocate(12);
    const arrayView = new DataView(memory.buffer, array, 12);
    arrayView.setInt32(0, 2, true);
    arrayView.setInt32(4, 17, true);
    arrayView.setInt32(8, 23, true);
    const vectorData = allocate(8);
    const vectorDataView = new DataView(memory.buffer, vectorData, 8);
    vectorDataView.setInt32(0, 31, true);
    vectorDataView.setInt32(4, 47, true);
    const vector = allocate(12);
    const vectorView = new DataView(memory.buffer, vector, 12);
    vectorView.setInt32(0, vectorData, true);
    vectorView.setInt32(4, 2, true);
    vectorView.setInt32(8, 2, true);
    expect(exports.arrayRead(array, 1)).toBe(23);
    expect(exports.arrayWrite(array, 0, 19)).toBe(19);
    expect(exports.arrayRead(array, 0)).toBe(19);
    expect(exports.vectorRead(vector, 1)).toBe(47);
    expect(exports.arrayLength(array)).toBe(2);
    expect(exports.vectorLength(vector)).toBe(2);
    expect(() => exports.arrayRead(array, 2)).toThrow(WebAssembly.RuntimeError);
    expect(() => exports.vectorRead(vector, -1)).toThrow(WebAssembly.RuntimeError);
  });

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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(result.wasm!, [0x2d, 0x00, 0x00])).toBeGreaterThan(5);
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
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

  it('validates target profiles and emits shared-memory modules only when enabled', () => {
    const module = { ...moduleWith([]), featureRequirements: { threads: true, atomics: true } };
    const denied = compileForgeWebScriptWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { threads: true },
      metadata,
    });
    expect(denied.wasm).toBeUndefined();
    expect(denied.diagnostics.map(({ code }) => code)).toContain('FWS-FEATURE-001');

    const enabled = compileForgeWebScriptWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { threads: true, atomics: true },
      metadata,
    });
    expect(enabled.diagnostics).toEqual([]);
    expect(enabled.wat).toContain('(memory (export "memory") 1 1 shared)');
    expect(WebAssembly.validate(enabled.wasm!.buffer as ArrayBuffer)).toBe(true);
  });

  it('returns deterministic optimized and unoptimized debug artifacts', () => {
    const makeModule = (value: number): ForgeWebScriptWasmModule =>
      moduleWith([
        {
          kind: 'function',
          name: 'answer',
          exported: true,
          parameters: [],
          result: { name: 'i32', span },
          span,
          body: [{ kind: 'return', value: i32(value), span }],
        },
      ]);
    const result = compileForgeWebScriptWasm({
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
    const result = compileForgeWebScriptWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      targetFeatures: { memory64: true },
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('(memory (export "memory") i64 1)');
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
  });

  it('emits valid scalar functions alongside the runtime memory helpers', () => {
    const result = compileForgeWebScriptWasm({
      ir: moduleWith([
        {
          kind: 'function',
          name: 'answer',
          exported: true,
          parameters: [],
          result: { name: 'i32', span },
          span,
          body: [{ kind: 'return', value: { kind: 'literal', value: 42, type: 'i32', span }, span }],
        },
      ]),
      optimizedIr: moduleWith([
        {
          kind: 'function',
          name: 'answer',
          exported: true,
          parameters: [],
          result: { name: 'i32', span },
          span,
          body: [{ kind: 'return', value: { kind: 'literal', value: 42, type: 'i32', span }, span }],
        },
      ]),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
  });

  it('emits scalar parameters and binary expressions', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'add',
        exported: true,
        parameters: [
          { name: 'left', type: { name: 'i32', span } },
          { name: 'right', type: { name: 'i32', span } },
        ],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'binary',
              operator: '+',
              left: { kind: 'identifier', name: 'left', span },
              right: { kind: 'identifier', name: 'right', span },
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
  });

  it('short-circuits logical expressions with result-producing Wasm control flow', () => {
    const divisionByZero: ForgeWebScriptWasmExpression = {
      kind: 'binary',
      operator: '/',
      left: i32(1),
      right: i32(0),
      span,
    };
    const module = moduleWith([
      {
        kind: 'function',
        name: 'andGuard',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'binary',
              operator: '&&',
              left: { kind: 'literal', value: false, type: 'bool', span },
              right: divisionByZero,
              span,
            },
            span,
          },
        ],
      },
      {
        kind: 'function',
        name: 'orGuard',
        exported: true,
        parameters: [],
        result: { name: 'bool', span },
        span,
        body: [
          {
            kind: 'return',
            value: {
              kind: 'binary',
              operator: '||',
              left: { kind: 'literal', value: true, type: 'bool', span },
              right: divisionByZero,
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('if (result i32)');
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(exports.andGuard()).toBe(0);
    expect(exports.orGuard()).toBe(1);
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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wasm).toBeDefined();
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports;
    expect(Object.keys(exports).sort()).toEqual([
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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports;
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
                { kind: 'literal', value: 'a(\\d+)b', type: 'string', span },
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
                { kind: 'literal', value: 'a(\\d+)b', type: 'string', span },
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
                { kind: 'literal', value: 'a(\\d+)b', type: 'string', span },
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
                { kind: 'literal', value: '(\\d+)', type: 'string', span },
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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(result.wasm!, [0xfc, 0x0a, 0x00, 0x00])).toBeGreaterThanOrEqual(2);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports;
    expect((exports.start as () => number)()).toBe(1);
    expect((exports.end as () => number)()).toBe(4);
    expect((exports.missing as () => number)()).toBe(-1);
    expect((exports.searchStart as () => number)()).toBe(2);
  });

  it('suppresses executable output when a non-unit path is missing a return', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'missing',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.wasm).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['FWS-CFG-001']);
  });

  it('executes deterministic string and byte helpers inside standalone WASM', () => {
    const functions: ForgeWebScriptWasmModule['functions'] = [
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
              arguments: [literal('abc'), i32(1)],
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
                  arguments: [literal('abcd'), i32(1), i32(4)],
                  span,
                },
                i32(0),
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
          { kind: 'let', name: 'index', type: { name: 'i32', span }, value: i32(0), span },
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
                  right: i32(1),
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
    const result = compileForgeWebScriptWasm({
      ir: moduleWith(functions),
      optimizedIr: moduleWith(functions),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(countInstruction(result.wasm!, [0xfc, 0x0a, 0x00, 0x00])).toBeGreaterThanOrEqual(2);
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
    const result = compileForgeWebScriptWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { simd: true },
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(result.wasm!, [0xfd, 0x00, 0x00, 0x00])).toBeGreaterThanOrEqual(2);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
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
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(countInstruction(result.wasm!, [0x10, 0x02])).toBe(0);
    const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
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
      args: ForgeWebScriptWasmExpression[],
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
          value: { kind: 'call' as const, callee, standardLibrary, arguments: args, span },
          span,
        },
      ],
    });
    const module = moduleWith([
      invalid('badLength', 'string-length', [i32(0), i32(1)]),
      invalid('badSlice', 'string-slice', [literal('abc'), i32(3), i32(1)]),
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      Function
    >;
    expect(() => exports.badLength()).toThrow(WebAssembly.RuntimeError);
    expect(() => exports.badSlice()).toThrow(WebAssembly.RuntimeError);
  });

  it('lowers iterator functions to factory/next state machines without crashing', () => {
    const module = {
      ...moduleWith([
        {
          kind: 'function' as const,
          name: 'values',
          exported: true,
          iterable: true,
          parameters: [
            {
              name: 'source',
              type: {
                name: 'unit' as const,
                reference: 'Iterator',
                arguments: [{ name: 'i32' as const, span }],
                span,
              } as never,
            },
          ],
          result: {
            name: 'unit' as const,
            reference: 'Iterator',
            arguments: [{ name: 'i32' as const, span }],
            span,
          } as never,
          span,
          body: [
            {
              kind: 'iterator-loop' as const,
              binding: 'next',
              iterator: {
                kind: 'call' as const,
                callee: 'source.next',
                arguments: [],
                span,
              },
              body: [
                {
                  kind: 'yield' as const,
                  value: { kind: 'identifier' as const, name: 'next', span },
                  span,
                },
              ],
              state: 0,
              span,
            },
          ],
        },
        {
          kind: 'function' as const,
          name: 'one',
          exported: true,
          iterable: true,
          parameters: [],
          result: {
            name: 'unit' as const,
            reference: 'Iterator',
            arguments: [{ name: 'i32' as const, span }],
            span,
          } as never,
          span,
          body: [{ kind: 'yield' as const, value: i32(1), span }],
        },
      ]),
      iteratorDescriptors: [
        {
          id: 'values',
          generic: 'Iterator',
          elementType: 'i32',
          nextFunction: 'values.next',
          representation: 'descriptor-boundary' as const,
          ownership: 'borrowed' as const,
        },
        {
          id: 'one',
          generic: 'Iterator',
          elementType: 'i32',
          nextFunction: 'one.next',
          representation: 'descriptor-boundary' as const,
          ownership: 'borrowed' as const,
        },
      ],
    };
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics.map(({ code, message }) => `${code}:${message}`)).toEqual([]);
    expect(result.diagnostics.some(({ code }) => code === 'FWS-EMIT-001')).toBe(false);
    expect(result.wasm).toBeDefined();
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
    expect(result.iteratorExports).toEqual([
      expect.objectContaining({ name: 'values', nextFunction: 'values.next', elementType: 'i32' }),
      expect.objectContaining({ name: 'one', nextFunction: 'one.next', elementType: 'i32' }),
    ]);
    expect(result.wat).toContain(';; iterator-export: values next=values.next');
    expect(result.wat).toContain('(func $one.next');
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      CallableFunction
    >;
    expect(typeof exports.values).toBe('function');
    expect(typeof exports['values.next']).toBe('function');
    expect(exports.one()).toBe(0);
    expect(exports['one.next'](0)).toBe(1n);
    expect(exports['one.next'](1)).toBe(0x1_0000_0000n);
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
    const denied = compileForgeWebScriptWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      metadata,
    });
    expect(denied.wasm).toBeUndefined();
    expect(denied.diagnostics.map(({ code }) => code)).toContain('FWS-FEATURE-001');

    const result = compileForgeWebScriptWasm({
      ir: module,
      optimizedIr: module,
      abi: {},
      links: {},
      targetFeatures: { threads: true, atomics: true },
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('i32.atomic.rmw.add');
    expect(WebAssembly.validate(result.wasm!.buffer as ArrayBuffer)).toBe(true);
  });

  it('traps allocator overflow and deallocation outside the owned memory range', () => {
    const result = compileForgeWebScriptWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports;
    const allocate = exports.fws_alloc as (size: number) => number;
    const deallocate = exports.fws_dealloc as (pointer: number, size: number) => void;

    expect(allocate(0)).toBe(1024);
    expect(() => allocate(0xff_ff_ff_ff)).toThrow(WebAssembly.RuntimeError);
    expect(() => deallocate(0, 1)).toThrow(WebAssembly.RuntimeError);
    expect(() => deallocate(1024, 0x00_01_00_00)).toThrow(WebAssembly.RuntimeError);
  });

  it('reallocates tails in place, copies non-tail prefixes, and traps invalid ranges', () => {
    const result = compileForgeWebScriptWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      metadata,
    });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports;
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
    const result = compileForgeWebScriptWasm({
      ir: moduleWith([]),
      optimizedIr: moduleWith([]),
      abi: {},
      links: {},
      metadata,
    });
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports;
    const allocate = exports.fws_alloc as (size: number) => number;
    const reset = exports.fws_reset as () => void;

    expect(allocate(8)).toBe(1024);
    expect(allocate(8)).toBe(1032);
    reset();
    expect(allocate(8)).toBe(1024);
  });
  it('elides bounds check for proven-safe indexed reads, but retains it for required/writes', () => {
    const arrType = { name: 'i32' as const, reference: 'Array' as const, length: 2, span };

    // Helper: create a read module with identical structure but different boundsCheck.
    // Both use identical export names to isolate the boundsCheck difference.
    const createReadModule = (exportName: string, boundsCheck: 'proven-safe' | 'required') =>
      moduleWith([
        {
          kind: 'function',
          name: exportName,
          exported: true,
          parameters: [],
          result: { name: 'i32', span },
          span,
          body: [
            {
              kind: 'let',
              name: 'arr',
              type: arrType,
              value: { kind: 'array-literal', elements: [i32(10), i32(20)], type: arrType, span },
              span,
            },
            {
              kind: 'return',
              value: {
                kind: 'index',
                receiver: { kind: 'identifier', name: 'arr', span },
                index: { ...i32(0), kind: 'literal', span },
                boundsCheck,
                span,
              },
              span,
            },
          ],
        },
      ]);

    // Helper: create a write function that accepts an index parameter.
    // This allows testing both in-range and out-of-range writes.
    const createWriteFunction = (exportName: string) =>
      moduleWith([
        {
          kind: 'function',
          name: exportName,
          exported: true,
          parameters: [{ kind: 'parameter', name: 'index', type: { name: 'i32', span }, span }],
          result: { name: 'i32', span },
          span,
          body: [
            {
              kind: 'let',
              name: 'arr',
              type: arrType,
              value: { kind: 'array-literal', elements: [i32(10), i32(20)], type: arrType, span },
              span,
            },
            {
              kind: 'assignment',
              name: 'arr',
              index: { kind: 'identifier', name: 'index', span },
              value: i32(99),
              span,
            },
            { kind: 'return', value: i32(0), span },
          ],
        },
      ]);

    const compile = (module: ForgeWebScriptWasmModule) =>
      compileForgeWebScriptWasm({
        ir: module,
        optimizedIr: module,
        abi: {},
        links: {},
        metadata: { ...metadata, optimization: 'release' },
      });

    // Test 1: Proven-safe read vs required read
    const moduleSafe = createReadModule('readA', 'proven-safe');
    const moduleRequired = createReadModule('readA', 'required');
    const resultSafe = compile(moduleSafe);
    const resultRequired = compile(moduleRequired);

    expect(resultSafe.diagnostics).toHaveLength(0);
    expect(resultRequired.diagnostics).toHaveLength(0);

    // Proven-safe should be strictly smaller than required (elision effect only)
    expect(resultSafe.wasm!.length).toBeLessThan(resultRequired.wasm!.length);

    // Test 2: Write retains check via behavioral test with invalid index
    const moduleWrite = createWriteFunction('writeTest');
    const resultWrite = compile(moduleWrite);
    expect(resultWrite.diagnostics).toHaveLength(0);

    const instance = new WebAssembly.Instance(new WebAssembly.Module(resultWrite.wasm!), {});
    const writeTest = instance.exports.writeTest as (index: number) => number;

    // In-range write (index 0 or 1 for a 2-element array) should succeed
    expect(() => writeTest(0)).not.toThrow();
    expect(() => writeTest(1)).not.toThrow();

    // Out-of-range write (index 2 equals the logical length) should throw RuntimeError
    expect(() => writeTest(2)).toThrow(WebAssembly.RuntimeError);
  });
});
