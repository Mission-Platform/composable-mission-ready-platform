import { describe, expect, it } from 'vitest';

import type { FlintGraphNode, FlintNodeDefinition } from '@mission-platform/flint';

import { filterNodeDefinitions, isNodeInSelectionBox } from './useSelectionController';

describe('useSelectionController Hook & Selection Calculations', () => {
  it('correctly determines if a node is within the marquee selection box', () => {
    const node: FlintGraphNode = {
      id: 'node-1',
      operation: 'math.add',
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [],
    };

    // Fully enclosing box (node spans 100..320, 100..220)
    expect(isNodeInSelectionBox(node, 50, 50, 400, 300)).toBe(true);

    // Partial overlap box
    expect(isNodeInSelectionBox(node, 150, 150, 500, 500)).toBe(true);

    // Completely disjoint box
    expect(isNodeInSelectionBox(node, 500, 500, 700, 700)).toBe(false);
  });

  it('filters node catalog definitions case-insensitively', () => {
    const definitions: FlintNodeDefinition[] = [
      {
        operation: 'math.add',
        title: 'Add Numbers',
        category: 'math',
        inputs: [],
        outputs: [],
      },
      {
        operation: 'text.concat',
        title: 'Concatenate Text',
        category: 'text',
        inputs: [],
        outputs: [],
      },
    ];

    expect(filterNodeDefinitions('add', definitions).length).toBe(1);
    expect(filterNodeDefinitions('TEXT', definitions).length).toBe(1);
    expect(filterNodeDefinitions('nonexistent', definitions).length).toBe(0);
    expect(filterNodeDefinitions('', definitions).length).toBe(2);
  });
});
