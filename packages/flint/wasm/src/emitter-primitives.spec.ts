import { describe, expect, it } from 'vitest';

import { countInstruction, index32, metadata, moduleWith, span, wasmBytes, wasmModule } from './emitter-fixtures.js';
import { compileFlintWasm } from './emitter.js';

import type { FlintWasmModule, FlintWasmPrimitiveType } from './contracts.js';

describe('Flint WASM Emitter Primitives', () => {
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
    const first = compileFlintWasm(input);
    const second = compileFlintWasm(input);
    expect(first.diagnostics).toHaveLength(0);
    expect(first.wasm).toBeDefined();
    expect(WebAssembly.validate(wasmBytes(first).buffer as ArrayBuffer)).toBe(true);
    expect(first.wasm).toEqual(second.wasm);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.wat).toContain('(result i32)');
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
              { value: 0, body: [{ kind: 'return', value: index32(10), span }] },
              { value: 2, body: [{ kind: 'return', value: index32(20), span }] },
            ],
            defaultCase: [{ kind: 'return', value: index32(-1), span }],
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('br_table');
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
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
              { value: -100_000, body: [{ kind: 'return', value: index32(10), span }] },
              { value: 100_000, body: [{ kind: 'return', value: index32(20), span }] },
            ],
            defaultCase: [{ kind: 'return', value: index32(-1), span }],
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).not.toContain('br_table');
    expect(result.wat).toContain('i32.eq');
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
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
            cases: [{ value: 0, body: [{ kind: 'return', value: index32(42), span }] }],
            defaultCase: [{ kind: 'return', value: index32(-1), span }],
            span,
          },
        ],
      },
    ]);
    const nonEmptyResult = compileFlintWasm({
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
          { kind: 'return', value: index32(-1), span },
        ],
      },
    ]);
    const emptyResult = compileFlintWasm({
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
            value: { kind: 'vector-literal', elements: [index32(7), index32(11)], type: { ...vectorType, span }, span },
            span,
          },
          {
            kind: 'return',
            value: {
              kind: 'index',
              receiver: { kind: 'identifier', name: 'values', span },
              index: index32(1),
              span,
            },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    expect(countInstruction(wasmBytes(result), [0xfc, 0x0a, 0x00, 0x00])).toBeGreaterThanOrEqual(1);
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
            value: { kind: 'array-literal', elements: [index32(3), index32(5)], type: { ...arrayType, span }, span },
            span,
          },
          { kind: 'assignment', name: 'values', index: index32(0), value: index32(9), span },
          {
            kind: 'return',
            value: { kind: 'index', receiver: { kind: 'identifier', name: 'values', span }, index: index32(0), span },
            span,
          },
        ],
      },
    ]);
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
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
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
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

  it('emits valid scalar functions alongside the runtime memory helpers', () => {
    const result = compileFlintWasm({
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
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
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
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
  });

  it('short-circuits logical expressions with result-producing Wasm control flow', () => {
    const divisionByZero: FlintWasmExpression = {
      kind: 'binary',
      operator: '/',
      left: index32(1),
      right: index32(0),
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
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    expect(result.wat).toContain('if (result i32)');
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, Function>;
    expect(exports.andGuard()).toBe(0);
    expect(exports.orGuard()).toBe(1);
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
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.wasm).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['FLINT-CFG-001']);
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
          body: [{ kind: 'yield' as const, value: index32(1), span }],
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
    const result = compileFlintWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics.map(({ code, message }) => `${code}:${message}`)).toEqual([]);
    expect(result.diagnostics.some(({ code }) => code === 'FLINT-EMIT-001')).toBe(false);
    expect(result.wasm).toBeDefined();
    expect(WebAssembly.validate(wasmBytes(result).buffer as ArrayBuffer)).toBe(true);
    expect(result.iteratorExports).toEqual([
      expect.objectContaining({ name: 'values', nextFunction: 'values.next', elementType: 'i32' }),
      expect.objectContaining({ name: 'one', nextFunction: 'one.next', elementType: 'i32' }),
    ]);
    expect(result.wat).toContain(';; iterator-export: values next=values.next');
    expect(result.wat).toContain('(func $one.next');
    const exports = new WebAssembly.Instance(wasmModule(result), {}).exports as Record<string, CallableFunction>;
    expect(typeof exports.values).toBe('function');
    expect(typeof exports['values.next']).toBe('function');
    expect(exports.one()).toBe(0);
    expect(exports['one.next'](0)).toBe(1n);
    expect(exports['one.next'](1)).toBe(0x1_00_00_00_00n);
  });

  it('elides bounds check for proven-safe indexed reads, but retains it for required/writes', () => {
    const arrayType = { name: 'i32' as const, reference: 'Array' as const, length: 2, span };

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
              type: arrayType,
              value: { kind: 'array-literal', elements: [index32(10), index32(20)], type: arrayType, span },
              span,
            },
            {
              kind: 'return',
              value: {
                kind: 'index',
                receiver: { kind: 'identifier', name: 'arr', span },
                index: { ...index32(0), kind: 'literal', span },
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
              type: arrayType,
              value: { kind: 'array-literal', elements: [index32(10), index32(20)], type: arrayType, span },
              span,
            },
            {
              kind: 'assignment',
              name: 'arr',
              index: { kind: 'identifier', name: 'index', span },
              value: index32(99),
              span,
            },
            { kind: 'return', value: index32(0), span },
          ],
        },
      ]);

    const compile = (module: FlintWasmModule) =>
      compileFlintWasm({
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
    expect(wasmBytes(resultSafe).length).toBeLessThan(wasmBytes(resultRequired).length);

    // Test 2: Write retains check via behavioral test with invalid index
    const moduleWrite = createWriteFunction('writeTest');
    const resultWrite = compile(moduleWrite);
    expect(resultWrite.diagnostics).toHaveLength(0);

    const instance = new WebAssembly.Instance(wasmModule(resultWrite), {});
    const writeTest = instance.exports.writeTest as (index: number) => number;

    // In-range write (index 0 or 1 for a 2-element array) should succeed
    expect(() => writeTest(0)).not.toThrow();
    expect(() => writeTest(1)).not.toThrow();

    // Out-of-range write (index 2 equals the logical length) should throw RuntimeError
    expect(() => writeTest(2)).toThrow(WebAssembly.RuntimeError);
  });

  it('emits type-accurate WebAssembly load opcodes for typed pointer dereference', () => {
    const span = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
    const createDerefModule = (
      name: string,
      pointeeType: string,
      resultType: FlintWasmPrimitiveType,
    ): FlintWasmModule => ({
      name: `deref_${name}`,
      span,
      functions: [
        {
          name: `deref_${name}`,
          exported: true,
          parameters: [
            {
              name: 'ptr',
              type: {
                name: 'i32',
                reference: 'CPtr',
                arguments: [{ name: pointeeType as FlintWasmPrimitiveType }],
              },
            },
          ],
          result: { name: resultType },
          body: [
            {
              kind: 'return',
              value: {
                kind: 'unary',
                operator: '*',
                operand: { kind: 'identifier', name: 'ptr', span },
                span,
              },
              span,
            },
          ],
          span,
        },
      ],
      imports: [],
    });

    // f32: should emit opcode 0x2a (f32.load)
    const f32Module = createDerefModule('f32', 'f32', 'f32');
    const f32Result = compileFlintWasm({ ir: f32Module, optimizedIr: f32Module, abi: {}, links: {}, metadata });
    expect(f32Result.diagnostics).toEqual([]);
    expect([...(f32Result.wasm ?? [])]).toContain(0x2a);

    // f64: should emit opcode 0x2b (f64.load)
    const f64Module = createDerefModule('f64', 'f64', 'f64');
    const f64Result = compileFlintWasm({ ir: f64Module, optimizedIr: f64Module, abi: {}, links: {}, metadata });
    expect(f64Result.diagnostics).toEqual([]);
    expect([...(f64Result.wasm ?? [])]).toContain(0x2b);

    // i64: should emit opcode 0x29 (i64.load)
    const int64Module = createDerefModule('i64', 'i64', 'i64');
    const int64Result = compileFlintWasm({ ir: int64Module, optimizedIr: int64Module, abi: {}, links: {}, metadata });
    expect(int64Result.diagnostics).toEqual([]);
    expect([...(int64Result.wasm ?? [])]).toContain(0x29);

    // i32: should emit opcode 0x28 (i32.load)
    const int32Module = createDerefModule('i32', 'i32', 'i32');
    const int32Result = compileFlintWasm({ ir: int32Module, optimizedIr: int32Module, abi: {}, links: {}, metadata });
    expect(int32Result.diagnostics).toEqual([]);
    expect([...(int32Result.wasm ?? [])]).toContain(0x28);
  });
});
