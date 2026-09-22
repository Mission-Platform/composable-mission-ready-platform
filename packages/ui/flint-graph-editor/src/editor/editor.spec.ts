import { describe, expect, it } from 'vitest';

import { executeGraph, exportGraphArtifacts } from './compiler-worker';
import { FlintEditorStore } from './editor-store';

describe('Flint Graph Editor - Reactive Store & History', () => {
  it('initializes with empty or default graph state', () => {
    const store = new FlintEditorStore();
    const state = store.getState();

    expect(state.graph.nodes).toHaveLength(0);
    expect(state.graph.edges).toHaveLength(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.validation.valid).toBe(true);
  });

  it('adds nodes from catalog, updates selection, and supports undo/redo', () => {
    const store = new FlintEditorStore();

    const nodeA = store.addNode('input', { x: 50, y: 50 }, { name: 'in_1' });
    expect(nodeA).toBeDefined();
    expect(store.getState().graph.nodes).toHaveLength(1);
    expect(store.getState().selectedNodeIds).toContain(nodeA?.id);
    expect(store.getState().canUndo).toBe(true);
    expect(store.getState().canRedo).toBe(false);

    const nodeB = store.addNode('add', { x: 200, y: 50 });
    expect(nodeB).toBeDefined();
    expect(store.getState().graph.nodes).toHaveLength(2);

    // Undo should revert nodeB addition
    store.undo();
    expect(store.getState().graph.nodes).toHaveLength(1);
    expect(store.getState().graph.nodes[0]?.id).toBe(nodeA?.id);
    expect(store.getState().canRedo).toBe(true);

    // Redo should restore nodeB addition
    store.redo();
    expect(store.getState().graph.nodes).toHaveLength(2);
  });

  it('connects compatible ports and rejects invalid connections', () => {
    const store = new FlintEditorStore();
    const inputNode = store.addNode('input', { x: 0, y: 0 })!;
    const addNode = store.addNode('add', { x: 150, y: 0 })!;

    // Valid connection: input output -> add input 'a'
    const connectResult = store.connectPorts(inputNode.id, 'value', addNode.id, 'a');
    expect(connectResult.success).toBe(true);
    expect(store.getState().graph.edges).toHaveLength(1);

    // Duplicate connection to same input port should fail
    const duplicateResult = store.connectPorts(inputNode.id, 'value', addNode.id, 'a');
    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error).toContain('already has an incoming connection');

    // Self loop connection should fail
    const loopResult = store.connectPorts(addNode.id, 'result', addNode.id, 'b');
    expect(loopResult.success).toBe(false);
  });

  it('deletes selected nodes and cleans up connected edges with undo support', () => {
    const store = new FlintEditorStore();
    const inNode = store.addNode('input')!;
    const outNode = store.addNode('output')!;
    store.connectPorts(inNode.id, 'value', outNode.id, 'value');

    expect(store.getState().graph.nodes).toHaveLength(2);
    expect(store.getState().graph.edges).toHaveLength(1);

    // Select inNode and delete
    store.selectNode(inNode.id);
    store.deleteSelected();

    expect(store.getState().graph.nodes).toHaveLength(1);
    expect(store.getState().graph.edges).toHaveLength(0); // edge removed automatically

    // Undo restores node and edge
    store.undo();
    expect(store.getState().graph.nodes).toHaveLength(2);
    expect(store.getState().graph.edges).toHaveLength(1);
  });

  it('moves nodes and updates positions', () => {
    const store = new FlintEditorStore();
    const node = store.addNode('constant', { x: 10, y: 20 })!;

    store.moveNode(node.id, { x: 85, y: 95 });
    const moved = store.getState().graph.nodes.find((n) => n.id === node.id);
    expect(moved?.position.x).toBe(85);
    expect(moved?.position.y).toBe(95);

    store.commitNodeMove();
    expect(store.getState().canUndo).toBe(true);
  });

  it('supports multi-node selection and multi-node translation', () => {
    const store = new FlintEditorStore();
    const nodeA = store.addNode('constant', { x: 10, y: 20 })!;
    const nodeB = store.addNode('add', { x: 100, y: 150 })!;
    const nodeC = store.addNode('output', { x: 300, y: 200 })!;

    // Select single node
    store.selectNode(nodeA.id);
    expect(store.getState().selectedNodeIds).toEqual([nodeA.id]);

    // Multi-select with shift/flag
    store.selectNode(nodeB.id, true);
    expect(store.getState().selectedNodeIds).toContain(nodeA.id);
    expect(store.getState().selectedNodeIds).toContain(nodeB.id);

    // Toggle selection
    store.toggleNodeSelection(nodeA.id);
    expect(store.getState().selectedNodeIds).not.toContain(nodeA.id);
    expect(store.getState().selectedNodeIds).toContain(nodeB.id);

    // Batch select nodes
    store.selectNodes([nodeA.id, nodeC.id]);
    expect(store.getState().selectedNodeIds).toEqual([nodeA.id, nodeC.id]);

    // Move multiple selected nodes by delta
    const startPositions = new Map<string, { readonly x: number; readonly y: number }>([
      [nodeA.id, { x: 10, y: 20 }],
      [nodeC.id, { x: 300, y: 200 }],
    ]);
    store.moveSelectedNodes(25, 35, startPositions);

    const movedA = store.getState().graph.nodes.find((n) => n.id === nodeA.id);
    const movedC = store.getState().graph.nodes.find((n) => n.id === nodeC.id);
    expect(movedA?.position).toEqual({ x: 35, y: 55 });
    expect(movedC?.position).toEqual({ x: 325, y: 235 });

    expect(store.getUpdateTimeMs()).toBeGreaterThan(0);
  });
});

