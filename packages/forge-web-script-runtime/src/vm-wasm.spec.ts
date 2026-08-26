import { describe, expect, it } from 'vitest';

import { ForgeWebScriptTrap } from './traps.js';
import { compileForgeWebScriptVmWasm, prepareForgeWebScriptVmWasm } from './vm-wasm.js';
import { createForgeWebScriptVmExecutor } from './vm.js';

import type { ForgeWebScriptVmModule, ForgeWebScriptVmValue } from './vm.js';

const number = (value: number): ForgeWebScriptVmValue => ({ kind: 'number', type: 'i32', value });
const unsignedNumber = (value: number): ForgeWebScriptVmValue => ({ kind: 'number', type: 'u32', value });
const wideNumber = (value: bigint): ForgeWebScriptVmValue => ({ kind: 'number', type: 'i64', value });

const module: ForgeWebScriptVmModule = {
  format: 'forge-web-script-vm-module',
  version: '1.0',
  sourceHash: 'vm-wasm-test',
  constants: [number(40), number(2), unsignedNumber(0xff_ff_ff_ff), unsignedNumber(2)],
  aggregateLayouts: [{ name: 'Payload', kind: 'struct', size: 3, alignment: 1, fields: [], immutable: true }],
  specializations: [],
  capabilityImports: [{ name: 'now', capability: 'clock.now', parameters: [], result: 'i32' }],
  memory: {
    pageSize: 65_536,
    addressType: 'u32',
    allocatorExport: 'fws_alloc',
    deallocatorExport: 'fws_dealloc',
    reallocatorExport: 'fws_realloc',
  },
  functions: [
    {
      name: 'add',
      parameters: ['i32', 'i32'],
      result: 'i32',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'binary', operation: '+', destination: 2, left: 0, right: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
    {
      name: 'choose',
      parameters: ['bool', 'i32', 'i32'],
      result: 'i32',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'branch', condition: 0, ifTrue: 1, ifFalse: 2 },
        { opcode: 'return', source: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
    {
      name: 'move',
      parameters: ['i32'],
      result: 'i32',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'move', destination: 1, source: 0 },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'neg',
      parameters: ['i32'],
      result: 'i32',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'unary', operation: 'neg', destination: 1, operand: 0 },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'unsignedNeg',
      parameters: ['u32'],
      result: 'u32',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'unary', operation: 'neg', destination: 1, operand: 0 },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'wideNeg',
      parameters: ['i64'],
      result: 'i64',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'unary', operation: 'neg', destination: 1, operand: 0 },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'not',
      parameters: ['bool'],
      result: 'bool',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'unary', operation: 'not', destination: 1, operand: 0 },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'jump',
      parameters: [],
      result: 'i32',
      registers: 1,
      debugSpans: [],
      code: [
        { opcode: 'jump', target: 2 },
        { opcode: 'const', destination: 0, constant: 1 },
        { opcode: 'const', destination: 0, constant: 0 },
        { opcode: 'return', source: 0 },
      ],
    },
    {
      name: 'byteAt',
      parameters: ['Payload', 'i32'],
      result: 'i32',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'byte-at', destination: 2, source: 0, index: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
    {
      name: 'trap',
      parameters: [],
      result: 'unit',
      registers: 0,
      debugSpans: [],
      code: [{ opcode: 'trap', code: 'CustomTrap', message: 'boom' }],
    },
    {
      name: 'payloadLength',
      parameters: ['Payload'],
      result: 'i32',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'len', destination: 1, source: 0 },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'payloadEcho',
      parameters: ['Payload'],
      result: 'Payload',
      registers: 1,
      debugSpans: [],
      code: [{ opcode: 'return', source: 0 }],
    },
    {
      name: 'payloadCall',
      parameters: ['Payload'],
      result: 'Payload',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'call', destination: 1, functionName: 'payloadEcho', arguments: [0] },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'bytesEqual',
      parameters: ['bytes', 'bytes'],
      result: 'bool',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'binary', operation: '==', destination: 2, left: 0, right: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
    {
      name: 'memory',
      parameters: [],
      result: 'i32',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'const', constant: 0 },
        { opcode: 'store', address: 16, source: 0 },
        { opcode: 'load', destination: 1, address: 16, type: 'number', numberType: 'i32' },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'clock',
      parameters: [],
      result: 'i32',
      registers: 1,
      debugSpans: [],
      code: [
        { opcode: 'call-capability', destination: 0, importName: 'now', arguments: [] },
        { opcode: 'return', source: 0 },
      ],
    },
    {
      name: 'unsignedDivide',
      parameters: [],
      result: 'u32',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'const', destination: 0, constant: 2 },
        { opcode: 'const', destination: 1, constant: 3 },
        { opcode: 'binary', operation: '/', destination: 2, left: 0, right: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
  ],
};

