import {
  createPrimitiveType,
  createSyntheticSpan,
  flattenGraph,
  type FlintGraphNode,
  type FlintGraphPort,
  type FlintNodeGraph,
  type FlintNodeSourceMap,
} from './types.js';
import { validateGraph } from './validator.js';

import type {
  FlintBinaryExpression,
  FlintCapabilityImport,
  FlintExpression,
  FlintFunction,
  FlintLiteralExpression,
  FlintMatchArm,
  FlintModule,
  FlintParameter,
  FlintPrimitiveType,
  FlintReturnStatement,
  FlintStatement,
  FlintStructDeclaration,
  FlintTypeName,
} from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

export interface FlintAstBuildResult {
  readonly module: FlintModule;
  readonly sourceMap: FlintNodeSourceMap;
  readonly entryFunctionName: string;
  readonly returnType: FlintTypeName;
}

/**
 * Normalizes an arbitrary name into a valid Flint identifier.
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
 * Returns a fallback default literal AST expression for primitive types.
 */
function createDefaultFallbackLiteral(
  primitiveType: FlintPrimitiveType,
  span: FlintSourceSpan,
): FlintLiteralExpression {
  if (primitiveType === 'bool') {
    return { kind: 'literal', value: false, type: 'bool', span };
  }
  if (primitiveType === 'string') {
    return { kind: 'literal', value: '', type: 'string', span };
  }
  return { kind: 'literal', value: 0, type: primitiveType === 'unit' ? 'i32' : primitiveType, span };
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

  return createDefaultFallbackLiteral(primitiveType, span);
}

type InputResolver = (node: FlintGraphNode, portId: string) => FlintExpression;

const BINARY_ARITHMETIC_OPERATORS: Readonly<Record<string, FlintBinaryExpression['operator']>> = {
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
 * Builds composite multi-arm or struct AST expressions for advanced mathematical operations.
 */
function buildAdvancedArithmeticExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  switch (node.operation) {
    case 'negate': {
      return { kind: 'unary', operator: '-', operand: resolveInput(node, 'a'), span };
    }
    case 'abs': {
      const operand = resolveInput(node, 'a');
      const zero = createLiteralExpression(0, createPrimitiveType('i32'), span);
      const arms: readonly FlintMatchArm[] = [
        {
          kind: 'match-arm',
          pattern: { kind: 'literal', value: true, span },
          value: { kind: 'unary', operator: '-', operand, span },
          span,
        },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: operand, span },
      ];
      return { kind: 'match', value: { kind: 'binary', operator: '<', left: operand, right: zero, span }, arms, span };
    }
    case 'min': {
      const leftValue = resolveInput(node, 'a');
      const rightValue = resolveInput(node, 'b');
      const arms: readonly FlintMatchArm[] = [
        { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: leftValue, span },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: rightValue, span },
      ];
      return {
        kind: 'match',
        value: { kind: 'binary', operator: '<', left: leftValue, right: rightValue, span },
        arms,
        span,
      };
    }
    case 'max': {
      const leftValue = resolveInput(node, 'a');
      const rightValue = resolveInput(node, 'b');
      const arms: readonly FlintMatchArm[] = [
        { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: leftValue, span },
        { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: rightValue, span },
      ];
      return {
        kind: 'match',
        value: { kind: 'binary', operator: '>', left: leftValue, right: rightValue, span },
        arms,
        span,
      };
    }
    case 'div_rem': {
      const dividend = resolveInput(node, 'a');
      const divisor = resolveInput(node, 'b');
      const structName = `Record_${sanitizeIdentifier(node.id)}`;
      return {
        kind: 'struct-value',
        type: { kind: 'type-name', name: 'unit', reference: structName, span },
        fields: {
          quotient: { kind: 'binary', operator: '/', left: dividend, right: divisor, span },
          remainder: { kind: 'binary', operator: '%', left: dividend, right: divisor, span },
        },
        span,
      };
    }
    case 'min_max': {
      const firstValue = resolveInput(node, 'a');
      const secondValue = resolveInput(node, 'b');
      const structName = `Record_${sanitizeIdentifier(node.id)}`;
      return {
        kind: 'struct-value',
        type: { kind: 'type-name', name: 'unit', reference: structName, span },
        fields: {
          min: {
            kind: 'match',
            value: { kind: 'binary', operator: '<', left: firstValue, right: secondValue, span },
            arms: [
              { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: firstValue, span },
              { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: secondValue, span },
            ],
            span,
          },
          max: {
            kind: 'match',
            value: { kind: 'binary', operator: '>', left: firstValue, right: secondValue, span },
            arms: [
              { kind: 'match-arm', pattern: { kind: 'literal', value: true, span }, value: firstValue, span },
              { kind: 'match-arm', pattern: { kind: 'literal', value: false, span }, value: secondValue, span },
            ],
            span,
          },
        },
        span,
      };
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Lowers arithmetic and mathematical graph nodes into binary, unary, or match AST expressions.
 */
function buildArithmeticExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  const binaryOperator = BINARY_ARITHMETIC_OPERATORS[node.operation];
  if (binaryOperator !== undefined) {
    return {
      kind: 'binary',
      operator: binaryOperator,
      left: resolveInput(node, 'a'),
      right: resolveInput(node, 'b'),
      span,
    };
  }
  return buildAdvancedArithmeticExpression(node, resolveInput, span);
}

