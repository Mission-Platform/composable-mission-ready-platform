import { describe, expect, it } from 'vitest';

import { createLowLevelSonModule } from '../sonir/low-level/dialect.js';

import { runFlintSanitizerPass } from './sanitizer.js';

import type { LowLevelSonNode } from '../sonir/low-level/dialect.js';

describe('Address & Capability Sanitizer (F-San)', () => {
  it('instruments pointer loads and stores with shadow-memory boundary validation', () => {
    const baseModule = createLowLevelSonModule('sanitizer_test');
    const nodes: LowLevelSonNode[] = [
      ...baseModule.nodes,
      {
        id: 2,
        opcode: 'mem.load',
        type: 'i32',
        valueInputs: [1024],
        memoryInputs: [0],
        controlInputs: [1],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 3,
        opcode: 'mem.store',
        type: 'unit',
        valueInputs: [2048, 42],
        memoryInputs: [0],
        controlInputs: [1],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
    ];

    const result = runFlintSanitizerPass({ ...baseModule, nodes }, { sanitizeBounds: true });
    expect(result.report.instrumentedBoundsChecks).toBe(2);
    expect(result.module.nodes.length).toBe(nodes.length + 2);
    expect(result.module.nodes.some((node) => node.constantValue === '__fsan_check_bounds')).toBe(true);
  });
});