describe('Flint Graph Editor - Compiler Worker Execution & Export', () => {
  it('executes a complete graph pipeline in WebAssembly with input reactivity', async () => {
    const store = new FlintEditorStore();
    const inA = store.addNode('input', { x: 0, y: 0 }, { name: 'a' })!;
    const inB = store.addNode('input', { x: 0, y: 100 }, { name: 'b' })!;
    const addNode = store.addNode('add', { x: 150, y: 50 })!;
    const outNode = store.addNode('output', { x: 300, y: 50 })!;

    const resA = store.connectPorts(inA.id, 'value', addNode.id, 'a');
    const resB = store.connectPorts(inB.id, 'value', addNode.id, 'b');
    const resOut = store.connectPorts(addNode.id, 'result', outNode.id, 'value');
    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);
    expect(resOut.success).toBe(true);
    expect(store.getState().graph.edges).toHaveLength(3);

    const result = await executeGraph(store.getState().graph, { a: 15, b: 27 });
    expect(result.type).toBe('run_success');

    if (result.type === 'run_success') {
      expect(result.outputs.result).toBe(42);
      expect(result.wasmBytes).toBeDefined();
    }
  });

  it('reports descriptive node errors for disconnected required ports', async () => {
    const store = new FlintEditorStore();
    // Output node requires input 'value'
    store.addNode('output')!;

    const result = await executeGraph(store.getState().graph);
    expect(result.type).toBe('run_error');
    if (result.type === 'run_error') {
      expect(result.error).toContain('failed');
      expect(Object.keys(result.nodeErrors).length).toBeGreaterThan(0);
    }
  });

  it('exports formatted Flint source code and ABI manifest', () => {
    const store = new FlintEditorStore();
    const inNode = store.addNode('input', { x: 0, y: 0 }, { name: 'x' })!;
    const outNode = store.addNode('output', { x: 200, y: 0 })!;
    store.connectPorts(inNode.id, 'value', outNode.id, 'value');

    const exportResult = exportGraphArtifacts(store.getState().graph);
    expect(exportResult.type).toBe('export_result');

    if (exportResult.type === 'export_result') {
      expect(exportResult.source).toContain('export fn evaluate(x: i32) -> i32 {');
      expect(exportResult.source).toContain('return x;');
      expect(exportResult.wasmBytes).toBeInstanceOf(Uint8Array);
    }
  });
});
