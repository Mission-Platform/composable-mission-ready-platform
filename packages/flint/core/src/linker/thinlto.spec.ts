import { describe, expect, it } from 'vitest';

import {
  buildThinLtoIndex,
  computeThinLtoInliningPlan,
  createModuleSummary,
  type ThinLtoFunctionSummary,
} from './thinlto.js';

describe('Flint-ThinLTO Module Summary Indexing & Inlining', () => {
  it('builds global call graphs, identifies live symbols, and prunes unused capabilities', () => {
    const mathFunctions: ThinLtoFunctionSummary[] = [
      {
        name: 'math.add',
        isExported: true,
        calls: ['math.helper'],
        capabilityImports: ['cap.math.basic'],
        memoryEffects: 'none',
        inlineCandidate: true,
        instructionCount: 5,
      },
      {
        name: 'math.helper',
        isExported: false,
        calls: [],
        capabilityImports: [],
        memoryEffects: 'none',
        inlineCandidate: true,
        instructionCount: 2,
      },
      {
        name: 'math.unused',
        isExported: false,
        calls: [],
        capabilityImports: ['cap.math.matrix'],
        memoryEffects: 'readwrite',
        inlineCandidate: false,
        instructionCount: 100,
      },
    ];

    const module1 = createModuleSummary('math_module', mathFunctions);
    const index = buildThinLtoIndex([module1], ['math.add']);

    expect(index.liveSymbols.has('math.add')).toBe(true);
    expect(index.liveSymbols.has('math.helper')).toBe(true);
    expect(index.liveSymbols.has('math.unused')).toBe(false);
    expect(index.prunedCapabilities.has('cap.math.matrix')).toBe(true);
    expect(index.prunedCapabilities.has('cap.math.basic')).toBe(false);

    const inliningPlan = computeThinLtoInliningPlan(index, 50);
    expect(inliningPlan.get('math.add')).toEqual(['math.helper']);
  });
});
