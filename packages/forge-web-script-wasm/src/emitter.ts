/* eslint-disable import-x/order, unicorn/consistent-function-scoping, unicorn/prefer-switch */

import type {
  ForgeWebScriptWasmBackendInput,
  ForgeWebScriptWasmBackendResult,
  ForgeWebScriptWasmBinaryOperator,
  ForgeWebScriptWasmDiagnostic,
  ForgeWebScriptWasmExpression,
  ForgeWebScriptWasmFeatureRequirements,
  ForgeWebScriptWasmFunction,
  ForgeWebScriptWasmIteratorBoundaryDescriptor,
  ForgeWebScriptWasmIteratorExport,
  ForgeWebScriptWasmModule,
  ForgeWebScriptWasmPrimitiveType,
  ForgeWebScriptWasmSourceSpan,
  ForgeWebScriptWasmStatement,
  ForgeWebScriptWasmCompilerHints,
  ForgeWebScriptTargetFeatures,
  ForgeWebScriptWasmTypeName,
} from './contracts.js';
import { compileRegex, type CompiledRegex } from '@mission-platform/forge-web-script-regex';
import {
  buildForgeWebScriptWasmCollectionRuntimeBodies,
  buildForgeWebScriptWasmCollectionRuntimeWasmBodies,
} from './collection-runtime.js';
import { buildRegexRuntimeBodies, REGEX_RUNTIME_FUNCTION_COUNT } from './regex-runtime.js';
import { buildStringRuntimeBodies, STRING_RUNTIME_FUNCTION_COUNT } from './string-runtime.js';
import { renderForgeWebScriptWasmWat } from './wat.js';
import { lowerForgeWebScriptWasmFunctionToSsa, type ForgeWebScriptWasmSsaBindings, type ForgeWebScriptWasmSsaValue } from './cfg.js';

const STATIC_DATA_START = 1024;
const encoder = new TextEncoder();
type WasmValueType = 0x7f | 0x7e | 0x7d | 0x7c;
type ValueLocation = {
  readonly indexes: readonly number[];
  readonly type: ForgeWebScriptWasmPrimitiveType;
  readonly reference?: string;
  readonly length?: number;
};
type Callable = {
  readonly parameters: readonly ForgeWebScriptWasmPrimitiveType[];
  readonly result: ForgeWebScriptWasmPrimitiveType;
};

const wasmTypes: Readonly<Record<ForgeWebScriptWasmPrimitiveType, readonly WasmValueType[]>> = {
  bool: [0x7f],
  bytes: [0x7f, 0x7f],
  f32: [0x7d],
  f64: [0x7c],
  i32: [0x7f],
  i64: [0x7e],
  string: [0x7f, 0x7f],
  u32: [0x7f],
  u64: [0x7e],
  unit: [],
};

function unsignedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = value >>> 0;
  do {
    const byte = remaining & 0x7f;
    remaining >>>= 7;
    result.push(remaining === 0 ? byte : byte | 0x80);
  } while (remaining !== 0);
  return result;
}

function signedLeb(value: number | bigint): number[] {
  const result: number[] = [];
  let remaining = BigInt(value);
  let more = true;
  while (more) {
    const byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    more = !((remaining === 0n && (byte & 0x40) === 0) || (remaining === -1n && (byte & 0x40) !== 0));
    result.push(more ? byte | 0x80 : byte);
  }
  return result;
}

function vector(values: readonly number[]): number[] {
  return [...unsignedLeb(values.length), ...values];
}

function wasmString(value: string): number[] {
  const bytes = [...encoder.encode(value)];
  return [...unsignedLeb(bytes.length), ...bytes];
}

function section(id: number, contents: readonly number[]): number[] {
  return [id, ...unsignedLeb(contents.length), ...contents];
}

function valueTypes(type: ForgeWebScriptWasmPrimitiveType): readonly WasmValueType[] {
  return wasmTypes[type];
}

function wasmFunctionType(
  parameters: readonly ForgeWebScriptWasmPrimitiveType[],
  result: ForgeWebScriptWasmPrimitiveType,
): number[] {
  return [0x60, ...vector(parameters.flatMap((parameter) => valueTypes(parameter))), ...vector(valueTypes(result))];
}

function appendF32(value: number): number[] {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setFloat32(0, value, true);
  return [...new Uint8Array(buffer)];
}

function appendF64(value: number): number[] {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, value, true);
  return [...new Uint8Array(buffer)];
}

function defaultValue(type: ForgeWebScriptWasmPrimitiveType): number[] {
  return valueTypes(type).flatMap((valueType) => {
    if (valueType === 0x7d) return [0x43, ...appendF32(0)];
    if (valueType === 0x7c) return [0x44, ...appendF64(0)];
    if (valueType === 0x7e) return [0x42, ...signedLeb(0n)];
    return [0x41, ...signedLeb(0)];
  });
}

const ITER_RESULT_HELPER = '__fws_iter_result';
const COLLECTION_RUNTIME_OPERATION_ORDER = [
  'array-new',
  'array-get',
  'array-set',
  'array-length',
  'array-iter',
  'vector-new',
  'vector-push',
  'vector-get',
  'vector-set',
  'vector-length',
  'vector-pop',
  'iterator-next',
] as const;
const COLLECTION_RUNTIME_OPERATIONS: ReadonlySet<string> = new Set(COLLECTION_RUNTIME_OPERATION_ORDER);

function projectPrimitive(type: { readonly name?: string; readonly reference?: string } | undefined): ForgeWebScriptWasmPrimitiveType {
  if (type === undefined) return 'i32';
  if (
    type.reference === 'Iterator' ||
    type.reference === 'Iterable' ||
    type.reference === 'Result'
  )
    return 'i32';
  if (type.reference === 'Option')
    return 'i64';
  if (type.reference !== undefined) return 'i32';
  const name = type.name;
  if (
    name === 'bool' ||
    name === 'bytes' ||
    name === 'f32' ||
    name === 'f64' ||
    name === 'i32' ||
    name === 'i64' ||
    name === 'string' ||
    name === 'u32' ||
    name === 'u64' ||
    name === 'unit'
  )
    return name;
  return 'i32';
}

function projectTypeName(
  type: { readonly name?: string; readonly reference?: string; readonly span?: ForgeWebScriptWasmSourceSpan } | undefined,
  _span: ForgeWebScriptWasmSourceSpan,
): ForgeWebScriptWasmTypeName {
  const aggregate = type as {
    readonly name?: string;
    readonly reference?: string;
    readonly arguments?: readonly ForgeWebScriptWasmTypeName[];
    readonly length?: number;
  } | undefined;
  return {
    name: projectPrimitive(type),
    ...(aggregate?.reference === undefined ? {} : { reference: aggregate.reference }),
    ...(aggregate?.arguments === undefined ? {} : { arguments: aggregate.arguments.map((argument) => projectTypeName(argument, _span)) }),
    ...(aggregate?.length === undefined ? {} : { length: aggregate.length }),
  };
}

function projectExpression(expression: ForgeWebScriptWasmExpression): ForgeWebScriptWasmExpression {
  if (expression.kind === 'literal') {
    return {
      ...expression,
      type: projectPrimitive({ name: expression.type }),
    };
  }
  if (expression.kind === 'identifier') return expression;
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => projectExpression(argument)),
    };
  if (expression.kind === 'unary') return { ...expression, operand: projectExpression(expression.operand) };
  if (expression.kind === 'atomic')
    return {
      ...expression,
      address: projectExpression(expression.address),
      ...(expression.value === undefined ? {} : { value: projectExpression(expression.value) }),
      ...(expression.replacement === undefined ? {} : { replacement: projectExpression(expression.replacement) }),
    };
  if (expression.kind === 'binary')
    return {
      ...expression,
      left: projectExpression(expression.left),
      right: projectExpression(expression.right),
    };
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return { ...expression, elements: expression.elements.map((element) => projectExpression(element)), type: projectTypeName(expression.type, expression.span) };
  if (expression.kind === 'index')
    return { ...expression, receiver: projectExpression(expression.receiver), index: projectExpression(expression.index) };
  return expression;
}

function iterResultCall(
  value: ForgeWebScriptWasmExpression,
  done: number,
  span: ForgeWebScriptWasmSourceSpan,
): ForgeWebScriptWasmExpression {
  return {
    kind: 'call',
    callee: ITER_RESULT_HELPER,
    arguments: [value, { kind: 'literal', value: done, type: 'i32', span }],
    span,
  };
}

function returnIterResult(
  value: ForgeWebScriptWasmExpression | number,
  done: number,
  span: ForgeWebScriptWasmSourceSpan,
): ForgeWebScriptWasmStatement {
  const valueExpression: ForgeWebScriptWasmExpression =
    typeof value === 'number' ? { kind: 'literal', value, type: 'i32', span } : projectExpression(value);
  return { kind: 'return', value: iterResultCall(valueExpression, done, span), span };
}

function buildYieldStateMachine(
  yields: readonly ForgeWebScriptWasmExpression[],
  span: ForgeWebScriptWasmSourceSpan,
): readonly ForgeWebScriptWasmStatement[] {
  const state: ForgeWebScriptWasmExpression = { kind: 'identifier', name: '__state', span };
  let statements: ForgeWebScriptWasmStatement[] = [returnIterResult(0, 1, span)];
  for (let index = yields.length - 1; index >= 0; index -= 1) {
    statements = [
      {
        kind: 'if',
        condition: {
          kind: 'binary',
          operator: '==',
          left: state,
          right: { kind: 'literal', value: index, type: 'i32', span },
          span,
        },
        consequent: [returnIterResult(yields[index]!, 0, span)],
        alternate: statements,
        span,
      },
    ];
  }
  return statements;
}

function lowerIteratorStatements(
  statements: readonly ForgeWebScriptWasmStatement[],
): readonly ForgeWebScriptWasmStatement[] {
  return statements.flatMap((statement) => {
    if (statement.kind === 'yield') return [returnIterResult(statement.value, 0, statement.span)];
    if (statement.kind === 'iterator-loop') {
      return [
        {
          ...statement,
          iterator: projectExpression(statement.iterator),
          body: lowerIteratorStatements(statement.body),
        },
      ];
    }
    if (statement.kind === 'if')
      return [
        {
          ...statement,
          condition: projectExpression(statement.condition),
          consequent: lowerIteratorStatements(statement.consequent),
          ...(statement.alternate === undefined ? {} : { alternate: lowerIteratorStatements(statement.alternate) }),
        },
      ];
    if (statement.kind === 'switch')
      return [
        {
          ...statement,
          value: projectExpression(statement.value),
          cases: statement.cases.map((arm) => ({ ...arm, body: lowerIteratorStatements(arm.body) })),
          ...(statement.defaultCase === undefined ? {} : { defaultCase: lowerIteratorStatements(statement.defaultCase) }),
        },
      ];
    if (statement.kind === 'while' || statement.kind === 'do-while')
      return [
        {
          ...statement,
          condition: projectExpression(statement.condition),
          body: lowerIteratorStatements(statement.body),
        },
      ];
    if (statement.kind === 'for')
      return [
        {
          ...statement,
          condition: projectExpression(statement.condition),
          ...(statement.initializer === undefined
            ? {}
            : { initializer: lowerIteratorStatements([statement.initializer])[0] }),
          ...(statement.update === undefined ? {} : { update: lowerIteratorStatements([statement.update])[0] }),
          body: lowerIteratorStatements(statement.body),
        },
      ];
    if (statement.kind === 'let')
      return [
        {
          ...statement,
          type: projectTypeName(statement.type, statement.span),
          value: projectExpression(statement.value),
        },
      ];
    if (statement.kind === 'assignment')
      return [{ ...statement, value: projectExpression(statement.value), ...(statement.index === undefined ? {} : { index: projectExpression(statement.index) }) }];
    if (statement.kind === 'return')
      return [
        {
          ...statement,
          ...(statement.value === undefined ? {} : { value: projectExpression(statement.value) }),
        },
      ];
    if (statement.kind === 'expression-statement')
      return [{ ...statement, expression: projectExpression(statement.expression) }];
    return [statement];
  });
}

