import { FLINT_ANALYSIS_DIAGNOSTIC_CODES } from './contracts.js';

import type {
  FlintAnalysisContext,
  FlintAnalysisEvidence,
  FlintAnalysisFinding,
  FlintAnalysisRule,
} from './contracts.js';
import type { FlintCapabilityImport, FlintTypeName } from '../ast.js';
import type { FlintIrExpression, FlintIrStatement } from '../ir.js';

/** Scalar or primitive constant evaluated at compile-time during static analysis. */
type Constant = boolean | number | string | undefined;

/** Mapping from variable binding identifier to known compile-time constant value. */
type Environment = Map<string, Constant>;

/** Flow state representation for range analysis along a control-flow path. */
interface RangeFlow {
  readonly environment: Environment;
  readonly reachable: boolean;
}

/**
 * Merges multiple analysis environments at a control-flow join point, retaining only unanimous facts.
 *
 * @param states - Array of environments from incoming branches.
 * @returns Unified environment containing only values common to all branches.
 */
function mergeEnvironments(states: readonly Environment[]): Environment {
  const merged = new Map<string, Constant>();
  const first = states[0];
  if (first === undefined) return merged;
  for (const [name, value] of first) {
    if (states.every((state) => state.has(name) && Object.is(state.get(name), value))) merged.set(name, value);
  }
  return merged;
}

const integerBounds: Readonly<Record<string, readonly [number, number]>> = {
  i32: [-(2 ** 31), 2 ** 31 - 1],
  u32: [0, 2 ** 32 - 1],
  i64: [-(2 ** 63), 2 ** 63 - 1],
  u64: [0, 2 ** 64 - 1],
};

/**
 * Constructs an evidence record associating a diagnostic message and span with an optional value.
 *
 * @param message - Descriptive message of the evidence.
 * @param span - Source code span location.
 * @param value - Optional constant value involved in the evidence.
 * @returns Structured analysis evidence object.
 */
function evidence(message: string, span: FlintAnalysisFinding['span'], value?: Constant): FlintAnalysisEvidence {
  return { message, span, ...(value === undefined ? {} : { value }) };
}

/**
 * Extracts optional properties to attach to an analysis finding.
 *
 * @param options - Configuration options.
 * @returns Partial object containing optional finding fields.
 */
// skipcq: JS-R1005
function extractFindingExtras(
  options?: Pick<FlintAnalysisFinding, 'severity' | 'blocking' | 'evidence' | 'owasp' | 'cwe'>,
): Partial<Pick<FlintAnalysisFinding, 'blocking' | 'evidence' | 'owasp' | 'cwe'>> {
  if (options === undefined) return {};
  return {
    ...(options.blocking === undefined ? {} : { blocking: options.blocking }),
    ...(options.evidence === undefined ? {} : { evidence: options.evidence }),
    ...(options.owasp === undefined ? {} : { owasp: options.owasp }),
    ...(options.cwe === undefined ? {} : { cwe: options.cwe }),
  };
}

/**
 * Creates a standardized analysis finding diagnostic.
 *
 * @param context - Compiler analysis context.
 * @param ruleId - Unique rule identifier.
 * @param category - Category classification of the finding.
 * @param code - Diagnostic code.
 * @param message - Diagnostic message text.
 * @param span - Source span where the issue was detected.
 * @param hint - Remediation guidance hint.
 * @param options - Additional options including severity, CWE, OWASP, and evidence.
 * @returns Fully constructed analysis finding.
 */
function finding(
  context: FlintAnalysisContext,
  ruleId: string,
  category: FlintAnalysisFinding['category'],
  code: string,
  message: string,
  span: FlintAnalysisFinding['span'],
  hint: string,
  options?: Pick<FlintAnalysisFinding, 'severity' | 'blocking' | 'evidence' | 'owasp' | 'cwe'>,
): FlintAnalysisFinding {
  return {
    code,
    ruleId,
    category,
    severity: options?.severity ?? 'error',
    message,
    fileName: context.fileName,
    span,
    hint,
    ...extractFindingExtras(options),
  };
}

const NUMERIC_BINARY_OPERATORS: Readonly<Record<string, (left: number, right: number) => Constant>> = {
  '+': (left, right) => left + right,
  '-': (left, right) => left - right,
  '*': (left, right) => left * right,
  '/': (left, right) => (right === 0 ? undefined : left / right),
  '%': (left, right) => (right === 0 ? undefined : left % right),
  '<': (left, right) => left < right,
  '<=': (left, right) => left <= right,
  '>': (left, right) => left > right,
  '>=': (left, right) => left >= right,
  '==': (left, right) => left === right,
  '!=': (left, right) => left !== right,
};

/**
 * Evaluates a numeric binary expression given left and right operands.
 *
 * @param operator - Binary operator symbol.
 * @param left - Left numeric value.
 * @param right - Right numeric value.
 * @returns Evaluated constant result or undefined if undefined operator or division by zero.
 */
function evaluateNumericBinary(operator: string, left: number, right: number): Constant {
  const handler = NUMERIC_BINARY_OPERATORS[operator];
  return handler === undefined ? undefined : handler(left, right);
}

/**
 * Evaluates a boolean binary expression given left and right operands.
 *
 * @param operator - Binary operator symbol.
 * @param left - Left boolean value.
 * @param right - Right boolean value.
 * @returns Evaluated constant boolean or undefined.
 */
