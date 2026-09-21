import { describe, expect, it } from 'vitest';

import {
  createNodeFromDefinition,
  getAllNodeDefinitions,
  getNodeDefinition,
  getNodeDefinitionsByCategory,
} from './catalog.js';
import { createContainerType, createPrimitiveType, type FlintGraphEdge, type FlintNodeGraph } from './types.js';
import { areTypesCompatible, validateGraph } from './validator.js';

describe('Flint Graph Compiler - Validator & Catalog', () => {
  describe('areTypesCompatible', () => {
    it('confirms identical primitive types are compatible', () => {
      expect(areTypesCompatible(createPrimitiveType('f32'), createPrimitiveType('f32'))).toBe(true);
      expect(areTypesCompatible(createPrimitiveType('i32'), createPrimitiveType('i32'))).toBe(true);
      expect(areTypesCompatible(createPrimitiveType('string'), createPrimitiveType('string'))).toBe(true);
      expect(areTypesCompatible(createPrimitiveType('bool'), createPrimitiveType('bool'))).toBe(true);
      expect(areTypesCompatible(createPrimitiveType('i64'), createPrimitiveType('i64'))).toBe(true);
    });

    it('rejects mismatched primitive types', () => {
      expect(areTypesCompatible(createPrimitiveType('f32'), createPrimitiveType('string'))).toBe(false);
      expect(areTypesCompatible(createPrimitiveType('i32'), createPrimitiveType('f32'))).toBe(false);
      expect(areTypesCompatible(createPrimitiveType('bool'), createPrimitiveType('i32'))).toBe(false);
    });

    it('checks container and generic type compatibility', () => {
      const vecI32_1 = createContainerType('Vector', [createPrimitiveType('i32')]);
      const vecI32_2 = createContainerType('Vector', [createPrimitiveType('i32')]);
      const vecF32 = createContainerType('Vector', [createPrimitiveType('f32')]);
      const optI32 = createContainerType('Option', [createPrimitiveType('i32')]);

      expect(areTypesCompatible(vecI32_1, vecI32_2)).toBe(true);
      expect(areTypesCompatible(vecI32_1, vecF32)).toBe(false);
      expect(areTypesCompatible(vecI32_1, optI32)).toBe(false);
    });
  });

  describe('Standard Catalog Definitions', () => {
    it('registers all required catalog operations with unique operations', () => {
      const allDefinitions = getAllNodeDefinitions();
      expect(allDefinitions.length).toBeGreaterThanOrEqual(25);

      const opSet = new Set<string>();
      for (const definition of allDefinitions) {
        expect(opSet.has(definition.operation)).toBe(false);
        opSet.add(definition.operation);
        expect(definition.title).toBeTruthy();
        expect(definition.description).toBeTruthy();
      }
    });

    it('filters definitions by category properly', () => {
      const mathDefinitions = getNodeDefinitionsByCategory('math');
      expect(mathDefinitions.length).toBeGreaterThanOrEqual(10);
      expect(mathDefinitions.every((definition) => definition.category === 'math')).toBe(true);

      const collectionDefinitions = getNodeDefinitionsByCategory('collection');
      expect(collectionDefinitions.length).toBeGreaterThanOrEqual(8);
      expect(collectionDefinitions.every((definition) => definition.category === 'collection')).toBe(true);
    });

    it('creates graph nodes from catalog definitions', () => {
      const addDefinition = getNodeDefinition('add');
      expect(addDefinition).toBeDefined();
      if (!addDefinition) return;

      const node = createNodeFromDefinition(addDefinition, 'node-1', { x: 100, y: 200 });
      expect(node.id).toBe('node-1');
      expect(node.operation).toBe('add');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.inputs).toHaveLength(2);
      expect(node.outputs).toHaveLength(1);
    });
  });

  describe('validateGraph', () => {
    it('validates a valid linear arithmetic pipeline and returns topological ordering', () => {
      const inputDefinition = getNodeDefinition('input')!;
      const addDefinition = getNodeDefinition('add')!;
      const multiplyDefinition = getNodeDefinition('multiply')!;
      const outputDefinition = getNodeDefinition('output')!;

      const nodeInput = createNodeFromDefinition(inputDefinition, 'n-input');
      const nodeAdd = createNodeFromDefinition(addDefinition, 'n-add');
      const nodeMult = createNodeFromDefinition(multiplyDefinition, 'n-mult');
      const nodeOutput = createNodeFromDefinition(outputDefinition, 'n-output');

      const edges: readonly FlintGraphEdge[] = [
        { id: 'e1', fromNodeId: 'n-input', fromPortId: 'value', toNodeId: 'n-add', toPortId: 'a' },
        { id: 'e2', fromNodeId: 'n-input', fromPortId: 'value', toNodeId: 'n-add', toPortId: 'b' },
        { id: 'e3', fromNodeId: 'n-add', fromPortId: 'result', toNodeId: 'n-mult', toPortId: 'a' },
        { id: 'e4', fromNodeId: 'n-add', fromPortId: 'result', toNodeId: 'n-mult', toPortId: 'b' },
        { id: 'e5', fromNodeId: 'n-mult', fromPortId: 'result', toNodeId: 'n-output', toPortId: 'value' },
      ];

      const graph: FlintNodeGraph = {
        id: 'graph-1',
        name: 'Math Pipeline',
        nodes: [nodeOutput, nodeMult, nodeAdd, nodeInput], // unordered
        edges,
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.sortedNodeIds).toBeDefined();

      const sorted = result.sortedNodeIds!;
      expect(sorted.indexOf('n-input')).toBeLessThan(sorted.indexOf('n-add'));
      expect(sorted.indexOf('n-add')).toBeLessThan(sorted.indexOf('n-mult'));
      expect(sorted.indexOf('n-mult')).toBeLessThan(sorted.indexOf('n-output'));
    });

    it('detects and rejects duplicate node IDs', () => {
      const addDefinition = getNodeDefinition('add')!;
      const node1 = createNodeFromDefinition(addDefinition, 'duplicate-id');
      const node2 = createNodeFromDefinition(addDefinition, 'duplicate-id');

      const graph: FlintNodeGraph = {
        id: 'g-dup',
        name: 'Duplicate Test',
        nodes: [node1, node2],
        edges: [],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-DUPLICATE-NODE',
          nodeId: 'duplicate-id',
        }),
      );
    });

    it('detects self-loop edges', () => {
      const addDefinition = getNodeDefinition('add')!;
      const node = createNodeFromDefinition(addDefinition, 'n1');

      const graph: FlintNodeGraph = {
        id: 'g-loop',
        name: 'Loop Test',
        nodes: [node],
        edges: [{ id: 'e1', fromNodeId: 'n1', fromPortId: 'result', toNodeId: 'n1', toPortId: 'a' }],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-SELF-LOOP',
          nodeId: 'n1',
        }),
      );
    });

    it('detects 2-node cycles', () => {
      const addDefinition = getNodeDefinition('add')!;
      const nodeA = createNodeFromDefinition(addDefinition, 'nA');
      const nodeB = createNodeFromDefinition(addDefinition, 'nB');

      const graph: FlintNodeGraph = {
        id: 'g-cycle2',
        name: 'Cycle 2 Test',
        nodes: [nodeA, nodeB],
        edges: [
          { id: 'e1', fromNodeId: 'nA', fromPortId: 'result', toNodeId: 'nB', toPortId: 'a' },
          { id: 'e2', fromNodeId: 'nB', fromPortId: 'result', toNodeId: 'nA', toPortId: 'a' },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-CYCLE',
        }),
      );
    });

    it('detects 3-node cycles', () => {
      const addDefinition = getNodeDefinition('add')!;
      const nodeA = createNodeFromDefinition(addDefinition, 'nA');
      const nodeB = createNodeFromDefinition(addDefinition, 'nB');
      const nodeC = createNodeFromDefinition(addDefinition, 'nC');

      const graph: FlintNodeGraph = {
        id: 'g-cycle3',
        name: 'Cycle 3 Test',
        nodes: [nodeA, nodeB, nodeC],
        edges: [
          { id: 'e1', fromNodeId: 'nA', fromPortId: 'result', toNodeId: 'nB', toPortId: 'a' },
          { id: 'e2', fromNodeId: 'nB', fromPortId: 'result', toNodeId: 'nC', toPortId: 'a' },
          { id: 'e3', fromNodeId: 'nC', fromPortId: 'result', toNodeId: 'nA', toPortId: 'a' },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-CYCLE',
        }),
      );
    });

    it('rejects multiple incoming connections to a single input port', () => {
      const addDefinition = getNodeDefinition('add')!;
      const inputDefinition = getNodeDefinition('input')!;

      const nodeInput1 = createNodeFromDefinition(inputDefinition, 'in-1');
      const nodeInput2 = createNodeFromDefinition(inputDefinition, 'in-2');
      const nodeAdd = createNodeFromDefinition(addDefinition, 'add-1');

      const graph: FlintNodeGraph = {
        id: 'g-multi',
        name: 'Multi-input Test',
        nodes: [nodeInput1, nodeInput2, nodeAdd],
        edges: [
          { id: 'e1', fromNodeId: 'in-1', fromPortId: 'value', toNodeId: 'add-1', toPortId: 'a' },
          { id: 'e2', fromNodeId: 'in-2', fromPortId: 'value', toNodeId: 'add-1', toPortId: 'a' }, // duplicate connection to port 'a'
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-MULTI-INPUT',
          nodeId: 'add-1',
          portId: 'a',
        }),
      );
    });

    it('rejects edges connecting incompatible port types', () => {
      const concatDefinition = getNodeDefinition('concat')!;
      const addDefinition = getNodeDefinition('add')!;

      const nodeConcat = createNodeFromDefinition(concatDefinition, 'concat-1');
      const nodeAdd = createNodeFromDefinition(addDefinition, 'add-1');

      const graph: FlintNodeGraph = {
        id: 'g-type-mismatch',
        name: 'Type Mismatch Test',
        nodes: [nodeConcat, nodeAdd],
        edges: [
          // Concat returns string, Add requires f32
          { id: 'e1', fromNodeId: 'concat-1', fromPortId: 'result', toNodeId: 'add-1', toPortId: 'a' },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-TYPE-MISMATCH',
          nodeId: 'add-1',
          portId: 'a',
        }),
      );
    });

    it('flags unconnected required input ports with no default value', () => {
      const outputDefinition = getNodeDefinition('output')!;
      const nodeOutput = createNodeFromDefinition(outputDefinition, 'out-1'); // required input 'value', no default

      const graph: FlintNodeGraph = {
        id: 'g-missing-input',
        name: 'Missing Input Test',
        nodes: [nodeOutput],
        edges: [],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-REQUIRED-PORT-UNCONNECTED',
          nodeId: 'out-1',
          portId: 'value',
        }),
      );
    });

    it('flags dangling edges pointing to non-existent nodes or ports', () => {
      const addDefinition = getNodeDefinition('add')!;
      const node1 = createNodeFromDefinition(addDefinition, 'node-1');
      const node2 = createNodeFromDefinition(addDefinition, 'node-2');

      const graph: FlintNodeGraph = {
        id: 'g-dangling',
        name: 'Dangling Edge Test',
        nodes: [node1, node2],
        edges: [
          { id: 'e1', fromNodeId: 'node-1', fromPortId: 'result', toNodeId: 'missing-node', toPortId: 'a' },
          { id: 'e2', fromNodeId: 'node-1', fromPortId: 'non-existent-port', toNodeId: 'node-2', toPortId: 'a' },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-DANGLING-EDGE',
        }),
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FLINT-GRAPH-MISSING-PORT',
        }),
      );
    });
  });
});