function collectTopLevelYields(
  statements: readonly ForgeWebScriptWasmStatement[],
): ForgeWebScriptWasmExpression[] | undefined {
  const yields: ForgeWebScriptWasmExpression[] = [];
  for (const statement of statements) {
    if (statement.kind !== 'yield') return undefined;
    yields.push(projectExpression(statement.value));
  }
  return yields;
}

function bodyContainsIteratorNodes(statements: readonly ForgeWebScriptWasmStatement[]): boolean {
  for (const statement of statements) {
    if (statement.kind === 'yield' || statement.kind === 'iterator-loop') return true;
    if (statement.kind === 'if') {
      if (bodyContainsIteratorNodes(statement.consequent)) return true;
      if (statement.alternate !== undefined && bodyContainsIteratorNodes(statement.alternate)) return true;
    } else if (statement.kind === 'switch') {
      if (statement.cases.some((arm) => bodyContainsIteratorNodes(arm.body))) return true;
      if (statement.defaultCase !== undefined && bodyContainsIteratorNodes(statement.defaultCase)) return true;
    } else if (statement.kind === 'while' || statement.kind === 'do-while') {
      if (bodyContainsIteratorNodes(statement.body)) return true;
    } else if (statement.kind === 'for') {
      if (statement.initializer !== undefined && bodyContainsIteratorNodes([statement.initializer])) return true;
      if (statement.update !== undefined && bodyContainsIteratorNodes([statement.update])) return true;
      if (bodyContainsIteratorNodes(statement.body)) return true;
    }
  }
  return false;
}

function elementTypeLabel(type: {
  readonly name?: string;
  readonly reference?: string;
  readonly arguments?: readonly { readonly name?: string; readonly reference?: string }[];
}): string {
  const argument = type.arguments?.[0];
  if (argument !== undefined) return argument.reference ?? argument.name ?? 'i32';
  return 'i32';
}

function rewriteStateIdentifier(
  expression: ForgeWebScriptWasmExpression,
  from: string | undefined,
): ForgeWebScriptWasmExpression {
  if (from === undefined) return expression;
  if (expression.kind === 'identifier')
    return expression.name === from ? { ...expression, name: '__state' } : expression;
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => rewriteStateIdentifier(argument, from)),
    };
  if (expression.kind === 'unary') return { ...expression, operand: rewriteStateIdentifier(expression.operand, from) };
  if (expression.kind === 'binary')
    return {
      ...expression,
      left: rewriteStateIdentifier(expression.left, from),
      right: rewriteStateIdentifier(expression.right, from),
    };
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return { ...expression, elements: expression.elements.map((element) => rewriteStateIdentifier(element, from)) };
  if (expression.kind === 'index')
    return {
      ...expression,
      receiver: rewriteStateIdentifier(expression.receiver, from),
      index: rewriteStateIdentifier(expression.index, from),
    };
  if (expression.kind === 'atomic')
    return {
      ...expression,
      address: rewriteStateIdentifier(expression.address, from),
      ...(expression.value === undefined ? {} : { value: rewriteStateIdentifier(expression.value, from) }),
      ...(expression.replacement === undefined
        ? {}
        : { replacement: rewriteStateIdentifier(expression.replacement, from) }),
    };
  return expression;
}

function rewriteStateInStatements(
  statements: readonly ForgeWebScriptWasmStatement[],
  from: string | undefined,
): readonly ForgeWebScriptWasmStatement[] {
  if (from === undefined) return statements;
  return statements.map((statement) => {
    if (statement.kind === 'let')
      return { ...statement, value: rewriteStateIdentifier(statement.value, from) };
    if (statement.kind === 'assignment')
      return {
        ...statement,
        value: rewriteStateIdentifier(statement.value, from),
        ...(statement.index === undefined ? {} : { index: rewriteStateIdentifier(statement.index, from) }),
      };
    if (statement.kind === 'return')
      return {
        ...statement,
        ...(statement.value === undefined ? {} : { value: rewriteStateIdentifier(statement.value, from) }),
      };
    if (statement.kind === 'expression-statement')
      return { ...statement, expression: rewriteStateIdentifier(statement.expression, from) };
    if (statement.kind === 'yield')
      return { ...statement, value: rewriteStateIdentifier(statement.value, from) };
    if (statement.kind === 'iterator-loop')
      return {
        ...statement,
        iterator: rewriteStateIdentifier(statement.iterator, from),
        body: rewriteStateInStatements(statement.body, from),
      };
    if (statement.kind === 'if')
      return {
        ...statement,
        condition: rewriteStateIdentifier(statement.condition, from),
        consequent: rewriteStateInStatements(statement.consequent, from),
        ...(statement.alternate === undefined
          ? {}
          : { alternate: rewriteStateInStatements(statement.alternate, from) }),
      };
    if (statement.kind === 'switch')
      return {
        ...statement,
        value: rewriteStateIdentifier(statement.value, from),
        cases: statement.cases.map((arm) => ({ ...arm, body: rewriteStateInStatements(arm.body, from) })),
        ...(statement.defaultCase === undefined
          ? {}
          : { defaultCase: rewriteStateInStatements(statement.defaultCase, from) }),
      };
    if (statement.kind === 'while' || statement.kind === 'do-while')
      return {
        ...statement,
        condition: rewriteStateIdentifier(statement.condition, from),
        body: rewriteStateInStatements(statement.body, from),
      };
    if (statement.kind === 'for')
      return {
        ...statement,
        condition: rewriteStateIdentifier(statement.condition, from),
        ...(statement.initializer === undefined
          ? {}
          : { initializer: rewriteStateInStatements([statement.initializer], from)[0]! }),
        ...(statement.update === undefined
          ? {}
          : { update: rewriteStateInStatements([statement.update], from)[0]! }),
        body: rewriteStateInStatements(statement.body, from),
      };
    return statement;
  });
}

function lowerIterableFunction(declaration: ForgeWebScriptWasmFunction): readonly ForgeWebScriptWasmFunction[] {
  const span = declaration.span;
  const parameters = declaration.parameters.map((parameter) => ({
    ...parameter,
    type: projectTypeName(parameter.type, span),
  }));
  const stateParameter = parameters[0]?.name;
  const factoryValue: ForgeWebScriptWasmExpression =
    stateParameter === undefined
      ? { kind: 'literal', value: 0, type: 'i32', span }
      : { kind: 'identifier', name: stateParameter, span };
  const factory: ForgeWebScriptWasmFunction = {
    name: declaration.name,
    exported: declaration.exported,
    iteratorRole: 'factory',
    parameters,
    result: { name: 'i32' },
    body: [{ kind: 'return', value: factoryValue, span }],
    span,
  };
  const yields = collectTopLevelYields(declaration.body);
  const nextBody =
    yields === undefined
      ? rewriteStateInStatements(lowerIteratorStatements(declaration.body), stateParameter).concat(
          bodyContainsIteratorNodes(declaration.body) ? [] : [returnIterResult(0, 1, span)],
        )
      : buildYieldStateMachine(yields, span);
  // Ensure every next() path completes with an explicit done/value pair.
  const ensuredNextBody =
    nextBody.length === 0 || nextBody.every((statement) => statement.kind !== 'return')
      ? [...nextBody, returnIterResult(0, 1, span)]
      : nextBody;
  const next: ForgeWebScriptWasmFunction = {
    name: `${declaration.name}.next`,
    exported: declaration.exported,
    iteratorRole: 'next',
    parameters: [{ name: '__state', type: { name: 'i32' } }],
    result: { name: 'i64' },
    body: ensuredNextBody,
    span,
  };
  return [factory, next];
}

function lowerPlainFunction(declaration: ForgeWebScriptWasmFunction): ForgeWebScriptWasmFunction {
  return {
    ...declaration,
    parameters: declaration.parameters.map((parameter) => ({
      ...parameter,
      type: projectTypeName(parameter.type, declaration.span),
    })),
    result: projectTypeName(declaration.result, declaration.span),
    body: lowerIteratorStatements(declaration.body),
  };
}

function deriveIteratorDescriptors(
  module: ForgeWebScriptWasmModule,
): readonly ForgeWebScriptWasmIteratorBoundaryDescriptor[] {
  if (module.iteratorDescriptors !== undefined && module.iteratorDescriptors.length > 0)
    return module.iteratorDescriptors;
  return module.functions.flatMap((declaration) => {
    // Only explicit `iter fn` producers become iterator factories.
    // Consumer `loop` statements must remain ordinary function bodies.
    if (declaration.iterable !== true) return [];
    const elementType = elementTypeLabel(declaration.result as never);
    return [
      {
        id: declaration.name,
        generic: 'Iterator',
        elementType,
        nextFunction: `${declaration.name}.next`,
        representation: 'descriptor-boundary' as const,
        ownership: 'borrowed' as const,
      },
    ];
  });
}

function lowerIteratorModule(module: ForgeWebScriptWasmModule): {
  readonly module: ForgeWebScriptWasmModule;
  readonly iteratorExports: readonly ForgeWebScriptWasmIteratorExport[];
} {
  const descriptors = deriveIteratorDescriptors(module);
  const descriptorByName = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  const functions: ForgeWebScriptWasmFunction[] = [];
  let needsIterHelper = false;
  for (const declaration of module.functions) {
    const isIterable =
      declaration.iterable === true ||
      declaration.iteratorRole === 'factory' ||
      declaration.iteratorRole === 'next' ||
      descriptorByName.has(declaration.name);
    if (declaration.iteratorRole === 'next') {
      functions.push(lowerPlainFunction(declaration));
      needsIterHelper = true;
      continue;
    }
    if (isIterable && declaration.iteratorRole !== 'factory') {
      const lowered = lowerIterableFunction(declaration);
      functions.push(...lowered);
      needsIterHelper = true;
      continue;
    }
    functions.push(lowerPlainFunction(declaration));
  }
  if (needsIterHelper && !functions.some((declaration) => declaration.name === ITER_RESULT_HELPER)) {
    const span = module.span;
    functions.push({
      name: ITER_RESULT_HELPER,
      exported: false,
      parameters: [
        { name: 'value', type: { name: 'i32' } },
        { name: 'done', type: { name: 'i32' } },
      ],
      result: { name: 'i64' },
      // Body is emitted specially in emitWasm; placeholder keeps contracts total.
      body: [
        {
          kind: 'return',
          value: { kind: 'literal', value: 0, type: 'i64', span },
          span,
        },
      ],
      span,
    });
  }
  const iteratorExports: ForgeWebScriptWasmIteratorExport[] = descriptors.map((descriptor) => ({
    name: descriptor.id,
    nextFunction: descriptor.nextFunction,
    elementType: descriptor.elementType,
    resultRepresentation: 'value-done-pair',
    ownership: descriptor.ownership,
  }));
  return {
    module: {
      ...module,
      functions,
      iteratorDescriptors: descriptors,
    },
    iteratorExports,
  };
}

