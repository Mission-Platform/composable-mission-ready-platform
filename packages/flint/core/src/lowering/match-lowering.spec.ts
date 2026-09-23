import { describe, expect, it } from 'vitest';

import { compileDecisionTree, isDenseSwitchEligible } from './match-lowering.js';

import type { FlintExpression, FlintMatchArm } from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

const dummySpan: FlintSourceSpan = {
  start: 0,
  end: 10,
  line: 1,
  column: 1,
  endLine: 1,
  endColumn: 10,
};

const dummyDiscriminant: FlintExpression = {
  kind: 'identifier',
  name: 'status',
  span: dummySpan,
};

function enumResolver(name: string): number | undefined {
  switch (name) {
    case 'Pending': {
      return 0;
    }
    case 'Active': {
      return 1;
    }
    case 'Completed': {
      return 2;
    }
    default: {
      return undefined;
    }
  }
}

describe('Decision-Tree pattern matching lowering', () => {
  it('correctly identifies dense integer values as eligible for br_table', () => {
    expect(isDenseSwitchEligible([0, 1, 2, 3])).toBe(true);
    expect(isDenseSwitchEligible([10, 11, 12, 13, 14])).toBe(true);
    expect(isDenseSwitchEligible([0, 2, 4])).toBe(true); // range 5 <= 3 * 4
    expect(isDenseSwitchEligible([1, 1000, 2000])).toBe(false); // sparse
  });

  it('compiles dense enum match arms into br_table decision tree nodes', () => {
    const arms: FlintMatchArm[] = [
      {
        kind: 'match-arm',
        pattern: { kind: 'variant', name: 'Pending', bindings: [], span: dummySpan },
        value: { kind: 'literal', value: 100, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: 'match-arm',
        pattern: { kind: 'variant', name: 'Active', bindings: [], span: dummySpan },
        value: { kind: 'literal', value: 200, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: 'match-arm',
        pattern: { kind: 'variant', name: 'Completed', bindings: [], span: dummySpan },
        value: { kind: 'literal', value: 300, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: 'match-arm',
        pattern: { kind: 'wildcard', span: dummySpan },
        value: { kind: 'literal', value: -1, span: dummySpan },
        span: dummySpan,
      },
    ];

    const tree = compileDecisionTree(dummyDiscriminant, arms, { enumValueResolver: enumResolver });

    expect(tree.kind).toBe('switch');
    if (tree.kind === 'switch') {
      expect(tree.strategy).toBe('br-table');
      expect(tree.cases).toHaveLength(3);
      expect(tree.cases[0]?.value).toBe(0);
      expect(tree.cases[1]?.value).toBe(1);
      expect(tree.cases[2]?.value).toBe(2);
      expect(tree.defaultSubtree?.kind).toBe('leaf');
    }
  });

  it('compiles sparse integer match arms into sparse search decision tree nodes', () => {
    const arms: FlintMatchArm[] = [
      {
        kind: 'match-arm',
        pattern: { kind: 'literal', value: 10, span: dummySpan },
        value: { kind: 'literal', value: 1, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: 'match-arm',
        pattern: { kind: 'literal', value: 5000, span: dummySpan },
        value: { kind: 'literal', value: 2, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: 'match-arm',
        pattern: { kind: 'wildcard', span: dummySpan },
        value: { kind: 'literal', value: 0, span: dummySpan },
        span: dummySpan,
      },
    ];

    const tree = compileDecisionTree(dummyDiscriminant, arms);

    expect(tree.kind).toBe('switch');
    if (tree.kind === 'switch') {
      expect(tree.strategy).toBe('sparse');
      expect(tree.cases).toHaveLength(2);
      expect(tree.defaultSubtree?.kind).toBe('leaf');
    }
  });
});
