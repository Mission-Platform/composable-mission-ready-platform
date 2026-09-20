import { describe, expect, it } from 'vitest';

import { optimizeFlintWasmModule } from './optimizer.js';

import type { FlintWasmModule, FlintWasmSourceSpan } from './contracts.js';

const span: FlintWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
const number = (value: number) => ({ kind: 'literal' as const, value, type: 'i32' as const, span });
const identifier = (name: string) => ({ kind: 'identifier' as const, name, span });

function moduleWith(
  body: FlintWasmModule['functions'][number]['body'],
  parameters: FlintWasmModule['functions'][number]['parameters'] = [],
): FlintWasmModule {
  return {
    kind: 'module',
    name: 'optimizer-spec',
    imports: [],
    sourceImports: [],
    functions: [
      { kind: 'function', name: 'run', exported: true, parameters, result: { name: 'i32', span }, body, span },
    ],
    span,
  };
}

function firstFunction(wasmModule: FlintWasmModule): FlintWasmModule['functions'][number] {
  const function_ = wasmModule.functions[0];
  if (function_ === undefined) throw new Error('Expected function at index 0');
  return function_;
}

describe('Forge Web Script Wasm-stage optimizer', () => {
  it('propagates constants and copies, removes pure dead statements, and keeps effects', () => {
    const optimized = optimizeFlintWasmModule(
      moduleWith(
        [
          { kind: 'let', name: 'base', type: { name: 'i32', span }, value: identifier('input'), span },
          { kind: 'let', name: 'copy', type: { name: 'i32', span }, value: identifier('base'), span },
          {
            kind: 'expression-statement',
            expression: { kind: 'binary', operator: '+', left: number(1), right: number(2), span },
            span,
          },
          {
            kind: 'return',
            value: { kind: 'binary', operator: '+', left: identifier('copy'), right: number(2), span },
            span,
          },
          {
            kind: 'expression-statement',
            expression: { kind: 'call', callee: 'afterReturn', arguments: [], span },
            span,
          },
        ],
        [{ name: 'input', type: { name: 'i32', span } }],
      ),
    );
    const body = firstFunction(optimized.module).body;
    expect(body).toHaveLength(3);
    expect(body[2]).toMatchObject({
      kind: 'return',
      value: { kind: 'binary', left: { kind: 'identifier', name: 'input' } },
    });
    expect(optimized.report.passes.find(({ name }) => name === 'copy-propagation')?.applied).toBeGreaterThan(0);
    expect(optimized.report.passes.find(({ name }) => name === 'dead-code-elimination')?.applied).toBe(1);
    expect(optimized.report.passes.find(({ name }) => name === 'unreachable-block-removal')?.applied).toBe(1);
  });

  it('invalidates aliases when an assigned local changes', () => {
    const optimized = optimizeFlintWasmModule(
      moduleWith(
        [
          {
            kind: 'let',
            name: 'high',
            type: { name: 'i32', span },
            value: { kind: 'binary', operator: '/', left: identifier('x'), right: number(128), span },
            span,
          },
          {
            kind: 'assignment',
            name: 'x',
            value: { kind: 'binary', operator: '%', left: identifier('x'), right: number(256), span },
            span,
          },
          { kind: 'return', value: identifier('high'), span },
        ],
        [{ name: 'x', type: { name: 'i32', span } }],
      ),
    );

    expect(firstFunction(optimized.module).body.at(-1)).toMatchObject({
      kind: 'return',
      value: { kind: 'identifier', name: 'high' },
    });
  });

  it('preserves loop-local aliases across assignments', () => {
    const optimized = optimizeFlintWasmModule(
      moduleWith(
        [
          {
            kind: 'while',
            condition: identifier('running'),
            body: [
              {
                kind: 'let',
                name: 'high',
                type: { name: 'i32', span },
                value: { kind: 'binary', operator: '/', left: identifier('x'), right: number(128), span },
                span,
              },
              {
                kind: 'assignment',
                name: 'x',
                value: { kind: 'binary', operator: '*', left: identifier('x'), right: number(2), span },
                span,
              },
              {
                kind: 'if',
                condition: { kind: 'binary', operator: '==', left: identifier('high'), right: number(1), span },
                consequent: [],
                span,
              },
            ],
            span,
          },
        ],
        [
          { name: 'running', type: { name: 'bool', span } },
          { name: 'x', type: { name: 'i32', span } },
        ],
      ),
    );

    expect(firstFunction(optimized.module).body[0]).toMatchObject({
      kind: 'while',
      body: [{}, {}, { kind: 'if', condition: { kind: 'binary', left: { kind: 'identifier', name: 'high' } } }],
    });
  });

  it('normalizes enum tags and selects dense or sparse dispatch deterministically', () => {
    const dense = optimizeFlintWasmModule({
      ...moduleWith([
        {
          kind: 'switch',
          value: identifier('tag'),
          cases: [
            { value: 2, body: [{ kind: 'return', value: number(2), span }] },
            { value: 3, body: [{ kind: 'return', value: number(3), span }] },
          ],
          defaultCase: [{ kind: 'return', value: number(0), span }],
          span,
        },
      ]),
      functions: [
        {
          ...firstFunction(moduleWith([])),
          parameters: [{ name: 'tag', type: { name: 'i32', span } }],
          body: firstFunction(
            moduleWith([
              {
                kind: 'switch',
                value: identifier('tag'),
                cases: [
                  { value: 2, body: [{ kind: 'return', value: number(2), span }] },
                  { value: 3, body: [{ kind: 'return', value: number(3), span }] },
                ],
                defaultCase: [{ kind: 'return', value: number(0), span }],
                span,
              },
            ]),
          ).body,
        },
      ],
    });
    const denseSwitch = firstFunction(dense.module).body[0];
    expect(denseSwitch).toMatchObject({ kind: 'switch', strategy: 'br-table' });

    const sparse = optimizeFlintWasmModule({
      ...dense.module,
      functions: [
        {
          ...firstFunction(dense.module),
          body: [
            {
              kind: 'switch',
              value: identifier('tag'),
              cases: [
                { value: 1, body: [{ kind: 'return', value: number(1), span }] },
                { value: 1000, body: [{ kind: 'return', value: number(1000), span }] },
              ],
              defaultCase: [{ kind: 'return', value: number(0), span }],
              span,
            },
          ],
        },
      ],
    });
    expect(firstFunction(sparse.module).body[0]).toMatchObject({ kind: 'switch', strategy: 'sparse' });
  });

  it('folds constant switches and puts exported functions before private functions', () => {
    const module = moduleWith([
      {
        kind: 'switch',
        value: number(7),
        cases: [{ value: 7, body: [{ kind: 'return', value: number(42), span }] }],
        defaultCase: [{ kind: 'return', value: number(0), span }],
        span,
      },
    ]);
    const optimized = optimizeFlintWasmModule({
      ...module,
      functions: [
        { ...firstFunction(module), name: 'public', exported: true },
        { ...firstFunction(module), name: 'private-z', exported: false },
        { ...firstFunction(module), name: 'private-a', exported: false },
      ],
    });
    expect(optimized.module.functions.map(({ name }) => name)).toEqual(['public', 'private-a', 'private-z']);
    expect(firstFunction(optimized.module).body).toMatchObject([
      { kind: 'return', value: { kind: 'literal', value: 42 } },
    ]);
  });

  it('folds i32 arithmetic with WebAssembly wrapping semantics', () => {
    const optimized = optimizeFlintWasmModule(
      moduleWith([
        {
          kind: 'return',
          value: {
            kind: 'binary',
            operator: '+',
            left: {
              kind: 'binary',
              operator: '*',
              left: number(216_613_626),
              right: number(16_777_619),
              span,
            },
            right: number(1),
            span,
          },
          span,
        },
      ]),
    );

    expect(firstFunction(optimized.module).body).toMatchObject([
      // eslint-disable-next-line unicorn/prefer-math-trunc -- Assertion models WebAssembly i32 wrapping.
      { kind: 'return', value: { kind: 'literal', value: (Math.imul(216_613_626, 16_777_619) + 1) | 0 } },
    ]);
  });
});
