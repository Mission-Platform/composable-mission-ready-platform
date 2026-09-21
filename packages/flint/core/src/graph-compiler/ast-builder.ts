import {
  createPrimitiveType,
  createSyntheticSpan,
  flattenGraph,
  type FlintGraphNode,
  type FlintNodeGraph,
  type FlintNodeSourceMap,
} from './types.js';
import { validateGraph } from './validator.js';

import type {
  FlintCapabilityImport,
  FlintExpression,
  FlintFunction,
  FlintLetStatement,
  FlintLiteralExpression,
  FlintMatchArm,
  FlintModule,
  FlintParameter,
  FlintPrimitiveType,
  FlintReturnStatement,
  FlintStatement,
  FlintTypeName,
} from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

export interface FlintAstBuildResult {
  readonly module: FlintModule;
  readonly sourceMap: FlintNodeSourceMap;
  readonly entryFunctionName: string;
  readonly returnType: FlintTypeName;
}

function sanitizeIdentifier(name: string): string {
  const sanitized = name.replaceAll(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(sanitized)) {
    return `_${sanitized}`;
  }
  return sanitized.length === 0 ? '_val' : sanitized;
}

function spanKey(span: FlintSourceSpan): string {
  return `${span.line}:${span.column}:${span.endLine}:${span.endColumn}`;
}

/**
 * Builds an AST literal expression for a default or constant port value.
 */
function createLiteralExpression(value: unknown, type: FlintTypeName, span: FlintSourceSpan): FlintLiteralExpression {
  const primitiveType: FlintPrimitiveType = type.reference === undefined ? type.name : 'unit';

  if (typeof value === 'boolean') {
    return { kind: 'literal', value, type: 'bool', span };
  }
  if (typeof value === 'number') {
    return { kind: 'literal', value: Math.trunc(value), type: primitiveType === 'unit' ? 'i32' : primitiveType, span };
  }
  if (typeof value === 'string') {
    return { kind: 'literal', value, type: 'string', span };
  }

  // Fallback defaults by type name
  if (primitiveType === 'bool') {
    return { kind: 'literal', value: false, type: 'bool', span };
  }
  if (primitiveType === 'string') {
    return { kind: 'literal', value: '', type: 'string', span };
  }
  return { kind: 'literal', value: 0, type: primitiveType === 'unit' ? 'i32' : primitiveType, span };
}

type InputResolver = (node: FlintGraphNode, portId: string) => FlintExpression;

function buildArithmeticExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  switch (node.operation) {
    case 'add':
    case 'add_i32': {
      return { kind: 'binary', operator: '+', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'subtract':
    case 'subtract_i32': {
      return { kind: 'binary', operator: '-', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'multiply':
    case 'multiply_i32': {
      return { kind: 'binary', operator: '*', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'divide':
    case 'divide_i32': {
      return { kind: 'binary', operator: '/', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'modulo': {
      return { kind: 'binary', operator: '%', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'negate': {
      return { kind: 'unary', operator: '-', operand: resolveInput(node, 'a'), span };
    }
    case 'abs': {
      const a = resolveInput(node, 'a');
      const zero = createLiteralExpression(0, createPrimitiveType('i32'), span);
      const arms: readonly FlintMatchArm[] = [
        {
          kind: 'match-arm',
          pattern: { kind: 'literal', value: true, span },
          value: { kind: 'unary', operator: '-', operand: a, span },
          span,
        },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: a, span },
      ];
      return { kind: 'match', value: { kind: 'binary', operator: '<', left: a, right: zero, span }, arms, span };
    }
    case 'min': {
      const a = resolveInput(node, 'a');
      const b = resolveInput(node, 'b');
      const arms: readonly FlintMatchArm[] = [
        { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: a, span },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: b, span },
      ];
      return { kind: 'match', value: { kind: 'binary', operator: '<', left: a, right: b, span }, arms, span };
    }
    case 'max': {
      const a = resolveInput(node, 'a');
      const b = resolveInput(node, 'b');
      const arms: readonly FlintMatchArm[] = [
        { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: a, span },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: b, span },
      ];
      return { kind: 'match', value: { kind: 'binary', operator: '>', left: a, right: b, span }, arms, span };
    }
    default: {
      return undefined;
    }
  }
}

function buildComparisonExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  switch (node.operation) {
    case 'and': {
      return { kind: 'binary', operator: '&&', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'or': {
      return { kind: 'binary', operator: '||', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'not': {
      return { kind: 'unary', operator: '!', operand: resolveInput(node, 'a'), span };
    }
    case 'equals': {
      return { kind: 'binary', operator: '==', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'not_equals': {
      return { kind: 'binary', operator: '!=', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'greater_than': {
      return { kind: 'binary', operator: '>', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'less_than': {
      return { kind: 'binary', operator: '<', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'greater_or_equal': {
      return { kind: 'binary', operator: '>=', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    case 'less_or_equal': {
      return { kind: 'binary', operator: '<=', left: resolveInput(node, 'a'), right: resolveInput(node, 'b'), span };
    }
    default: {
      return undefined;
    }
  }
}

function buildCollectionExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  const primaryOutPort = node.outputs[0];
  switch (node.operation) {
    case 'vector_new': {
      const outType = primaryOutPort?.type ?? createPrimitiveType('i32');
      return { kind: 'vector-literal', elements: [], type: outType, span };
    }
    case 'vector_push': {
      return {
        kind: 'call',
        callee: 'Vector.push',
        arguments: [resolveInput(node, 'vector'), resolveInput(node, 'item')],
        span,
      };
    }
    case 'vector_get': {
      return {
        kind: 'call',
        callee: 'Vector.get',
        arguments: [resolveInput(node, 'vector'), resolveInput(node, 'index')],
        span,
      };
    }
    case 'vector_len': {
      return { kind: 'call', callee: 'Vector.length', arguments: [resolveInput(node, 'vector')], span };
    }
    case 'option_some': {
      const outType = primaryOutPort?.type ?? createPrimitiveType('i32');
      return { kind: 'enum-value', type: outType, variant: 'Some', arguments: [resolveInput(node, 'value')], span };
    }
    case 'option_none': {
      const outType = primaryOutPort?.type ?? createPrimitiveType('i32');
      return { kind: 'enum-value', type: outType, variant: 'None', arguments: [], span };
    }
    case 'option_unwrap_or': {
      const opt = resolveInput(node, 'option');
      const fallback = resolveInput(node, 'fallback');
      const arms: readonly FlintMatchArm[] = [
        {
          kind: 'match-arm',
          pattern: { kind: 'variant', name: 'Some', bindings: ['val'], span },
          value: { kind: 'identifier', name: 'val', span },
          span,
        },
        { kind: 'match-arm', pattern: { kind: 'variant', name: 'None', bindings: [], span }, value: fallback, span },
      ];
      return { kind: 'match', value: opt, arms, span };
    }
    default: {
      return undefined;
    }
  }
}

function buildControlOrTextExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  switch (node.operation) {
    case 'concat': {
      return {
        kind: 'call',
        callee: 'string_concat',
        arguments: [resolveInput(node, 'a'), resolveInput(node, 'b')],
        span,
      };
    }
    case 'string_length': {
      return { kind: 'call', callee: 'string_length', arguments: [resolveInput(node, 'value')], span };
    }
    case 'branch_if': {
      const condition = resolveInput(node, 'condition');
      const thenValue = resolveInput(node, 'thenValue');
      const elseValue = resolveInput(node, 'elseValue');
      const arms: readonly FlintMatchArm[] = [
        { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: thenValue, span },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: elseValue, span },
      ];
      return { kind: 'match', value: condition, arms, span };
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Lowers a validated FlintNodeGraph into an in-memory FlintModule AST and bidirectional source map.
 */
export function buildGraphAst(inputGraph: FlintNodeGraph): FlintAstBuildResult {
  const graph = flattenGraph(inputGraph);
  const validation = validateGraph(graph);
  if (!validation.valid || validation.sortedNodeIds === undefined) {
    const errorMessages = validation.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => issue.message)
      .join('\n');
    throw new Error(`Cannot build AST for invalid graph:\n${errorMessages}`);
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

  const moduleName = sanitizeIdentifier(graph.name || 'graph_module');
  const entryFunctionName = sanitizeIdentifier(graph.entryFunctionName ?? 'evaluate');

  const capabilityImports: FlintCapabilityImport[] = [];
  const parameters: FlintParameter[] = [];
  const statements: FlintStatement[] = [];

  let currentLine = 1;

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

    const importSpan = createSyntheticSpan(currentLine++, 1, 30);
    let resultType = createPrimitiveType('unit');
    let importParameters: readonly FlintParameter[] = [];

    switch (capability) {
      case 'clock.now': {
        resultType = createPrimitiveType('i64');
        break;
      }
      case 'random.f64': {
        resultType = createPrimitiveType('f64');
        break;
      }
      case 'env.log': {
        importParameters = [
          { kind: 'parameter', name: 'message', type: createPrimitiveType('string'), span: importSpan },
        ];
        break;
      }
      default: {
        break;
      }
    }

    capabilityImports.push({
      kind: 'capability-import',
      capability,
      alias,
      parameters: importParameters,
      result: resultType,
      span: importSpan,
    });
  }

  currentLine++;

  // 2. Process Input Nodes -> Function Parameters
  for (const nodeId of validation.sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined) continue;

    if (node.kind === 'input' || node.operation === 'input') {
      const outPort = node.outputs[0];
      const parameterName = sanitizeIdentifier(String(node.properties?.name ?? `param_${node.id}`));
      const parameterType = outPort?.type ?? createPrimitiveType('f32');
      const parameterSpan = createSyntheticSpan(currentLine, 1, parameterName.length + 10);

      parameters.push({
        kind: 'parameter',
        name: parameterName,
        type: parameterType,
        span: parameterSpan,
      });

      if (outPort !== undefined) {
        portToAstIdentifier.set(`${node.id}:${outPort.id}`, parameterName);
      }
      nodeToSpan.set(node.id, parameterSpan);
      spanToNode.set(spanKey(parameterSpan), node.id);
    }
  }

  currentLine++;

  function resolveInputExpression(node: FlintGraphNode, portId: string): FlintExpression {
    const port = node.inputs.find((p) => p.id === portId);
    const key = `${node.id}:${portId}`;
    const incoming = incomingEdges.get(key);

    if (incoming !== undefined) {
      const sourceIdentifier = portToAstIdentifier.get(`${incoming.fromNodeId}:${incoming.fromPortId}`);
      if (sourceIdentifier !== undefined) {
        return {
          kind: 'identifier',
          name: sourceIdentifier,
          span: createSyntheticSpan(currentLine, 1, sourceIdentifier.length),
        };
      }
    }

    const fallbackValue = port?.defaultValue;
    const fallbackType = port?.type ?? createPrimitiveType('f32');
    return createLiteralExpression(fallbackValue, fallbackType, createSyntheticSpan(currentLine, 1, 5));
  }

  // 3. Process Intermediate Computation Nodes
  for (const nodeId of validation.sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined) continue;
    if (node.kind === 'input' || node.operation === 'input') continue;
    if (node.kind === 'output' || node.operation === 'output') continue;

    const nodeSpan = createSyntheticSpan(currentLine++, 3, 40);
    nodeToSpan.set(node.id, nodeSpan);
    spanToNode.set(spanKey(nodeSpan), node.id);

    const primaryOutPort = node.outputs[0];
    const letVariableName = `v_${sanitizeIdentifier(node.id)}_${primaryOutPort ? sanitizeIdentifier(primaryOutPort.id) : 'out'}`;
    if (primaryOutPort !== undefined) {
      portToAstIdentifier.set(`${node.id}:${primaryOutPort.id}`, letVariableName);
    }

    let expression: FlintExpression | undefined;

    if (node.operation === 'constant') {
      const value = node.properties?.value;
      const outType = primaryOutPort?.type ?? createPrimitiveType('f32');
      expression = createLiteralExpression(value, outType, nodeSpan);
    } else {
      expression =
        buildArithmeticExpression(node, resolveInputExpression, nodeSpan) ??
        buildComparisonExpression(node, resolveInputExpression, nodeSpan) ??
        buildCollectionExpression(node, resolveInputExpression, nodeSpan) ??
        buildControlOrTextExpression(node, resolveInputExpression, nodeSpan);

      if (expression === undefined) {
        switch (node.operation) {
          case 'clock_now': {
            const alias = capabilityAliases.get('clock.now') ?? 'host_clock_now';
            expression = { kind: 'call', callee: alias, arguments: [], span: nodeSpan };

            break;
          }
          case 'random_f64': {
            const alias = capabilityAliases.get('random.f64') ?? 'host_random_f64';
            expression = { kind: 'call', callee: alias, arguments: [], span: nodeSpan };

            break;
          }
          case 'log_debug': {
            const alias = capabilityAliases.get('env.log') ?? 'host_log_debug';
            expression = {
              kind: 'call',
              callee: alias,
              arguments: [resolveInputExpression(node, 'message')],
              span: nodeSpan,
            };

            break;
          }
          default: {
            const arguments_ = node.inputs.map((port) => resolveInputExpression(node, port.id));
            expression = { kind: 'call', callee: node.operation, arguments: arguments_, span: nodeSpan };
          }
        }
      }
    }

    const letStatement: FlintLetStatement = {
      kind: 'let',
      name: letVariableName,
      type: primaryOutPort?.type ?? createPrimitiveType('f32'),
      value: expression,
      span: nodeSpan,
    };

    statements.push(letStatement);
  }

  // 4. Process Output Node -> Return Statement
  const outputNodes = graph.nodes.filter((node) => node.kind === 'output' || node.operation === 'output');
  let returnType: FlintTypeName = createPrimitiveType('unit');
  let returnStatement: FlintReturnStatement;

  if (outputNodes.length === 0) {
    returnStatement = { kind: 'return', span: createSyntheticSpan(currentLine++, 3, 7) };
    statements.push(returnStatement);
  } else {
    const primaryOutput = outputNodes[0];
    if (primaryOutput === undefined) {
      returnStatement = { kind: 'return', span: createSyntheticSpan(currentLine++, 3, 7) };
      statements.push(returnStatement);
    } else {
      const returnSpan = createSyntheticSpan(currentLine++, 3, 20);
      nodeToSpan.set(primaryOutput.id, returnSpan);
      spanToNode.set(spanKey(returnSpan), primaryOutput.id);

      const inPort = primaryOutput.inputs[0];
      const returnExpr = inPort ? resolveInputExpression(primaryOutput, inPort.id) : undefined;
      returnType = inPort?.type ?? createPrimitiveType('f32');

      returnStatement = {
        kind: 'return',
        value: returnExpr,
        span: returnSpan,
      };
      statements.push(returnStatement);
    }
  }

  const functionSpan = createSyntheticSpan(1, 1, currentLine * 30);
  const mainFunction: FlintFunction = {
    kind: 'function',
    name: entryFunctionName,
    exported: true,
    genericParameters: [],
    parameters,
    result: returnType,
    body: statements,
    span: functionSpan,
  };

  const moduleSpan = createSyntheticSpan(1, 1, currentLine * 30);
  const flintModule: FlintModule = {
    kind: 'module',
    name: moduleName,
    imports: capabilityImports,
    sourceImports: [],
    structs: [],
    enums: [],
    interfaces: [],
    functions: [mainFunction],
    span: moduleSpan,
  };

  return {
    module: flintModule,
    sourceMap: {
      nodeToSpan,
      spanToNode,
      portToAstIdentifier,
    },
    entryFunctionName,
    returnType,
  };
}