const BINARY_COMPARISON_OPERATORS: Readonly<Record<string, FlintBinaryExpression['operator']>> = {
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
 * Lowers logical and comparison graph nodes into binary or unary boolean AST expressions.
 */
function buildComparisonExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  if (node.operation === 'not') {
    return { kind: 'unary', operator: '!', operand: resolveInput(node, 'a'), span };
  }
  const binaryOperator = BINARY_COMPARISON_OPERATORS[node.operation];
  if (binaryOperator !== undefined) {
    return {
      kind: 'binary',
      operator: binaryOperator,
      left: resolveInput(node, 'a'),
      right: resolveInput(node, 'b'),
      span,
    };
  }
  return undefined;
}

/**
 * Lowers vector operations into standard library AST call expressions.
 */
function buildVectorExpression(
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
    default: {
      return undefined;
    }
  }
}

/**
 * Lowers Option operations into enum construction or match unwrapping expressions.
 */
function buildOptionExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  const primaryOutPort = node.outputs[0];
  switch (node.operation) {
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

/**
 * Lowers collection, map, and vector operations into Flint stdlib calls and match expressions.
 */
function buildCollectionExpression(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  return buildVectorExpression(node, resolveInput, span) ?? buildOptionExpression(node, resolveInput, span);
}

/**
 * Lowers string manipulation, branching, and text operations into function calls or match expressions.
 */
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
 * Creates capability import declarations and alias mappings.
 */
function createCapabilityImports(
  requiredCapabilities: ReadonlySet<string>,
  startLine: number,
): { capabilityImports: FlintCapabilityImport[]; capabilityAliases: Map<string, string>; nextLine: number } {
  let currentLine = startLine;
  const capabilityImports: FlintCapabilityImport[] = [];
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

  return { capabilityImports, capabilityAliases, nextLine: currentLine };
}

/**
 * Builds function parameter declarations from graph input nodes.
 */
function createInputParameters(
  sortedNodeIds: readonly string[],
  nodeMap: ReadonlyMap<string, FlintGraphNode>,
  startLine: number,
  portToAstIdentifier: Map<string, string>,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): { parameters: FlintParameter[]; nextLine: number } {
  let currentLine = startLine;
  const parameters: FlintParameter[] = [];

  for (const nodeId of sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node === undefined || (node.kind !== 'input' && node.operation !== 'input')) {
      continue;
    }

    const outPort = node.outputs[0];
    const parameterName = sanitizeIdentifier(String(node.properties?.name ?? `param_${node.id}`));
    const parameterType = outPort?.type ?? createPrimitiveType('f32');
    const parameterSpan = createSyntheticSpan(currentLine++, 1, parameterName.length + 10);

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

  return { parameters, nextLine: currentLine };
}

/**
 * Lowers host capability calls into invocation AST expressions.
 */
function lowerCapabilityCall(
  node: FlintGraphNode,
  capabilityAliases: ReadonlyMap<string, string>,
  resolveInput: InputResolver,
  span: FlintSourceSpan,
): FlintExpression | undefined {
  if (node.operation === 'clock_now') {
    const alias = capabilityAliases.get('clock.now') ?? 'host_clock_now';
    return { kind: 'call', callee: alias, arguments: [], span };
  }
  if (node.operation === 'random_f64') {
    const alias = capabilityAliases.get('random.f64') ?? 'host_random_f64';
    return { kind: 'call', callee: alias, arguments: [], span };
  }
  if (node.operation === 'log_debug') {
    const alias = capabilityAliases.get('env.log') ?? 'host_log_debug';
    return { kind: 'call', callee: alias, arguments: [resolveInput(node, 'message')], span };
  }
  return undefined;
}

/**
 * Lowers custom Flint code blocks or unmapped operations into helper functions or calls.
 */
function lowerCustomOrUnmappedCode(
  node: FlintGraphNode,
  resolveInput: InputResolver,
  helperFunctions: FlintFunction[],
  currentLine: number,
  nodeSpan: FlintSourceSpan,
  primaryOutPort?: FlintGraphPort,
): FlintExpression {
  if (node.operation === 'flint_code' || node.kind === 'custom') {
    const customFunctionName = sanitizeIdentifier(String(node.properties?.functionName ?? `custom_${node.id}`));
    const arguments_ = node.inputs.map((port) => resolveInput(node, port.id));

    if (!helperFunctions.some((f) => f.name === customFunctionName)) {
      helperFunctions.push({
        kind: 'function',
        name: customFunctionName,
        exported: false,
        genericParameters: [],
        parameters: node.inputs.map((inp, index) => ({
          kind: 'parameter',
          name: sanitizeIdentifier(inp.name),
          type: inp.type,
          span: createSyntheticSpan(currentLine + index, 1, 10),
        })),
        result: primaryOutPort?.type ?? createPrimitiveType('f32'),
        body: [
          {
            kind: 'return',
            value: node.inputs[0]
              ? { kind: 'identifier', name: sanitizeIdentifier(node.inputs[0].name), span: nodeSpan }
              : undefined,
            span: nodeSpan,
          },
        ],
        span: nodeSpan,
      });
    }

    return { kind: 'call', callee: customFunctionName, arguments: arguments_, span: nodeSpan };
  }

  const arguments_ = node.inputs.map((port) => resolveInput(node, port.id));
  return { kind: 'call', callee: node.operation, arguments: arguments_, span: nodeSpan };
}

/**
 * Generates record struct declarations and let-binding statements for intermediate node outputs.
 */
function lowerMultiOutputRecord(
  node: FlintGraphNode,
  expression: FlintExpression | undefined,
  nodeSpan: FlintSourceSpan,
  currentLine: number,
  portToAstIdentifier: Map<string, string>,
  structDeclarations: FlintStructDeclaration[],
  statements: FlintStatement[],
): void {
  const primaryOutPort = node.outputs[0];
  const structName = `Record_${sanitizeIdentifier(node.id)}`;
  const structFields = node.outputs.map((p, index) => ({
    kind: 'struct-field' as const,
    name: sanitizeIdentifier(p.id),
    type: p.type,
    span: createSyntheticSpan(currentLine + index, 3, 10),
  }));

  structDeclarations.push({
    kind: 'struct',
    name: structName,
    record: true,
    genericParameters: [],
    fields: structFields,
    immutable: true,
    span: nodeSpan,
  });

  const recordVariableName = `v_${sanitizeIdentifier(node.id)}_record`;
  const recordType: FlintTypeName = {
    kind: 'type-name',
    name: 'unit',
    reference: structName,
    span: nodeSpan,
  };

  statements.push({
    kind: 'let',
    name: recordVariableName,
    type: recordType,
    value: expression ?? createLiteralExpression(0, recordType, nodeSpan),
    span: nodeSpan,
  });

  if (node.splitOutputs !== false) {
    for (const outPort of node.outputs) {
      const fieldVariableName = `v_${sanitizeIdentifier(node.id)}_${sanitizeIdentifier(outPort.id)}`;
      portToAstIdentifier.set(`${node.id}:${outPort.id}`, fieldVariableName);
      statements.push({
        kind: 'let',
        name: fieldVariableName,
        type: outPort.type,
        value: {
          kind: 'identifier',
          name: `${recordVariableName}.${sanitizeIdentifier(outPort.id)}`,
          span: nodeSpan,
        },
        span: nodeSpan,
      });
    }
  } else if (primaryOutPort !== undefined) {
    portToAstIdentifier.set(`${node.id}:${primaryOutPort.id}`, recordVariableName);
  }
}

/**
 * Generates single-variable let-binding statements for node outputs.
 */
function lowerSingleOutput(
  node: FlintGraphNode,
  expression: FlintExpression | undefined,
  letVariableName: string,
  nodeSpan: FlintSourceSpan,
  statements: FlintStatement[],
): void {
  const primaryOutPort = node.outputs[0];
  statements.push({
    kind: 'let',
    name: letVariableName,
    type: primaryOutPort?.type ?? createPrimitiveType('f32'),
    value: expression ?? createLiteralExpression(0, primaryOutPort?.type ?? createPrimitiveType('f32'), nodeSpan),
    span: nodeSpan,
  });
}

/**
 * Generates record struct declarations and let-binding statements for intermediate node outputs.
 */
function lowerNodeOutputs(
  node: FlintGraphNode,
  expression: FlintExpression | undefined,
  letVariableName: string,
  nodeSpan: FlintSourceSpan,
  currentLine: number,
  portToAstIdentifier: Map<string, string>,
  structDeclarations: FlintStructDeclaration[],
  statements: FlintStatement[],
): void {
  if (node.outputs.length > 1) {
    lowerMultiOutputRecord(
      node,
      expression,
      nodeSpan,
      currentLine,
      portToAstIdentifier,
      structDeclarations,
      statements,
    );
  } else {
    lowerSingleOutput(node, expression, letVariableName, nodeSpan, statements);
  }
}

/**
 * Resolves the computation expression for an intermediate graph node.
 */
function resolveNodeExpression(
  node: FlintGraphNode,
  resolveInputExpression: InputResolver,
  capabilityAliases: ReadonlyMap<string, string>,
  helperFunctions: FlintFunction[],
  currentLine: number,
  nodeSpan: FlintSourceSpan,
  primaryOutPort?: FlintGraphPort,
): FlintExpression {
  if (node.operation === 'constant') {
    return createLiteralExpression(
      node.properties?.value,
      primaryOutPort?.type ?? createPrimitiveType('f32'),
      nodeSpan,
    );
  }
  return (
    buildArithmeticExpression(node, resolveInputExpression, nodeSpan) ??
    buildComparisonExpression(node, resolveInputExpression, nodeSpan) ??
    buildCollectionExpression(node, resolveInputExpression, nodeSpan) ??
    buildControlOrTextExpression(node, resolveInputExpression, nodeSpan) ??
    lowerCapabilityCall(node, capabilityAliases, resolveInputExpression, nodeSpan) ??
    lowerCustomOrUnmappedCode(node, resolveInputExpression, helperFunctions, currentLine, nodeSpan, primaryOutPort)
  );
}

/**
 * Lowers a single intermediate computation node into statements and source mappings.
 */
function lowerComputationNode(
  node: FlintGraphNode,
  currentLine: number,
  resolveInputExpression: InputResolver,
  capabilityAliases: ReadonlyMap<string, string>,
  helperFunctions: FlintFunction[],
  portToAstIdentifier: Map<string, string>,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
  structDeclarations: FlintStructDeclaration[],
  statements: FlintStatement[],
): number {
  const nodeSpan = createSyntheticSpan(currentLine, 3, 40);
  nodeToSpan.set(node.id, nodeSpan);
  spanToNode.set(spanKey(nodeSpan), node.id);

  const primaryOutPort = node.outputs[0];
  const letVariableName = `v_${sanitizeIdentifier(node.id)}_${primaryOutPort ? sanitizeIdentifier(primaryOutPort.id) : 'out'}`;
  if (primaryOutPort !== undefined) {
    portToAstIdentifier.set(`${node.id}:${primaryOutPort.id}`, letVariableName);
  }

  const expression = resolveNodeExpression(
    node,
    resolveInputExpression,
    capabilityAliases,
    helperFunctions,
    currentLine,
    nodeSpan,
    primaryOutPort,
  );

  lowerNodeOutputs(
    node,
    expression,
    letVariableName,
    nodeSpan,
    currentLine,
    portToAstIdentifier,
    structDeclarations,
    statements,
  );
  return currentLine + 1;
}

/**
 * Iterates through sorted intermediate nodes and lowers them sequentially into statements.
 */
function lowerIntermediateComputationNodes(
  sortedNodeIds: readonly string[],
  nodeMap: ReadonlyMap<string, FlintGraphNode>,
  startLine: number,
  resolveInputExpression: InputResolver,
  capabilityAliases: ReadonlyMap<string, string>,
  helperFunctions: FlintFunction[],
  portToAstIdentifier: Map<string, string>,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
  structDeclarations: FlintStructDeclaration[],
  statements: FlintStatement[],
): number {
  let currentLine = startLine;
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
    currentLine = lowerComputationNode(
      node,
      currentLine,
      resolveInputExpression,
      capabilityAliases,
      helperFunctions,
      portToAstIdentifier,
      nodeToSpan,
      spanToNode,
      structDeclarations,
      statements,
    );
  }
  return currentLine;
}