// skipcq: JS-R1005
function evaluateBooleanBinary(operator: string, left: boolean, right: boolean): Constant {
  switch (operator) {
    case '&&': {
      return left && right;
    }
    case '||': {
      return left || right;
    }
    case '==': {
      return left === right;
    }
    case '!=': {
      return left !== right;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Evaluates a unary operator applied to a constant value.
 *
 * @param operator - Unary operator symbol.
 * @param operand - Evaluated operand value.
 * @returns Evaluated constant or undefined.
 */
function evaluateUnary(operator: string, operand: Constant): Constant {
  if (operator === '-' && typeof operand === 'number') return -operand;
  if (operator === '!' && typeof operand === 'boolean') return !operand;
  return undefined;
}

/**
 * Evaluates a binary expression against the environment.
 *
 * @param expression - Binary expression node.
 * @param environment - Current analysis environment.
 * @returns Evaluated constant or undefined.
 */
function evaluateBinary(
  expression: FlintIrExpression & { kind: 'binary' },
  environment: ReadonlyMap<string, Constant>,
): Constant {
  const left = evaluate(expression.left, environment);
  const right = evaluate(expression.right, environment);
  if (typeof left === 'number' && typeof right === 'number') {
    return evaluateNumericBinary(expression.operator, left, right);
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return evaluateBooleanBinary(expression.operator, left, right);
  }
  return undefined;
}

/**
 * Statically evaluates a compile-time constant expression using the current environment.
 *
 * @param expression - IR expression to evaluate.
 * @param environment - Map of variable names to constant values.
 * @returns Known constant value, or undefined if the expression is non-constant.
 */
function evaluate(expression: FlintIrExpression, environment: ReadonlyMap<string, Constant>): Constant {
  if (expression.kind === 'literal') return expression.value;
  if (expression.kind === 'identifier') return environment.get(expression.name);
  if (expression.kind === 'unary') {
    return evaluateUnary(expression.operator, evaluate(expression.operand, environment));
  }
  if (expression.kind === 'binary') {
    return evaluateBinary(expression, environment);
  }
  return undefined;
}

/**
 * Resolves the string type identifier from an AST type name.
 *
 * @param type - Type name node.
 * @returns Reference name or primitive name.
 */
function typeName(type: FlintTypeName): string {
  return type.reference ?? type.name;
}

/**
 * Evaluates known constant length of an array, vector, or string expression.
 *
 * @param expression - IR expression to test.
 * @param environment - Current analysis environment.
 * @returns Byte or element length if statically known, otherwise undefined.
 */
// skipcq: JS-R1005
function constantLength(expression: FlintIrExpression, environment: ReadonlyMap<string, Constant>): number | undefined {
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') return expression.elements.length;
  if (expression.kind === 'literal' && typeof expression.value === 'string')
    return new TextEncoder().encode(expression.value).length;
  if (expression.kind === 'identifier') {
    const value = environment.get(`length:${expression.name}`);
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

/**
 * Recursively visits child expressions of collection or structured expression nodes.
 *
 * @param expression - Compound expression node.
 * @param visit - Visitor callback.
 */
// skipcq: JS-R1005
function visitCollectionExpression(
  expression: FlintIrExpression,
  visit: (expression: FlintIrExpression) => void,
): void {
  switch (expression.kind) {
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) visitExpression(element, visit);
      break;
    }
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) visitExpression(value, visit);
      break;
    }
    case 'match': {
      visitExpression(expression.value, visit);
      for (const arm of expression.arms) visitExpression(arm.value, visit);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Visits child expressions of calls, unary, binary, or indexed expressions.
 *
 * @param expression - Expression node whose children to visit.
 * @param visit - Visitor callback.
 */
// skipcq: JS-R1005
function visitChildren(expression: FlintIrExpression, visit: (expression: FlintIrExpression) => void): void {
  switch (expression.kind) {
    case 'call':
    case 'enum-value': {
      for (const argument of expression.arguments) visitExpression(argument, visit);
      return;
    }
    case 'binary': {
      visitExpression(expression.left, visit);
      visitExpression(expression.right, visit);
      return;
    }
    case 'unary': {
      visitExpression(expression.operand, visit);
      return;
    }
    case 'index': {
      visitExpression(expression.receiver, visit);
      visitExpression(expression.index, visit);
      return;
    }
    default: {
      visitCollectionExpression(expression, visit);
      return;
    }
  }
}

/**
 * Traverses an IR expression tree in pre-order, invoking a visitor callback for each node.
 *
 * @param expression - Root IR expression to traverse.
 * @param visit - Visitor callback invoked for each encountered expression.
 */
function visitExpression(expression: FlintIrExpression, visit: (expression: FlintIrExpression) => void): void {
  visit(expression);
  visitChildren(expression, visit);
}

/**
 * Visits nested statements contained within control-flow IR structures.
 *
 * @param statement - Parent IR statement.
 * @param visit - Visitor callback.
 */
// skipcq: JS-R1005
function visitStatementChildren(statement: FlintIrStatement, visit: (statement: FlintIrStatement) => void): void {
  switch (statement.kind) {
    case 'if': {
      visitExpression(statement.condition, () => {
        // Traverse condition without actions.
      });
      visitStatements(statement.consequent, visit);
      if (statement.alternate !== undefined) visitStatements(statement.alternate, visit);
      break;
    }
    case 'while':
    case 'do-while':
    case 'iterator-loop': {
      visitStatements(statement.body, visit);
      break;
    }
    case 'switch': {
      for (const arm of statement.cases) visitStatements(arm.body, visit);
      if (statement.defaultCase !== undefined) visitStatements(statement.defaultCase, visit);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Traverses an array of IR statements, recursively descending into nested statement blocks.
 *
 * @param statements - Array of IR statements to traverse.
 * @param visit - Visitor callback invoked for each encountered statement.
 */
function visitStatements(statements: readonly FlintIrStatement[], visit: (statement: FlintIrStatement) => void): void {
  for (const statement of statements) {
    visit(statement);
    visitStatementChildren(statement, visit);
  }
}

/**
 * Extracts conditional or loop expression from a branching or looping statement.
 *
 * @param statement - Statement to inspect.
 * @returns Array containing the expression, or empty array.
 */
// skipcq: JS-R1005
function loopOrBranchExpression(statement: FlintIrStatement): readonly FlintIrExpression[] {
  if (statement.kind === 'if' || statement.kind === 'while' || statement.kind === 'do-while') {
    return [statement.condition];
  }
  if (statement.kind === 'iterator-loop') return [statement.iterator];
  if (statement.kind === 'expression-statement') return [statement.expression];
  return [];
}

/**
 * Returns all top-level expressions directly contained within an IR statement.
 *
 * @param statement - IR statement to inspect.
 * @returns Readonly array of immediate child expressions.
 */
function expressionsOf(statement: FlintIrStatement): readonly FlintIrExpression[] {
  if ('value' in statement && statement.value !== undefined) {
    return [statement.value];
  }
  return loopOrBranchExpression(statement);
}

/**
 * Checks if an if-statement guarantees a return on both consequent and alternate paths.
 *
 * @param statement - If statement node.
 * @returns True if both branches return.
 */
function isIfGuaranteedReturn(statement: FlintIrStatement & { kind: 'if' }): boolean {
  if (statement.alternate === undefined) return false;
  return guaranteedReturn(statement.consequent) && guaranteedReturn(statement.alternate);
}

/**
 * Checks if an infinite loop guarantees a return from within its body.
 *
 * @param statement - Loop statement node.
 * @returns True if the loop is infinite and body guarantees return.
 */
function isLoopGuaranteedReturn(statement: FlintIrStatement): boolean {
  if (statement.kind !== 'while' && statement.kind !== 'do-while') return false;
  if (statement.condition.kind !== 'literal' || statement.condition.value !== true) return false;
  return guaranteedReturn(statement.body);
}

/**
 * Checks if a switch statement guarantees a return across all cases and default.
 *
 * @param statement - Switch statement node.
 * @returns True if all cases and default return.
 */
function isSwitchGuaranteedReturn(statement: FlintIrStatement & { kind: 'switch' }): boolean {
  if (statement.defaultCase === undefined) return false;
  return statement.cases.every((arm) => guaranteedReturn(arm.body)) && guaranteedReturn(statement.defaultCase);
}

/**
 * Tests whether a solitary statement guarantees function termination via return.
 *
 * @param statement - IR statement to evaluate.
 * @returns True if the statement unconditionally returns.
 */
// skipcq: JS-R1005
function statementGuaranteesReturn(statement: FlintIrStatement): boolean {
  if (statement.kind === 'return') return true;
  if (statement.kind === 'if') return isIfGuaranteedReturn(statement);
  if (statement.kind === 'while' || statement.kind === 'do-while') return isLoopGuaranteedReturn(statement);
  if (statement.kind === 'switch') return isSwitchGuaranteedReturn(statement);
  return false;
}

/**
 * Statically determines whether every reachable execution path in the statement block ends in a return.
 *
 * @param statements - Array of IR statements in the function body.
 * @returns True if execution cannot fall off the end of the block without returning.
 */
function guaranteedReturn(statements: readonly FlintIrStatement[]): boolean {
  return statements.some((statement) => statementGuaranteesReturn(statement));
}

/**
 * Checks whether a block of statements contains any conditional or loop constructs.
 *
 * @param statements - Statements to inspect.
 * @returns True if any statement branches or loops.
 */
function containsConditional(statements: readonly FlintIrStatement[]): boolean {
  // skipcq: JS-R1005
  return statements.some((statement) => {
    if (statement.kind === 'if' || statement.kind === 'switch' || statement.kind === 'match-statement') return true;
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop')
      return containsConditional(statement.body);
    return false;
  });
}

const correctnessRule: FlintAnalysisRule = {
  id: 'fws.correctness.control-flow',
  category: 'control-flow',
  // skipcq: JS-R1005
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: FlintAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      if (typeName(declaration.result) !== 'unit' && !declaration.iterable && !guaranteedReturn(declaration.body))
        findings.push(
          finding(
            context,
            'fws.correctness.control-flow',
            'control-flow',
            `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.controlFlow}-001`,
            `Function '${declaration.name}' does not return a value on every path.`,
            declaration.span,
            'Return a value on every branch or make the function return unit.',
            { severity: 'error', cwe: ['CWE-457'] },
          ),
        );
      let reachable = true;
      // skipcq: JS-R1005
      visitStatements(declaration.body, (statement) => {
        if (!reachable) return;
        if (statement.kind === 'return') reachable = false;
        else if (
          statement.kind === 'while' &&
          evaluate(statement.condition, new Map()) === true &&
          !guaranteedReturn(statement.body)
        )
          findings.push(
            finding(
              context,
              'fws.correctness.control-flow',
              'control-flow',
              `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.controlFlow}-002`,
              'Loop condition is always true and has no statically visible exit.',
              statement.condition.span,
              'Use a bounded iterator or prove a terminating condition.',
              { severity: 'error', owasp: ['A05'], cwe: ['CWE-835'] },
            ),
          );
        else if (
          statement.kind === 'do-while' &&
          evaluate(statement.condition, new Map()) === true &&
          !guaranteedReturn(statement.body)
        )
          findings.push(
            finding(
              context,
              'fws.correctness.control-flow',
              'control-flow',
              `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.controlFlow}-002`,
              'Loop condition is always true and has no statically visible exit.',
              statement.condition.span,
              'Use a bounded iterator or prove a terminating condition.',
              { severity: 'error', owasp: ['A05'], cwe: ['CWE-835'] },
            ),
          );
      });
    }
    return findings;
  },
};

/**
 * Detects statically provable division or modulo by zero.
 *
 * @param node - Candidate binary expression node.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
function checkDivisionByZero(
  node: FlintIrExpression,
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'binary') return;
  if (node.operator !== '/' && node.operator !== '%') return;
  if (evaluate(node.right, environment) !== 0) return;
  findings.push(
    finding(
      context,
      'fws.safety.ranges-and-bounds',
      'memory',
      `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.memory}-001`,
      'Division by zero is provable on this path.',
      node.right.span,
      'Guard the divisor before performing the operation.',
      { severity: 'error', cwe: ['CWE-369'] },
    ),
  );
}

/**
 * Checks for array or vector indexing outside known static length bounds.
 *
 * @param node - Candidate index expression node.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function checkIndexBounds(
  node: FlintIrExpression,
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'index') return;
  const index = evaluate(node.index, environment);
  const length = constantLength(node.receiver, environment);
  if (typeof index !== 'number' || length === undefined) return;
  if (Number.isInteger(index) && index >= 0 && index < length) return;
  findings.push(
    finding(
      context,
      'fws.safety.ranges-and-bounds',
      'memory',
      `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.memory}-002`,
      `Collection index ${index} is outside its known length ${length}.`,
      node.index.span,
      'Use a bounds check or an option-returning collection operation.',
      { severity: 'error', owasp: ['A08'], cwe: ['CWE-129'] },
    ),
  );
}

/**
 * Records constant length information into the environment following an array-length call.
 *
 * @param node - Candidate call expression node.
 * @param environment - Target analysis environment to mutate.
 */
function updateArrayLength(node: FlintIrExpression, environment: Environment): void {
  if (node.kind !== 'call' || node.standardLibrary !== 'array-length') return;
  const receiver = node.arguments[0];
  if (receiver === undefined) return;
  const receiverName = receiver.kind === 'identifier' ? receiver.name : '';
  environment.set(`length:${receiverName}`, constantLength(receiver, environment));
}

/**
 * Tests whether standard library operation performs single-byte access.
 *
 * @param standardLibrary - Identifier of standard library operation.
 * @returns True if the call is a byte-at operation.
 */
function isByteAtCall(standardLibrary: string | undefined): boolean {
  return (
    standardLibrary === 'string-byte-at' ||
    standardLibrary === 'bytes-byte-at' ||
    standardLibrary === 'bytes-byte-at-u32'
  );
}

/**
 * Evaluates whether an extracted byte index falls within the valid range 0 <= value < length.
 *
 * @param value - Evaluated index value.
 * @param length - Resolved receiver length.
 * @returns True if within valid bounds.
 */
function isByteIndexInBounds(value: Constant, length: number | undefined): boolean {
  return typeof value === 'number' && length !== undefined && value >= 0 && value < length;
}

/**
 * Checks bounds for byte extraction operations on strings or byte slices.
 *
 * @param node - Candidate call expression node.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function checkByteAtBounds(
  node: FlintIrExpression,
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'call' || !isByteAtCall(node.standardLibrary)) return;
  const index = node.arguments.at(-1);
  const receiver = node.arguments[0];
  if (index === undefined || receiver === undefined) return;
  const value = evaluate(index, environment);
  const length = constantLength(receiver, environment);
  if (typeof value !== 'number' || length === undefined || isByteIndexInBounds(value, length)) return;
  findings.push(
    finding(
      context,
      'fws.safety.ranges-and-bounds',
      'memory',
      `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.memory}-003`,
      `Byte index ${value} is outside its known length ${length}.`,
      index.span,
      'Check the index against the byte/string length.',
      { severity: 'error', cwe: ['CWE-125'] },
    ),
  );
}

/**
 * Validates that slice range values are numeric and within 0..length.
 *
 * @param startValue - Evaluated slice start.
 * @param endValue - Evaluated slice end.
 * @param length - Resolved collection length.
 * @returns True if slice bounds are valid.
 */
// skipcq: JS-R1005
function isValidSliceBounds(startValue: Constant, endValue: Constant, length: number | undefined): boolean {
  if (length === undefined || typeof startValue !== 'number' || typeof endValue !== 'number') return false;
  return startValue >= 0 && endValue >= startValue && endValue <= length;
}

/**
 * Evaluates whether slice indices fall within valid receiver bounds.
 *
 * @param start - Start expression node.
 * @param end - End expression node.
 * @param receiver - Receiver expression node.
 * @param environment - Current analysis environment.
 * @returns True if bounds are present and valid.
 */
// skipcq: JS-R1005
function areSliceBoundsValid(
  start: FlintIrExpression | undefined,
  end: FlintIrExpression | undefined,
  receiver: FlintIrExpression | undefined,
  environment: ReadonlyMap<string, Constant>,
): boolean {
  if (start === undefined || end === undefined || receiver === undefined) return true;
  const length = constantLength(receiver, environment);
  const startValue = evaluate(start, environment);
  const endValue = evaluate(end, environment);
  if (length === undefined || typeof startValue !== 'number' || typeof endValue !== 'number') return true;
  return isValidSliceBounds(startValue, endValue, length);
}

/**
 * Verifies that string slice indices fall within valid bounds.
 *
 * @param node - Candidate call expression node.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
function checkStringSliceBounds(
  node: FlintIrExpression,
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'call' || node.standardLibrary !== 'string-slice') return;
  const start = node.arguments.at(-2);
  const end = node.arguments.at(-1);
  const receiver = node.arguments[0];
  if (areSliceBoundsValid(start, end, receiver, environment)) return;
  findings.push(
    finding(
      context,
      'fws.safety.ranges-and-bounds',
      'memory',
      `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.memory}-004`,
      'String slice bounds exceed the known string length.',
      node.span,
      'Clamp or validate both slice bounds before slicing.',
      { severity: 'error', cwe: ['CWE-125'] },
    ),
  );
}

/**
 * Inspects an expression for numerical range and indexing violations.
 *
 * @param node - Expression node to inspect.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
function inspectRangeExpression(
  node: FlintIrExpression,
  environment: Environment,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  checkDivisionByZero(node, environment, context, findings);
  checkIndexBounds(node, environment, context, findings);
  updateArrayLength(node, environment);
  checkByteAtBounds(node, environment, context, findings);
  checkStringSliceBounds(node, environment, context, findings);
}

/**
 * Validates that an integer literal binding does not overflow its declared type width.
 *
 * @param statement - Let statement node.
 * @param environment - Target analysis environment to mutate.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function checkIntegerDeclarationBounds(
  statement: FlintIrStatement & { kind: 'let' },
  environment: Environment,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  const value = evaluate(statement.value, environment);
  const bounds = integerBounds[statement.type.name];
  if (
    bounds !== undefined &&
    typeof value === 'number' &&
    (!Number.isInteger(value) || value < bounds[0] || value > bounds[1])
  ) {
    findings.push(
      finding(
        context,
        'fws.safety.ranges-and-bounds',
        'memory',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.memory}-005`,
        `Constant value ${value} is outside the ${statement.type.name} range.`,
        statement.value.span,
        'Use a checked conversion or keep the value within the declared integer range.',
        {
          severity: 'error',
          cwe: ['CWE-190'],
          evidence: [evidence(`Declared type is ${statement.type.name}`, statement.type.span, value)],
        },
      ),
    );
  }
  environment.set(statement.name, value);
  const length = constantLength(statement.value, environment);
  if (length !== undefined) environment.set(`length:${statement.name}`, length);
}

/**
 * Merges branch environments after branching control-flow.
 *
 * @param branches - Child branch flow states.
 * @param environment - Destination environment.
 * @returns True if at least one branch was reachable.
 */
function mergeRangeFlowBranches(branches: readonly RangeFlow[], environment: Environment): boolean {
  const reachableBranches = branches.filter(({ reachable }) => reachable);
  if (reachableBranches.length === 0) return false;
  environment.clear();
  for (const [name, value] of mergeEnvironments(
    reachableBranches.map(({ environment: branchEnvironment }) => branchEnvironment),
  )) {
    environment.set(name, value);
  }
  return true;
}

/**
 * Evaluates range flow along if-statement branches.
 *
 * @param statement - If statement node.
 * @param environment - Current environment.
 * @param visit - Visitor function for recursive block analysis.
 * @returns True if at least one path is reachable.
 */
function processRangeIfBranch(
  statement: FlintIrStatement & { kind: 'if' },
  environment: Environment,
  visit: (statements: readonly FlintIrStatement[], input: ReadonlyMap<string, Constant>) => RangeFlow,
): boolean {
  const branchInput = new Map(environment);
  const branches: RangeFlow[] = [visit(statement.consequent, branchInput)];
  if (statement.alternate === undefined) {
    branches.push({ environment: new Map(branchInput), reachable: true });
  } else {
    branches.push(visit(statement.alternate, branchInput));
  }
  return mergeRangeFlowBranches(branches, environment);
}

/**
 * Evaluates range flow along switch-statement cases.
 *
 * @param statement - Switch statement node.
 * @param environment - Current environment.
 * @param visit - Visitor function for recursive block analysis.
 * @returns True if at least one path is reachable.
 */
function processRangeSwitchBranch(
  statement: FlintIrStatement & { kind: 'switch' },
  environment: Environment,
  visit: (statements: readonly FlintIrStatement[], input: ReadonlyMap<string, Constant>) => RangeFlow,
): boolean {
  const branchInput = new Map(environment);
  const branches = statement.cases.map((arm) => visit(arm.body, branchInput));
  if (statement.defaultCase === undefined) {
    branches.push({ environment: new Map(branchInput), reachable: true });
  } else {
    branches.push(visit(statement.defaultCase, branchInput));
  }
  return mergeRangeFlowBranches(branches, environment);
}

/**
 * Dispatches control flow statements for range analysis.
 *
 * @param statement - Statement to process.
 * @param environment - Current environment.
 * @param visit - Visitor function for recursive block analysis.
 * @returns True if path remains reachable.
 */
// skipcq: JS-R1005
function processRangeControlFlow(
  statement: FlintIrStatement,
  environment: Environment,
  visit: (statements: readonly FlintIrStatement[], input: ReadonlyMap<string, Constant>) => RangeFlow,
): boolean {
  if (statement.kind === 'if') return processRangeIfBranch(statement, environment, visit);
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') {
    visit(statement.body, new Map(environment));
    return true;
  }
  if (statement.kind === 'switch') return processRangeSwitchBranch(statement, environment, visit);
  return true;
}

/* eslint-disable unicorn/consistent-function-scoping -- recursive visitors close over per-function findings. */
const rangeRule: FlintAnalysisRule = {
  id: 'fws.safety.ranges-and-bounds',
  category: 'memory',
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: FlintAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      const initialEnvironment: Environment = new Map();
      const unsetConstant: Constant = undefined;
      for (const parameter of declaration.parameters) initialEnvironment.set(parameter.name, unsetConstant);
      // Each recursive call owns a state snapshot. Only facts equal on every reachable
      // branch are retained at a control-flow join.
      // skipcq: JS-R1005
      const visit = (statements: readonly FlintIrStatement[], input: ReadonlyMap<string, Constant>): RangeFlow => {
        const environment: Environment = new Map(input);
        let reachable = true;
        for (const statement of statements) {
          if (!reachable) break;
          for (const expression of expressionsOf(statement)) {
            visitExpression(expression, (node) => inspectRangeExpression(node, environment, context, findings));
          }
          if (statement.kind === 'let') {
            checkIntegerDeclarationBounds(statement, environment, context, findings);
          } else if (statement.kind === 'assignment') {
            environment.set(statement.name, evaluate(statement.value, environment));
          }
          if (statement.kind === 'return') {
            reachable = false;
            continue;
          }
          reachable = processRangeControlFlow(statement, environment, visit);
        }
        return { environment, reachable };
      };
      visit(declaration.body, initialEnvironment);
    }
    return findings;
  },
};

/** Lifecycle state of a dynamic heap allocation during ownership analysis. */
interface Allocation {
  readonly size: number | undefined;
  released: boolean;
}

/** State tuple tracking allocations and variables during ownership analysis. */
interface OwnershipFlow {
  readonly allocations: Map<string, Allocation>;
  readonly environment: Environment;
  readonly reachable: boolean;
}

/**
 * Creates an isolated deep clone of an allocation map.
 *
 * @param input - Allocation map to copy.
 * @returns Cloned allocation map preserving pointer aliasing relationships.
 */
function cloneAllocations(input: ReadonlyMap<string, Allocation>): Map<string, Allocation> {
  const copies = new Map<Allocation, Allocation>();
  const result = new Map<string, Allocation>();
  for (const [name, allocation] of input) {
    let copy = copies.get(allocation);
    if (copy === undefined) {
      copy = { size: allocation.size, released: allocation.released };
      copies.set(allocation, copy);
    }
    result.set(name, copy);
  }
  return result;
}

/**
 * Merges allocation states from multiple incoming control-flow paths.
 *
 * @param states - Array of allocation maps from incoming branches.
 * @returns Unified allocation map.
 */
// skipcq: JS-R1005
function mergeAllocations(states: readonly Map<string, Allocation>[]): Map<string, Allocation> {
  const merged = new Map<string, Allocation>();
  const first = states[0];
  if (first === undefined) return merged;
  const names = [...first.keys()].filter((name) => states.every((state) => state.has(name)));
  const mergedAliases = new Map<Allocation, Allocation>();
  for (const name of names) {
    const firstAllocation = first.get(name);
    if (firstAllocation === undefined) continue;
    let allocation = mergedAliases.get(firstAllocation);
    const aliases = names.filter((candidate) => first.get(candidate) === firstAllocation);
    const aliasingAgrees = aliases.every((candidate) =>
      states.every((state) => state.get(candidate) === state.get(name)),
    );
    if (allocation === undefined || !aliasingAgrees) {
      const candidates = states
        .map((state) => state.get(name))
        .filter((candidate): candidate is Allocation => candidate !== undefined);
      const firstCandidate = candidates[0];
      if (firstCandidate === undefined) continue;
      const size = candidates.every((candidate) => Object.is(candidate.size, firstCandidate.size))
        ? firstCandidate.size
        : undefined;
      allocation = { size, released: candidates.some((candidate) => candidate.released) };
      if (aliasingAgrees) mergedAliases.set(firstAllocation, allocation);
    }
    merged.set(name, allocation);
  }
  return merged;
}

/**
 * Recursively tests whether structured expressions contain tainted data.
 *
 * @param expression - Compound expression node.
 * @param tainted - Set of tainted binding identifiers.
 * @returns True if any element in the collection is tainted.
 */
// skipcq: JS-R1005
function taintedCollection(expression: FlintIrExpression, tainted: ReadonlySet<string>): boolean {
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') {
    return expression.elements.some((element) => taintedExpression(element, tainted));
  }
  if (expression.kind === 'struct-value') {
    return Object.values(expression.fields).some((value) => taintedExpression(value, tainted));
  }
  if (expression.kind === 'match') {
    return (
      taintedExpression(expression.value, tainted) ||
      expression.arms.some((arm) => taintedExpression(arm.value, tainted))
    );
  }
  return false;
}

/**
 * Checks if an expression computes a value derived from tainted user inputs.
 *
 * @param expression - IR expression to inspect.
 * @param tainted - Set of variable names tainted by unchecked external input.
 * @returns True if the expression is tainted.
 */
// skipcq: JS-R1005
function taintedExpression(expression: FlintIrExpression, tainted: ReadonlySet<string>): boolean {
  if (expression.kind === 'identifier') return tainted.has(expression.name);
  if (expression.kind === 'binary')
    return taintedExpression(expression.left, tainted) || taintedExpression(expression.right, tainted);
  if (expression.kind === 'unary') return taintedExpression(expression.operand, tainted);
  if (expression.kind === 'index')
    return taintedExpression(expression.receiver, tainted) || taintedExpression(expression.index, tainted);
  if (expression.kind === 'call' || expression.kind === 'enum-value')
    return expression.arguments.some((argument) => taintedExpression(argument, tainted));
  return taintedCollection(expression, tainted);
}

/**
 * Verifies that dynamic memory allocation requests specify positive sizes within policy bounds.
 *
 * @param node - Memory allocation call node.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function checkMemoryAlloc(
  node: FlintIrExpression & { kind: 'call' },
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  const sizeArgument = node.arguments[0];
  const size = sizeArgument === undefined ? undefined : evaluate(sizeArgument, environment);
  if (typeof size === 'number' && size <= 0) {
    findings.push(
      finding(
        context,
        'fws.safety.ownership-and-memory',
        'ownership',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-001`,
        'Allocation size must be positive.',
        sizeArgument?.span ?? node.span,
        'Allocate a non-zero, policy-bounded region.',
        { severity: 'error', cwe: ['CWE-789'] },
      ),
    );
  }
  if (typeof size === 'number' && size > context.policy.limits.maxAllocationBytes) {
    findings.push(
      finding(
        context,
        'fws.safety.ownership-and-memory',
        'ownership',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-002`,
        'Allocation exceeds the configured analysis limit.',
        node.span,
        'Use bounded allocation sizes or raise the explicit policy limit.',
        { severity: 'error', cwe: ['CWE-789'] },
      ),
    );
  }
}

/**
 * Checks deallocation calls for double-free defects and size mismatches.
 *
 * @param node - Deallocation call node.
 * @param name - Variable name of the pointer being freed.
 * @param allocations - Live allocations map.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function checkMemoryDealloc(
  node: FlintIrExpression & { kind: 'call' },
  name: string,
  allocations: Map<string, Allocation>,
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  const allocation = allocations.get(name);
  if (allocation?.released === true) {
    findings.push(
      finding(
        context,
        'fws.safety.ownership-and-memory',
        'ownership',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-003`,
        `Pointer '${name}' is released more than once.`,
        node.span,
        'Release an owned allocation exactly once.',
        { severity: 'error', owasp: ['A04'], cwe: ['CWE-415'] },
      ),
    );
  }
  if (allocation !== undefined) {
    const size = node.arguments[1] === undefined ? undefined : evaluate(node.arguments[1], environment);
    if (typeof size === 'number' && size !== allocation.size) {
      findings.push(
        finding(
          context,
          'fws.safety.ownership-and-memory',
          'ownership',
          `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-004`,
          `Deallocation length ${size} does not match the owned allocation length ${allocation.size}.`,
          node.span,
          'Retain and pass the exact pointer-length pair returned by the allocator.',
          { severity: 'error', cwe: ['CWE-761'] },
        ),
      );
    }
    allocation.released = true;
  }
}

const MEMORY_ACCESS_OPERATIONS = new Set([
  'memory-load-u32',
  'memory-load-f64',
  'memory-store-u32',
  'memory-store-f64',
]);

/**
 * Checks memory load and store operations for use-after-free defects.
 *
 * @param node - Memory access call node.
 * @param name - Pointer identifier being accessed.
 * @param allocations - Live allocations map.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
function checkMemoryUseAfterRelease(
  node: FlintIrExpression & { kind: 'call' },
  name: string,
  allocations: ReadonlyMap<string, Allocation>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.standardLibrary === undefined || !MEMORY_ACCESS_OPERATIONS.has(node.standardLibrary)) return;
  if (allocations.get(name)?.released === true) {
    findings.push(
      finding(
        context,
        'fws.safety.ownership-and-memory',
        'ownership',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-005`,
        `Pointer '${name}' is used after release.`,
        node.span,
        'Do not use a pointer after transferring it to the deallocator.',
        { severity: 'error', owasp: ['A04'], cwe: ['CWE-416'] },
      ),
    );
  }
}

/**
 * Inspects an expression for memory ownership, double-free, and use-after-free defects.
 *
 * @param node - Candidate expression node.
 * @param allocations - Live allocations map.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function inspectOwnershipExpression(
  node: FlintIrExpression,
  allocations: Map<string, Allocation>,
  environment: ReadonlyMap<string, Constant>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'call') return;
  const operation = node.standardLibrary;
  const name = node.arguments[0]?.kind === 'identifier' ? node.arguments[0].name : undefined;
  if (operation === 'memory-alloc') {
    checkMemoryAlloc(node, environment, context, findings);
  } else if (operation === 'memory-dealloc' && name !== undefined) {
    checkMemoryDealloc(node, name, allocations, environment, context, findings);
  } else if (name !== undefined) {
    checkMemoryUseAfterRelease(node, name, allocations, context, findings);
  }
}

/**
 * Updates allocation state for a memory-realloc call.
 *
 * @param call - Realloc call expression node.
 * @param statementName - Name of variable receiving the allocation.
 * @param allocations - Live allocations map.
 * @param environment - Current analysis environment.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function processMemoryRealloc(
  call: FlintIrExpression & { kind: 'call' },
  statementName: string,
  allocations: Map<string, Allocation>,
  environment: Environment,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  const pointerArgument = call.arguments[0];
  if (pointerArgument?.kind !== 'identifier') return;
  const pointerName = pointerArgument.name;
  const old = allocations.get(pointerName);
  const sizeArgument = call.arguments[2];
  const size = sizeArgument === undefined ? undefined : evaluate(sizeArgument, environment);
  if (old === undefined || size === undefined || typeof size !== 'number') return;
  if (old.released) {
    findings.push(
      finding(
        context,
        'fws.safety.ownership-and-memory',
        'ownership',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-005`,
        `Pointer '${pointerName}' is reallocated after release.`,
        call.span,
        'Reallocate only a live owned allocation.',
        { severity: 'error', cwe: ['CWE-416'] },
      ),
    );
  }
  old.released = true;
  allocations.set(statementName, { size, released: false });
}

/**
 * Updates allocation and environment state for a let statement during ownership analysis.
 *
 * @param statement - Let statement node.
 * @param allocations - Allocations map to update.
 * @param environment - Environment to update.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function processOwnershipLetStatement(
  statement: FlintIrStatement & { kind: 'let' },
  allocations: Map<string, Allocation>,
  environment: Environment,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  const value = statement.value;
  if (value.kind === 'call' && value.standardLibrary === 'memory-alloc') {
    const sizeArgument = value.arguments[0];
    const size = sizeArgument === undefined ? undefined : evaluate(sizeArgument, environment);
    if (typeof size === 'number') allocations.set(statement.name, { size, released: false });
  } else if (value.kind === 'call' && value.standardLibrary === 'memory-realloc') {
    processMemoryRealloc(value, statement.name, allocations, environment, context, findings);
  } else if (value.kind === 'identifier') {
    const existing = allocations.get(value.name);
    if (existing !== undefined) {
      allocations.set(statement.name, existing);
    }
  }
  environment.set(statement.name, evaluate(statement.value, environment));
}

/**
 * Merges ownership flows from multiple branches.
 *
 * @param branches - Child branch flows.
 * @param allocations - Allocation state to update.
 * @param environment - Environment to update.
 * @returns True if at least one branch is reachable.
 */
function mergeOwnershipFlowBranches(
  branches: readonly OwnershipFlow[],
  allocations: Map<string, Allocation>,
  environment: Environment,
): boolean {
  const reachableBranches = branches.filter(({ reachable }) => reachable);
  if (reachableBranches.length === 0) return false;
  allocations.clear();
  for (const [name, allocation] of mergeAllocations(
    reachableBranches.map(({ allocations: branchState }) => branchState),
  )) {
    allocations.set(name, allocation);
  }
  environment.clear();
  for (const [name, value] of mergeEnvironments(reachableBranches.map(({ environment: branchState }) => branchState))) {
    environment.set(name, value);
  }
  return true;
}

/**
 * Evaluates ownership flow along if-statement branches.
 *
 * @param statement - If statement node.
 * @param allocations - Live allocations.
 * @param environment - Current environment.
 * @param visit - Visitor function for recursive block analysis.
 * @returns True if at least one path is reachable.
 */
function processOwnershipIfBranch(
  statement: FlintIrStatement & { kind: 'if' },
  allocations: Map<string, Allocation>,
  environment: Environment,
  visit: (
    statements: readonly FlintIrStatement[],
    inputAllocations: ReadonlyMap<string, Allocation>,
    inputEnvironment: ReadonlyMap<string, Constant>,
  ) => OwnershipFlow,
): boolean {
  const branchAllocations = cloneAllocations(allocations);
  const branchEnvironment = new Map(environment);
  const branches: OwnershipFlow[] = [visit(statement.consequent, branchAllocations, branchEnvironment)];
  if (statement.alternate === undefined) {
    branches.push({
      allocations: cloneAllocations(branchAllocations),
      environment: new Map(branchEnvironment),
      reachable: true,
    });
  } else {
    branches.push(visit(statement.alternate, branchAllocations, branchEnvironment));
  }
  return mergeOwnershipFlowBranches(branches, allocations, environment);
}

/**
 * Evaluates ownership flow along switch cases.
 *
 * @param statement - Switch statement node.
 * @param allocations - Live allocations.
 * @param environment - Current environment.
 * @param visit - Visitor function for recursive block analysis.
 * @returns True if at least one path is reachable.
 */
function processOwnershipSwitchBranch(
  statement: FlintIrStatement & { kind: 'switch' },
  allocations: Map<string, Allocation>,
  environment: Environment,
  visit: (
    statements: readonly FlintIrStatement[],
    inputAllocations: ReadonlyMap<string, Allocation>,
    inputEnvironment: ReadonlyMap<string, Constant>,
  ) => OwnershipFlow,
): boolean {
  const branchAllocations = cloneAllocations(allocations);
  const branchEnvironment = new Map(environment);
  const branches = statement.cases.map((arm) => visit(arm.body, branchAllocations, branchEnvironment));
  if (statement.defaultCase === undefined) {
    branches.push({
      allocations: cloneAllocations(branchAllocations),
      environment: new Map(branchEnvironment),
      reachable: true,
    });
  } else {
    branches.push(visit(statement.defaultCase, branchAllocations, branchEnvironment));
  }
  return mergeOwnershipFlowBranches(branches, allocations, environment);
}

/**
 * Dispatches control flow statements for ownership analysis.
 *
 * @param statement - Statement to process.
 * @param allocations - Live allocations.
 * @param environment - Current environment.
 * @param visit - Visitor function for recursive block analysis.
 * @returns True if path remains reachable.
 */
// skipcq: JS-R1005
function processOwnershipControlFlow(
  statement: FlintIrStatement,
  allocations: Map<string, Allocation>,
  environment: Environment,
  visit: (
    statements: readonly FlintIrStatement[],
    inputAllocations: ReadonlyMap<string, Allocation>,
    inputEnvironment: ReadonlyMap<string, Constant>,
  ) => OwnershipFlow,
): boolean {
  if (statement.kind === 'if') return processOwnershipIfBranch(statement, allocations, environment, visit);
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') {
    visit(statement.body, allocations, environment);
    return true;
  }
  if (statement.kind === 'switch') return processOwnershipSwitchBranch(statement, allocations, environment, visit);
  return true;
}

