import { describe, expect, it } from 'vitest';

import { parseFlint } from '../parser.js';

import { buildGraphAst } from './ast-builder.js';
import { createNodeFromDefinition, getNodeDefinition } from './catalog.js';
import { compileGraphToFlint, compileNodeGraph } from './generator.js';
import { emitGraphSource } from './source-emitter.js';

import type { FlintGraphEdge, FlintNodeGraph } from './types.js';

describe('Flint Graph Compiler - AST & Source Generation', () => {
  const inputDefinition = getNodeDefinition('input')!;
  const outputDefinition = getNodeDefinition('output')!;
  const addDefinition = getNodeDefinition('add')!;
  const multiplyDefinition = getNodeDefinition('multiply')!;
  const constantDefinition = getNodeDefinition('constant')!;

  it('builds a typed in-memory FlintModule AST from a dataflow graph', () => {
    const nodeA = createNodeFromDefinition(inputDefinition, 'in_a', { x: 0, y: 0 }, { name: 'a' });
    const nodeB = createNodeFromDefinition(inputDefinition, 'in_b', { x: 0, y: 50 }, { name: 'b' });
    const nodeAdd = createNodeFromDefinition(addDefinition, 'add_1', { x: 100, y: 25 });
    const nodeOut = createNodeFromDefinition(outputDefinition, 'out_1', { x: 200, y: 25 });

    const edges: readonly FlintGraphEdge[] = [
      { id: 'e1', fromNodeId: 'in_a', fromPortId: 'value', toNodeId: 'add_1', toPortId: 'a' },
      { id: 'e2', fromNodeId: 'in_b', fromPortId: 'value', toNodeId: 'add_1', toPortId: 'b' },
      { id: 'e3', fromNodeId: 'add_1', fromPortId: 'result', toNodeId: 'out_1', toPortId: 'value' },
    ];

    const graph: FlintNodeGraph = {
      id: 'simple_math',
      name: 'SimpleMath',
      nodes: [nodeOut, nodeAdd, nodeB, nodeA],
      edges,
    };

    const result = buildGraphAst(graph);
    expect(result.module).toBeDefined();
    expect(result.entryFunctionName).toBe('evaluate');
    expect(result.module.functions).toHaveLength(1);

    const function_ = result.module.functions[0]!;
    expect(function_.name).toBe('evaluate');
    expect(function_.exported).toBe(true);
    expect(function_.parameters).toHaveLength(2);
    expect(function_.parameters[0]!.name).toBe('a');
    expect(function_.parameters[1]!.name).toBe('b');

    // Body should have let statement for add_1 and a return statement
    expect(function_.body).toHaveLength(2);
    const letStmt = function_.body[0]!;
    expect(letStmt.kind).toBe('let');
    if (letStmt.kind === 'let') {
      expect(letStmt.name).toBe('v_add_1_result');
      expect(letStmt.value.kind).toBe('binary');
    }

    const returnValueStmt = function_.body[1]!;
    expect(returnValueStmt.kind).toBe('return');
    if (returnValueStmt.kind === 'return') {
      expect(returnValueStmt.value).toBeDefined();
      expect(returnValueStmt.value?.kind).toBe('identifier');
    }

    // Source map checks
    expect(result.sourceMap.nodeToSpan.has('add_1')).toBe(true);
    expect(result.sourceMap.nodeToSpan.has('in_a')).toBe(true);
    expect(result.sourceMap.nodeToSpan.has('out_1')).toBe(true);
  });

  it('emits valid Flint source code that parses cleanly through parseFlint', () => {
    const nodeA = createNodeFromDefinition(inputDefinition, 'in_a', { x: 0, y: 0 }, { name: 'a' });
    const nodeB = createNodeFromDefinition(inputDefinition, 'in_b', { x: 0, y: 50 }, { name: 'b' });
    const nodeAdd = createNodeFromDefinition(addDefinition, 'add_1', { x: 100, y: 25 });
    const nodeConst = createNodeFromDefinition(constantDefinition, 'const_2', { x: 100, y: 100 }, { value: 2 });
    const nodeMult = createNodeFromDefinition(multiplyDefinition, 'mult_1', { x: 200, y: 50 });
    const nodeOut = createNodeFromDefinition(outputDefinition, 'out_1', { x: 300, y: 50 });

    const edges: readonly FlintGraphEdge[] = [
      { id: 'e1', fromNodeId: 'in_a', fromPortId: 'value', toNodeId: 'add_1', toPortId: 'a' },
      { id: 'e2', fromNodeId: 'in_b', fromPortId: 'value', toNodeId: 'add_1', toPortId: 'b' },
      { id: 'e3', fromNodeId: 'add_1', fromPortId: 'result', toNodeId: 'mult_1', toPortId: 'a' },
      { id: 'e4', fromNodeId: 'const_2', fromPortId: 'value', toNodeId: 'mult_1', toPortId: 'b' },
      { id: 'e5', fromNodeId: 'mult_1', fromPortId: 'result', toNodeId: 'out_1', toPortId: 'value' },
    ];

    const graph: FlintNodeGraph = {
      id: 'pipeline_math',
      name: 'PipelineMath',
      nodes: [nodeA, nodeB, nodeConst, nodeAdd, nodeMult, nodeOut],
      edges,
    };

    const result = emitGraphSource(graph);
    expect(result.source).toContain('export fn evaluate(a: i32, b: i32) -> i32 {');
    expect(result.source).toContain('let v_add_1_result: i32 = a + b;');
    expect(result.source).toContain('let v_const_2_value: i32 = 2;');
    expect(result.source).toContain('let v_mult_1_result: i32 = v_add_1_result * v_const_2_value;');
    expect(result.source).toContain('return v_mult_1_result;');

    // Parse emitted source with Flint compiler frontend
    const parseResult = parseFlint(result.source, 'generated.flint');
    expect(parseResult.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(parseResult.module).toBeDefined();

    // Verify bidirectional source map
    for (const node of graph.nodes) {
      const span = result.sourceMap.nodeToSpan.get(node.id);
      expect(span).toBeDefined();
      if (span) {
        const key = `${span.line}:${span.column}:${span.endLine}:${span.endColumn}`;
        expect(result.sourceMap.spanToNode.get(key)).toBe(node.id);
      }
    }
  });

  it('generates capability imports for host capability nodes', () => {
    const clockDefinition = getNodeDefinition('clock_now')!;
    const nodeClock = createNodeFromDefinition(clockDefinition, 'clock_node');
    const nodeOut = createNodeFromDefinition(outputDefinition, 'out_node', undefined, { typeName: 'i64' });

    const graph: FlintNodeGraph = {
      id: 'clock_pipeline',
      name: 'ClockPipeline',
      nodes: [nodeClock, nodeOut],
      edges: [{ id: 'e1', fromNodeId: 'clock_node', fromPortId: 'timestamp', toNodeId: 'out_node', toPortId: 'value' }],
      requestedCapabilities: ['clock.now'],
    };

    const compilation = compileGraphToFlint(graph);
    expect(compilation.source).toContain('import capability "clock.now" as host_clock_now() -> i64;');
    expect(compilation.source).toContain('let v_clock_node_timestamp: i64 = host_clock_now();');
    expect(compilation.module.imports).toHaveLength(1);
    expect(compilation.module.imports[0]!.capability).toBe('clock.now');
  });

  it('compiles graph to WebAssembly binary and executes with numerical correctness', async () => {
    const nodeA = createNodeFromDefinition(inputDefinition, 'in_a', { x: 0, y: 0 }, { name: 'a' });
    const nodeB = createNodeFromDefinition(inputDefinition, 'in_b', { x: 0, y: 50 }, { name: 'b' });
    const nodeAdd = createNodeFromDefinition(addDefinition, 'add_1', { x: 100, y: 25 });
    const nodeConst = createNodeFromDefinition(constantDefinition, 'const_2', { x: 100, y: 100 }, { value: 2 });
    const nodeMult = createNodeFromDefinition(multiplyDefinition, 'mult_1', { x: 200, y: 50 });
    const nodeOut = createNodeFromDefinition(outputDefinition, 'out_1', { x: 300, y: 50 });

    const edges: readonly FlintGraphEdge[] = [
      { id: 'e1', fromNodeId: 'in_a', fromPortId: 'value', toNodeId: 'add_1', toPortId: 'a' },
      { id: 'e2', fromNodeId: 'in_b', fromPortId: 'value', toNodeId: 'add_1', toPortId: 'b' },
      { id: 'e3', fromNodeId: 'add_1', fromPortId: 'result', toNodeId: 'mult_1', toPortId: 'a' },
      { id: 'e4', fromNodeId: 'const_2', fromPortId: 'value', toNodeId: 'mult_1', toPortId: 'b' },
      { id: 'e5', fromNodeId: 'mult_1', fromPortId: 'result', toNodeId: 'out_1', toPortId: 'value' },
    ];

    const graph: FlintNodeGraph = {
      id: 'calc_test',
      name: 'CalcTest',
      nodes: [nodeA, nodeB, nodeConst, nodeAdd, nodeMult, nodeOut],
      edges,
    };

    const artifact = compileNodeGraph(graph);
    expect(artifact.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(artifact.wasm).toBeDefined();

    if (!artifact.wasm) return;

    // Instantiate native WebAssembly
    const wasmModule = await WebAssembly.instantiate(artifact.wasm);
    const { evaluate } = wasmModule.instance.exports;
    expect(typeof evaluate).toBe('function');

    if (typeof evaluate === 'function') {
      // (3 + 4) * 2 = 14
      const evalResult = Reflect.apply(evaluate, undefined, [3, 4]);
      expect(evalResult).toBe(14);
    }
  });

  it('emits record structs and splits outputs for multi-output operations', () => {
    const divRemDefinition = getNodeDefinition('div_rem')!;
    const nodeA = createNodeFromDefinition(inputDefinition, 'in_a', { x: 0, y: 0 }, { name: 'a' });
    const nodeB = createNodeFromDefinition(inputDefinition, 'in_b', { x: 0, y: 50 }, { name: 'b' });
    const nodeDivRem = createNodeFromDefinition(
      divRemDefinition,
      'div_rem_1',
      { x: 100, y: 25 },
      { splitOutputs: true },
    );
    const nodeOut = createNodeFromDefinition(outputDefinition, 'out_1', { x: 200, y: 25 });

    const edges: readonly FlintGraphEdge[] = [
      { id: 'e1', fromNodeId: 'in_a', fromPortId: 'value', toNodeId: 'div_rem_1', toPortId: 'a' },
      { id: 'e2', fromNodeId: 'in_b', fromPortId: 'value', toNodeId: 'div_rem_1', toPortId: 'b' },
      { id: 'e3', fromNodeId: 'div_rem_1', fromPortId: 'quotient', toNodeId: 'out_1', toPortId: 'value' },
    ];

    const graph: FlintNodeGraph = {
      id: 'div_rem_test',
      name: 'DivRemTest',
      nodes: [nodeA, nodeB, nodeDivRem, nodeOut],
      edges,
    };

    const result = emitGraphSource(graph);
    expect(result.source).toContain('record Record_div_rem_1');
    expect(result.source).toContain('quotient: i32;');
    expect(result.source).toContain('remainder: i32;');
    expect(result.source).toContain('let v_div_rem_1_record: Record_div_rem_1 = Record_div_rem_1');
    expect(result.source).toContain('let v_div_rem_1_quotient: i32 = v_div_rem_1_record.quotient;');
    expect(result.source).toContain('return v_div_rem_1_quotient;');

    const parsed = parseFlint(result.source, 'div_rem.flint');
    expect(parsed.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });

  it('supports custom Flint code node declarations', () => {
    const codeDefinition = getNodeDefinition('flint_code')!;
    const nodeA = createNodeFromDefinition(inputDefinition, 'in_a', { x: 0, y: 0 }, { name: 'a' });
    const nodeB = createNodeFromDefinition(inputDefinition, 'in_b', { x: 0, y: 50 }, { name: 'b' });
    const nodeCode = createNodeFromDefinition(
      codeDefinition,
      'code_1',
      { x: 100, y: 25 },
      {
        code: 'fn my_calc(a: i32, b: i32) -> i32 {\n  return a * 3 + b;\n}',
        functionName: 'my_calc',
      },
    );
    const nodeOut = createNodeFromDefinition(outputDefinition, 'out_1', { x: 200, y: 25 });

    const edges: readonly FlintGraphEdge[] = [
      { id: 'e1', fromNodeId: 'in_a', fromPortId: 'value', toNodeId: 'code_1', toPortId: 'a' },
      { id: 'e2', fromNodeId: 'in_b', fromPortId: 'value', toNodeId: 'code_1', toPortId: 'b' },
      { id: 'e3', fromNodeId: 'code_1', fromPortId: 'result', toNodeId: 'out_1', toPortId: 'value' },
    ];

    const graph: FlintNodeGraph = {
      id: 'custom_code_test',
      name: 'CustomCodeTest',
      nodes: [nodeA, nodeB, nodeCode, nodeOut],
      edges,
    };

    const result = emitGraphSource(graph);
    expect(result.source).toContain('fn my_calc(a: i32, b: i32) -> i32 {');
    expect(result.source).toContain('my_calc(a, b)');

    const parsed = parseFlint(result.source, 'custom_code.flint');
    expect(parsed.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });
});