function expressionType(
  expression: ForgeWebScriptWasmExpression,
  locals: ReadonlyMap<string, ValueLocation>,
  callables: ReadonlyMap<string, Callable>,
): ForgeWebScriptWasmPrimitiveType {
  if (expression.kind === 'literal') return expression.type;
  if (expression.kind === 'identifier') return locals.get(expression.name)?.type ?? 'unit';
  if (expression.kind === 'call') {
    if (expression.standardLibrary === 'string-concat') return 'string';
    if (expression.standardLibrary === 'string-slice' || expression.standardLibrary === 'bytes-slice')
      return expression.standardLibrary === 'bytes-slice' ? 'bytes' : 'string';
    if (
      expression.standardLibrary === 'string-length' ||
      expression.standardLibrary === 'string-byte-at' ||
      expression.standardLibrary === 'string-to-i32' ||
      expression.standardLibrary === 'bytes-length' ||
      expression.standardLibrary === 'bytes-byte-at'
    )
      return 'i32';
    if (expression.standardLibrary === 'bytes-length-u32') return 'u32';
    if (expression.standardLibrary === 'bytes-byte-at-u32') return 'u32';
    if (expression.standardLibrary === 'string-starts-with') return 'bool';
    if (expression.standardLibrary === 'memory-alloc' || expression.standardLibrary === 'memory-load-u32' || expression.standardLibrary === 'memory-realloc') return 'u32';
    if (expression.standardLibrary === 'memory-load-f64' || expression.standardLibrary === 'f64-from-u32') return 'f64';
    if (expression.standardLibrary === 'memory-dealloc' || expression.standardLibrary === 'memory-store-u32' || expression.standardLibrary === 'memory-store-f64') return 'unit';
    if (expression.standardLibrary !== undefined && COLLECTION_RUNTIME_OPERATIONS.has(expression.standardLibrary)) {
      if (expression.standardLibrary === 'iterator-next') return 'i64';
      return expression.standardLibrary.endsWith('-set') ? 'unit' : 'i32';
    }
    return callables.get(expression.callee)?.result ?? 'unit';
  }
  if (expression.kind === 'atomic') return expression.operation === 'store' ? 'unit' : 'i32';
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') return 'i32';
  if (expression.kind === 'index') return 'i32';
  if (expression.kind === 'unary')
    return expression.operator === '!' ? 'bool' : expressionType(expression.operand, locals, callables);
  if (expression.kind !== 'binary') return 'unit';
  if (['<', '<=', '>', '>=', '==', '!=', '&&', '||'].includes(expression.operator)) return 'bool';
  return expressionType(expression.left, locals, callables);
}

function binaryOpcode(operator: ForgeWebScriptWasmBinaryOperator, type: ForgeWebScriptWasmPrimitiveType): number {
  if (operator === '&&') return 0x71;
  if (operator === '||') return 0x72;
  const float = type === 'f32' || type === 'f64';
  const wide = type === 'i64' || type === 'u64';
  if (float) {
    const table: Readonly<Record<string, number>> =
      type === 'f32'
        ? {
            '+': 0x92,
            '-': 0x93,
            '*': 0x94,
            '/': 0x95,
            '<': 0x5d,
            '<=': 0x5f,
            '==': 0x5b,
            '!=': 0x5c,
            '>': 0x5e,
            '>=': 0x60,
          }
        : {
            '+': 0xa0,
            '-': 0xa1,
            '*': 0xa2,
            '/': 0xa3,
            '<': 0x63,
            '<=': 0x65,
            '==': 0x61,
            '!=': 0x62,
            '>': 0x64,
            '>=': 0x66,
          };
    return table[operator] ?? 0x5b;
  }
  if (wide) {
    const table: Readonly<Record<string, number>> = {
      '+': 0x7c,
      '-': 0x7d,
      '*': 0x7e,
      '/': type === 'u64' ? 0x80 : 0x7f,
      '%': type === 'u64' ? 0x82 : 0x81,
      '<': type === 'u64' ? 0x54 : 0x53,
      '<=': type === 'u64' ? 0x58 : 0x57,
      '==': 0x51,
      '!=': 0x52,
      '>': type === 'u64' ? 0x56 : 0x55,
      '>=': type === 'u64' ? 0x5a : 0x59,
    };
    return table[operator] ?? 0x51;
  }
  const table: Readonly<Record<string, number>> = {
    '+': 0x6a,
    '-': 0x6b,
    '*': 0x6c,
    '/': type === 'u32' ? 0x6e : 0x6d,
    '%': type === 'u32' ? 0x70 : 0x6f,
    '<': type === 'u32' ? 0x49 : 0x48,
    '<=': type === 'u32' ? 0x4d : 0x4c,
    '==': 0x46,
    '!=': 0x47,
    '>': type === 'u32' ? 0x4b : 0x4a,
    '>=': type === 'u32' ? 0x4f : 0x4e,
  };
  return table[operator] ?? 0x46;
}

function hashBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function featureRequirements(module: ForgeWebScriptWasmModule): ForgeWebScriptWasmFeatureRequirements {
  return {
    ...(module.featureRequirements?.simd === true ? { simd: true } : {}),
    ...(module.featureRequirements?.tailCall === true ? { tailCall: true } : {}),
    ...(module.featureRequirements?.memory64 === true ? { memory64: true } : {}),
    ...(module.featureRequirements?.threads === true ? { threads: true } : {}),
    ...(module.featureRequirements?.atomics === true ? { atomics: true } : {}),
    ...(module.featureRequirements?.parallel === undefined ? {} : { parallel: module.featureRequirements.parallel }),
  };
}

function validateTargetFeatures(
  module: ForgeWebScriptWasmModule,
  targetFeatures: ForgeWebScriptTargetFeatures | undefined,
  fileName: string,
): readonly ForgeWebScriptWasmDiagnostic[] {
  const requested = targetFeatures ?? {};
  const required = featureRequirements(module);
  const diagnostics: ForgeWebScriptWasmDiagnostic[] = [];
  const check = (feature: keyof ForgeWebScriptTargetFeatures): void => {
    if (required[feature] === true && requested[feature] !== true)
      diagnostics.push({
        ...backendDiagnostic(fileName, `Target feature "${feature}" is required by the module but is disabled.`, module.span),
        code: 'FWS-FEATURE-001',
        hint: `Enable targetFeatures.${feature} or remove the feature-dependent operation.`,
      });
  };
  (Object.keys(required).filter((feature) => feature !== 'parallel') as (keyof ForgeWebScriptTargetFeatures)[]).forEach(check);
  if (requested.threads === true && requested.atomics !== true)
    diagnostics.push({
      ...backendDiagnostic(fileName, 'Shared-memory execution requires atomics to be enabled in the target profile.', module.span),
      code: 'FWS-FEATURE-002',
      hint: 'Set both targetFeatures.threads and targetFeatures.atomics to true.',
    });
  if (requested.atomics === true && requested.threads !== true)
    diagnostics.push({
      ...backendDiagnostic(fileName, 'Atomic operations require shared-memory execution in the target profile.', module.span),
      code: 'FWS-FEATURE-003',
      hint: 'Set both targetFeatures.atomics and targetFeatures.threads to true.',
    });
  if (requested.memory64 === true && module.functions.some((declaration) => /(?:string|bytes|full|prefix|search)-/.test(JSON.stringify(declaration.body))))
    diagnostics.push({
      ...backendDiagnostic(fileName, 'memory64 is incompatible with legacy 32-bit pointer runtime helpers.', module.span),
      code: 'FWS-FEATURE-004',
      hint: 'Use a core-memory target for string, bytes, and regular-expression helpers.',
    });
  return diagnostics;
}

function memoryLimits(
  targetFeatures: ForgeWebScriptTargetFeatures | undefined,
  requiredBytes: number,
): number[] {
  const initialPages = Math.max(1, Math.ceil(requiredBytes / 65_536));
  if (targetFeatures?.memory64 === true && targetFeatures.threads === true)
    return [0x01, 0x07, ...unsignedLeb(initialPages), ...unsignedLeb(65_536)];
  if (targetFeatures?.memory64 === true) return [0x01, 0x04, ...unsignedLeb(initialPages)];
  if (targetFeatures?.threads === true)
    return [0x01, 0x03, ...unsignedLeb(initialPages), ...unsignedLeb(65_536)];
  return [0x01, 0x00, ...unsignedLeb(initialPages)];
}

function featureCustomSection(targetFeatures: ForgeWebScriptTargetFeatures | undefined): number[] {
  const normalized = {
    simd: targetFeatures?.simd === true,
    tailCall: targetFeatures?.tailCall === true,
    memory64: targetFeatures?.memory64 === true,
    threads: targetFeatures?.threads === true,
    atomics: targetFeatures?.atomics === true,
  };
  return section(0, [...wasmString('fws.target-features'), ...encoder.encode(JSON.stringify(normalized))]);
}