const ownershipRule: FlintAnalysisRule = {
  id: 'fws.safety.ownership-and-memory',
  category: 'ownership',
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: FlintAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      // skipcq: JS-D1001, JS-R1005
      const visit = (
        statements: readonly FlintIrStatement[],
        inputAllocations: ReadonlyMap<string, Allocation>,
        inputEnvironment: ReadonlyMap<string, Constant>,
      ): OwnershipFlow => {
        const allocations = cloneAllocations(inputAllocations);
        const environment: Environment = new Map(inputEnvironment);
        let reachable = true;
        for (const statement of statements) {
          if (!reachable) break;
          for (const expression of expressionsOf(statement)) {
            visitExpression(expression, (node) =>
              inspectOwnershipExpression(node, allocations, environment, context, findings),
            );
          }
          if (statement.kind === 'let') {
            processOwnershipLetStatement(statement, allocations, environment, context, findings);
          } else if (statement.kind === 'assignment' && statement.value.kind === 'identifier') {
            const existing = allocations.get(statement.value.name);
            if (existing !== undefined) {
              allocations.set(statement.name, existing);
            }
          }
          if (statement.kind === 'return') {
            reachable = false;
            continue;
          }
          reachable = processOwnershipControlFlow(statement, allocations, environment, visit);
        }
        return { allocations, environment, reachable };
      };
      visit(declaration.body, new Map(), new Map());
    }
    return findings;
  },
};

