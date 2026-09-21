/**
 * Compile-time expression evaluation, constant folding, and simplification.
 */

import type { FlintWasmExpression, FlintWasmPrimitiveType, FlintWasmSourceSpan } from './contracts.js';

/** Variable binding environment mapping identifier names to constant expressions. */
export type Environment = ReadonlyMap<string, FlintWasmExpression>;

/** Outcome of folding an expression node, with counters for statistics. */
export interface FoldResult {
  readonly expression: FlintWasmExpression;
  readonly constants: number;
  readonly offsets: number;
}

/** Constructs a literal expression node. */
export const literal = (
  value: boolean | number | string,
  span: FlintWasmSourceSpan,
  type: FlintWasmPrimitiveType = typeof value === 'boolean' ? 'bool' : typeof value === 'string' ? 'string' : 'i32',
): FlintWasmExpression => ({
  kind: 'literal',
  value,
  type,
  span,
});

/** Determines whether an expression is side-effect free and deterministic. */
// skipcq: JS-R1005
export function pure(expression: FlintWasmExpression): boolean {
  if (expression.kind === 'literal' || expression.kind === 'identifier') return true;
  if (expression.kind === 'unary') return pure(expression.operand);
  if (expression.kind === 'binary') return pure(expression.left) && pure(expression.right);
  return false;
}

/** Normalizes integer literal values to 32-bit signed integer representations. */
export function normalizeInteger(value: number, type: FlintWasmPrimitiveType): number {
  // eslint-disable-next-line unicorn/prefer-math-trunc -- i32 normalization must preserve WebAssembly wrapping semantics.
  return type === 'u32' ? value >>> 0 : value | 0;
}

// skipcq: JS-D1001, JS-R1005
function foldAddSubMul(
  operator: string,
  a: number,
  b: number,
  integer32: boolean,
  type: FlintWasmPrimitiveType,
): number | undefined {
  switch (operator) {
    case '+': {
      return integer32 ? normalizeInteger(a + b, type) : a + b;
    }
    case '-': {
      return integer32 ? normalizeInteger(a - b, type) : a - b;
    }
    case '*': {
      return integer32 ? normalizeInteger(Math.imul(a, b), type) : a * b;
    }
    default: {
      return undefined;
    }
  }
}

// skipcq: JS-D1001, JS-R1005
function foldDivisionAndRemainder(
  operator: string,
  a: number,
  b: number,
  integer32: boolean,
  type: FlintWasmPrimitiveType,
): number | undefined {
  if (b === 0) return undefined;
  switch (operator) {
    case '/': {
      return integer32 ? normalizeInteger(Math.trunc(a / b), type) : Math.trunc(a / b);
    }
    case '%': {
      return integer32 ? normalizeInteger(a % b, type) : a % b;
    }
    default: {
      return undefined;
    }
  }
}

// skipcq: JS-D1001
function foldArithmetic(
  operator: string,
  a: number,
  b: number,
  integer32: boolean,
  type: FlintWasmPrimitiveType,
): number | undefined {
  const addSubMul = foldAddSubMul(operator, a, b, integer32, type);
  if (addSubMul !== undefined) return addSubMul;
  return foldDivisionAndRemainder(operator, a, b, integer32, type);
}

// skipcq: JS-D1001, JS-R1005
function foldComparison(operator: string, a: number, b: number): boolean | undefined {
  switch (operator) {
    case '<': {
      return a < b;
    }
    case '<=': {
      return a <= b;
    }
    case '==': {
      return a === b;
    }
    case '!=': {
      return a !== b;
    }
    case '>': {
      return a > b;
    }
    case '>=': {
      return a >= b;
    }
    default: {
      return undefined;
    }
  }
}

/** Evaluates compile-time binary arithmetic operations on numeric constants. */
// skipcq: JS-R1005
export function foldNumbers(
  operator: Extract<FlintWasmExpression, { kind: 'binary' }>['operator'],
  left: number,
  right: number,
  type: FlintWasmPrimitiveType,
): boolean | number | undefined {
  if (type === 'i64' || type === 'u64') return undefined;
  const integer32 = type === 'i32' || type === 'u32';
  // skipcq: JS-C1002
  const a = integer32 ? normalizeInteger(left, type) : left;
  // skipcq: JS-C1002
  const b = integer32 ? normalizeInteger(right, type) : right;

  const arithmetic = foldArithmetic(operator, a, b, integer32, type);
  if (arithmetic !== undefined) return arithmetic;

  return foldComparison(operator, a, b);
}

