import { flintTypeNameToString, type FlintPrimitiveType, type FlintTypeName } from '../ast.js';

import {
  flattenGraph,
  type FlintGraphNode,
  type FlintGraphPort,
  type FlintNodeGraph,
  type FlintNodeSourceMap,
} from './types.js';
import { validateGraph } from './validator.js';

import type { FlintSourceSpan } from '../diagnostics.js';

export interface FlintSourceEmissionResult {
  readonly source: string;
  readonly sourceMap: FlintNodeSourceMap;
  readonly entryFunctionName: string;
  readonly returnType: FlintTypeName;
}

/**
 * Normalizes an arbitrary string into a valid Flint identifier.
 */
function sanitizeIdentifier(name: string): string {
  const sanitized = name.replaceAll(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(sanitized)) {
    return `_${sanitized}`;
  }
  return sanitized.length === 0 ? '_val' : sanitized;
}

/**
 * Computes a unique string key for a source span location.
 */
function spanKey(span: FlintSourceSpan): string {
  return `${span.line}:${span.column}:${span.endLine}:${span.endColumn}`;
}

/**
 * Formats a primitive or default port value as a valid Flint literal code string.
 */
function formatLiteral(value: unknown, type: FlintTypeName): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return `${Math.trunc(value)}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  const primitiveType: FlintPrimitiveType = type.reference === undefined ? type.name : 'unit';
  if (primitiveType === 'bool') return 'false';
  if (primitiveType === 'string') return '""';
  return '0';
}

type SourceResolver = (node: FlintGraphNode, portId: string) => string;

const BINARY_ARITHMETIC_SYMBOLS: Readonly<Record<string, string>> = {
  add: '+',
  add_i32: '+',
  subtract: '-',
  subtract_i32: '-',
  multiply: '*',
  multiply_i32: '*',
  divide: '/',
  divide_i32: '/',
  modulo: '%',
};

/**
 * Emits advanced multi-branch arithmetic or composite struct expressions into Flint source code.
 */
function emitAdvancedArithmeticExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  switch (node.operation) {
    case 'negate': {
      return `-${resolveSource(node, 'a')}`;
    }
    case 'min': {
      const leftValue = resolveSource(node, 'a');
      const rightValue = resolveSource(node, 'b');
      return `match ${leftValue} < ${rightValue} { true => ${leftValue}, false => ${rightValue} }`;
    }
    case 'max': {
      const leftValue = resolveSource(node, 'a');
      const rightValue = resolveSource(node, 'b');
      return `match ${leftValue} > ${rightValue} { true => ${leftValue}, false => ${rightValue} }`;
    }
    case 'abs': {
      const operandValue = resolveSource(node, 'a');
      return `match ${operandValue} < 0 { true => -${operandValue}, false => ${operandValue} }`;
    }
    case 'div_rem': {
      const structName = `Record_${sanitizeIdentifier(node.id)}`;
      const dividendValue = resolveSource(node, 'a');
      const divisorValue = resolveSource(node, 'b');
      return `${structName} { quotient: ${dividendValue} / ${divisorValue}, remainder: ${dividendValue} % ${divisorValue} }`;
    }
    case 'min_max': {
      const structName = `Record_${sanitizeIdentifier(node.id)}`;
      const firstValue = resolveSource(node, 'a');
      const secondValue = resolveSource(node, 'b');
      return `${structName} { min: match ${firstValue} < ${secondValue} { true => ${firstValue}, false => ${secondValue} }, max: match ${firstValue} > ${secondValue} { true => ${firstValue}, false => ${secondValue} } }`;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Emits mathematical and arithmetic expressions into Flint binary, unary, or match source code.
 */
function emitArithmeticExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  const symbol = BINARY_ARITHMETIC_SYMBOLS[node.operation];
  if (symbol !== undefined) {
    return `${resolveSource(node, 'a')} ${symbol} ${resolveSource(node, 'b')}`;
  }
  return emitAdvancedArithmeticExpression(node, resolveSource);
}

const BINARY_COMPARISON_SYMBOLS: Readonly<Record<string, string>> = {
  and: '&&',
  or: '||',
  equals: '==',
  not_equals: '!=',
  greater_than: '>',
  less_than: '<',
  greater_or_equal: '>=',
  less_or_equal: '<=',
};

/**
 * Emits boolean comparison and logical expressions into Flint binary or unary source code.
 */
function emitComparisonExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  if (node.operation === 'not') {
    return `!${resolveSource(node, 'a')}`;
  }
  const symbol = BINARY_COMPARISON_SYMBOLS[node.operation];
  if (symbol !== undefined) {
    return `${resolveSource(node, 'a')} ${symbol} ${resolveSource(node, 'b')}`;
  }
  return undefined;
}

/**
 * Emits vector collection operations into standard library Flint source expressions.
 */
function emitVectorExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  switch (node.operation) {
    case 'vector_new': {
      return 'vector[]';
    }
    case 'vector_push': {
      return `Vector.push(${resolveSource(node, 'vector')}, ${resolveSource(node, 'item')})`;
    }
    case 'vector_get': {
      return `Vector.get(${resolveSource(node, 'vector')}, ${resolveSource(node, 'index')})`;
    }
    case 'vector_len': {
      return `Vector.length(${resolveSource(node, 'vector')})`;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Emits option expressions into enum variant construction or pattern match unwrapping expressions.
 */
function emitOptionExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  switch (node.operation) {
    case 'option_some': {
      return `Option::Some(${resolveSource(node, 'value')})`;
    }
    case 'option_none': {
      return 'Option::None';
    }
    case 'option_unwrap_or': {
      const opt = resolveSource(node, 'option');
      const fallback = resolveSource(node, 'fallback');
      return `match ${opt} { Option::Some(val) => val, Option::None => ${fallback} }`;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Emits vector and option collection expressions into Flint standard library function calls.
 */
function emitCollectionExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  return emitVectorExpression(node, resolveSource) ?? emitOptionExpression(node, resolveSource);
}

/**
 * Emits string operations and branching conditionals into Flint expressions.
 */
function emitControlOrTextExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  switch (node.operation) {
    case 'concat': {
      return `string_concat(${resolveSource(node, 'a')}, ${resolveSource(node, 'b')})`;
    }
    case 'string_length': {
      return `string_length(${resolveSource(node, 'value')})`;
    }
    case 'branch_if': {
      const cond = resolveSource(node, 'condition');
      const thenValue = resolveSource(node, 'thenValue');
      const elseValue = resolveSource(node, 'elseValue');
      return `match ${cond} { true => ${thenValue}, false => ${elseValue} }`;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Collects host capabilities required by capability and capability-call nodes.
 */
function collectRequiredCapabilities(nodes: readonly FlintGraphNode[], initial: readonly string[]): Set<string> {
  const required = new Set<string>(initial);
  for (const node of nodes) {
    if (node.category === 'capability' || node.kind === 'capability_call') {
      const capabilityName =
        node.operation === 'clock_now'
          ? 'clock.now'
          : node.operation === 'random_f64'
            ? 'random.f64'
            : node.operation === 'log_debug'
              ? 'env.log'
              : String(node.properties?.capability ?? node.operation);
      required.add(capabilityName);
    }
  }
  return required;
}

/**
 * Emits capability import statements and returns a map of aliases.
 */
function emitCapabilityImports(
  requiredCapabilities: ReadonlySet<string>,
  appendLine: (text: string) => void,
): Map<string, string> {
  const capabilityAliases = new Map<string, string>();
  for (const capability of requiredCapabilities) {
    const alias = `host_${sanitizeIdentifier(capability)}`;
    capabilityAliases.set(capability, alias);

    let signature = '() -> unit;';
    switch (capability) {
      case 'clock.now': {
        signature = '() -> i64;';
        break;
      }
      case 'random.f64': {
        signature = '() -> f64;';
        break;
      }
      case 'env.log': {
        signature = '(message: string) -> unit;';
        break;
      }
      default: {
        break;
      }
    }

    appendLine(`import capability "${capability}" as ${alias}${signature}`);
  }

  if (requiredCapabilities.size > 0) {
    appendLine('');
  }
  return capabilityAliases;
}

/**
 * Emits record struct declarations for multi-output nodes.
 */
function emitRecordStructs(nodes: readonly FlintGraphNode[], appendLine: (text: string) => void): void {
  for (const node of nodes) {
    if (node.outputs.length > 1) {
      const structName = `Record_${sanitizeIdentifier(node.id)}`;
      appendLine(`record ${structName} {`);
      for (const port of node.outputs) {
        appendLine(`  ${sanitizeIdentifier(port.id)}: ${flintTypeNameToString(port.type)};`);
      }
      appendLine('}\n');
    }
  }
}

/**
 * Emits user-defined custom code declarations once per unique code body.
 */
function emitCustomCodeDeclarations(nodes: readonly FlintGraphNode[], appendLine: (text: string) => void): void {
  const emittedCustomCode = new Set<string>();
  for (const node of nodes) {
    if ((node.kind === 'custom' || node.operation === 'flint_code') && node.properties?.code) {
      const codeString = String(node.properties.code).trim();
      if (!emittedCustomCode.has(codeString)) {
        emittedCustomCode.add(codeString);
        appendLine(`${codeString}\n`);
      }
    }
  }
}

/**
 * Collects parameter names and types for function declaration header.
 */
function collectInputParameters(
  sortedNodeIds: readonly string[],
  nodeMap: ReadonlyMap<string, FlintGraphNode>,
  portToAstIdentifier: Map<string, string>,
): { name: string; type: string }[] {
  const functionParameters: { name: string; type: string }[] = [];
  for (const nodeId of sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined || (node.kind !== 'input' && node.operation !== 'input')) {
      continue;
    }
    const outPort = node.outputs[0];
    const parameterName = sanitizeIdentifier(String(node.properties?.name ?? `param_${node.id}`));
    const parameterType = outPort ? flintTypeNameToString(outPort.type) : 'f32';

    functionParameters.push({ name: parameterName, type: parameterType });
    if (outPort !== undefined) {
      portToAstIdentifier.set(`${node.id}:${outPort.id}`, parameterName);
    }
  }
  return functionParameters;
}

/**
 * Registers source spans for function parameters within the header record.
 */
function recordParameterSpans(
  sortedNodeIds: readonly string[],
  nodeMap: ReadonlyMap<string, FlintGraphNode>,
  functionHeaderRecord: { start: number; line: number },
  prefixLength: number,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): void {
  let currentParameterOffset = prefixLength;
  for (const nodeId of sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined || (node.kind !== 'input' && node.operation !== 'input')) {
      continue;
    }
    const outPort = node.outputs[0];
    const parameterName = sanitizeIdentifier(String(node.properties?.name ?? `param_${node.id}`));
    const parameterType = outPort ? flintTypeNameToString(outPort.type) : 'i32';
    const parameterText = `${parameterName}: ${parameterType}`;

    const spanStart = functionHeaderRecord.start + currentParameterOffset;
    const spanEnd = spanStart + parameterText.length;
    const spanColumn = currentParameterOffset + 1;
    const spanEndColumn = spanColumn + parameterText.length;

    const span: FlintSourceSpan = {
      start: spanStart,
      end: spanEnd,
      line: functionHeaderRecord.line,
      column: spanColumn,
      endLine: functionHeaderRecord.line,
      endColumn: spanEndColumn,
    };
    nodeToSpan.set(node.id, span);
    spanToNode.set(spanKey(span), node.id);

    currentParameterOffset += parameterText.length + 2;
  }
}

/**
 * Formats zero-argument host capability call strings.
 */
function resolveCapabilityCallSource(
  operation: string,
  capabilityAliases: ReadonlyMap<string, string>,
): string | undefined {
  if (operation === 'clock_now') {
    const alias = capabilityAliases.get('clock.now') ?? 'host_clock_now';
    return `${alias}()`;
  }
  if (operation === 'random_f64') {
    const alias = capabilityAliases.get('random.f64') ?? 'host_random_f64';
    return `${alias}()`;
  }
  return undefined;
}

/**
 * Resolves capability calls or custom function invocations into Flint expression strings.
 */
function resolveCapabilityOrCustomExpression(
  node: FlintGraphNode,
  capabilityAliases: ReadonlyMap<string, string>,
  resolveInputSource: SourceResolver,
): string {
  const capabilityCall = resolveCapabilityCallSource(node.operation, capabilityAliases);
  if (capabilityCall !== undefined) {
    return capabilityCall;
  }
  if (node.operation === 'log_debug') {
    const alias = capabilityAliases.get('env.log') ?? 'host_log_debug';
    return `${alias}(${resolveInputSource(node, 'message')})`;
  }

  const arguments_ = node.inputs.map((port) => resolveInputSource(node, port.id)).join(', ');
  if (node.operation === 'flint_code' || node.kind === 'custom') {
    const customFunctionName = sanitizeIdentifier(String(node.properties?.functionName ?? `custom_${node.id}`));
    return `${customFunctionName}(${arguments_})`;
  }
  return `${node.operation}(${arguments_})`;
}

/**
 * Resolves the expression string for a computation node.
 */
function resolveNodeSourceExpression(
  node: FlintGraphNode,
  resolveInputSource: SourceResolver,
  capabilityAliases: ReadonlyMap<string, string>,
  primaryOutPort?: FlintGraphPort,
): string {
  if (node.operation === 'constant') {
    const value = node.properties?.value;
    const outType = primaryOutPort?.type ?? {
      kind: 'type-name',
      name: 'f32',
      span: { start: 0, end: 3, line: 1, column: 1, endLine: 1, endColumn: 4 },
    };
    return formatLiteral(value, outType);
  }

  return (
    emitArithmeticExpression(node, resolveInputSource) ??
    emitComparisonExpression(node, resolveInputSource) ??
    emitCollectionExpression(node, resolveInputSource) ??
    emitControlOrTextExpression(node, resolveInputSource) ??
    resolveCapabilityOrCustomExpression(node, capabilityAliases, resolveInputSource)
  );
}

/**
 * Emits multi-output record construction and decomposed field let-statements.
 */
function emitMultiOutputRecordSource(
  node: FlintGraphNode,
  expressionText: string,
  appendLine: (text: string) => { start: number; end: number; line: number; text: string },
  portToAstIdentifier: Map<string, string>,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): void {
  const structName = `Record_${sanitizeIdentifier(node.id)}`;
  const recordVariableName = `v_${sanitizeIdentifier(node.id)}_record`;
  const statementRecord = appendLine(`  let ${recordVariableName}: ${structName} = ${expressionText};`);
  const span: FlintSourceSpan = {
    start: statementRecord.start,
    end: statementRecord.end,
    line: statementRecord.line,
    column: 3,
    endLine: statementRecord.line,
    endColumn: statementRecord.text.length + 1,
  };
  nodeToSpan.set(node.id, span);
  spanToNode.set(spanKey(span), node.id);

  if (node.splitOutputs !== false) {
    for (const outPort of node.outputs) {
      const fieldVariableName = `v_${sanitizeIdentifier(node.id)}_${sanitizeIdentifier(outPort.id)}`;
      const fieldTypeString = flintTypeNameToString(outPort.type);
      portToAstIdentifier.set(`${node.id}:${outPort.id}`, fieldVariableName);
      appendLine(
        `  let ${fieldVariableName}: ${fieldTypeString} = ${recordVariableName}.${sanitizeIdentifier(outPort.id)};`,
      );
    }
  } else if (node.outputs[0] !== undefined) {
    portToAstIdentifier.set(`${node.id}:${node.outputs[0].id}`, recordVariableName);
  }
}

/**
 * Emits single-variable let statement.
 */
function emitSingleOutputSource(
  node: FlintGraphNode,
  letVariableName: string,
  outTypeString: string,
  expressionText: string,
  appendLine: (text: string) => { start: number; end: number; line: number; text: string },
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): void {
  const statementRecord = appendLine(`  let ${letVariableName}: ${outTypeString} = ${expressionText};`);
  const span: FlintSourceSpan = {
    start: statementRecord.start,
    end: statementRecord.end,
    line: statementRecord.line,
    column: 3,
    endLine: statementRecord.line,
    endColumn: statementRecord.text.length + 1,
  };
  nodeToSpan.set(node.id, span);
  spanToNode.set(spanKey(span), node.id);
}

/**
 * Emits a single intermediate computation node into SSA let-statements.
 */
function emitSingleIntermediateNode(
  node: FlintGraphNode,
  resolveInputSource: SourceResolver,
  capabilityAliases: ReadonlyMap<string, string>,
  appendLine: (text: string) => { start: number; end: number; line: number; text: string },
  portToAstIdentifier: Map<string, string>,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): void {
  const primaryOutPort = node.outputs[0];
  const letVariableName = `v_${sanitizeIdentifier(node.id)}_${primaryOutPort ? sanitizeIdentifier(primaryOutPort.id) : 'out'}`;
  const outTypeString = primaryOutPort ? flintTypeNameToString(primaryOutPort.type) : 'f32';

  if (primaryOutPort !== undefined) {
    portToAstIdentifier.set(`${node.id}:${primaryOutPort.id}`, letVariableName);
  }

  const expressionText = resolveNodeSourceExpression(node, resolveInputSource, capabilityAliases, primaryOutPort);
  if (node.outputs.length > 1) {
    emitMultiOutputRecordSource(node, expressionText, appendLine, portToAstIdentifier, nodeToSpan, spanToNode);
  } else {
    emitSingleOutputSource(node, letVariableName, outTypeString, expressionText, appendLine, nodeToSpan, spanToNode);
  }
}

/**
 * Emits all intermediate computation node let statements.
 */
function emitIntermediateNodesSource(
  sortedNodeIds: readonly string[],
  nodeMap: ReadonlyMap<string, FlintGraphNode>,
  resolveInputSource: SourceResolver,
  capabilityAliases: ReadonlyMap<string, string>,
  appendLine: (text: string) => { start: number; end: number; line: number; text: string },
  portToAstIdentifier: Map<string, string>,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): void {
  for (const nodeId of sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (
      node === undefined ||
      node.kind === 'input' ||
      node.operation === 'input' ||
      node.kind === 'output' ||
      node.operation === 'output'
    ) {
      continue;
    }
    emitSingleIntermediateNode(
      node,
      resolveInputSource,
      capabilityAliases,
      appendLine,
      portToAstIdentifier,
      nodeToSpan,
      spanToNode,
    );
  }
}

/**
 * Emits the function return statement and registers source span for the primary output node.
 */
function emitReturnStatementSource(
  outputNodes: readonly FlintGraphNode[],
  resolveInputSource: SourceResolver,
  appendLine: (text: string) => { start: number; end: number; line: number; text: string },
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): void {
  if (outputNodes.length === 0 || outputNodes[0] === undefined) {
    appendLine('  return;');
    return;
  }

  const primaryOutput = outputNodes[0];
  const inPort = primaryOutput.inputs[0];
  const returnExprText = inPort ? resolveInputSource(primaryOutput, inPort.id) : '';
  const returnRecord = appendLine(`  return ${returnExprText};`);
  const returnSpan: FlintSourceSpan = {
    start: returnRecord.start,
    end: returnRecord.end,
    line: returnRecord.line,
    column: 3,
    endLine: returnRecord.line,
    endColumn: returnRecord.text.length + 1,
  };
  nodeToSpan.set(primaryOutput.id, returnSpan);
  spanToNode.set(spanKey(returnSpan), primaryOutput.id);
}

/**
 * Emits clean, formatted Flint source code from a validated graph with exact bidirectional source maps.
 */
export function emitGraphSource(inputGraph: FlintNodeGraph): FlintSourceEmissionResult {
  const graph = flattenGraph(inputGraph);
  const validation = validateGraph(graph);
  if (!validation.valid || validation.sortedNodeIds === undefined) {
    const errorMessages = validation.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => issue.message)
      .join('\n');
    throw new Error(`Cannot emit source for invalid graph:\n${errorMessages}`);
  }

  const nodeMap = new Map<string, FlintGraphNode>(graph.nodes.map((node) => [node.id, node]));
  const nodeToSpan = new Map<string, FlintSourceSpan>();
  const spanToNode = new Map<string, string>();
  const portToAstIdentifier = new Map<string, string>();

  const incomingEdges = new Map<string, { fromNodeId: string; fromPortId: string }>();
  for (const edge of graph.edges) {
    incomingEdges.set(`${edge.toNodeId}:${edge.toPortId}`, {
      fromNodeId: edge.fromNodeId,
      fromPortId: edge.fromPortId,
    });
  }

  const lines: string[] = [];
  let currentOffset = 0;

  /**
   * Appends a line of code to the emitted source buffer and records offset metadata.
   */
  function appendLine(text: string): { start: number; end: number; line: number; text: string } {
    const lineIndex = lines.length + 1;
    const lineStart = currentOffset;
    lines.push(text);
    currentOffset += text.length + 1;
    return {
      start: lineStart,
      end: lineStart + text.length,
      line: lineIndex,
      text,
    };
  }

  appendLine('// Generated by Flint Graph Compiler');
  appendLine(`// Module: ${graph.name || 'GraphModule'}`);
  appendLine('');

  const requiredCapabilities = collectRequiredCapabilities(graph.nodes, graph.requestedCapabilities ?? []);
  const capabilityAliases = emitCapabilityImports(requiredCapabilities, appendLine);
  emitRecordStructs(graph.nodes, appendLine);
  emitCustomCodeDeclarations(graph.nodes, appendLine);

  const functionParameters = collectInputParameters(validation.sortedNodeIds, nodeMap, portToAstIdentifier);
  const entryFunctionName = sanitizeIdentifier(graph.entryFunctionName ?? 'evaluate');
  const parameterString = functionParameters.map((p) => `${p.name}: ${p.type}`).join(', ');

  const outputNodes = graph.nodes.filter((node) => node.kind === 'output' || node.operation === 'output');
  let returnTypeString = 'unit';
  let returnTypeNode: FlintTypeName = {
    kind: 'type-name',
    name: 'unit',
    span: { start: 0, end: 4, line: 1, column: 1, endLine: 1, endColumn: 5 },
  };

  if (outputNodes.length > 0 && outputNodes[0]?.inputs[0] !== undefined) {
    const inPort = outputNodes[0].inputs[0];
    returnTypeString = flintTypeNameToString(inPort.type);
    returnTypeNode = inPort.type;
  }

  const prefix = `export fn ${entryFunctionName}(`;
  const functionHeaderRecord = appendLine(`${prefix}${parameterString}) -> ${returnTypeString} {`);

  recordParameterSpans(validation.sortedNodeIds, nodeMap, functionHeaderRecord, prefix.length, nodeToSpan, spanToNode);

  /**
   * Resolves the source code expression for an input port from incoming edges or default literals.
   */
  function resolveInputSource(node: FlintGraphNode, portId: string): string {
    const port = node.inputs.find((p) => p.id === portId);
    const key = `${node.id}:${portId}`;
    const incoming = incomingEdges.get(key);

    if (incoming !== undefined) {
      const sourceIdentifier = portToAstIdentifier.get(`${incoming.fromNodeId}:${incoming.fromPortId}`);
      if (sourceIdentifier !== undefined) {
        return sourceIdentifier;
      }
    }

    const fallbackValue = port?.defaultValue;
    const fallbackType: FlintTypeName = port?.type ?? {
      kind: 'type-name',
      name: 'f32',
      span: { start: 0, end: 3, line: 1, column: 1, endLine: 1, endColumn: 4 },
    };
    return formatLiteral(fallbackValue, fallbackType);
  }

  emitIntermediateNodesSource(
    validation.sortedNodeIds,
    nodeMap,
    resolveInputSource,
    capabilityAliases,
    appendLine,
    portToAstIdentifier,
    nodeToSpan,
    spanToNode,
  );

  emitReturnStatementSource(outputNodes, resolveInputSource, appendLine, nodeToSpan, spanToNode);

  appendLine('}');
  const sourceText = lines.join('\n');

  return {
    source: sourceText,
    sourceMap: {
      nodeToSpan,
      spanToNode,
      portToAstIdentifier,
    },
    entryFunctionName,
    returnType: returnTypeNode,
  };
}