/**
 * Determines whether a standard library identifier corresponds to regex execution.
 *
 * @param standardLibrary - Standard library identifier string.
 * @returns True if the identifier belongs to regex matching operations.
 */
function isRegexStandardLibraryOp(standardLibrary: string | undefined): boolean {
  if (standardLibrary === undefined) return false;
  return (
    standardLibrary.startsWith('full-') || standardLibrary.startsWith('prefix-') || standardLibrary.startsWith('search')
  );
}

/**
 * Checks whether a regex standard library call exceeds configured input length limits.
 *
 * @param node - Call expression node.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
// skipcq: JS-R1005
function checkRegexInputLength(
  node: FlintIrExpression,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'call' || !isRegexStandardLibraryOp(node.standardLibrary)) return;
  const input = node.arguments[0];
  if (input?.kind !== 'literal' || typeof input.value !== 'string') return;
  if (input.value.length <= context.policy.limits.maxRegexInputLength) return;
  findings.push(
    finding(
      context,
      'fws.resource-bounds',
      'resource',
      `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.resource}-002`,
      'Regex input exceeds the configured deterministic work limit.',
      input.span,
      'Limit regex input length before invoking the standard library.',
      { severity: 'error', owasp: ['A06'], cwe: ['CWE-1333'] },
    ),
  );
}

/* eslint-enable unicorn/consistent-function-scoping */
const resourceRule: FlintAnalysisRule = {
  id: 'fws.resource-bounds',
  category: 'resource',
  // skipcq: JS-R1005
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: FlintAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      if (declaration.analysis?.calls.includes(declaration.name) && !containsConditional(declaration.body))
        findings.push(
          finding(
            context,
            'fws.resource-bounds',
            'resource',
            `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.resource}-003`,
            `Recursive function '${declaration.name}' has no statically visible base condition.`,
            declaration.span,
            `Add a terminating base case and keep call depth below ${context.policy.limits.maxCallDepth}.`,
            { severity: 'error', owasp: ['A05'], cwe: ['CWE-674'] },
          ),
        );
      let asyncCalls = 0;
      visitStatements(declaration.body, (statement) => {
        if (
          statement.kind === 'iterator-loop' &&
          statement.boundedLength !== undefined &&
          statement.boundedLength > context.policy.limits.maxLoopIterations
        )
          findings.push(
            finding(
              context,
              'fws.resource-bounds',
              'resource',
              `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.resource}-001`,
              `Iterator bound ${statement.boundedLength} exceeds the configured loop limit.`,
              statement.span,
              'Bound the iterator or lower its maximum yield count.',
              { severity: 'error', owasp: ['A05'], cwe: ['CWE-834'] },
            ),
          );
        for (const expression of expressionsOf(statement))
          visitExpression(expression, (node) => {
            checkRegexInputLength(node, context, findings);
            if (node.kind === 'call') {
              const imported = ir.imports.find((item) => item.alias === node.callee);
              if (imported?.capability.startsWith('scheduler.') === true) asyncCalls += 1;
            }
          });
      });
      if (asyncCalls > context.policy.limits.maxAsyncTasks)
        findings.push(
          finding(
            context,
            'fws.resource-bounds',
            'resource',
            `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.resource}-004`,
            `Function schedules ${asyncCalls} tasks, exceeding the configured async task limit.`,
            declaration.span,
            'Bound task submission or configure an explicit async task limit.',
            { severity: 'error', owasp: ['A05'], cwe: ['CWE-400'] },
          ),
        );
    }
    return findings;
  },
};