function emitWasm(
  module: ForgeWebScriptWasmModule,
  targetFeatures: ForgeWebScriptTargetFeatures | undefined,
  compilerHints: ForgeWebScriptWasmCompilerHints | undefined,
): Uint8Array {
  const hasRegexRuntime = module.functions.some((declaration) =>
    /"standardLibrary":"(?:full|prefix|search)/.test(JSON.stringify(declaration.body)),
  );
  const hasStringRuntime = module.functions.some((declaration) =>
    /"standardLibrary":"(?:string|bytes)-/.test(JSON.stringify(declaration.body)),
  );
  const hasCollectionRuntime = module.functions.some((declaration) =>
    /"(?:kind":"(?:array-literal|vector-literal|index|iterator-loop)|standardLibrary":"(?:array|vector)-|standardLibrary":"iterator-next)/.test(
      JSON.stringify(declaration.body),
    ),
  );
  const collectionContracts = hasCollectionRuntime
    ? COLLECTION_RUNTIME_OPERATION_ORDER.map((operation) =>
        buildForgeWebScriptWasmCollectionRuntimeBodies().find((contract) => contract.operation === operation),
      ).filter((contract): contract is NonNullable<typeof contract> => contract !== undefined)
    : [];
  const types: number[][] = [];
  const typeIndexes = new Map<string, number>();
  const getTypeIndex = (
    parameters: readonly ForgeWebScriptWasmPrimitiveType[],
    result: ForgeWebScriptWasmPrimitiveType,
  ): number => {
    const key = `${parameters.join(',')}->${result}`;
    const existing = typeIndexes.get(key);
    if (existing !== undefined) return existing;
    const index = types.length;
    types.push(wasmFunctionType(parameters, result));
    typeIndexes.set(key, index);
    return index;
  };
  const callables = new Map<string, Callable>();
  for (const imported of module.imports)
    callables.set(imported.alias, {
      parameters: imported.parameters.map(({ type }) => type.name),
      result: imported.result.name,
    });
  for (const declaration of module.functions)
    callables.set(declaration.name, {
      parameters: declaration.parameters.map(({ type }) => type.name),
      result: declaration.result.name,
    });
  const importTypeIndexes = module.imports.map(({ parameters, result }) =>
    getTypeIndex(
      parameters.map(({ type }) => type.name),
      result.name,
    ),
  );
  const functionTypeIndexes = module.functions.map(({ parameters, result }) =>
    getTypeIndex(
      parameters.map(({ type }) => type.name),
      result.name,
    ),
  );
  const regexClassType = hasRegexRuntime ? getTypeIndex(['u32', 'u32', 'u32'], 'i32') : undefined;
  const regexRunType = hasRegexRuntime
    ? getTypeIndex(
        Array.from({ length: 11 }, () => 'u32' as const),
        'i32',
      )
    : undefined;
  const regexEntryType = hasRegexRuntime
    ? getTypeIndex(
        Array.from({ length: 13 }, () => 'u32' as const),
        'i32',
      )
    : undefined;
  const stringLengthType = hasStringRuntime ? getTypeIndex(['string'], 'i32') : undefined;
  const stringConcatType = hasStringRuntime ? getTypeIndex(['string', 'string'], 'string') : undefined;
  const stringByteAtType = hasStringRuntime ? getTypeIndex(['string', 'i32'], 'i32') : undefined;
  const stringStartsWithType = hasStringRuntime ? getTypeIndex(['string', 'string'], 'bool') : undefined;
  const stringSliceType = hasStringRuntime ? getTypeIndex(['string', 'i32', 'i32'], 'string') : undefined;
  const stringToI32Type = hasStringRuntime ? getTypeIndex(['string'], 'i32') : undefined;
  const addressType = targetFeatures?.memory64 === true ? 'u64' : 'u32';
  const allocatorType = getTypeIndex([addressType], addressType);
  const deallocatorType = getTypeIndex([addressType, addressType], 'unit');
  const reallocatorType = getTypeIndex([addressType, addressType, addressType], addressType);
  const resetType = getTypeIndex([], 'unit');
  const collectionTypeIndexes = collectionContracts.map(({ parameters, results }) =>
    getTypeIndex(parameters as readonly ForgeWebScriptWasmPrimitiveType[], (results[0] ?? 'unit') as ForgeWebScriptWasmPrimitiveType),
  );
  const dataEntries: { readonly offset: number; readonly bytes: Uint8Array }[] = [];
  const stringOffsets = new Map<string, { readonly offset: number; readonly bytes: Uint8Array }>();
  let dataOffset = STATIC_DATA_START;
  const addData = (bytes: Uint8Array, alignment = 1): { readonly offset: number; readonly bytes: Uint8Array } => {
    dataOffset = (dataOffset + alignment - 1) & ~(alignment - 1);
    const entry = { offset: dataOffset, bytes };
    dataOffset += bytes.byteLength;
    dataEntries.push(entry);
    return entry;
  };
  const getString = (value: string): { readonly offset: number; readonly bytes: Uint8Array } => {
    const existing = stringOffsets.get(value);
    if (existing !== undefined) return existing;
    const bytes = encoder.encode(value);
    const entry = addData(bytes);
    stringOffsets.set(value, entry);
    return entry;
  };
  const regexTables = new Map<
    string,
    {
      readonly compiled: CompiledRegex;
      readonly program: { readonly offset: number; readonly bytes: Uint8Array };
      readonly classes: { readonly offset: number; readonly bytes: Uint8Array };
      readonly captures: { readonly offset: number; readonly bytes: Uint8Array };
      readonly scratch: { readonly offset: number; readonly bytes: Uint8Array };
      readonly slots: number;
    }
  >();
  const i32Bytes = (values: readonly number[]): Uint8Array => {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, index) => view.setInt32(index * 4, value, true));
    return bytes;
  };
  const getRegexTable = (pattern: string) => {
    const existing = regexTables.get(pattern);
    if (existing !== undefined) return existing;
    const compiled = compileRegex(pattern);
    const slots = 2 * (compiled.groupCount + 1);
    const program = addData(i32Bytes(compiled.program), 4);
    const classes = addData(i32Bytes(compiled.classes), 4);
    const captures = addData(new Uint8Array(slots * 4), 4);
    const scratch = addData(new Uint8Array(Math.max(1, compiled.program.length) * slots * 4), 4);
    const table = { compiled, program, classes, captures, scratch, slots };
    regexTables.set(pattern, table);
    return table;
  };
  const functionIndexes = new Map<string, number>();
  for (const [index, declaration] of module.imports.entries()) functionIndexes.set(declaration.alias, index);
  for (const [index, declaration] of module.functions.entries())
    functionIndexes.set(declaration.name, module.imports.length + index);
  const runtimeIndex = module.imports.length + module.functions.length;
  const allocatorFunctionIndex = runtimeIndex + (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) + (hasStringRuntime ? STRING_RUNTIME_FUNCTION_COUNT : 0);
  const collectionBodies = hasCollectionRuntime
    ? buildForgeWebScriptWasmCollectionRuntimeWasmBodies(allocatorFunctionIndex)
    : [];
  const collectionFunctionIndex = (operation: string): number => {
    const index = COLLECTION_RUNTIME_OPERATION_ORDER.indexOf(operation as (typeof COLLECTION_RUNTIME_OPERATION_ORDER)[number]);
    if (index < 0) throw new Error(`Unknown collection runtime operation "${operation}".`);
    return allocatorFunctionIndex + 3 + index;
  };
  const enumValues = new Map<string, number>();
  for (const declaration of module.enumDeclarations ?? [])
    for (const variant of declaration.variants) enumValues.set(variant.name, variant.value);
  const bodies: number[][] = [];
  for (const declaration of module.functions) {
    if (declaration.name === ITER_RESULT_HELPER) {
      // pack (value: i32, done: i32) -> i64 as (done << 32) | value
      const helperBody = [
        0,
        0x20,
        0x00,
        0xad,
        0x20,
        0x01,
        0xad,
        0x42,
        ...signedLeb(32n),
        0x86,
        0x84,
        0x0b,
      ];
      bodies.push([...unsignedLeb(helperBody.length), ...helperBody]);
      continue;
    }
    const parameterLocations = new Map<string, ValueLocation>();
    let parameterIndex = 0;
    for (const parameter of declaration.parameters) {
      const indexes = valueTypes(parameter.type.name).map(() => parameterIndex++);
      parameterLocations.set(parameter.name, {
        indexes,
        type: parameter.type.name,
        ...(parameter.type.reference === undefined ? {} : { reference: parameter.type.reference }),
        ...(parameter.type.length === undefined ? {} : { length: parameter.type.length }),
      });
    }
    const ssaPlan = lowerForgeWebScriptWasmFunctionToSsa(declaration);
    const locals: { readonly type: WasmValueType }[] = [];
    const locations = new Map<ForgeWebScriptWasmStatement, ValueLocation>();
    const iteratorBindingLocations = new Map<ForgeWebScriptWasmStatement, ValueLocation>();
    const iteratorSourceLocations = new Map<ForgeWebScriptWasmStatement, ValueLocation>();
    const expressionLocations = new Map<ForgeWebScriptWasmExpression, ValueLocation>();
    const collectionAccessLocations = new Map<
      ForgeWebScriptWasmExpression,
      { readonly receiver: ValueLocation; readonly index: ValueLocation }
    >();
    const bytesByteAtLocations = new Map<
      ForgeWebScriptWasmExpression,
      { readonly pointer: ValueLocation; readonly length: ValueLocation; readonly index: ValueLocation }
    >();
    const stringByteAtLocations = new Map<
      ForgeWebScriptWasmExpression,
      { readonly pointer: ValueLocation; readonly length: ValueLocation; readonly index: ValueLocation }
    >();
    const pointerLengthLocations = new Map<
      ForgeWebScriptWasmExpression,
      { readonly pointer: ValueLocation; readonly length: ValueLocation }
    >();
    const allocateI32 = (): ValueLocation => {
      const index = parameterIndex + locals.length;
      locals.push({ type: 0x7f });
      return { indexes: [index], type: 'i32' };
    };
    const allocateI64 = (): ValueLocation => {
      const index = parameterIndex + locals.length;
      locals.push({ type: 0x7e });
      return { indexes: [index], type: 'i64' };
    };
    const valueLocations = new Map<number, ValueLocation>();
    for (const value of ssaPlan.values) {
      if (value.kind === 'parameter') {
        const parameterLocation = parameterLocations.get(value.name);
        if (parameterLocation !== undefined) valueLocations.set(value.id, parameterLocation);
        continue;
      }
      const indexes = valueTypes(value.type).map((type) => {
        const index = parameterIndex + locals.length;
        locals.push({ type });
        return index;
      });
      valueLocations.set(value.id, {
        indexes,
        type: value.type,
        ...(value.reference === undefined ? {} : { reference: value.reference }),
        ...(value.length === undefined ? {} : { length: value.length }),
      });
    }
    const locationForValue = (value: ForgeWebScriptWasmSsaValue | undefined): ValueLocation | undefined =>
      value === undefined ? undefined : valueLocations.get(value.id);
    const bindingsToLocations = (bindings: ForgeWebScriptWasmSsaBindings): Map<string, ValueLocation> => {
      const result = new Map<string, ValueLocation>();
      for (const [name, value] of bindings) {
        const location = locationForValue(value);
        if (location !== undefined) result.set(name, location);
      }
      return result;
    };
    const collectExpression = (expression: ForgeWebScriptWasmExpression): void => {
      if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') {
        expressionLocations.set(expression, allocateI32());
        expression.elements.forEach(collectExpression);
      } else if (expression.kind === 'call') {
        if (expression.standardLibrary === 'bytes-byte-at' || expression.standardLibrary === 'bytes-byte-at-u32')
          bytesByteAtLocations.set(expression, { pointer: allocateI32(), length: allocateI32(), index: allocateI32() });
        else if (expression.standardLibrary === 'string-byte-at')
          stringByteAtLocations.set(expression, { pointer: allocateI32(), length: allocateI32(), index: allocateI32() });
        else if (
          expression.standardLibrary === 'string-length' ||
          expression.standardLibrary === 'bytes-length' ||
          expression.standardLibrary === 'bytes-length-u32'
        )
          pointerLengthLocations.set(expression, { pointer: allocateI32(), length: allocateI32() });
        expression.arguments.forEach(collectExpression);
      }
      else if (expression.kind === 'atomic') {
        collectExpression(expression.address);
        if (expression.value !== undefined) collectExpression(expression.value);
        if (expression.replacement !== undefined) collectExpression(expression.replacement);
      } else if (expression.kind === 'binary') {
        collectExpression(expression.left);
        collectExpression(expression.right);
      } else if (expression.kind === 'unary') collectExpression(expression.operand);
      else if (expression.kind === 'index') {
        collectExpression(expression.receiver);
        collectExpression(expression.index);
        collectionAccessLocations.set(expression, { receiver: allocateI32(), index: allocateI32() });
      }
    };
    const iteratorSourceExpression = (statement: Extract<ForgeWebScriptWasmStatement, { readonly kind: 'iterator-loop' }>): ForgeWebScriptWasmExpression => {
      const iterator = statement.iterator;
      return iterator.kind === 'call' && iterator.standardLibrary === 'iterator-next' && iterator.arguments[0] !== undefined
        ? iterator.arguments[0]
        : iterator;
    };
    const collect = (statements: readonly ForgeWebScriptWasmStatement[], visible: Map<string, ValueLocation>): void => {
      for (const statement of statements) {
        if (statement.kind === 'let') {
          const location = locationForValue(ssaPlan.definitionValues.get(statement));
          if (location !== undefined) locations.set(statement, location);
          collectExpression(statement.value);
        } else if (statement.kind === 'assignment') {
          const location = locationForValue(ssaPlan.definitionValues.get(statement));
          if (location !== undefined) locations.set(statement, location);
          collectExpression(statement.value);
          if (statement.index !== undefined) collectExpression(statement.index);
        } else if (statement.kind === 'if') {
          collectExpression(statement.condition);
          collect(statement.consequent, new Map(visible));
          if (statement.alternate !== undefined) collect(statement.alternate, new Map(visible));
        } else if (statement.kind === 'switch') {
          locations.set(statement, allocateI32());
          collectExpression(statement.value);
          statement.cases.forEach((arm) => collect(arm.body, new Map(visible)));
          if (statement.defaultCase !== undefined) collect(statement.defaultCase, new Map(visible));
        } else if (statement.kind === 'while') {
          collectExpression(statement.condition);
          collect(statement.body, new Map(visible));
        } else if (statement.kind === 'for') {
          collectExpression(statement.condition);
          if (statement.initializer !== undefined) collect([statement.initializer], new Map(visible));
          if (statement.update !== undefined) collect([statement.update], new Map(visible));
          collect(statement.body, new Map(visible));
        } else if (statement.kind === 'do-while') {
          collectExpression(statement.condition);
          collect(statement.body, new Map(visible));
        } else if (statement.kind === 'iterator-loop') {
          collectExpression(iteratorSourceExpression(statement));
          iteratorSourceLocations.set(statement, allocateI32());
          locations.set(statement, allocateI64());
          const binding = allocateI32();
          iteratorBindingLocations.set(statement, binding);
          const loopVisible = new Map(visible);
          loopVisible.set(statement.binding, binding);
          collect(statement.body, loopVisible);
        } else if (statement.kind === 'return' && statement.value !== undefined) collectExpression(statement.value);
        else if (statement.kind === 'expression-statement') collectExpression(statement.expression);
      }
    };
    collect(declaration.body, new Map(parameterLocations));
    const body: number[] = [...unsignedLeb(locals.length), ...locals.flatMap(({ type }) => [1, type])];
    const bindingsForStatement = (
      statement: ForgeWebScriptWasmStatement,
      fallback: ReadonlyMap<string, ValueLocation>,
    ): Map<string, ValueLocation> => {
      const result = new Map(fallback);
      const planned = ssaPlan.entryBindings.get(statement);
      if (planned !== undefined) {
        for (const [name, location] of bindingsToLocations(planned)) result.set(name, location);
      }
      return result;
    };
    const emitCopies = (
      from: ForgeWebScriptWasmSsaBindings | undefined,
      to: ForgeWebScriptWasmSsaBindings | undefined,
    ): void => {
      if (from === undefined || to === undefined) return;
      for (const [name, target] of to) {
        const source = from.get(name);
        const sourceLocation = locationForValue(source);
        const targetLocation = locationForValue(target);
        if (sourceLocation === undefined || targetLocation === undefined || source?.id === target.id) continue;
        for (const index of sourceLocation.indexes) body.push(0x20, ...unsignedLeb(index));
        for (const index of targetLocation.indexes.toReversed()) body.push(0x21, ...unsignedLeb(index));
      }
    };
    const emitPhiPrelude = (statement: ForgeWebScriptWasmStatement): void =>
      emitCopies(ssaPlan.entryBindings.get(statement), ssaPlan.exitBindings.get(statement));
    const emitBranchCopies = (statement: ForgeWebScriptWasmStatement, branchIndex: number): void =>
      emitCopies(ssaPlan.branchOutputs.get(statement)?.[branchIndex], ssaPlan.exitBindings.get(statement));
    const emitCollectionCall = (
      operation: string,
      arguments_: readonly ForgeWebScriptWasmExpression[],
      visible: ReadonlyMap<string, ValueLocation>,
    ): void => {
      for (const argument of arguments_) emitExpression(argument, visible);
      body.push(0x10, ...unsignedLeb(collectionFunctionIndex(operation)));
    };
    const emitExpression = (
      expression: ForgeWebScriptWasmExpression,
      visible: ReadonlyMap<string, ValueLocation>,
    ): void => {
      if (expression.kind === 'literal') {
        if (expression.type === 'string' || expression.type === 'bytes') {
          const entry = getString(String(expression.value));
          body.push(0x41, ...signedLeb(entry.offset), 0x41, ...signedLeb(entry.bytes.byteLength));
        } else if (expression.type === 'f32') body.push(0x43, ...appendF32(Number(expression.value)));
        else if (expression.type === 'f64') body.push(0x44, ...appendF64(Number(expression.value)));
        else if (expression.type === 'i64' || expression.type === 'u64')
          body.push(0x42, ...signedLeb(BigInt(Number(expression.value))));
        else
          body.push(
            0x41,
            ...signedLeb(expression.value === true ? 1 : expression.value === false ? 0 : Number(expression.value)),
          );
      } else if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') {
        const temporary = expressionLocations.get(expression);
        if (temporary === undefined) throw new Error('Collection literal is missing its temporary handle local.');
        const operation = expression.kind === 'array-literal' ? 'array-new' : 'vector-new';
        body.push(0x41, ...signedLeb(expression.kind === 'array-literal' ? expression.elements.length : 0));
        body.push(0x10, ...unsignedLeb(collectionFunctionIndex(operation)), 0x21, ...unsignedLeb(temporary.indexes[0]!));
        expression.elements.forEach((element, index) => {
          body.push(0x20, ...unsignedLeb(temporary.indexes[0]!));
          if (expression.kind === 'vector-literal') {
            emitExpression(element, visible);
            body.push(0x10, ...unsignedLeb(collectionFunctionIndex('vector-push')), 0x1a);
          } else {
            body.push(0x41, ...signedLeb(index));
            emitExpression(element, visible);
            body.push(0x10, ...unsignedLeb(collectionFunctionIndex('array-set')));
          }
        });
        body.push(0x20, ...unsignedLeb(temporary.indexes[0]!));
      } else if (expression.kind === 'index') {
        const receiver = expression.receiver.kind === 'identifier' ? visible.get(expression.receiver.name) : undefined;
        const access = collectionAccessLocations.get(expression);
        if (access !== undefined && (receiver?.reference === 'Array' || receiver?.reference === 'Vector')) {
          emitExpression(expression.receiver, visible);
          body.push(0x21, ...unsignedLeb(access.receiver.indexes[0]!));
          emitExpression(expression.index, visible);
          body.push(0x21, ...unsignedLeb(access.index.indexes[0]!));
          body.push(
            0x20,
            ...unsignedLeb(access.receiver.indexes[0]!),
            0x28,
            0x02,
            receiver.reference === 'Array' ? 0 : 4,
            0x20,
            ...unsignedLeb(access.index.indexes[0]!),
            0x4d,
            0x04,
            0x40,
            0x00,
            0x0b,
          );
          if (receiver.reference === 'Array') {
            body.push(
              0x20,
              ...unsignedLeb(access.receiver.indexes[0]!),
              0x20,
              ...unsignedLeb(access.index.indexes[0]!),
              0x41,
              ...signedLeb(1),
              0x6a,
              0x41,
              ...signedLeb(4),
              0x6c,
              0x6a,
              0x28,
              0x02,
              0,
            );
          } else {
            body.push(
              0x20,
              ...unsignedLeb(access.receiver.indexes[0]!),
              0x28,
              0x02,
              0,
              0x20,
              ...unsignedLeb(access.index.indexes[0]!),
              0x41,
              ...signedLeb(4),
              0x6c,
              0x6a,
              0x28,
              0x02,
              0,
            );
          }
        } else {
          emitExpression(expression.receiver, visible);
          emitExpression(expression.index, visible);
          body.push(0x10, ...unsignedLeb(collectionFunctionIndex(receiver?.reference === 'Array' ? 'array-get' : 'vector-get')));
        }
      } else if (expression.kind === 'identifier') {
        const location = visible.get(expression.name);
        if (location !== undefined) for (const index of location.indexes) body.push(0x20, ...unsignedLeb(index));
      } else if (expression.kind === 'atomic') {
        emitExpression(expression.address, visible);
        if (expression.operation === 'load') {
          body.push(0xfe, 0x10, 0x02, 0x00);
        } else {
          if (expression.value !== undefined) emitExpression(expression.value, visible);
          if (expression.operation === 'store') body.push(0xfe, 0x17, 0x02, 0x00);
          else if (expression.operation === 'add') body.push(0xfe, 0x1e, 0x02, 0x00);
          else {
            if (expression.replacement !== undefined) emitExpression(expression.replacement, visible);
            body.push(0xfe, 0x48, 0x02, 0x00);
          }
        }
      } else if (expression.kind === 'call') {
        if (expression.standardLibrary !== undefined) {
          if (
            expression.standardLibrary === 'memory-alloc' ||
            expression.standardLibrary === 'memory-dealloc' ||
            expression.standardLibrary === 'memory-realloc'
          ) {
            for (const argument of expression.arguments) emitExpression(argument, visible);
            const offset =
              expression.standardLibrary === 'memory-alloc'
                ? 0
                : expression.standardLibrary === 'memory-dealloc'
                  ? 1
                  : 3 + collectionBodies.length;
            body.push(0x10, ...unsignedLeb(allocatorFunctionIndex + offset));
            return;
          }
          if (expression.standardLibrary === 'memory-load-u32') {
            const address = expression.arguments[0];
            if (address === undefined) throw new Error('FWS-MEMORY-001: memory_load_u32 requires an address.');
            emitExpression(address, visible);
            body.push(0x28, 0x02, 0x00);
            return;
          }
          if (expression.standardLibrary === 'memory-store-u32') {
            const address = expression.arguments[0];
            const value = expression.arguments[1];
            if (address === undefined || value === undefined)
              throw new Error('FWS-MEMORY-002: memory_store_u32 requires an address and value.');
            emitExpression(address, visible);
            emitExpression(value, visible);
            body.push(0x36, 0x02, 0x00);
            return;
          }
          if (expression.standardLibrary === 'memory-load-f64') {
            const address = expression.arguments[0];
            if (address === undefined) throw new Error('FWS-MEMORY-003: memory_load_f64 requires an address.');
            emitExpression(address, visible);
            body.push(0x2b, 0x03, 0x00);
            return;
          }
          if (expression.standardLibrary === 'memory-store-f64') {
            const address = expression.arguments[0];
            const value = expression.arguments[1];
            if (address === undefined || value === undefined)
              throw new Error('FWS-MEMORY-004: memory_store_f64 requires an address and value.');
            emitExpression(address, visible);
            emitExpression(value, visible);
            body.push(0x39, 0x03, 0x00);
            return;
          }
          if (expression.standardLibrary === 'f64-from-u32') {
            const value = expression.arguments[0];
            if (value === undefined) throw new Error('FWS-NUMERIC-001: f64_from_u32 requires a value.');
            emitExpression(value, visible);
            body.push(0xb8);
            return;
          }
          if (expression.standardLibrary.startsWith('string-') || expression.standardLibrary.startsWith('bytes-')) {
            if (
              expression.standardLibrary === 'string-length' ||
              expression.standardLibrary === 'bytes-length' ||
              expression.standardLibrary === 'bytes-length-u32'
            ) {
              const value = expression.arguments[0];
              const explicitLength = expression.arguments[1];
              const locations = pointerLengthLocations.get(expression);
              if (value !== undefined && locations !== undefined) {
                emitExpression(value, visible);
                if (explicitLength !== undefined) emitExpression(explicitLength, visible);
                body.push(0x21, ...unsignedLeb(locations.length.indexes[0]!));
                body.push(0x21, ...unsignedLeb(locations.pointer.indexes[0]!));
                body.push(
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x41,
                  ...signedLeb(STATIC_DATA_START),
                  0x49,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x20,
                  ...unsignedLeb(locations.length.indexes[0]!),
                  0x6a,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x49,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x20,
                  ...unsignedLeb(locations.length.indexes[0]!),
                  0x6a,
                  0x3f,
                  0x00,
                  0x41,
                  ...signedLeb(65_536),
                  0x6c,
                  0x4b,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.length.indexes[0]!),
                );
                return;
              }
            }
            if (
              expression.standardLibrary === 'bytes-byte-at' ||
              expression.standardLibrary === 'bytes-byte-at-u32' ||
              expression.standardLibrary === 'string-byte-at'
            ) {
              const bytes = expression.arguments[0];
              const index = expression.arguments[1];
              const locations = bytesByteAtLocations.get(expression) ?? stringByteAtLocations.get(expression);
              if (bytes !== undefined && index !== undefined && locations !== undefined) {
                emitExpression(bytes, visible);
                body.push(0x21, ...unsignedLeb(locations.length.indexes[0]!));
                body.push(0x21, ...unsignedLeb(locations.pointer.indexes[0]!));
                emitExpression(index, visible);
                body.push(0x21, ...unsignedLeb(locations.index.indexes[0]!));
                body.push(
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x41,
                  ...signedLeb(STATIC_DATA_START),
                  0x49,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x20,
                  ...unsignedLeb(locations.length.indexes[0]!),
                  0x6a,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x49,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x20,
                  ...unsignedLeb(locations.length.indexes[0]!),
                  0x6a,
                  0x3f,
                  0x00,
                  0x41,
                  ...signedLeb(65_536),
                  0x6c,
                  0x4b,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.index.indexes[0]!),
                  0x41,
                  ...signedLeb(0),
                  0x48,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.index.indexes[0]!),
                  0x20,
                  ...unsignedLeb(locations.length.indexes[0]!),
                  0x4f,
                  0x04,
                  0x40,
                  0x00,
                  0x0b,
                  0x20,
                  ...unsignedLeb(locations.pointer.indexes[0]!),
                  0x20,
                  ...unsignedLeb(locations.index.indexes[0]!),
                  0x6a,
                  0x2d,
                  0x00,
                  0x00,
                );
                return;
              }
            }
            for (const argument of expression.arguments) emitExpression(argument, visible);
            const operation = expression.standardLibrary;
                    const helperOffset = operation === 'string-concat'
              ? 0
              : operation.endsWith('length')
                ? 1
              : operation.endsWith('byte-at')
                ? 2
                : operation.endsWith('starts-with')
                  ? 3
                  : operation.endsWith('slice')
                    ? 4
                    : 5;
            body.push(
              0x10,
              ...unsignedLeb(runtimeIndex + (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) + helperOffset),
            );
            return;
          }
          if (COLLECTION_RUNTIME_OPERATIONS.has(expression.standardLibrary)) {
            const receiver = expression.arguments[0]?.kind === 'identifier'
              ? visible.get(expression.arguments[0].name)
              : undefined;
            const isArrayLength = expression.standardLibrary === 'array-length' && receiver?.reference === 'Array';
            const isVectorLength = expression.standardLibrary === 'vector-length' && receiver?.reference === 'Vector';
            if (expression.arguments[0] !== undefined && (isArrayLength || isVectorLength)) {
              emitExpression(expression.arguments[0], visible);
              body.push(0x28, 0x02, isArrayLength ? 0 : 4);
              return;
            }
            emitCollectionCall(expression.standardLibrary, expression.arguments, visible);
            return;
          }
          const pattern = expression.arguments[0];
          if (pattern?.kind !== 'literal' || pattern.type !== 'string' || typeof pattern.value !== 'string')
            throw new Error('FWS-REGEX-004: Regex patterns must be compile-time string literals.');
          const table = getRegexTable(pattern.value);
          const input = expression.arguments[1];
          if (input === undefined) throw new Error('FWS-REGEX-005: Regex operation is missing its input string.');
          body.push(0x41, ...signedLeb(table.program.offset), 0x41, ...signedLeb(table.classes.offset));
          emitExpression(input, visible);
          body.push(0x41, ...signedLeb(0));
          if (expression.standardLibrary === 'search' || expression.standardLibrary.startsWith('search-'))
            emitExpression(expression.arguments[2], visible);
          else body.push(0x41, ...signedLeb(0));
          const mode = expression.standardLibrary.startsWith('full')
            ? 1
            : expression.standardLibrary.startsWith('search')
              ? 2
              : 0;
          body.push(
            0x41,
            ...signedLeb(mode),
            0x41,
            ...signedLeb(table.captures.offset),
            0x41,
            ...signedLeb(table.scratch.offset),
            0x41,
            ...signedLeb(table.slots),
            0x41,
            ...signedLeb(0),
          );
          const capture = expression.standardLibrary.includes('capture-');
          if (capture) {
            const groupIndex = expression.standardLibrary.startsWith('search-') ? 3 : 2;
            emitExpression(expression.arguments[groupIndex], visible);
            body.push(0x41, ...signedLeb(expression.standardLibrary.endsWith('-end') ? 1 : 0));
          } else body.push(0x41, ...signedLeb(-1), 0x41, ...signedLeb(0));
          body.push(0x10, ...unsignedLeb(runtimeIndex + 2));
          return;
        }
        const index = functionIndexes.get(expression.callee);
        if (index !== undefined) {
          if (expression.callee.endsWith('.next')) {
            const receiver = expression.callee.slice(0, expression.callee.lastIndexOf('.'));
            const receiverName = visible.has(receiver) ? receiver : '__state';
            emitExpression({ kind: 'identifier', name: receiverName, span: expression.span }, visible);
          } else {
            for (const argument of expression.arguments) emitExpression(argument, visible);
          }
          body.push(0x10, ...unsignedLeb(index));
        } else if (expression.callee.endsWith('.next')) {
          const receiver = expression.callee.slice(0, expression.callee.lastIndexOf('.'));
          const receiverName = visible.has(receiver) ? receiver : '__state';
          emitExpression({ kind: 'identifier', name: receiverName, span: expression.span }, visible);
        } else for (const argument of expression.arguments) emitExpression(argument, visible);
      } else if (expression.kind === 'unary') {
        const operandType =
          expression.operator === '!' ? 'bool' : expressionType(expression.operand, visible, callables);
        if (expression.operator === '!') {
          emitExpression(expression.operand, visible);
          body.push(0x45);
        } else if (operandType === 'f32') {
          emitExpression(expression.operand, visible);
          body.push(0x8c);
        } else if (operandType === 'f64') {
          emitExpression(expression.operand, visible);
          body.push(0x9a);
        } else if (operandType === 'i64' || operandType === 'u64') {
          body.push(0x42, ...signedLeb(0n));
          emitExpression(expression.operand, visible);
          body.push(0x7d);
        } else {
          body.push(0x41, ...signedLeb(0));
          emitExpression(expression.operand, visible);
          body.push(0x6b);
        }
      } else if (expression.kind === 'binary') {
        if (expression.operator === '&&' || expression.operator === '||') {
          emitExpression(expression.left, visible);
          body.push(0x04, 0x7f);
          if (expression.operator === '&&') {
            emitExpression(expression.right, visible);
            body.push(0x05, 0x41, ...signedLeb(0), 0x0b);
          } else {
            body.push(0x41, ...signedLeb(1), 0x05);
            emitExpression(expression.right, visible);
            body.push(0x0b);
          }
        } else {
          emitExpression(expression.left, visible);
          emitExpression(expression.right, visible);
          body.push(binaryOpcode(expression.operator, expressionType(expression.left, visible, callables)));
        }
      }
    };
    const emitSwitch = (
      statement: Extract<ForgeWebScriptWasmStatement, { readonly kind: 'switch' }>,
      visible: ReadonlyMap<string, ValueLocation>,
    ): void => {
      const location = locations.get(statement);
      if (location === undefined) throw new Error('Switch is missing its discriminant local.');
      const values = statement.cases.map((arm) => {
        const value = typeof arm.value === 'number' ? arm.value : enumValues.get(arm.value);
        if (value === undefined || !Number.isInteger(value)) throw new Error(`FWS-DISPATCH-001: Invalid switch case "${String(arm.value)}".`);
        return value;
      });
      if (new Set(values).size !== values.length) throw new Error('FWS-DISPATCH-002: Duplicate switch case value.');
      const minimum = values.length === 0 ? 0 : Math.min(...values);
      const maximum = values.length === 0 ? 0 : Math.max(...values);
      const tableLength = maximum - minimum + 1;
      const useBrTable = values.length > 0 && tableLength <= 65_536 && tableLength <= values.length * 4;
      emitPhiPrelude(statement);
      emitExpression(statement.value, visible);
      body.push(0x21, ...unsignedLeb(location.indexes[0]!));
      body.push(0x02, 0x40);
      if (values.length > 0) {
        if (useBrTable) {
          body.push(0x20, ...unsignedLeb(location.indexes[0]!), 0x41, ...signedLeb(minimum), 0x48, 0x04, 0x40, 0x0c, 0x00, 0x0b);
          body.push(0x20, ...unsignedLeb(location.indexes[0]!), 0x41, ...signedLeb(maximum), 0x4a, 0x04, 0x40, 0x0c, 0x00, 0x0b);
          body.push(0x02, 0x40);
          for (let index = 0; index < values.length; index += 1) body.push(0x02, 0x40);
          body.push(0x20, ...unsignedLeb(location.indexes[0]!), 0x41, ...signedLeb(minimum), 0x6b, 0x0e, ...unsignedLeb(tableLength));
          for (let value = minimum; value <= maximum; value += 1) {
            const caseIndex = values.indexOf(value);
            body.push(...unsignedLeb(caseIndex < 0 ? values.length : values.length - 1 - caseIndex));
          }
          body.push(...unsignedLeb(values.length));
          for (let index = values.length - 1; index >= 0; index -= 1) {
            body.push(0x0b);
            emitStatements(statement.cases[index]!.body, visible);
            emitBranchCopies(statement, index);
            body.push(0x0c, ...unsignedLeb(index + 1));
          }
          body.push(0x0b);
        } else {
          for (const [index, value] of values.entries()) {
            body.push(0x20, ...unsignedLeb(location.indexes[0]!), 0x41, ...signedLeb(value), 0x46, 0x04, 0x40);
            emitStatements(statement.cases[index]!.body, visible);
            emitBranchCopies(statement, index);
            body.push(0x0c, 0x01, 0x0b);
          }
        }
      }
      if (statement.defaultCase !== undefined) {
        emitStatements(statement.defaultCase, visible);
        emitBranchCopies(statement, values.length);
      }
      body.push(0x0b);
    };
    const emitStatements = (
      statements: readonly ForgeWebScriptWasmStatement[],
      initial: ReadonlyMap<string, ValueLocation>,
    ): void => {
      const visible = new Map(initial);
      for (const statement of statements) {
        const current = bindingsForStatement(statement, visible);
        if (statement.kind === 'let') {
          emitExpression(statement.value, current);
          const location = locations.get(statement);
          if (location !== undefined)
            for (const index of location.indexes.toReversed()) body.push(0x21, ...unsignedLeb(index));
        } else if (statement.kind === 'assignment') {
          const location = locations.get(statement) ?? current.get(statement.name);
          const access = statement.index === undefined ? undefined : collectionAccessLocations.get(statement.index);
          if (
            statement.index !== undefined &&
            location !== undefined &&
            access !== undefined &&
            (location.reference === 'Array' || location.reference === 'Vector')
          ) {
            body.push(0x20, ...unsignedLeb(location.indexes[0]!));
            body.push(0x21, ...unsignedLeb(access.receiver.indexes[0]!));
            emitExpression(statement.index, current);
            body.push(0x21, ...unsignedLeb(access.index.indexes[0]!));
            body.push(
              0x20,
              ...unsignedLeb(access.receiver.indexes[0]!),
              0x28,
              0x02,
              location.reference === 'Array' ? 0 : 4,
              0x20,
              ...unsignedLeb(access.index.indexes[0]!),
              0x4d,
              0x04,
              0x40,
              0x00,
              0x0b,
            );
            if (location.reference === 'Array') {
              body.push(
                0x20,
                ...unsignedLeb(access.receiver.indexes[0]!),
                0x20,
                ...unsignedLeb(access.index.indexes[0]!),
                0x41,
                ...signedLeb(1),
                0x6a,
                0x41,
                ...signedLeb(4),
                0x6c,
                0x6a,
              );
            } else {
              body.push(
                0x20,
                ...unsignedLeb(access.receiver.indexes[0]!),
                0x28,
                0x02,
                0,
                0x20,
                ...unsignedLeb(access.index.indexes[0]!),
                0x41,
                ...signedLeb(4),
                0x6c,
                0x6a,
              );
            }
            emitExpression(statement.value, current);
            body.push(0x36, 0x02, 0);
          } else if (statement.index !== undefined && location !== undefined) {
            body.push(0x20, ...unsignedLeb(location.indexes[0]!));
            emitExpression(statement.index, current);
            emitExpression(statement.value, current);
            body.push(0x10, ...unsignedLeb(collectionFunctionIndex(location.reference === 'Array' ? 'array-set' : 'vector-set')));
          } else {
            emitExpression(statement.value, current);
            if (location !== undefined)
            for (const index of location.indexes.toReversed()) body.push(0x21, ...unsignedLeb(index));
          }
        } else if (statement.kind === 'return') {
          const tailCall =
            targetFeatures?.tailCall === true &&
            statement.value?.kind === 'call' &&
            compilerHints?.tailCallFunctions?.includes(statement.value.callee) === true;
          if (tailCall && statement.value?.kind === 'call') {
            for (const argument of statement.value.arguments) emitExpression(argument, current);
            const index = functionIndexes.get(statement.value.callee);
            if (index === undefined) throw new Error(`Tail-call target "${statement.value.callee}" is not available.`);
            body.push(0x12, ...unsignedLeb(index));
          } else {
            if (statement.value !== undefined) emitExpression(statement.value, current);
            body.push(0x0f);
          }
        } else if (statement.kind === 'if') {
          emitPhiPrelude(statement);
          emitExpression(statement.condition, current);
          body.push(0x04, 0x40);
          emitStatements(statement.consequent, current);
          emitBranchCopies(statement, 0);
          if (statement.alternate !== undefined) {
            body.push(0x05);
            emitStatements(statement.alternate, current);
            emitBranchCopies(statement, 1);
          }
          body.push(0x0b);
        } else if (statement.kind === 'switch') {
          emitSwitch(statement, current);
        } else if (statement.kind === 'while') {
          emitCopies(ssaPlan.loopInitialBindings.get(statement), ssaPlan.loopHeaders.get(statement));
          const loopVisible = bindingsToLocations(ssaPlan.loopHeaders.get(statement) ?? ssaPlan.entryBindings.get(statement) ?? new Map());
          body.push(0x02, 0x40, 0x03, 0x40);
          emitExpression(statement.condition, loopVisible);
          body.push(0x45, 0x0d, 0x01);
          emitStatements(statement.body, loopVisible);
          emitCopies(ssaPlan.loopBackedges.get(statement), ssaPlan.loopHeaders.get(statement));
          body.push(0x0c, 0x00, 0x0b, 0x0b);
        } else if (statement.kind === 'for') {
          const loopVisible = new Map(current);
          if (statement.initializer !== undefined) {
            emitStatements([statement.initializer], loopVisible);
          }
          emitCopies(ssaPlan.loopInitialBindings.get(statement), ssaPlan.loopHeaders.get(statement));
          const headerVisible = bindingsToLocations(ssaPlan.loopHeaders.get(statement) ?? new Map());
          body.push(0x02, 0x40, 0x03, 0x40);
          emitExpression(statement.condition, headerVisible);
          body.push(0x45, 0x0d, 0x01);
          emitStatements(statement.body, headerVisible);
          if (statement.update !== undefined) emitStatements([statement.update], headerVisible);
          emitCopies(ssaPlan.loopBackedges.get(statement), ssaPlan.loopHeaders.get(statement));
          body.push(0x0c, 0x00, 0x0b, 0x0b);
        } else if (statement.kind === 'do-while') {
          emitCopies(ssaPlan.loopInitialBindings.get(statement), ssaPlan.loopHeaders.get(statement));
          const loopVisible = bindingsToLocations(ssaPlan.loopHeaders.get(statement) ?? new Map());
          body.push(0x02, 0x40, 0x03, 0x40);
          emitStatements(statement.body, loopVisible);
          emitCopies(ssaPlan.loopBackedges.get(statement), ssaPlan.loopHeaders.get(statement));
          emitExpression(statement.condition, loopVisible);
          body.push(0x45, 0x0d, 0x01, 0x0c, 0x00, 0x0b, 0x0b);
        } else if (statement.kind === 'expression-statement') {
          emitExpression(statement.expression, current);
          for (const _ of valueTypes(expressionType(statement.expression, current, callables))) body.push(0x1a);
        } else if (statement.kind === 'yield') {
          // Defensive residual path: yield lowers to a done/value pack before emission.
          emitExpression(iterResultCall(statement.value, 0, statement.span), current);
          body.push(0x0f);
        } else if (statement.kind === 'iterator-loop') {
          const source = iteratorSourceLocations.get(statement);
          const packed = locations.get(statement);
          const binding = iteratorBindingLocations.get(statement);
          if (source === undefined || packed === undefined || binding === undefined)
            throw new Error('Iterator loop is missing its compiler-assigned locals.');
          const sourceExpression = iteratorSourceExpression(statement);
          emitExpression(
            sourceExpression.kind === 'identifier' && !current.has(sourceExpression.name)
              ? { kind: 'identifier', name: '__state', span: sourceExpression.span }
              : sourceExpression,
            current,
          );
          body.push(0x21, ...unsignedLeb(source.indexes[0]!));
          const loopVisible = new Map(current);
          loopVisible.set(statement.binding, binding);
          body.push(0x02, 0x40, 0x03, 0x40);
          body.push(0x20, ...unsignedLeb(source.indexes[0]!));
          body.push(0x10, ...unsignedLeb(collectionFunctionIndex('iterator-next')));
          body.push(0x21, ...unsignedLeb(packed.indexes[0]!));
          body.push(0x20, ...unsignedLeb(packed.indexes[0]!));
          body.push(0x42, ...signedLeb(32n), 0x88, 0x50, 0x45, 0x0d, 0x01);
          body.push(0x20, ...unsignedLeb(packed.indexes[0]!), 0xa7, 0x21, ...unsignedLeb(binding.indexes[0]!));
          emitStatements(statement.body, loopVisible);
          body.push(0x0c, 0x00, 0x0b, 0x0b);
        }
      }
    };
    emitStatements(declaration.body, parameterLocations);
    if (declaration.result.name !== 'unit') body.push(...defaultValue(declaration.result.name));
    body.push(0x0b);
    bodies.push([...unsignedLeb(body.length), ...body]);
  }
  if (hasRegexRuntime) {
    const runtime = buildRegexRuntimeBodies(runtimeIndex);
    for (const runtimeBody of [runtime.classMatch, runtime.run, runtime.entry])
      bodies.push([...unsignedLeb(runtimeBody.length), ...runtimeBody]);
  }
  if (hasStringRuntime) {
    const runtime = buildStringRuntimeBodies(
      runtimeIndex + (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) + STRING_RUNTIME_FUNCTION_COUNT,
      targetFeatures?.simd === true,
    );
    for (const runtimeBody of [runtime.concat, runtime.length, runtime.byteAt, runtime.startsWith, runtime.slice, runtime.toI32])
      bodies.push([...unsignedLeb(runtimeBody.length), ...runtimeBody]);
  }
  // The global is the high-water mark. Allocation is caller-owned and deterministic;
  // overflow and deallocation outside the owned range trap instead of corrupting memory.
  const globalInitialValue = Math.max(STATIC_DATA_START, dataOffset);
  const allocatorBody = [
    3,
    1,
    0x7f,
    1,
    0x7f,
    1,
    0x7f,
    0x23,
    0x00,
    0x21,
    0x01,
    0x23,
    0x00,
    0x20,
    0x00,
    0x6a,
    0x21,
    0x02,
    0x20,
    0x02,
    0x20,
    0x01,
    0x49,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x02,
    0x41,
    ...signedLeb(16),
    0x76,
    0x20,
    0x02,
    0x41,
    ...signedLeb(65_535),
    0x71,
    0x41,
    ...signedLeb(0),
    0x47,
    0x6a,
    0x21,
    0x03,
    0x20,
    0x03,
    0x3f,
    0x00,
    0x4b,
    0x04,
    0x40,
    0x20,
    0x03,
    0x3f,
    0x00,
    0x6b,
    0x40,
    0x00,
    0x41,
    ...signedLeb(-1),
    0x46,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x0b,
    0x20,
    0x02,
    0x24,
    0x00,
    0x20,
    0x01,
    0x0b,
  ];
  const deallocatorBody = [
    0,
    0x20,
    0x00,
    0x41,
    ...signedLeb(STATIC_DATA_START),
    0x49,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x01,
    0x6a,
    0x20,
    0x00,
    0x49,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x01,
    0x6a,
    0x23,
    0x00,
    0x4b,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x0b,
  ];
  const reallocatorBody = [
    5,
    1,
    0x7f,
    1,
    0x7f,
    1,
    0x7f,
    1,
    0x7f,
    1,
    0x7f,
    0x20,
    0x00,
    0x41,
    ...signedLeb(STATIC_DATA_START),
    0x49,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x01,
    0x6a,
    0x21,
    0x03,
    0x20,
    0x03,
    0x20,
    0x00,
    0x49,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x02,
    0x6a,
    0x21,
    0x04,
    0x20,
    0x04,
    0x20,
    0x00,
    0x49,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x03,
    0x23,
    0x00,
    0x46,
    0x04,
    0x7f,
    0x20,
    0x04,
    0x41,
    ...signedLeb(16),
    0x76,
    0x20,
    0x04,
    0x41,
    ...signedLeb(65_535),
    0x71,
    0x41,
    ...signedLeb(0),
    0x47,
    0x6a,
    0x21,
    0x05,
    0x20,
    0x05,
    0x3f,
    0x00,
    0x4b,
    0x04,
    0x40,
    0x20,
    0x05,
    0x3f,
    0x00,
    0x6b,
    0x40,
    0x00,
    0x41,
    ...signedLeb(-1),
    0x46,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x0b,
    0x20,
    0x04,
    0x24,
    0x00,
    0x20,
    0x00,
    0x05,
    0x20,
    0x02,
    0x10,
    ...unsignedLeb(allocatorFunctionIndex + 0),
    0x21,
    0x05,
    0x20,
    0x01,
    0x20,
    0x02,
    0x49,
    0x04,
    0x7f,
    0x20,
    0x01,
    0x05,
    0x20,
    0x02,
    0x0b,
    0x21,
    0x04,
    0x20,
    0x05,
    0x20,
    0x00,
    0x20,
    0x04,
    0xfc,
    0x0a,
    0x00,
    0x00,
    0x20,
    0x00,
    0x20,
    0x01,
    0x10,
    ...unsignedLeb(allocatorFunctionIndex + 1),
    0x20,
    0x05,
    0x0b,
    0x0b,
  ];
  const memory64AllocatorBody = [
    3,
    1,
    0x7e,
    1,
    0x7e,
    1,
    0x7e,
    0x23,
    0x00,
    0x21,
    0x01,
    0x23,
    0x00,
    0x20,
    0x00,
    0x7c,
    0x21,
    0x02,
    0x20,
    0x02,
    0x20,
    0x01,
    0x54,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x02,
    0x42,
    ...signedLeb(16),
    0x88,
    0x20,
    0x02,
    0x42,
    ...signedLeb(65_535),
    0x83,
    0x42,
    ...signedLeb(0),
    0x51,
    0xad,
    0x7c,
    0x21,
    0x03,
    0x20,
    0x03,
    0x3f,
    0x00,
    0x56,
    0x04,
    0x40,
    0x20,
    0x03,
    0x3f,
    0x00,
    0x7d,
    0x40,
    0x00,
    0x42,
    ...signedLeb(-1),
    0x51,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x0b,
    0x20,
    0x02,
    0x24,
    0x00,
    0x20,
    0x01,
    0x0b,
  ];
  const memory64DeallocatorBody = [
    0,
    0x20,
    0x00,
    0x42,
    ...signedLeb(STATIC_DATA_START),
    0x54,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x01,
    0x7c,
    0x20,
    0x00,
    0x54,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x01,
    0x7c,
    0x23,
    0x00,
    0x56,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x0b,
  ];
  const memory64ReallocatorBody = [
    5,
    1,
    0x7e,
    1,
    0x7e,
    1,
    0x7e,
    1,
    0x7e,
    1,
    0x7e,
    0x20,
    0x00,
    0x42,
    ...signedLeb(STATIC_DATA_START),
    0x54,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x00,
    0x20,
    0x01,
    0x7c,
    0x21,
    0x03,
    0x20,
    0x03,
    0x20,
    0x00,
    0x54,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x03,
    0x23,
    0x00,
    0x56,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x20,
    0x03,
    0x23,
    0x00,
    0x51,
    0x04,
    0x7e,
    0x20,
    0x00,
    0x20,
    0x02,
    0x7c,
    0x21,
    0x04,
    0x20,
    0x04,
    0x42,
    ...signedLeb(16),
    0x88,
    0x20,
    0x04,
    0x42,
    ...signedLeb(65_535),
    0x83,
    0x42,
    ...signedLeb(0),
    0x51,
    0xad,
    0x7c,
    0x21,
    0x05,
    0x20,
    0x05,
    0x3f,
    0x00,
    0x56,
    0x04,
    0x40,
    0x20,
    0x05,
    0x3f,
    0x00,
    0x7d,
    0x40,
    0x00,
    0x42,
    ...signedLeb(-1),
    0x51,
    0x04,
    0x40,
    0x00,
    0x0b,
    0x0b,
    0x20,
    0x04,
    0x24,
    0x00,
    0x20,
    0x00,
    0x05,
    0x20,
    0x02,
    0x10,
    ...unsignedLeb(allocatorFunctionIndex),
    0x21,
    0x05,
    0x20,
    0x01,
    0x20,
    0x02,
    0x54,
    0x04,
    0x7e,
    0x20,
    0x01,
    0x05,
    0x20,
    0x02,
    0x0b,
    0x21,
    0x04,
    0x20,
    0x05,
    0x20,
    0x00,
    0x20,
    0x04,
    0xfc,
    0x0a,
    0x00,
    0x00,
    0x20,
    0x00,
    0x20,
    0x01,
    0x10,
    ...unsignedLeb(allocatorFunctionIndex + 1),
    0x20,
    0x05,
    0x0b,
    0x0b,
  ];
  const resetBody = [
    0,
    0x41,
    ...signedLeb(globalInitialValue),
    0x24,
    0x00,
    0x0b,
  ];
  const memory64ResetBody = [
    0,
    0x42,
    ...signedLeb(globalInitialValue),
    0x24,
    0x00,
    0x0b,
  ];
  const emittedAllocatorBody = targetFeatures?.memory64 === true ? memory64AllocatorBody : allocatorBody;
  const emittedDeallocatorBody = targetFeatures?.memory64 === true ? memory64DeallocatorBody : deallocatorBody;
  const emittedReallocatorBody = targetFeatures?.memory64 === true ? memory64ReallocatorBody : reallocatorBody;
  const emittedResetBody = targetFeatures?.memory64 === true ? memory64ResetBody : resetBody;
  bodies.push(
    [...unsignedLeb(emittedAllocatorBody.length), ...emittedAllocatorBody],
    [...unsignedLeb(emittedDeallocatorBody.length), ...emittedDeallocatorBody],
    [...unsignedLeb(emittedResetBody.length), ...emittedResetBody],
  );
  for (const runtimeBody of collectionBodies) bodies.push([...unsignedLeb(runtimeBody.length), ...runtimeBody]);
  bodies.push([...unsignedLeb(emittedReallocatorBody.length), ...emittedReallocatorBody]);
  const importEntries = module.imports.map((declaration, index) => [
    ...wasmString(declaration.capability),
    ...wasmString(declaration.alias),
    0x00,
    ...unsignedLeb(importTypeIndexes[index] ?? 0),
  ]);
  const exportEntries = [
    ...module.functions
      .filter(({ exported }) => exported)
      .map(({ name }) => [...wasmString(name), 0x00, ...unsignedLeb(functionIndexes.get(name) ?? 0)]),
    [...wasmString('memory'), 0x02, 0x00],
    [
      ...wasmString('fws_alloc'),
      0x00,
      ...unsignedLeb(
        runtimeIndex +
          (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) +
          (hasStringRuntime ? STRING_RUNTIME_FUNCTION_COUNT : 0),
      ),
    ],
    [
      ...wasmString('fws_dealloc'),
      0x00,
      ...unsignedLeb(
        runtimeIndex +
          (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) +
          (hasStringRuntime ? STRING_RUNTIME_FUNCTION_COUNT : 0) +
          1,
      ),
    ],
    [
      ...wasmString('fws_realloc'),
      0x00,
      ...unsignedLeb(
        runtimeIndex +
          (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) +
          (hasStringRuntime ? STRING_RUNTIME_FUNCTION_COUNT : 0) +
          3 + collectionBodies.length,
      ),
    ],
    [
      ...wasmString('fws_reset'),
      0x00,
      ...unsignedLeb(
        runtimeIndex +
          (hasRegexRuntime ? REGEX_RUNTIME_FUNCTION_COUNT : 0) +
          (hasStringRuntime ? STRING_RUNTIME_FUNCTION_COUNT : 0) +
          2,
      ),
    ],
  ];
  const encodedDataEntries = dataEntries.map((entry) => [
    0x00,
    targetFeatures?.memory64 === true ? 0x42 : 0x41,
    ...signedLeb(entry.offset),
    0x0b,
    ...unsignedLeb(entry.bytes.byteLength),
    ...entry.bytes,
  ]);
  const global = [
    0x01,
    targetFeatures?.memory64 === true ? 0x7e : 0x7f,
    0x01,
    targetFeatures?.memory64 === true ? 0x42 : 0x41,
    ...signedLeb(globalInitialValue),
    0x0b,
  ];
  return new Uint8Array(
    [
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      section(1, [...unsignedLeb(types.length), ...types.flat()]),
      ...(importEntries.length === 0 ? [] : section(2, [...unsignedLeb(importEntries.length), ...importEntries.flat()])),
      section(
        3,
        vector(
          [
            ...functionTypeIndexes,
            ...(regexClassType === undefined ? [] : [regexClassType!, regexRunType!, regexEntryType!]),
            ...(stringLengthType === undefined
              ? []
              : [stringConcatType!, stringLengthType!, stringByteAtType!, stringStartsWithType!, stringSliceType!, stringToI32Type!]),
            allocatorType,
            deallocatorType,
            resetType,
            ...collectionTypeIndexes,
            reallocatorType,
          ].flatMap((type) => unsignedLeb(type)),
        ),
      ),
      section(
        5,
        memoryLimits(targetFeatures, globalInitialValue),
      ),
      section(6, global),
      section(7, [...unsignedLeb(exportEntries.length), ...exportEntries.flat()]),
      section(10, [...unsignedLeb(bodies.length), ...bodies.flat()]),
      featureCustomSection(targetFeatures),
      ...(encodedDataEntries.length === 0
        ? []
        : section(11, [...unsignedLeb(encodedDataEntries.length), ...encodedDataEntries.flat()])),
    ].flat(),
  );
}

