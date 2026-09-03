import { describe, expect, it } from 'vitest';

import { lowerForgeWebScriptWasmFunctionToSsa } from './cfg.js';

import type { ForgeWebScriptWasmFunction, ForgeWebScriptWasmSourceSpan } from './contracts.js';

const span: ForgeWebScriptWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
const index32 = (value: number) => ({ kind: 'literal' as const, value, type: 'i32' as const, span });
const identifier = (name: string) => ({ kind: 'identifier' as const, name, span });

function functionWith(body: ForgeWebScriptWasmFunction['body']): ForgeWebScriptWasmFunction {
  return {
    kind: 'function',
    name: 'ssa',
    exported: false,
    parameters: [{ name: 'condition', type: { name: 'bool', span } }],
    result: { name: 'i32', span },
    span,
    body,
  };
}

describe('Forge Web Script structured CFG/SSA lowering', () => {
  it('creates a phi value and join block for divergent scalar definitions', () => {
    const plan = lowerForgeWebScriptWasmFunctionToSsa(
      functionWith([
        { kind: 'let', name: 'value', type: { name: 'i32', span }, value: index32(0), span },
        {
          kind: 'if',
          condition: identifier('condition'),
          consequent: [{ kind: 'assignment', name: 'value', value: index32(10), span }],
          alternate: [{ kind: 'assignment', name: 'value', value: index32(20), span }],
          span,
        },
        { kind: 'return', value: identifier('value'), span },
      ]),
    );

    expect(plan.values.filter(({ kind }) => kind === 'phi')).toHaveLength(1);
    expect(plan.blocks.some(({ kind }) => kind === 'join')).toBe(true);
    expect(plan.exitReachable).toBe(false);
  });

  it('creates a loop-header phi and a backedge binding for loop-carried values', () => {
    const loop: ForgeWebScriptWasmFunction['body'][number] = {
      kind: 'while',
      condition: {
        kind: 'binary',
        operator: '<',
        left: identifier('value'),
        right: index32(4),
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
    };
    const plan = lowerForgeWebScriptWasmFunctionToSsa(
      functionWith([
        { kind: 'let', name: 'value', type: { name: 'i32', span }, value: index32(0), span },
        loop,
        { kind: 'return', value: identifier('value'), span },
      ]),
    );

    expect(plan.values.filter(({ kind }) => kind === 'phi')).toHaveLength(1);
    expect(plan.loopHeaders.get(loop)?.get('value')?.kind).toBe('phi');
    expect(plan.loopBackedges.get(loop)?.get('value')?.kind).toBe('definition');
    expect(plan.blocks.some(({ kind }) => kind === 'loop-header')).toBe(true);
    expect(plan.exitReachable).toBe(false);
  });

  it('keeps the implicit exit reachable when a branch does not return', () => {
    const plan = lowerForgeWebScriptWasmFunctionToSsa(
      functionWith([
        {
          kind: 'if',
          condition: identifier('condition'),
          consequent: [{ kind: 'return', value: index32(1), span }],
          span,
        },
      ]),
    );

    expect(plan.exitReachable).toBe(true);
  });
});
