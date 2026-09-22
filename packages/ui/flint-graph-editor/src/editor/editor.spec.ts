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

  it('supports clipboard copy/paste, group copying with connections, and duplicate meta node naming', () => {
    const store = new FlintEditorStore();
    const inA = store.addNode('input', { x: 10, y: 10 }, { name: 'in_1' })!;
    const inB = store.addNode('input', { x: 10, y: 60 }, { name: 'in_2' })!;
    const addNode = store.addNode('add', { x: 150, y: 30 })!;
    store.connectPorts(inA.id, 'value', addNode.id, 'a');
    store.connectPorts(inB.id, 'value', addNode.id, 'b');

    // Group the nodes
    store.selectNodes([inA.id, inB.id, addNode.id]);
    const group = store.groupSelectedNodes('MathGroup')!;
    expect(group).toBeDefined();

    // Copy group and paste
    const copyResult = store.copyGroup(group.id);
    expect(copyResult).toBe(true);
    expect(store.getState().hasClipboard).toBe(true);

    const pastedIds = store.paste({ x: 300, y: 300 });
    expect(pastedIds).toHaveLength(3);
    // Group connections between pasted nodes should be duplicated
    expect(store.getState().graph.edges.length).toBe(4);

    // Create a meta node from selection
    store.selectNodes([inA.id, inB.id, addNode.id]);
    const metaNode = store.createMetaNodeFromSelected('SumMeta')!;
    expect(metaNode).toBeDefined();

    // Duplicate meta node appends count .001
    const duplicate = store.duplicateMetaNode(metaNode.id)!;
    expect(duplicate).toBeDefined();
    expect(duplicate.title).toBe('SumMeta.001');

    // Drill into meta node and back
    expect(store.drillIntoMetaNode(metaNode.id)).toBe(true);
    expect(store.canNavigateBack()).toBe(true);
    expect(store.getState().breadcrumbs.length).toBe(2);

    expect(store.navigateBack()).toBe(true);
    expect(store.canNavigateBack()).toBe(false);

    // Ungroup and color group
    store.setGroupColor(group.id, '#a371f7');
    expect(store.getState().graph.groups?.[0]?.color).toBe('#a371f7');
    store.ungroup(group.id);
    expect(store.getState().graph.groups?.length).toBe(1); // Only the pasted group remains
  });

  it('supports custom code node updates, output splitting, and edge removal', () => {
    const store = new FlintEditorStore();
    const codeNode = store.addNode('flint_code', { x: 50, y: 50 })!;
    expect(codeNode).toBeDefined();

    store.updateCodeNode(
      codeNode.id,
      'fn custom_add(a: i32, b: i32) -> i32 { return a + b; }',
      codeNode.inputs,
      codeNode.outputs,
      'custom_add',
    );
    const updated = store.getState().graph.nodes.find((n) => n.id === codeNode.id);
    expect(updated?.properties?.code).toContain('fn custom_add');

    // Toggle split outputs
    const divRem = store.addNode('div_rem', { x: 100, y: 100 })!;
    expect(divRem.splitOutputs).toBe(true);
    store.toggleSplitOutputs(divRem.id);
    const updatedDivRem = store.getState().graph.nodes.find((n) => n.id === divRem.id);
    expect(updatedDivRem?.splitOutputs).toBe(false);

    // Edge selection and removal
    const outNode = store.addNode('output', { x: 300, y: 100 })!;
    store.connectPorts(divRem.id, 'quotient', outNode.id, 'value');
    const edge = store.getState().graph.edges[0]!;
    expect(edge).toBeDefined();

    store.selectEdge(edge.id);
    expect(store.getState().activeEdgeId).toBe(edge.id);
    store.removeActiveEdge();
    expect(store.getState().graph.edges).toHaveLength(0);
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