/**
 * Creates the final function return statement and type from graph output nodes.
 */
function createOutputReturnStatement(
  outputNodes: readonly FlintGraphNode[],
  currentLine: number,
  resolveInput: InputResolver,
  nodeToSpan: Map<string, FlintSourceSpan>,
  spanToNode: Map<string, string>,
): { returnStatement: FlintReturnStatement; returnType: FlintTypeName } {
  if (outputNodes.length === 0) {
    return {
      returnStatement: { kind: 'return', span: createSyntheticSpan(currentLine, 3, 7) },
      returnType: createPrimitiveType('unit'),
    };
  }

  const primaryOutput = outputNodes[0];
  if (primaryOutput === undefined) {
    return {
      returnStatement: { kind: 'return', span: createSyntheticSpan(currentLine, 3, 7) },
      returnType: createPrimitiveType('unit'),
    };
  }

  const returnSpan = createSyntheticSpan(currentLine, 3, 20);
  nodeToSpan.set(primaryOutput.id, returnSpan);
  spanToNode.set(spanKey(returnSpan), primaryOutput.id);

  const inPort = primaryOutput.inputs[0];
  const returnExpr = inPort ? resolveInput(primaryOutput, inPort.id) : undefined;
  const returnType = inPort?.type ?? createPrimitiveType('f32');

  return {
    returnStatement: { kind: 'return', value: returnExpr, span: returnSpan },
    returnType,
  };
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
  const structDeclarations: FlintStructDeclaration[] = [];
  const helperFunctions: FlintFunction[] = [];
  const statements: FlintStatement[] = [];

  const requiredCapabilities = collectRequiredCapabilities(graph.nodes, graph.requestedCapabilities ?? []);
  const {
    capabilityImports,
    capabilityAliases,
    nextLine: lineAfterImports,
  } = createCapabilityImports(requiredCapabilities, 1);

  const { parameters, nextLine: lineAfterParameters } = createInputParameters(
    validation.sortedNodeIds,
    nodeMap,
    lineAfterImports + 1,
    portToAstIdentifier,
    nodeToSpan,
    spanToNode,
  );

  /**
   * Resolves the input expression for a port from incoming edge connections or default literals.
   */
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
          span: createSyntheticSpan(lineAfterParameters, 1, sourceIdentifier.length),
        };
      }
    }

    const fallbackValue = port?.defaultValue;
    const fallbackType = port?.type ?? createPrimitiveType('f32');
    return createLiteralExpression(fallbackValue, fallbackType, createSyntheticSpan(lineAfterParameters, 1, 5));
  }

  const lineAfterNodes = lowerIntermediateComputationNodes(
    validation.sortedNodeIds,
    nodeMap,
    lineAfterParameters + 1,
    resolveInputExpression,
    capabilityAliases,
    helperFunctions,
    portToAstIdentifier,
    nodeToSpan,
    spanToNode,
    structDeclarations,
    statements,
  );

  const outputNodes = graph.nodes.filter((node) => node.kind === 'output' || node.operation === 'output');
  const { returnStatement, returnType } = createOutputReturnStatement(
    outputNodes,
    lineAfterNodes,
    resolveInputExpression,
    nodeToSpan,
    spanToNode,
  );
  statements.push(returnStatement);

  const functionSpan = createSyntheticSpan(1, 1, lineAfterNodes * 30);
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

  const moduleSpan = createSyntheticSpan(1, 1, lineAfterNodes * 30);
  const flintModule: FlintModule = {
    kind: 'module',
    name: moduleName,
    imports: capabilityImports,
    sourceImports: [],
    structs: structDeclarations,
    enums: [],
    interfaces: [],
    functions: [...helperFunctions, mainFunction],
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