/**
 * Recursively inspects control-flow branches for capability taint tracking.
 *
 * @param statement - Statement to process.
 * @param visit - Block visitor function.
 */
// skipcq: JS-R1005
function processCapabilityControlFlow(
  statement: FlintIrStatement,
  visit: (statements: readonly FlintIrStatement[]) => void,
): void {
  switch (statement.kind) {
    case 'if': {
      visit(statement.consequent);
      if (statement.alternate !== undefined) visit(statement.alternate);
      break;
    }
    case 'while':
    case 'do-while':
    case 'iterator-loop': {
      visit(statement.body);
      break;
    }
    case 'switch': {
      for (const arm of statement.cases) visit(arm.body);
      if (statement.defaultCase !== undefined) visit(statement.defaultCase);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Checks for tainted argument propagation into sensitive host capabilities.
 *
 * @param node - Candidate expression node.
 * @param imports - Capability imports index.
 * @param sensitive - Regular expression identifying sensitive capabilities.
 * @param tainted - Set of tainted variables.
 * @param context - Compiler analysis context.
 * @param findings - Accumulated findings list.
 */
function checkTaintedCapabilityCall(
  node: FlintIrExpression,
  imports: ReadonlyMap<string, FlintCapabilityImport>,
  sensitive: RegExp,
  tainted: ReadonlySet<string>,
  context: FlintAnalysisContext,
  findings: FlintAnalysisFinding[],
): void {
  if (node.kind !== 'call') return;
  const importedCapability = imports.get(node.callee);
  if (importedCapability === undefined || !sensitive.test(importedCapability.capability)) return;
  if (node.arguments.some((argument) => argument.kind === 'identifier' && tainted.has(argument.name))) {
    findings.push(
      finding(
        context,
        'fws.security.capabilities-and-taint',
        'security',
        `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.security}-002`,
        `Tainted input flows to sensitive capability '${importedCapability.capability}'.`,
        node.span,
        'Validate, constrain, or explicitly declassify data before crossing the host boundary.',
        {
          severity: 'error',
          owasp: ['A03', 'A04'],
          cwe: ['CWE-20', 'CWE-913'],
          evidence: [evidence('Tainted source parameter', node.span)],
        },
      ),
    );
  }
}

const capabilityRule: FlintAnalysisRule = {
  id: 'fws.security.capabilities-and-taint',
  category: 'security',
  // skipcq: JS-R1005
  analyze: (context) => {
    const module = context.ir;
    if (module === undefined) return [];
    const findings: FlintAnalysisFinding[] = [];
    for (const imported of module.imports) {
      if (
        context.policy.allowedCapabilities.length > 0 &&
        !context.policy.allowedCapabilities.includes(imported.capability)
      )
        findings.push(
          finding(
            context,
            'fws.security.capabilities-and-taint',
            'security',
            `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.security}-001`,
            `Capability '${imported.capability}' is not allowed by the active policy.`,
            imported.span,
            'Declare the capability explicitly in the requested capability allow-list and policy.',
            { severity: 'error', owasp: ['A01'], cwe: ['CWE-862'] },
          ),
        );
    }
    const imports = new Map(module.imports.map((item) => [item.alias, item]));
    const sensitive = /(filesystem|network|socket|dom|eval|execute|secret|credential|token)/iu;
    for (const declaration of module.functions) {
      const tainted = new Set(
        declaration.parameters
          .filter(({ type }) => type.name === 'string' || type.name === 'bytes')
          .map(({ name }) => name),
      );
      // skipcq: JS-R1005
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const visit = (statements: readonly FlintIrStatement[]): void => {
        for (const statement of statements) {
          for (const expression of expressionsOf(statement)) {
            visitExpression(expression, (node) =>
              checkTaintedCapabilityCall(node, imports, sensitive, tainted, context, findings),
            );
          }
          if (statement.kind === 'let' && taintedExpression(statement.value, tainted)) tainted.add(statement.name);
          if (statement.kind === 'assignment' && taintedExpression(statement.value, tainted))
            tainted.add(statement.name);
          processCapabilityControlFlow(statement, visit);
        }
      };
      visit(declaration.body);
    }
    return findings;
  },
};

/**
 * Resolves a fallback source span from the module AST or IR for policy diagnostics.
 *
 * @param context - Compiler analysis context.
 * @returns Non-null source code span.
 */
function defaultFallbackSpan(context: FlintAnalysisContext): FlintAnalysisFinding['span'] {
  const nodeSpan = context.frontend.sonIr?.nodes[0]?.span;
  if (nodeSpan !== undefined) return nodeSpan;
  const functionSpan = context.frontend.module?.functions[0]?.span;
  if (functionSpan !== undefined) return functionSpan;
  return {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  };
}

/**
 * Checks if bounds checks are excluded by the compilation profile.
 *
 * @param context - Compiler analysis context.
 * @returns Finding if violation detected, otherwise undefined.
 */
function checkExcludedBoundsPolicy(context: FlintAnalysisContext): FlintAnalysisFinding | undefined {
  if (context.policy.boundsChecks !== 'excluded-by-profile') return undefined;
  return finding(
    context,
    'fws.optimization.safety-policy',
    'optimization',
    `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.optimization}-001`,
    'Runtime bounds checks are excluded by the active compilation profile.',
    defaultFallbackSpan(context),
    'Use the runtime policy unless every indexed access has independently audited proof facts.',
    {
      severity: context.policy.profile === 'strict' ? 'error' : 'warning',
      blocking: context.policy.profile === 'strict',
    },
  );
}

/**
 * Checks if the proven-safe bounds policy was requested without complete proofs.
 *
 * @param context - Compiler analysis context.
 * @returns Finding if unproven accesses exist, otherwise undefined.
 */
function checkProvenSafePolicy(context: FlintAnalysisContext): FlintAnalysisFinding | undefined {
  if (context.policy.boundsChecks !== 'proven-safe') return undefined;
  const unknownAccess = context.facts.arrayBounds.find(({ status }) => status === 'unknown');
  if (unknownAccess === undefined) return undefined;
  return finding(
    context,
    'fws.optimization.safety-policy',
    'optimization',
    `${FLINT_ANALYSIS_DIAGNOSTIC_CODES.optimization}-002`,
    'The proven-safe bounds policy was requested but at least one access lacks a static range proof.',
    unknownAccess.span ?? defaultFallbackSpan(context),
    'Keep runtime checks enabled or provide a proof-producing frontend fact.',
    { severity: 'error' },
  );
}

const optimizationSafetyRule: FlintAnalysisRule = {
  id: 'fws.optimization.safety-policy',
  category: 'optimization',
  analyze: (context) => {
    const findings: FlintAnalysisFinding[] = [];
    const excludedFinding = checkExcludedBoundsPolicy(context);
    if (excludedFinding !== undefined) findings.push(excludedFinding);
    const provenSafeFinding = checkProvenSafePolicy(context);
    if (provenSafeFinding !== undefined) findings.push(provenSafeFinding);
    return findings;
  },
};

export const FLINT_DEFAULT_ANALYSIS_RULES: readonly FlintAnalysisRule[] = [
  correctnessRule,
  rangeRule,
  ownershipRule,
  resourceRule,
  capabilityRule,
  optimizationSafetyRule,
];