describe('Forge Web Script VM WASM backend', () => {
  it('produces deterministic artifacts and matches numeric/control-flow execution', () => {
    const first = compileForgeWebScriptVmWasm(module, { compilerVersion: 'test' });
    const second = compileForgeWebScriptVmWasm(module, { compilerVersion: 'test' });
    expect(first).toEqual(second);
    const prepared = prepareForgeWebScriptVmWasm(first);
    expect(prepared.metadata.instancePolicy).toBe('reusable-with-reset');
    expect(prepared.instance.exports.fws_realloc).toBeTypeOf('function');
    const pointer = (prepared.instance.exports.fws_alloc as (size: number) => number)(4);
    expect(
      (prepared.instance.exports.fws_realloc as (pointer: number, oldSize: number, newSize: number) => number)(
        pointer,
        4,
        8,
      ),
    ).toBe(pointer);
    expect(prepared.execute('add', [number(40), number(2)]).value).toEqual(number(42));
    expect(prepared.execute('choose', [{ kind: 'bool', value: true }, number(1), number(2)]).value).toEqual(number(1));
    expect(prepared.execute('unsignedDivide', []).value).toEqual(unsignedNumber(2_147_483_647));
  });

  it('keeps VM-WASM realloc behavior aligned for tails, fallback copies, and traps', () => {
    const prepared = prepareForgeWebScriptVmWasm(module);
    const exports = prepared.instance.exports;
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
    expect(reallocate(tail, 4, 4)).toBe(tail);
    expect(reallocate(tail, 4, 0)).toBe(tail);
    expect(allocate(2)).toBe(tail);
    expect(() => reallocate(0, 1, 1)).toThrow(WebAssembly.RuntimeError);
    expect(() => reallocate(tail, 4, 0x7f_ff_ff_ff)).toThrow(WebAssembly.RuntimeError);
  });

  it('supports aggregate pointer-length values and resets allocation state between calls', () => {
    const prepared = prepareForgeWebScriptVmWasm(module);
    const first = prepared.execute('payloadLength', [
      { kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([1, 2, 3]), ownership: 'owned' },
    ]);
    const second = prepared.execute('payloadLength', [
      { kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([9]), ownership: 'owned' },
    ]);
    expect(first.value).toEqual(number(3));
    expect(second.value).toEqual(number(1));
    expect(
      prepared.execute('payloadCall', [
        { kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([4, 5]), ownership: 'owned' },
      ]).value,
    ).toEqual({ kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([4, 5]), ownership: 'owned' });
    expect(
      prepared.execute(
        'bytesEqual',
        [
          { kind: 'bytes', pointer: 0, length: 2, ownership: 'borrowed' },
          { kind: 'bytes', pointer: 2, length: 2, ownership: 'borrowed' },
        ],
        { memory: new Uint8Array([1, 2, 1, 2]) },
      ).value,
    ).toEqual({ kind: 'bool', value: true });
    expect(
      prepared.execute(
        'bytesEqual',
        [
          { kind: 'bytes', pointer: 0, length: 2, ownership: 'borrowed' },
          { kind: 'bytes', pointer: 2, length: 2, ownership: 'borrowed' },
        ],
        { memory: new Uint8Array([1, 2, 1, 3]) },
      ).value,
    ).toEqual({ kind: 'bool', value: false });
    expect(prepared.metadata.reproducibilityHash).toBe(prepared.artifact.reproducibilityHash);
  });

  it('matches interpreter semantics for move, unary, jump, byte-at, and trap instructions', () => {
    const prepared = prepareForgeWebScriptVmWasm(module);
    const interpreter = createForgeWebScriptVmExecutor();
    const executeBoth = (functionName: string, arguments_: readonly ForgeWebScriptVmValue[], memory?: Uint8Array) => {
      const options = memory === undefined ? undefined : { memory };
      const wasm = prepared.execute(functionName, arguments_, options);
      const interpreted = interpreter.execute(module, functionName, arguments_, { mode: 'interpret', memory });
      expect(wasm.value).toEqual(interpreted.value);
      return wasm.value;
    };

    expect(executeBoth('move', [number(9)])).toEqual(number(9));
    expect(executeBoth('neg', [number(7)])).toEqual(number(-7));
    expect(executeBoth('unsignedNeg', [unsignedNumber(7)])).toEqual(unsignedNumber(4_294_967_289));
    expect(executeBoth('wideNeg', [wideNumber(7n)])).toEqual(wideNumber(-7n));
    expect(executeBoth('not', [{ kind: 'bool', value: true }])).toEqual({ kind: 'bool', value: false });
    expect(executeBoth('jump', [])).toEqual(number(40));
    expect(
      executeBoth(
        'byteAt',
        [{ kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([4, 5, 6]), ownership: 'owned' }, number(1)],
        new Uint8Array([4, 5, 6]),
      ),
    ).toEqual(number(5));

    // eslint-disable-next-line unicorn/consistent-function-scoping -- This trap helper is specific to the parity case.
    const runTrap = (run: () => unknown): ForgeWebScriptTrap => {
      try {
        run();
      } catch (error) {
        if (error instanceof ForgeWebScriptTrap) return error;
        throw error;
      }
      throw new Error('expected a trap');
    };
    const wasmTrap = runTrap(() => prepared.execute('trap', []));
    const interpreterTrap = runTrap(() => interpreter.execute(module, 'trap', [], { mode: 'interpret' }));
    expect(wasmTrap).toMatchObject({ code: interpreterTrap.code, message: interpreterTrap.message });
    expect(wasmTrap.message).toBe('CustomTrap: boom');

    const wasmByteTrap = runTrap(() =>
      prepared.execute(
        'byteAt',
        [{ kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([4, 5]), ownership: 'owned' }, number(2)],
        new Uint8Array([4, 5]),
      ),
    );
    const interpreterByteTrap = runTrap(() =>
      interpreter.execute(
        module,
        'byteAt',
        [{ kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([4, 5]), ownership: 'owned' }, number(2)],
        { mode: 'interpret', memory: new Uint8Array([4, 5]) },
      ),
    );
    expect(wasmByteTrap).toMatchObject({ code: interpreterByteTrap.code, message: interpreterByteTrap.message });
  });

  it('binds declared capabilities and converts denied capabilities to traps', () => {
    const prepared = prepareForgeWebScriptVmWasm(module, { capabilities: { now: () => number(7) } });
    expect(prepared.execute('clock', []).value).toEqual(number(7));
    const denied = prepareForgeWebScriptVmWasm(module);
    expect(() => denied.execute('clock', [])).toThrowError(ForgeWebScriptTrap);
  });

  it('rejects malformed artifacts before instantiation', () => {
    const artifact = compileForgeWebScriptVmWasm(module);
    expect(() => prepareForgeWebScriptVmWasm({ ...artifact, wasm: new Uint8Array([0]) })).toThrowError(
      ForgeWebScriptTrap,
    );
    expect(() => prepareForgeWebScriptVmWasm({ ...artifact, reproducibilityHash: 'tampered' })).toThrowError(
      ForgeWebScriptTrap,
    );
  });

  it('preserves linear-memory reads and max-step traps', () => {
    const prepared = prepareForgeWebScriptVmWasm(module);
    expect(prepared.execute('memory', []).value).toEqual(number(40));
    expect(() => prepared.execute('memory', [], { maxSteps: 1 })).toThrowError(ForgeWebScriptTrap);
    prepared.reset();
    expect(prepared.execute('memory', []).value).toEqual(number(40));
  });
});