function emptySpan(): ForgeWebScriptWasmSourceSpan {
  return { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
}

function backendDiagnostic(fileName: string, message: string, span = emptySpan()): ForgeWebScriptWasmDiagnostic {
  return { code: 'FWS-EMIT-001', severity: 'error', phase: 'emit', message, fileName, span };
}

function validateReturnPaths(
  module: ForgeWebScriptWasmModule,
  fileName: string,
): readonly ForgeWebScriptWasmDiagnostic[] {
  return module.functions.flatMap((declaration) => {
    if (declaration.name === ITER_RESULT_HELPER) return [];
    if (declaration.result.name === 'unit' || !lowerForgeWebScriptWasmFunctionToSsa(declaration).exitReachable) return [];
    return [
      {
        ...backendDiagnostic(
          fileName,
          `Function "${declaration.name}" does not return a value on every reachable path.`,
          declaration.span,
        ),
        code: 'FWS-CFG-001',
        hint: 'Add a return statement to the function or to every if/else branch.',
      },
    ];
  });
}

interface EmittedVariant {
  readonly wasm?: Uint8Array;
  readonly wat: string;
  readonly diagnostics: readonly ForgeWebScriptWasmDiagnostic[];
  readonly iteratorExports: readonly ForgeWebScriptWasmIteratorExport[];
}

function emitVariant(
  module: ForgeWebScriptWasmModule,
  metadata: ForgeWebScriptWasmBackendInput['metadata'],
  targetFeatures: ForgeWebScriptTargetFeatures | undefined,
  compilerHints: ForgeWebScriptWasmCompilerHints | undefined,
  fileName: string,
): EmittedVariant {
  const lowered = lowerIteratorModule(module);
  const wat = renderForgeWebScriptWasmWat(lowered.module, { ...metadata, targetFeatures });
  const diagnostics: ForgeWebScriptWasmDiagnostic[] = [
    ...validateReturnPaths(lowered.module, fileName),
    ...validateTargetFeatures(lowered.module, targetFeatures, fileName),
  ];
  if (diagnostics.length > 0) return { wat, diagnostics, iteratorExports: lowered.iteratorExports };
  try {
    const wasm = emitWasm(lowered.module, targetFeatures, compilerHints);
    if (!WebAssembly.validate(wasm.buffer as ArrayBuffer)) {
      let validationDetail = '';
      try {
        new WebAssembly.Module(wasm.buffer as ArrayBuffer);
      } catch (error) {
        validationDetail = ` ${error instanceof Error ? error.message : String(error)}`;
      }
      diagnostics.push(
        backendDiagnostic(
          fileName,
          `The Forge Web Script backend emitted invalid WebAssembly.${validationDetail}`,
          module.span,
        ),
      );
      return { wat, diagnostics, iteratorExports: lowered.iteratorExports };
    }
    return { wasm, wat, diagnostics, iteratorExports: lowered.iteratorExports };
  } catch (error) {
    diagnostics.push(
      backendDiagnostic(
        fileName,
        error instanceof Error ? error.message : 'The WebAssembly backend failed to emit the module.',
        module.span,
      ),
    );
    return { wat, diagnostics, iteratorExports: lowered.iteratorExports };
  }
}

export function compileForgeWebScriptWasm(
  input: ForgeWebScriptWasmBackendInput,
  fileName = '<input>',
): ForgeWebScriptWasmBackendResult {
  input.logger?.log('info', 'backend.emit.start', { fileName, optimization: input.metadata.optimization });
  const targetFeatures = input.targetFeatures ?? input.metadata.targetFeatures;
  const compilerHints = input.compilerHints ?? input.metadata.compilerHints;
  const metadata = {
    ...input.metadata,
    sourceFiles: [...input.metadata.sourceFiles].toSorted(),
    ...(targetFeatures === undefined ? {} : { targetFeatures }),
    ...(compilerHints === undefined ? {} : { compilerHints }),
  };
  const optimized = emitVariant(input.optimizedIr, metadata, targetFeatures, compilerHints, fileName);
  const diagnostics = [...optimized.diagnostics];
  let unoptimized: EmittedVariant | undefined;
  if (metadata.optimization === 'debug' && diagnostics.length === 0) {
    unoptimized = emitVariant(input.ir, metadata, targetFeatures, compilerHints, fileName);
    diagnostics.push(...unoptimized.diagnostics);
  }
  const wasm = optimized.wasm;
  const contentHash =
    wasm === undefined
      ? hashBytes(encoder.encode(`${metadata.compilerVersion}\0${metadata.graphHash ?? ''}`))
      : hashBytes(wasm);
  const sourceMap = JSON.stringify({
    version: 3,
    file: input.optimizedIr.name,
    sources: metadata.sourceFiles,
    names: [],
    mappings: '',
  });
  const iteratorExports = optimized.iteratorExports;
  input.logger?.log('info', 'backend.emit.complete', {
    fileName,
    diagnostics: diagnostics.length,
    iteratorExports: iteratorExports.length,
  });
  return {
    ...(wasm === undefined ? {} : { wasm }),
    wat: optimized.wat,
    ...(unoptimized?.wasm === undefined ? {} : { unoptimizedWasm: unoptimized.wasm }),
    ...(unoptimized === undefined ? {} : { unoptimizedWat: unoptimized.wat }),
    ...(iteratorExports.length === 0 ? {} : { iteratorExports }),
    featureRequirements: featureRequirements(input.optimizedIr),
    ...(targetFeatures === undefined ? {} : { targetFeatures }),
    ...(compilerHints === undefined ? {} : { compilerHints }),
    sourceMap,
    contentHash,
    metadata,
    diagnostics,
  };
}
