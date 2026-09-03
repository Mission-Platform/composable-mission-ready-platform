import { describe, expect, it } from 'vitest';

import { optimizeForgeWebScriptWasmModule } from './optimizer.js';

import type { ForgeWebScriptWasmModule, ForgeWebScriptWasmSourceSpan } from './contracts.js';

const span: ForgeWebScriptWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
const number = (value: number) => ({ kind: 'literal' as const, value, type: 'i32' as const, span });
const identifier = (name: string) => ({ kind: 'identifier' as const, name, span });

function moduleWith(
  body: ForgeWebScriptWasmModule['functions'][number]['body'],
  parameters: ForgeWebScriptWasmModule['functions'][number]['parameters'] = [],
): ForgeWebScriptWasmModule {
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

describe('Forge Web Script Wasm-stage optimizer', () => {
  it('propagates constants and copies, removes pure dead statements, and keeps effects', () => {
    const optimized = optimizeForgeWebScriptWasmModule(
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
    const body = optimized.module.functions[0]!.body;
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
    const optimized = optimizeForgeWebScriptWasmModule(
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

    expect(optimized.module.functions[0]!.body.at(-1)).toMatchObject({
      kind: 'return',
      value: { kind: 'identifier', name: 'high' },
    });
  });

  it('preserves loop-local aliases across assignments', () => {
    const optimized = optimizeForgeWebScriptWasmModule(
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

    expect(optimized.module.functions[0]!.body[0]).toMatchObject({
      kind: 'while',
      body: [{}, {}, { kind: 'if', condition: { kind: 'binary', left: { kind: 'identifier', name: 'high' } } }],
    });
  });

  it('normalizes enum tags and selects dense or sparse dispatch deterministically', () => {
    const dense = optimizeForgeWebScriptWasmModule({
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
          ...moduleWith([]).functions[0]!,
          parameters: [{ name: 'tag', type: { name: 'i32', span } }],
          body: moduleWith([
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
          ]).functions[0]!.body,
        },
      ],
    });
    const denseSwitch = dense.module.functions[0]!.body[0];
    expect(denseSwitch).toMatchObject({ kind: 'switch', strategy: 'br-table' });

    const sparse = optimizeForgeWebScriptWasmModule({
      ...dense.module,
      functions: [
        {
          ...dense.module.functions[0]!,
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
    expect(sparse.module.functions[0]!.body[0]).toMatchObject({ kind: 'switch', strategy: 'sparse' });
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
    const optimized = optimizeForgeWebScriptWasmModule({
      ...module,
      functions: [
        { ...module.functions[0]!, name: 'public', exported: true },
        { ...module.functions[0]!, name: 'private-z', exported: false },
        { ...module.functions[0]!, name: 'private-a', exported: false },
      ],
    });
    expect(optimized.module.functions.map(({ name }) => name)).toEqual(['public', 'private-a', 'private-z']);
    expect(optimized.module.functions[0]!.body).toMatchObject([
      { kind: 'return', value: { kind: 'literal', value: 42 } },
    ]);
  });

  it('folds i32 arithmetic with WebAssembly wrapping semantics', () => {
    const optimized = optimizeForgeWebScriptWasmModule(
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

    expect(optimized.module.functions[0]!.body).toMatchObject([
      // eslint-disable-next-line unicorn/prefer-math-trunc -- Assertion models WebAssembly i32 wrapping.
      { kind: 'return', value: { kind: 'literal', value: (Math.imul(216_613_626, 16_777_619) + 1) | 0 } },
    ]);
  });
});
