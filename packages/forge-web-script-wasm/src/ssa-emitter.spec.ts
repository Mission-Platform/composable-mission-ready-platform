import { describe, expect, it } from 'vitest';

import { compileForgeWebScriptWasm } from './emitter.js';

import type { ForgeWebScriptWasmModule, ForgeWebScriptWasmSourceSpan } from './contracts.js';

const span: ForgeWebScriptWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
const index32 = (value: number) => ({ kind: 'literal' as const, value, type: 'i32' as const, span });
const identifier = (name: string) => ({ kind: 'identifier' as const, name, span });

function moduleWith(functions: ForgeWebScriptWasmModule['functions']): ForgeWebScriptWasmModule {
  return { kind: 'module', name: 'ssa-emitter', imports: [], sourceImports: [], functions, span };
}

const metadata = { compilerVersion: 'test', optimization: 'debug' as const, sourceFiles: ['ssa.fws'] };

describe('Forge Web Script CFG/SSA emitter integration', () => {
  it('materializes scalar phi copies on both if branches', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'branchValue',
        exported: true,
        parameters: [{ name: 'condition', type: { name: 'bool', span } }],
        result: { name: 'i32', span },
        span,
        body: [
          { kind: 'let', name: 'value', type: { name: 'i32', span }, value: index32(0), span },
          {
            kind: 'if',
            condition: identifier('condition'),
            consequent: [{ kind: 'assignment', name: 'value', value: index32(10), span }],
            alternate: [{ kind: 'assignment', name: 'value', value: index32(20), span }],
            span,
          },
          { kind: 'return', value: identifier('value'), span },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      (condition: number) => number
    >;
    expect(exports.branchValue(0)).toBe(20);
    expect(exports.branchValue(1)).toBe(10);
  });

  it('materializes loop-carried scalar values through the header and backedge', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'loopValue',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          { kind: 'let', name: 'value', type: { name: 'i32', span }, value: index32(0), span },
          {
            kind: 'while',
            condition: {
              kind: 'binary',
              operator: '<',
              left: identifier('value'),
              right: index32(3),
              span,
            },
            body: [
              {
                kind: 'assignment',
                name: 'value',
                value: { kind: 'binary', operator: '+', left: identifier('value'), right: index32(1), span },
                span,
              },
            ],
            span,
          },
          { kind: 'return', value: identifier('value'), span },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      () => number
    >;
    expect(exports.loopValue()).toBe(3);
  });

  it('keeps the loop backedge stable when its counter is reassigned after the loop', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'reassignedLoopValue',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          { kind: 'let', name: 'value', type: { name: 'i32', span }, value: index32(0), span },
          {
            kind: 'while',
            condition: {
              kind: 'binary',
              operator: '<',
              left: identifier('value'),
              right: index32(3),
              span,
            },
            body: [
              {
                kind: 'assignment',
                name: 'value',
                value: { kind: 'binary', operator: '+', left: identifier('value'), right: index32(1), span },
                span,
              },
            ],
            span,
          },
          { kind: 'assignment', name: 'value', value: index32(7), span },
          { kind: 'return', value: identifier('value'), span },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      () => number
    >;
    expect(exports.reassignedLoopValue()).toBe(7);
  });

  it('keeps a for initializer before the loop header phi', () => {
    const module = moduleWith([
      {
        kind: 'function',
        name: 'forValue',
        exported: true,
        parameters: [],
        result: { name: 'i32', span },
        span,
        body: [
          {
            kind: 'for',
            initializer: { kind: 'let', name: 'value', type: { name: 'i32', span }, value: index32(0), span },
            condition: {
              kind: 'binary',
              operator: '<',
              left: identifier('value'),
              right: index32(3),
              span,
            },
            update: {
              kind: 'assignment',
              name: 'value',
              value: { kind: 'binary', operator: '+', left: identifier('value'), right: index32(1), span },
              span,
            },
            body: [],
            span,
          },
          { kind: 'return', value: identifier('value'), span },
        ],
      },
    ]);
    const result = compileForgeWebScriptWasm({ ir: module, optimizedIr: module, abi: {}, links: {}, metadata });
    expect(result.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(result.wasm!), {}).exports as Record<
      string,
      () => number
    >;
    expect(exports.forValue()).toBe(3);
  });
});
