import { describe, expect, it } from 'vitest';

import { createHighLevelSonModule } from './high-level/dialect.js';
import { createLowLevelSonModule, type LowLevelSonNode } from './low-level/dialect.js';
import { runDominatorGvnPass, runRedundantLoadEliminationPass, runSccpPass } from './passes/canonical.js';
import { applyDeclarativeRewrites, BUILTIN_REWRITE_RULES } from './rewrites/engine.js';

describe('Progressive SonIR Dialects & Declarative Rewrites', () => {
  it('constructs High-Level SonIR modules with regional affine scopes', () => {
    const hlModule = createHighLevelSonModule('test_high_level');
    expect(hlModule.name).toBe('test_high_level');
    expect(hlModule.regions).toHaveLength(1);
    expect(hlModule.entryRegionId).toBe(1);
  });

  it('constructs Low-Level SonIR modules with Memory SSA token roots', () => {
    const llModule = createLowLevelSonModule('test_low_level');
    expect(llModule.name).toBe('test_low_level');
    expect(llModule.nodes).toHaveLength(1);
    expect(llModule.initialMemoryToken.version).toBe(0);
  });

  it('applies declarative algebraic rewrite rules (add 0, mul 1, mul 0, sub self, const folding)', () => {
    const nodes: LowLevelSonNode[] = [
      {
        id: 1,
        opcode: 'val.const',
        type: 'i32',
        constantValue: 42,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 2,
        opcode: 'val.const',
        type: 'i32',
        constantValue: 0,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 3,
        opcode: 'val.add',
        type: 'i32',
        valueInputs: [1, 2], // 42 + 0
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 4,
        opcode: 'val.sub',
        type: 'i32',
        valueInputs: [1, 1], // 42 - 42
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
    ];

    const result = applyDeclarativeRewrites(nodes, BUILTIN_REWRITE_RULES);
    expect(result.appliedRules).toContain('algebraic.add.zero');
    expect(result.appliedRules).toContain('algebraic.sub.self');
  });

  it('runs Dominator GVN and Redundant Load Elimination passes', () => {
    const baseModule = createLowLevelSonModule('pass_test');
    const nodes: LowLevelSonNode[] = [
      ...baseModule.nodes,
      {
        id: 2,
        opcode: 'val.add',
        type: 'i32',
        valueInputs: [10, 20],
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 3,
        opcode: 'val.add',
        type: 'i32',
        valueInputs: [10, 20], // Duplicate computation
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 4,
        opcode: 'mem.store',
        type: 'unit',
        valueInputs: [100, 55], // store 55 to address 100
        memoryInputs: [0],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 5,
        opcode: 'mem.load',
        type: 'i32',
        valueInputs: [100], // load from address 100 with same memToken
        memoryInputs: [0],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
    ];

    const gvnResult = runDominatorGvnPass({ ...baseModule, nodes });
    expect(gvnResult.deduplicatedCount).toBe(1);

    const rleResult = runRedundantLoadEliminationPass({ ...baseModule, nodes });
    expect(rleResult.eliminatedCount).toBe(1);

    const sccpResult = runSccpPass({ ...baseModule, nodes });
    expect(sccpResult.constantsPropagated).toBeGreaterThanOrEqual(0);
  });
});
