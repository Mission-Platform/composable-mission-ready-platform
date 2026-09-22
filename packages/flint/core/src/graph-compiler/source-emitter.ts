import { flintTypeNameToString, type FlintPrimitiveType, type FlintTypeName } from '../ast.js';

import { flattenGraph, type FlintGraphNode, type FlintNodeGraph, type FlintNodeSourceMap } from './types.js';
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

/**
 * Emits mathematical and arithmetic expressions into Flint binary, unary, or match source code.
 */
// skipcq: JS-R1005
function emitArithmeticExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  switch (node.operation) {
    case 'add':
    case 'add_i32': {
      return `${resolveSource(node, 'a')} + ${resolveSource(node, 'b')}`;
    }
    case 'subtract':
    case 'subtract_i32': {
      return `${resolveSource(node, 'a')} - ${resolveSource(node, 'b')}`;
    }
    case 'multiply':
    case 'multiply_i32': {
      return `${resolveSource(node, 'a')} * ${resolveSource(node, 'b')}`;
    }
    case 'divide':
    case 'divide_i32': {
      return `${resolveSource(node, 'a')} / ${resolveSource(node, 'b')}`;
    }
    case 'modulo': {
      return `${resolveSource(node, 'a')} % ${resolveSource(node, 'b')}`;
    }
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
 * Emits boolean comparison and logical expressions into Flint binary or unary source code.
 */
// skipcq: JS-R1005
function emitComparisonExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
  switch (node.operation) {
    case 'and': {
      return `${resolveSource(node, 'a')} && ${resolveSource(node, 'b')}`;
    }
    case 'or': {
      return `${resolveSource(node, 'a')} || ${resolveSource(node, 'b')}`;
    }
    case 'not': {
      return `!${resolveSource(node, 'a')}`;
    }
    case 'equals': {
      return `${resolveSource(node, 'a')} == ${resolveSource(node, 'b')}`;
    }
    case 'not_equals': {
      return `${resolveSource(node, 'a')} != ${resolveSource(node, 'b')}`;
    }
    case 'greater_than': {
      return `${resolveSource(node, 'a')} > ${resolveSource(node, 'b')}`;
    }
    case 'less_than': {
      return `${resolveSource(node, 'a')} < ${resolveSource(node, 'b')}`;
    }
    case 'greater_or_equal': {
      return `${resolveSource(node, 'a')} >= ${resolveSource(node, 'b')}`;
    }
    case 'less_or_equal': {
      return `${resolveSource(node, 'a')} <= ${resolveSource(node, 'b')}`;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Emits vector and option collection expressions into Flint standard library function calls.
 */
// skipcq: JS-R1005
function emitCollectionExpression(node: FlintGraphNode, resolveSource: SourceResolver): string | undefined {
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
 * Emits clean, formatted Flint source code from a validated graph with exact bidirectional source maps.
 */
// skipcq: JS-R1005
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
   * Appends a source line to the emitted output and records its source offset and line metadata.
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

  // 1. Process Host Capability Imports
  const requiredCapabilities = new Set<string>(graph.requestedCapabilities);
  for (const node of graph.nodes) {
    if (node.category === 'capability' || node.kind === 'capability_call') {
      const capabilityName =
        node.operation === 'clock_now'
          ? 'clock.now'
          : node.operation === 'random_f64'
            ? 'random.f64'
            : node.operation === 'log_debug'
              ? 'env.log'
              : String(node.properties?.capability ?? node.operation);
      requiredCapabilities.add(capabilityName);
    }
  }

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

  // 1.5. Emit Record Structs for Multi-Output Nodes
  for (const node of graph.nodes) {
    if (node.outputs.length > 1) {
      const structName = `Record_${sanitizeIdentifier(node.id)}`;
      appendLine(`record ${structName} {`);
      for (const port of node.outputs) {
        appendLine(`  ${sanitizeIdentifier(port.id)}: ${flintTypeNameToString(port.type)};`);
      }
      appendLine('}\n');
    }
  }

  // 1.6. Emit Custom Code Functions
  const emittedCustomCode = new Set<string>();
  for (const node of graph.nodes) {
    if ((node.kind === 'custom' || node.operation === 'flint_code') && node.properties?.code) {
      const codeString = String(node.properties.code).trim();
      if (!emittedCustomCode.has(codeString)) {
        emittedCustomCode.add(codeString);
        appendLine(`${codeString}\n`);
      }
    }
  }

  // 2. Identify Function Parameters (Input Nodes)
  const functionParameters: { name: string; type: string }[] = [];
  for (const nodeId of validation.sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined) continue;

    if (node.kind === 'input' || node.operation === 'input') {
      const outPort = node.outputs[0];
      const parameterName = sanitizeIdentifier(String(node.properties?.name ?? `param_${node.id}`));
      const parameterType = outPort ? flintTypeNameToString(outPort.type) : 'f32';

      functionParameters.push({ name: parameterName, type: parameterType });
      if (outPort !== undefined) {
        portToAstIdentifier.set(`${node.id}:${outPort.id}`, parameterName);
      }
    }
  }

  const entryFunctionName = sanitizeIdentifier(graph.entryFunctionName ?? 'evaluate');
  const parameterString = functionParameters.map((p) => `${p.name}: ${p.type}`).join(', ');

  const outputNodes = graph.nodes.filter((node) => node.kind === 'output' || node.operation === 'output');
  let returnTypeString = 'unit';
  let returnTypeNode: FlintTypeName = {
    kind: 'type-name',
    name: 'unit',
    span: { start: 0, end: 4, line: 1, column: 1, endLine: 1, endColumn: 5 },
  };

  if (outputNodes.length > 0) {
    const primaryOutput = outputNodes[0];
    const inPort = primaryOutput?.inputs[0];
    if (inPort !== undefined) {
      returnTypeString = flintTypeNameToString(inPort.type);
      returnTypeNode = inPort.type;
    }
  }

  const prefix = `export fn ${entryFunctionName}(`;
  const functionHeaderRecord = appendLine(`${prefix}${parameterString}) -> ${returnTypeString} {`);

  let currentParameterOffset = prefix.length;
  for (const nodeId of validation.sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined) continue;
    if (node.kind === 'input' || node.operation === 'input') {
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

      currentParameterOffset += parameterText.length + 2; // account for ', '
    }
  }

  /**
   * Resolves an incoming port connection or literal fallback into a Flint source code string.
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

  // 3. Emit Intermediate SSA Let Statements
  for (const nodeId of validation.sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined) continue;

    if (node.kind === 'input' || node.operation === 'input') continue;
    if (node.kind === 'output' || node.operation === 'output') continue;

    const primaryOutPort = node.outputs[0];
    const letVariableName = `v_${sanitizeIdentifier(node.id)}_${primaryOutPort ? sanitizeIdentifier(primaryOutPort.id) : 'out'}`;
    const outTypeString = primaryOutPort ? flintTypeNameToString(primaryOutPort.type) : 'f32';

    if (primaryOutPort !== undefined) {
      portToAstIdentifier.set(`${node.id}:${primaryOutPort.id}`, letVariableName);
    }

    let expressionText: string | undefined;

    if (node.operation === 'constant') {
      const value = node.properties?.value;
      const outType = primaryOutPort?.type ?? {
        kind: 'type-name',
        name: 'f32',
        span: { start: 0, end: 3, line: 1, column: 1, endLine: 1, endColumn: 4 },
      };
      expressionText = formatLiteral(value, outType);
    } else {
      expressionText =
        emitArithmeticExpression(node, resolveInputSource) ??
        emitComparisonExpression(node, resolveInputSource) ??
        emitCollectionExpression(node, resolveInputSource) ??
        emitControlOrTextExpression(node, resolveInputSource);

      if (expressionText === undefined) {
        switch (node.operation) {
          case 'clock_now': {
            const alias = capabilityAliases.get('clock.now') ?? 'host_clock_now';
            expressionText = `${alias}()`;

            break;
          }
          case 'random_f64': {
            const alias = capabilityAliases.get('random.f64') ?? 'host_random_f64';
            expressionText = `${alias}()`;

            break;
          }
          case 'log_debug': {
            const alias = capabilityAliases.get('env.log') ?? 'host_log_debug';
            expressionText = `${alias}(${resolveInputSource(node, 'message')})`;

            break;
          }
          default: {
            if (node.operation === 'flint_code' || node.kind === 'custom') {
              const customFunctionName = sanitizeIdentifier(
                String(node.properties?.functionName ?? `custom_${node.id}`),
              );
              const arguments_ = node.inputs.map((port) => resolveInputSource(node, port.id)).join(', ');
              expressionText = `${customFunctionName}(${arguments_})`;
            } else {
              const arguments_ = node.inputs.map((port) => resolveInputSource(node, port.id)).join(', ');
              expressionText = `${node.operation}(${arguments_})`;
            }
          }
        }
      }
    }

    if (node.outputs.length > 1) {
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
      } else if (primaryOutPort !== undefined) {
        portToAstIdentifier.set(`${node.id}:${primaryOutPort.id}`, recordVariableName);
      }
    } else {
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
  }

  // 4. Emit Return Statement
  if (outputNodes.length === 0) {
    appendLine('  return;');
  } else {
    const primaryOutput = outputNodes[0];
    if (primaryOutput === undefined) {
      appendLine('  return;');
    } else {
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
  }

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