// skipcq: JS-D1001
function resolveIdentifier(
  name: string,
  environment: Environment,
  resolving: Set<string>,
  fallback: FlintWasmExpression,
): FlintWasmExpression {
  if (resolving.has(name)) return fallback;
  const replacement = environment.get(name);
  if (replacement === undefined || (replacement.kind === 'identifier' && replacement.name === name)) {
    return fallback;
  }
  return resolve(replacement, environment, new Set(resolving).add(name));
}

// skipcq: JS-D1001
function resolveAtomic(
  expression: Extract<FlintWasmExpression, { kind: 'atomic' }>,
  environment: Environment,
  resolving: Set<string>,
): FlintWasmExpression {
  return {
    ...expression,
    address: resolve(expression.address, environment, resolving),
    ...(expression.value === undefined ? {} : { value: resolve(expression.value, environment, resolving) }),
    ...(expression.replacement === undefined
      ? {}
      : { replacement: resolve(expression.replacement, environment, resolving) }),
  };
}

/** Resolves an expression to a compile-time constant value using the local environment. */
// skipcq: JS-R1005
export function resolve(
  expression: FlintWasmExpression,
  environment: Environment,
  resolving = new Set<string>(),
): FlintWasmExpression {
  switch (expression.kind) {
    case 'identifier': {
      return resolveIdentifier(expression.name, environment, resolving, expression);
    }
    case 'unary': {
      return { ...expression, operand: resolve(expression.operand, environment, resolving) };
    }
    case 'binary': {
      return {
        ...expression,
        left: resolve(expression.left, environment, resolving),
        right: resolve(expression.right, environment, resolving),
      };
    }
    case 'call': {
      return {
        ...expression,
        arguments: expression.arguments.map((item) => resolve(item, environment, resolving)),
      };
    }
    case 'array-literal':
    case 'vector-literal': {
      return { ...expression, elements: expression.elements.map((item) => resolve(item, environment, resolving)) };
    }
    case 'index': {
      return {
        ...expression,
        receiver: resolve(expression.receiver, environment, resolving),
        index: resolve(expression.index, environment, resolving),
      };
    }
    case 'atomic': {
      return resolveAtomic(expression, environment, resolving);
    }
    default: {
      return expression;
    }
  }
}

// skipcq: JS-D1001, JS-R1005
function foldCall(expression: Extract<FlintWasmExpression, { kind: 'call' }>): FoldResult {
  const argumentsWithFolds = expression.arguments.map((argument) => fold(argument));
  if (
    expression.standardLibrary === 'string-concat' &&
    argumentsWithFolds.length === 2 &&
    argumentsWithFolds[1]?.expression.kind === 'literal' &&
    argumentsWithFolds[1].expression.type === 'string' &&
    argumentsWithFolds[1].expression.value === '' &&
    argumentsWithFolds[0]?.expression.kind === 'literal'
  ) {
    const first = argumentsWithFolds[0];
    if (first !== undefined) {
      return {
        expression: first.expression,
        constants: argumentsWithFolds.reduce((total, item) => total + item.constants, 0),
        offsets: argumentsWithFolds.reduce((total, item) => total + item.offsets, 0),
      };
    }
  }
  return {
    expression: {
      ...expression,
      arguments: argumentsWithFolds.map(({ expression: argument }) => argument),
    },
    constants: argumentsWithFolds.reduce((total, item) => total + item.constants, 0),
    offsets: argumentsWithFolds.reduce((total, item) => total + item.offsets, 0),
  };
}

// skipcq: JS-D1001, JS-R1005
function foldUnaryLiteral(
  operator: string,
  operand: Extract<FlintWasmExpression, { kind: 'literal' }>,
  span: FlintWasmSourceSpan,
): FlintWasmExpression | undefined {
  if (operator === '!' && typeof operand.value === 'boolean') {
    return literal(!operand.value, span);
  }
  if (operator === '-' && typeof operand.value === 'number' && operand.type !== 'i64' && operand.type !== 'u64') {
    const negatedValue =
      operand.type === 'i32' || operand.type === 'u32'
        ? normalizeInteger(-operand.value, operand.type)
        : -operand.value;
    return literal(negatedValue, span, operand.type);
  }
  return undefined;
}

// skipcq: JS-D1001
function foldUnary(expression: Extract<FlintWasmExpression, { kind: 'unary' }>): FoldResult {
  const operand = fold(expression.operand);
  if (operand.expression.kind === 'literal') {
    const folded = foldUnaryLiteral(expression.operator, operand.expression, expression.span);
    if (folded !== undefined) {
      return { expression: folded, constants: operand.constants + 1, offsets: operand.offsets };
    }
  }
  return {
    expression: { ...expression, operand: operand.expression },
    constants: operand.constants,
    offsets: operand.offsets,
  };
}

// skipcq: JS-D1001
function foldBinaryEquality(operator: string, av: unknown, bv: unknown): boolean | undefined {
  if (operator === '==') return av === bv;
  if (operator === '!=') return av !== bv;
  return undefined;
}

// skipcq: JS-D1001, JS-R1005
function foldBinaryLogical(operator: string, av: unknown, bv: unknown): boolean | undefined {
  if (typeof av !== 'boolean' || typeof bv !== 'boolean') return undefined;
  if (operator === '&&') return av && bv;
  if (operator === '||') return av || bv;
  return undefined;
}

// skipcq: JS-D1001
function foldBinaryLiteralValue(
  operator: Extract<FlintWasmExpression, { kind: 'binary' }>['operator'],
  av: boolean | number | string,
  bv: boolean | number | string,
  type: FlintWasmPrimitiveType,
): boolean | number | string | undefined {
  if (typeof av === 'number' && typeof bv === 'number') {
    return foldNumbers(operator, av, bv, type);
  }
  const equality = foldBinaryEquality(operator, av, bv);
  if (equality !== undefined) return equality;
  return foldBinaryLogical(operator, av, bv);
}

// skipcq: JS-D1001, JS-R1005
function isComparisonOrLogicalOperator(operator: string): boolean {
  return (
    operator === '<' ||
    operator === '<=' ||
    operator === '==' ||
    operator === '!=' ||
    operator === '>' ||
    operator === '>=' ||
    operator === '&&' ||
    operator === '||'
  );
}

// skipcq: JS-D1001
function foldBinaryLiterals(
  expression: Extract<FlintWasmExpression, { kind: 'binary' }>,
  left: FoldResult,
  right: FoldResult,
): FoldResult | undefined {
  // skipcq: JS-C1002
  const a = left.expression;
  // skipcq: JS-C1002
  const b = right.expression;
  if (a.kind !== 'literal' || b.kind !== 'literal') return undefined;

  const result = foldBinaryLiteralValue(expression.operator, a.value, b.value, a.type);
  if (result === undefined) return undefined;

  const resultType = isComparisonOrLogicalOperator(expression.operator) ? 'bool' : a.type;
  return {
    expression: literal(result, expression.span, resultType),
    constants: left.constants + right.constants + 1,
    offsets: left.offsets + right.offsets,
  };
}

// skipcq: JS-D1001, JS-R1005
function foldBinaryAddressOffsets(
  expression: Extract<FlintWasmExpression, { kind: 'binary' }>,
  left: FoldResult,
  right: FoldResult,
): FoldResult | undefined {
  // skipcq: JS-C1002
  const a = left.expression;
  // skipcq: JS-C1002
  const b = right.expression;
  if (
    expression.operator === '+' &&
    b.kind === 'literal' &&
    typeof b.value === 'number' &&
    a.kind === 'binary' &&
    a.operator === '+' &&
    a.right.kind === 'literal' &&
    typeof a.right.value === 'number'
  ) {
    return {
      expression: {
        ...expression,
        left: a.left,
        right: literal(a.right.value + b.value, expression.span),
      },
      constants: left.constants + right.constants,
      offsets: left.offsets + right.offsets + 1,
    };
  }
  return undefined;
}

// skipcq: JS-D1001
function foldBinary(expression: Extract<FlintWasmExpression, { kind: 'binary' }>): FoldResult {
  const left = fold(expression.left);
  const right = fold(expression.right);

  const literalResult = foldBinaryLiterals(expression, left, right);
  if (literalResult !== undefined) return literalResult;

  const offsetResult = foldBinaryAddressOffsets(expression, left, right);
  if (offsetResult !== undefined) return offsetResult;

  return {
    expression: { ...expression, left: left.expression, right: right.expression },
    constants: left.constants + right.constants,
    offsets: left.offsets + right.offsets,
  };
}

/** Performs recursive constant folding and algebraic simplification on an expression node. */
export function fold(expression: FlintWasmExpression): FoldResult {
  if (expression.kind === 'call') return foldCall(expression);
  if (expression.kind === 'unary') return foldUnary(expression);
  if (expression.kind === 'binary') return foldBinary(expression);
  return { expression, constants: 0, offsets: 0 };
}
