import {
  countFlintIr,
  lowerFlintIrToModule,
  lowerFlintToIr,
  type FlintIrCounts,
  type FlintIrExpression,
  type FlintIrFunction,
  type FlintIrModule,
  type FlintIrPurity,
  type FlintIrStatement,
} from './ir.js';

import type { FlintModule } from './ast.js';
import type { FlintSoNPassReport } from './son-ir.js';

/**
 * Legacy tree-IR optimizer, kept only as a compatibility adapter.
 *
 * `son-ir.ts`'s Sea-of-Nodes optimizer is the canonical optimization
 * boundary: `frontend.ts` builds the SoN graph from the *unoptimized* IR and
 * derives `optimizedIr`/`optimizedModule` (what the Wasm backend actually
 * compiles) from the SoN graph's own constant/copy-propagation, CSE, and
 * reachability passes. This module's `optimizeFlintModule`/
 * `optimizeFlintIr` no longer influence the compiled output; they
 * are retained solely to populate the backward-compatible
 * `FlintOptimizationReport` shape (and its richer pass-level detail
 * such as inlining/tail-call/iterator-unroll counters) for existing
 * consumers, and may be superseded once those decisions move onto the SoN
 * graph as well.
 */
export interface FlintOptimizationReport {
  readonly mode: 'debug' | 'release';
  readonly passes: readonly (
    | 'constant-folding'
    | 'local-simplification'
    | 'dead-code-elimination'
    | 'reachability-pruning'
    | 'call-graph-analysis'
    | 'purity-analysis'
    | 'iterator-analysis'
    | 'bounded-iterator-unrolling'
    | 'inlining'
    | 'tail-call-analysis'
    | 'optimistic-conditional-analysis'
  )[];
  readonly before: FlintIrCounts;
  readonly after: FlintIrCounts;
  readonly constantsFolded: number;
  readonly localsSimplified: number;
  readonly statementsRemoved: number;
  readonly functionsRemoved: number;
  readonly reachableFunctions: readonly string[];
  readonly appliedTransformations: readonly FlintOptimizationDecision[];
  readonly skippedTransformations: readonly FlintOptimizationDecision[];
  readonly featureRequirements: readonly string[];
  readonly iteratorUnrolled: number;
  readonly functionsInlined: number;
  readonly tailCallsDetected: number;
  readonly optimisticBranches: number;
  readonly pureFunctions: readonly string[];
  readonly effectfulFunctions: readonly string[];
  /** Ordered canonical SoN passes; legacy tree-IR pass data remains above. */
  readonly sonPasses?: readonly FlintSoNPassReport['name'][];
}

/**
 * Record describing an individual optimization transformation attempt and whether it was applied.
 */
export interface FlintOptimizationDecision {
  /** The optimization transformation category. */
  readonly transformation: 'iterator-unroll' | 'inline' | 'tail-call' | 'optimistic-conditional' | 'dead-code';
  /** Outcome status of the optimization attempt. */
  readonly status: 'applied' | 'skipped';
  /** Optional function name where the decision was evaluated. */
  readonly functionName?: string;
  /** Optional source span associated with the decision point. */
  readonly span?: FlintIrStatement['span'];
  /** Human-readable explanation of why the transformation was applied or skipped. */
  readonly reason: string;
}

/**
 * Result returned by the IR and AST optimization passes.
 */
export interface FlintOptimizationResult {
  /** Re-lowered AST module from the optimized IR representation. */
  readonly module: FlintModule;
  /** Optimized IR module. */
  readonly ir: FlintIrModule;
  /** Summary report detailing pass execution, metrics, and decisions. */
  readonly report: FlintOptimizationReport;
}

/**
 * Type alias for IR literal expressions representing known constant values.
 */
type Literal = Extract<FlintIrExpression, { kind: 'literal' }>;

/**
 * Mutable counters tracking optimizer metrics across passes.
 */
interface OptimizationCounters {
  constantsFolded: number;
  localsSimplified: number;
  statementsRemoved: number;
  iteratorUnrolled: number;
  functionsInlined: number;
  tailCallsDetected: number;
  optimisticBranches: number;
  applied: FlintOptimizationDecision[];
  skipped: FlintOptimizationDecision[];
  featureRequirements: Set<string>;
}

/**
 * Collects variable identifiers reassigned inside loop statements.
 *
 * @param statement - Statement AST node to inspect.
 * @param names - Mutable set accumulating assigned names.
 */
function collectAssignedNamesFromLoop(statement: FlintIrStatement, names: Set<string>): void {
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') {
    assignedNames(statement.body, names);
  }
}

/**
 * Collects variable identifiers that are reassigned in a statement.
 *
 * @param statement - Statement AST node to inspect.
 * @param names - Mutable set accumulating assigned names.
 */
function collectAssignedNamesFromStatement(statement: FlintIrStatement, names: Set<string>): void {
  if (statement.kind === 'assignment') {
    names.add(statement.name);
    return;
  }
  if (statement.kind === 'if') {
    assignedNames(statement.consequent, names);
    if (statement.alternate !== undefined) assignedNames(statement.alternate, names);
    return;
  }
  if (statement.kind === 'switch') {
    for (const arm of statement.cases) assignedNames(arm.body, names);
    if (statement.defaultCase !== undefined) assignedNames(statement.defaultCase, names);
    return;
  }
  collectAssignedNamesFromLoop(statement, names);
}

/**
 * Traverses an IR statement block to collect all assigned variable names.
 *
 * @param statements - Statement sequence to inspect.
 * @param names - Optional preexisting set to populate.
 * @returns Set of all assigned variable names in the block.
 */
function assignedNames(statements: readonly FlintIrStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) collectAssignedNamesFromStatement(statement, names);
  return names;
}

/**
 * Creates an IR literal node wrapping a primitive boolean, number, or string value.
 *
 * @param value - Literal value payload.
 * @param source - Original expression providing source span metadata.
 * @returns Literal IR expression.
 */
function literal(value: boolean | number | string, source: FlintIrExpression): Literal {
  if (source.kind === 'literal') return { ...source, value };
  return { kind: 'literal', value, type: 'bool', span: source.span };
}

/** Arithmetic operations dispatch table for numeric constants. */
const NUMERIC_ARITHMETIC_OPERATORS: Readonly<Record<string, (left: number, right: number) => number>> = {
  '+': (left, right) => left + right,
  '-': (left, right) => left - right,
  '*': (left, right) => left * right,
  '/': (left, right) => left / right,
  '%': (left, right) => left % right,
};

/** Comparison operations dispatch table for numeric constants. */
const NUMERIC_COMPARISON_OPERATORS: Readonly<Record<string, (left: number, right: number) => boolean>> = {
  '<': (left, right) => left < right,
  '<=': (left, right) => left <= right,
  '>': (left, right) => left > right,
  '>=': (left, right) => left >= right,
};

/**
 * Evaluates binary operations between numeric literal operands.
 *
 * @param operator - Binary operator token.
 * @param left - Left numeric operand.
 * @param right - Right numeric operand.
 * @returns Evaluated numeric or boolean result, or undefined if invalid (e.g. division by zero).
 */
function evaluateNumericBinary(operator: string, left: number, right: number): number | boolean | undefined {
  if ((operator === '/' || operator === '%') && right === 0) return undefined;
  const arithmetic = NUMERIC_ARITHMETIC_OPERATORS[operator];
  if (arithmetic !== undefined) return arithmetic(left, right);
  const comparison = NUMERIC_COMPARISON_OPERATORS[operator];
  if (comparison !== undefined) return comparison(left, right);
  return undefined;
}

/**
 * Evaluates boolean logical binary expressions (`&&`, `||`).
 *
 * @param operator - Binary operator token.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @returns Evaluated boolean result, or undefined if operands are non-boolean.
 */
function evaluateLogicalBinary(operator: string, left: Literal, right: Literal): boolean | undefined {
  if (typeof left.value !== 'boolean' || typeof right.value !== 'boolean') return undefined;
  if (operator === '&&') return left.value && right.value;
  if (operator === '||') return left.value || right.value;
  return undefined;
}

/**
 * Evaluates equality binary expressions (`==`, `!=`).
 *
 * @param operator - Binary operator token.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @returns Evaluated boolean result, or undefined if operator is not equality.
 */
function evaluateEqualityBinary(operator: string, left: Literal, right: Literal): boolean | undefined {
  if (operator === '==') return left.value === right.value;
  if (operator === '!=') return left.value !== right.value;
  return undefined;
}

/**
 * Constant folds a binary operator applied to two literal values.
 *
 * @param operator - Binary operator symbol.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @returns Constant folded value or undefined if not evaluable.
 */
function evaluateBinary(operator: string, left: Literal, right: Literal): boolean | number | string | undefined {
  const logical = evaluateLogicalBinary(operator, left, right);
  if (logical !== undefined) return logical;
  const equality = evaluateEqualityBinary(operator, left, right);
  if (equality !== undefined) return equality;
  if (typeof left.value !== 'number' || typeof right.value !== 'number') return undefined;
  return evaluateNumericBinary(operator, left.value, right.value);
}

/** Set of standard library functions known to be referentially transparent and side-effect free. */
const PURE_STANDARD_LIBRARY = new Set([
  'full-match',
  'prefix-match',
  'search',
  'full-capture-start',
  'full-capture-end',
  'prefix-capture-start',
  'prefix-capture-end',
  'search-capture-start',
  'search-capture-end',
  'string-concat',
  'string-length',
  'string-byte-at',
  'string-starts-with',
  'string-slice',
  'string-to-i32',
  'bytes-length',
  'bytes-byte-at',
  'bytes-slice',
]);

/**
 * Determines whether a call expression is pure based on standard library purity or known user callee purity.
 *
 * @param expression - Call expression node.
 * @param functions - Purity lookup table for user functions.
 * @returns 'pure' if the call has no side effects, otherwise 'effectful'.
 */
function callPurity(
  expression: Extract<FlintIrExpression, { kind: 'call' }>,
  functions: ReadonlyMap<string, FlintIrPurity>,
): FlintIrPurity {
  if (expression.standardLibrary !== undefined)
    return PURE_STANDARD_LIBRARY.has(expression.standardLibrary) &&
      expression.arguments.every((argument) => expressionPurity(argument, functions) === 'pure')
      ? 'pure'
      : 'effectful';
  const callee = functions.get(expression.callee);
  if (callee !== 'pure') return callee ?? 'effectful';
  return expression.arguments.every((argument) => expressionPurity(argument, functions) === 'pure')
    ? 'pure'
    : 'effectful';
}

/**
 * Determines purity for operator expressions (unary, binary, index).
 *
 * @param expression - Unary, binary, or index expression node.
 * @param functions - Purity lookup table for user functions.
 * @returns 'pure' if all sub-expressions are pure, otherwise 'effectful'.
 */
function operatorPurity(
  expression: Extract<FlintIrExpression, { kind: 'unary' | 'binary' | 'index' }>,
  functions: ReadonlyMap<string, FlintIrPurity>,
): FlintIrPurity {
  if (expression.kind === 'unary') return expressionPurity(expression.operand, functions);
  if (expression.kind === 'binary')
    return expressionPurity(expression.left, functions) === 'pure' &&
      expressionPurity(expression.right, functions) === 'pure'
      ? 'pure'
      : 'effectful';
  return expressionPurity(expression.receiver, functions) === 'pure' &&
    expressionPurity(expression.index, functions) === 'pure'
    ? 'pure'
    : 'effectful';
}

/**
 * Determines purity for aggregate and collection literal expressions.
 *
 * @param expression - Aggregate expression node.
 * @param functions - Purity lookup table for user functions.
 * @returns 'pure' if all element/field expressions are pure, otherwise 'effectful'.
 */
function aggregatePurity(
  expression: Extract<FlintIrExpression, { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' }>,
  functions: ReadonlyMap<string, FlintIrPurity>,
): FlintIrPurity {
  if (expression.kind === 'struct-value')
    return Object.values(expression.fields).every((value) => expressionPurity(value, functions) === 'pure')
      ? 'pure'
      : 'effectful';
  if (expression.kind === 'enum-value')
    return expression.arguments.every((argument) => expressionPurity(argument, functions) === 'pure')
      ? 'pure'
      : 'effectful';
  return expression.elements.every((element) => expressionPurity(element, functions) === 'pure') ? 'pure' : 'effectful';
}

/**
 * Determines purity for match expressions and all arms.
 *
 * @param expression - Match expression node.
 * @param functions - Purity lookup table for user functions.
 * @returns 'pure' if the scrutinee and all arm bodies are pure, otherwise 'effectful'.
 */
function matchPurity(
  expression: Extract<FlintIrExpression, { kind: 'match' }>,
  functions: ReadonlyMap<string, FlintIrPurity>,
): FlintIrPurity {
  return expressionPurity(expression.value, functions) === 'pure' &&
    expression.arms.every((arm) => expressionPurity(arm.value, functions) === 'pure')
    ? 'pure'
    : 'effectful';
}

/**
 * Checks whether an expression is inherently pure without inspecting sub-expressions.
 *
 * @param expression - Expression to check.
 * @returns True if the expression kind is always pure.
 */
function isSelfPureExpression(
  expression: FlintIrExpression,
): expression is Extract<FlintIrExpression, { kind: 'literal' | 'identifier' | 'function-value' }> {
  return expression.kind === 'literal' || expression.kind === 'identifier' || expression.kind === 'function-value';
}

/**
 * Classifies an IR expression as pure (side-effect free) or effectful.
 *
 * @param expression - Expression to inspect.
 * @param functions - Purity classification for called functions.
 * @returns 'pure' if evaluating the expression has no observable effects, otherwise 'effectful'.
 */
function expressionPurity(expression: FlintIrExpression, functions: ReadonlyMap<string, FlintIrPurity>): FlintIrPurity {
  if (isSelfPureExpression(expression)) return 'pure';
  if (expression.kind === 'call') return callPurity(expression, functions);
  if (expression.kind === 'unary' || expression.kind === 'binary' || expression.kind === 'index')
    return operatorPurity(expression, functions);
  if (expression.kind === 'match') return matchPurity(expression, functions);
  return aggregatePurity(expression, functions);
}

/**
 * Checks whether an IR statement sequence contains any yield statements (or loops that yield).
 *
 * @param statements - Statement sequence to inspect.
 * @returns True if any yield operation is present.
 */
function containsYield(statements: readonly FlintIrStatement[]): boolean {
  return statements.some((statement) => {
    if (statement.kind === 'yield') return true;
    if (statement.kind === 'if')
      return (
        containsYield(statement.consequent) ||
        (statement.alternate === undefined ? false : containsYield(statement.alternate))
      );
    if (statement.kind === 'while' || statement.kind === 'do-while') return containsYield(statement.body);
    if (statement.kind === 'iterator-loop') return true;
    if (statement.kind === 'match-statement') return false;
    return false;
  });
}

/**
 * Determines whether an iterator generator consists solely of consecutive top-level yields.
 *
 * @param statements - Function body statements.
 * @returns Count of yields if statically bounded, or undefined if dynamic/conditional.
 */
function staticallyBoundedIteratorYields(statements: readonly FlintIrStatement[]): number | undefined {
  let yields = 0;
  for (const statement of statements) {
    if (statement.kind !== 'yield') return undefined;
    yields += 1;
  }
  return yields;
}

/**
 * Evaluates the purity of a single function body given known callee purities.
 *
 * @param declaration - Function declaration to evaluate.
 * @param byName - Map of all functions in the module.
 * @param purity - Current iteration purity lookup table.
 * @returns 'pure' or 'effectful'.
 */
function solveFunctionPurity(
  declaration: FlintIrFunction,
  byName: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
): FlintIrPurity {
  const calls = new Set<string>();
  calledFunctionsInStatements(declaration.body, calls);
  if (containsYield(declaration.body)) return 'effectful';
  if (calls.size === 0) return 'pure';
  const callsArePure = [...calls].every((callee) => byName.has(callee) && purity.get(callee) === 'pure');
  if (!callsArePure) return 'effectful';
  const statementsArePure = declaration.body.every(
    (statement) =>
      statement.kind !== 'expression-statement' || expressionPurity(statement.expression, purity) === 'pure',
  );
  return statementsArePure ? 'pure' : 'effectful';
}

/**
 * Computes interprocedural function purity via fixed-point iteration.
 *
 * @param module - IR module containing functions.
 * @param byName - Map of function declarations keyed by name.
 * @returns Fixed-point map of function purities.
 */
function solvePurityFixedPoint(
  module: FlintIrModule,
  byName: ReadonlyMap<string, FlintIrFunction>,
): Map<string, FlintIrPurity> {
  const purity = new Map<string, FlintIrPurity>(module.functions.map(({ name }) => [name, 'unknown']));
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of module.functions) {
      const localPurity = solveFunctionPurity(declaration, byName, purity);
      if (purity.get(declaration.name) !== localPurity) {
        purity.set(declaration.name, localPurity);
        changed = true;
      }
    }
  }
  return purity;
}

/**
 * Constructs the metadata analysis record for an individual function.
 *
 * @param declaration - Function declaration to analyze.
 * @param purity - Resolved function purity map.
 * @returns Analysis metadata including call list, tail-callability, and iterator bounds.
 */
function buildFunctionAnalysis(
  declaration: FlintIrFunction,
  purity: ReadonlyMap<string, FlintIrPurity>,
): FlintIrFunction['analysis'] {
  const calls = new Set<string>();
  calledFunctionsInStatements(declaration.body, calls);
  const lastStatement = declaration.body.at(-1);
  const boundedLength = declaration.iterable === true ? staticallyBoundedIteratorYields(declaration.body) : undefined;
  return {
    purity: purity.get(declaration.name) ?? 'unknown',
    calls: [...calls].toSorted(),
    tailCallable:
      purity.get(declaration.name) === 'pure' &&
      lastStatement?.kind === 'return' &&
      lastStatement.value?.kind === 'call',
    ...(boundedLength === undefined ? {} : { iteratorBoundedLength: boundedLength }),
  };
}

/**
 * Computes call graph, purity analysis, and tail-call candidate properties for all functions.
 *
 * @param module - IR module under optimization.
 * @returns Per-function analyses and purity lookup tables.
 */
function analyzeFunctions(module: FlintIrModule): {
  readonly analyses: ReadonlyMap<string, FlintIrFunction['analysis']>;
  readonly purity: ReadonlyMap<string, FlintIrPurity>;
} {
  const byName = new Map(module.functions.map((declaration) => [declaration.name, declaration]));
  const purity = solvePurityFixedPoint(module, byName);
  const analyses = new Map<string, FlintIrFunction['analysis']>();
  for (const declaration of module.functions) {
    analyses.set(declaration.name, buildFunctionAnalysis(declaration, purity));
  }
  return { analyses, purity };
}

/**
 * Simplifies primary identifier or literal expressions against known constant locals.
 *
 * @param expression - Expression to check.
 * @param locals - Known constant locals.
 * @returns Constant substituted expression or undefined if not a primary expression.
 */
function optimizePrimaryExpression(
  expression: FlintIrExpression,
  locals: ReadonlyMap<string, Literal>,
): FlintIrExpression | undefined {
  if (expression.kind === 'identifier') {
    const replacement = locals.get(expression.name);
    return replacement === undefined ? expression : { ...replacement, span: expression.span };
  }
  if (expression.kind === 'literal' || expression.kind === 'function-value') return expression;
  return undefined;
}

/**
 * Recursively optimizes aggregate literal expressions (structs, enums, matches, collections).
 *
 * @param expression - Expression to optimize.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Optimized aggregate expression or undefined if not an aggregate kind.
 */
function optimizeAggregateExpression(
  expression: FlintIrExpression,
  locals: ReadonlyMap<string, Literal>,
  counters: Pick<OptimizationCounters, 'constantsFolded' | 'localsSimplified'>,
): FlintIrExpression | undefined {
  if (expression.kind === 'struct-value')
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [name, optimizeExpression(value, locals, counters)]),
      ),
    };
  if (expression.kind === 'enum-value')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => optimizeExpression(argument, locals, counters)),
    };
  if (expression.kind === 'match')
    return {
      ...expression,
      value: optimizeExpression(expression.value, locals, counters),
      arms: expression.arms.map((arm) => ({ ...arm, value: optimizeExpression(arm.value, locals, counters) })),
    };
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return {
      ...expression,
      elements: expression.elements.map((element) => optimizeExpression(element, locals, counters)),
    };
  return undefined;
}

/**
 * Optimizes unary expressions, evaluating constant negation and boolean inversion.
 *
 * @param expression - Unary expression node.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Optimized unary expression.
 */
function optimizeUnaryExpression(
  expression: Extract<FlintIrExpression, { kind: 'unary' }>,
  locals: ReadonlyMap<string, Literal>,
  counters: Pick<OptimizationCounters, 'constantsFolded' | 'localsSimplified'>,
): FlintIrExpression {
  const operand = optimizeExpression(expression.operand, locals, counters);
  if (operand.kind === 'literal' && expression.operator === '!' && typeof operand.value === 'boolean') {
    counters.constantsFolded += 1;
    return literal(!operand.value, expression);
  }
  if (operand.kind === 'literal' && expression.operator === '-' && typeof operand.value === 'number') {
    counters.constantsFolded += 1;
    return { ...operand, value: -operand.value, span: expression.span };
  }
  return { ...expression, operand };
}

/**
 * Folds two literal binary operands into a constant result when evaluable.
 *
 * @param expression - Binary expression node.
 * @param left - Left literal operand.
 * @param right - Right literal operand.
 * @param counters - Optimization counters accumulator.
 * @returns Folded literal expression, or undefined if operation is not evaluable.
 */
function foldBinaryConstants(
  expression: Extract<FlintIrExpression, { kind: 'binary' }>,
  left: Literal,
  right: Literal,
  counters: Pick<OptimizationCounters, 'constantsFolded'>,
): FlintIrExpression | undefined {
  const value = evaluateBinary(expression.operator, left, right);
  if (value === undefined) return undefined;
  counters.constantsFolded += 1;
  const isBoolResult =
    expression.operator === '&&' ||
    expression.operator === '||' ||
    ['<', '<=', '==', '!=', '>', '>='].includes(expression.operator);
  return {
    ...left,
    value,
    type: isBoolResult ? 'bool' : left.type,
    span: expression.span,
  };
}

/**
 * Simplifies identity operations like `x + 0` or `x * 1`.
 *
 * @param operator - Binary operator string.
 * @param left - Left expression operand.
 * @param right - Right expression operand.
 * @param counters - Optimization counters accumulator.
 * @returns Simplified left operand if an identity was matched, otherwise undefined.
 */
function simplifyBinaryIdentity(
  operator: string,
  left: FlintIrExpression,
  right: FlintIrExpression,
  counters: Pick<OptimizationCounters, 'localsSimplified'>,
): FlintIrExpression | undefined {
  if (operator === '+' && right.kind === 'literal' && right.value === 0) {
    counters.localsSimplified += 1;
    return left;
  }
  if (operator === '*' && right.kind === 'literal' && right.value === 1) {
    counters.localsSimplified += 1;
    return left;
  }
  return undefined;
}

/**
 * Optimizes binary expressions, evaluating constant operations and algebraic identities.
 *
 * @param expression - Binary expression node.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Optimized binary expression.
 */
function optimizeBinaryExpression(
  expression: Extract<FlintIrExpression, { kind: 'binary' }>,
  locals: ReadonlyMap<string, Literal>,
  counters: Pick<OptimizationCounters, 'constantsFolded' | 'localsSimplified'>,
): FlintIrExpression {
  const left = optimizeExpression(expression.left, locals, counters);
  const right = optimizeExpression(expression.right, locals, counters);
  if (left.kind === 'literal' && right.kind === 'literal') {
    const folded = foldBinaryConstants(expression, left, right, counters);
    if (folded !== undefined) return folded;
  }
  const simplified = simplifyBinaryIdentity(expression.operator, left, right, counters);
  if (simplified !== undefined) return simplified;
  return { ...expression, left, right };
}

/**
 * Optimizes an expression by folding constants and propagating known immutable values.
 *
 * @param expression - IR expression to optimize.
 * @param locals - In-scope known constant locals.
 * @param counters - Mutation counters tracking folded constants and simplified expressions.
 * @returns Optimized IR expression.
 */
function optimizeExpression(
  expression: FlintIrExpression,
  locals: ReadonlyMap<string, Literal>,
  counters: Pick<OptimizationCounters, 'constantsFolded' | 'localsSimplified'>,
): FlintIrExpression {
  const primary = optimizePrimaryExpression(expression, locals);
  if (primary !== undefined) return primary;

  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => optimizeExpression(argument, locals, counters)),
    };
  if (expression.kind === 'index')
    return {
      ...expression,
      receiver: optimizeExpression(expression.receiver, locals, counters),
      index: optimizeExpression(expression.index, locals, counters),
    };
  if (expression.kind === 'unary') return optimizeUnaryExpression(expression, locals, counters);
  if (expression.kind === 'binary') return optimizeBinaryExpression(expression, locals, counters);

  const aggregate = optimizeAggregateExpression(expression, locals, counters);
  if (aggregate !== undefined) return aggregate;

  return expression;
}

/**
 * Inlines the taken branch of an if statement whose condition evaluated to a constant boolean.
 *
 * @param statement - If statement node.
 * @param conditionValue - Statically evaluated boolean condition.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Inlined branch statements and termination flag.
 */
function pruneConstantIfBranch(
  statement: Extract<FlintIrStatement, { kind: 'if' }>,
  conditionValue: boolean,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): { readonly statements: readonly FlintIrStatement[]; readonly terminates: boolean } {
  const selected = conditionValue ? statement.consequent : (statement.alternate ?? []);
  const optimized = optimizeStatements(selected, new Map(locals), counters);
  counters.statementsRemoved += 1;
  counters.optimisticBranches += 1;
  counters.applied.push({
    transformation: 'optimistic-conditional',
    status: 'applied',
    span: statement.span,
    reason: 'Selected the branch of a condition proven constant without evaluating a host call.',
  });
  for (const name of assignedNames(selected)) locals.delete(name);
  const terminates = optimized.some(({ kind }) => kind === 'return');
  return { statements: optimized, terminates };
}

/**
 * Optimizes an if statement whose condition is dynamic/non-constant.
 *
 * @param statement - If statement node.
 * @param condition - Optimized condition expression.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Single optimized if statement and termination flag.
 */
function optimizeDynamicIfStatement(
  statement: Extract<FlintIrStatement, { kind: 'if' }>,
  condition: FlintIrExpression,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): { readonly statements: readonly FlintIrStatement[]; readonly terminates: boolean } {
  if (statement.conditionalHint !== undefined)
    counters.skipped.push({
      transformation: 'optimistic-conditional',
      status: 'skipped',
      span: statement.span,
      reason: 'The condition is not proven constant; branch hints cannot change semantics.',
    });
  const consequent = optimizeStatements(statement.consequent, new Map(locals), counters);
  const alternate =
    statement.alternate === undefined ? undefined : optimizeStatements(statement.alternate, new Map(locals), counters);
  for (const name of assignedNames(statement.consequent)) locals.delete(name);
  if (statement.alternate !== undefined) for (const name of assignedNames(statement.alternate)) locals.delete(name);
  return {
    statements: [{ ...statement, condition, consequent, ...(alternate === undefined ? {} : { alternate }) }],
    terminates: false,
  };
}

/**
 * Optimizes a conditional if statement, performing optimistic branch pruning when the condition is constant.
 *
 * @param statement - If statement node.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Object with the replacement statements and whether termination occurred.
 */
function optimizeIfStatement(
  statement: Extract<FlintIrStatement, { kind: 'if' }>,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): { readonly statements: readonly FlintIrStatement[]; readonly terminates: boolean } {
  const condition = optimizeExpression(statement.condition, locals, counters);
  if (condition.kind === 'literal' && typeof condition.value === 'boolean') {
    return pruneConstantIfBranch(statement, condition.value, locals, counters);
  }
  return optimizeDynamicIfStatement(statement, condition, locals, counters);
}

/**
 * Optimizes let or assignment statements, propagating constants and eliminating redundant bindings.
 *
 * @param statement - Let or assignment statement node.
 * @param locals - Known constant locals.
 * @param mutableNames - Names of variables reassigned elsewhere.
 * @param counters - Optimization counters accumulator.
 * @returns Replacement statement object, or empty object if removed, or undefined if not let/assignment.
 */
function optimizeBindingStatement(
  statement: FlintIrStatement,
  locals: Map<string, Literal>,
  mutableNames: ReadonlySet<string>,
  counters: OptimizationCounters,
): { readonly statement?: FlintIrStatement; readonly terminates?: boolean } | undefined {
  if (statement.kind === 'let') {
    const value = optimizeExpression(statement.value, locals, counters);
    if (value.kind === 'literal') locals.set(statement.name, value);
    else locals.delete(statement.name);
    if (value.kind === 'literal' && !mutableNames.has(statement.name)) {
      counters.statementsRemoved += 1;
      return {};
    }
    return { statement: { ...statement, value } };
  }
  if (statement.kind === 'assignment') {
    const value = optimizeExpression(statement.value, locals, counters);
    locals.delete(statement.name);
    return { statement: { ...statement, value } };
  }
  return undefined;
}

/**
 * Optimizes simple non-branching control statements (return, expression-statement, yield, match).
 *
 * @param statement - Statement to optimize.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Replacement statement object with termination flag, or undefined if not handled.
 */
function optimizeSimpleControlStatement(
  statement: FlintIrStatement,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): { readonly statement?: FlintIrStatement; readonly terminates?: boolean } | undefined {
  if (statement.kind === 'return') {
    const value = statement.value === undefined ? undefined : optimizeExpression(statement.value, locals, counters);
    return { statement: { ...statement, ...(value === undefined ? {} : { value }) }, terminates: true };
  }
  if (statement.kind === 'expression-statement') {
    return { statement: { ...statement, expression: optimizeExpression(statement.expression, locals, counters) } };
  }
  if (statement.kind === 'yield') {
    return { statement: { ...statement, value: optimizeExpression(statement.value, locals, counters) } };
  }
  if (statement.kind === 'match-statement') {
    return {
      statement: {
        ...statement,
        value: optimizeExpression(statement.value, locals, counters),
        arms: statement.arms.map((arm) => ({ ...arm, value: optimizeExpression(arm.value, locals, counters) })),
      },
    };
  }
  return undefined;
}

/**
 * Optimizes linear statements (let, assignment, return, expression-statement, yield, match).
 *
 * @param statement - Statement to optimize.
 * @param locals - Mutable map of known constant locals.
 * @param mutableNames - Set of variables reassigned elsewhere in the enclosing scope.
 * @param counters - Optimization counters accumulator.
 * @returns Result object with optional replacement statement and termination flag, or undefined if not linear.
 */
function optimizeLinearStatement(
  statement: FlintIrStatement,
  locals: Map<string, Literal>,
  mutableNames: ReadonlySet<string>,
  counters: OptimizationCounters,
): { readonly statement?: FlintIrStatement; readonly terminates?: boolean } | undefined {
  const binding = optimizeBindingStatement(statement, locals, mutableNames, counters);
  if (binding !== undefined) return binding;
  return optimizeSimpleControlStatement(statement, locals, counters);
}

/**
 * Optimizes a switch statement, invalidating constants reassigned across branches.
 *
 * @param statement - Switch statement node.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Optimized switch statement.
 */
function optimizeSwitchStatement(
  statement: Extract<FlintIrStatement, { kind: 'switch' }>,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): FlintIrStatement {
  const optimized = {
    ...statement,
    value: optimizeExpression(statement.value, locals, counters),
    cases: statement.cases.map((arm) => ({
      ...arm,
      body: optimizeStatements(arm.body, new Map(locals), counters),
    })),
    ...(statement.defaultCase === undefined
      ? {}
      : { defaultCase: optimizeStatements(statement.defaultCase, new Map(locals), counters) }),
  };
  for (const arm of statement.cases) for (const name of assignedNames(arm.body)) locals.delete(name);
  if (statement.defaultCase !== undefined) for (const name of assignedNames(statement.defaultCase)) locals.delete(name);
  return optimized;
}

/**
 * Optimizes while, do-while, and iterator-loop statements.
 *
 * @param statement - Loop statement node.
 * @param locals - Known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Optimized loop statement.
 */
function optimizeLoopStatement(
  statement: Extract<FlintIrStatement, { kind: 'while' | 'do-while' | 'iterator-loop' }>,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): FlintIrStatement {
  if (statement.kind === 'iterator-loop') {
    const bodyLocals = new Map(locals);
    for (const name of assignedNames(statement.body)) bodyLocals.delete(name);
    bodyLocals.delete(statement.binding);
    const body = optimizeStatements(statement.body, bodyLocals, counters);
    for (const name of assignedNames(statement.body)) locals.delete(name);
    return {
      ...statement,
      iterator: optimizeExpression(statement.iterator, locals, counters),
      body,
    };
  }
  const bodyLocals = new Map(locals);
  for (const name of assignedNames(statement.body)) bodyLocals.delete(name);
  const condition = optimizeExpression(statement.condition, bodyLocals, counters);
  const body = optimizeStatements(statement.body, bodyLocals, counters);
  for (const name of assignedNames(statement.body)) locals.delete(name);
  return { ...statement, condition, body };
}

/**
 * Optimizes structured statements (switch, iterator-loop, while, do-while).
 *
 * @param statement - Statement to optimize.
 * @param locals - Mutable map of known constant locals.
 * @param counters - Optimization counters accumulator.
 * @returns Optimized statement, or undefined if not a loop or switch.
 */
function optimizeLoopOrSwitchStatement(
  statement: FlintIrStatement,
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): FlintIrStatement | undefined {
  if (statement.kind === 'switch') return optimizeSwitchStatement(statement, locals, counters);
  if (statement.kind === 'iterator-loop' || statement.kind === 'while' || statement.kind === 'do-while')
    return optimizeLoopStatement(statement, locals, counters);
  return undefined;
}

/**
 * Optimizes a block of IR statements, eliminating dead code, folding constants, and inlining optimistic branches.
 *
 * @param statements - Sequence of IR statements.
 * @param locals - Constant propagation environment map.
 * @param counters - Counters tracking eliminated statements and simplified locals.
 * @returns Optimized statement sequence.
 */
function optimizeStatements(
  statements: readonly FlintIrStatement[],
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): readonly FlintIrStatement[] {
  const result: FlintIrStatement[] = [];
  const mutableNames = assignedNames(statements);
  let terminated = false;
  for (const statement of statements) {
    if (terminated) {
      counters.statementsRemoved += 1;
      continue;
    }
    if (statement.kind === 'if') {
      const { statements: branchStatements, terminates } = optimizeIfStatement(statement, locals, counters);
      result.push(...branchStatements);
      if (terminates) terminated = true;
      continue;
    }
    const linear = optimizeLinearStatement(statement, locals, mutableNames, counters);
    if (linear !== undefined) {
      if (linear.statement !== undefined) result.push(linear.statement);
      if (linear.terminates === true) terminated = true;
      continue;
    }
    const structured = optimizeLoopOrSwitchStatement(statement, locals, counters);
    if (structured !== undefined) {
      result.push(structured);
      continue;
    }
  }
  return result;
}

/**
 * Traverses a match expression to collect callee names.
 *
 * @param expression - Match expression to inspect.
 * @param names - Mutable set accumulating callee names.
 */
function calledFunctionsInMatch(expression: Extract<FlintIrExpression, { kind: 'match' }>, names: Set<string>): void {
  calledFunctions(expression.value, names);
  for (const arm of expression.arms) calledFunctions(arm.value, names);
}

/**
 * Traverses an aggregate expression to collect callee names.
 *
 * @param expression - Aggregate expression to inspect.
 * @param names - Mutable set accumulating callee names.
 */
function calledFunctionsInAggregate(expression: FlintIrExpression, names: Set<string>): void {
  switch (expression.kind) {
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) calledFunctions(value, names);
      break;
    }
    case 'enum-value': {
      for (const value of expression.arguments) calledFunctions(value, names);
      break;
    }
    case 'match': {
      calledFunctionsInMatch(expression, names);
      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) calledFunctions(element, names);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Recursively collects all function identifiers called within an IR expression.
 *
 * @param expression - Expression to inspect.
 * @param names - Mutable set accumulating callee names.
 */
function calledFunctions(expression: FlintIrExpression, names: Set<string>): void {
  switch (expression.kind) {
    case 'call': {
      names.add(expression.callee);
      for (const argument of expression.arguments) calledFunctions(argument, names);
      break;
    }
    case 'unary': {
      calledFunctions(expression.operand, names);
      break;
    }
    case 'binary': {
      calledFunctions(expression.left, names);
      calledFunctions(expression.right, names);
      break;
    }
    case 'index': {
      calledFunctions(expression.receiver, names);
      calledFunctions(expression.index, names);
      break;
    }
    default: {
      calledFunctionsInAggregate(expression, names);
      break;
    }
  }
}

/**
 * Collects callee names from linear statements (let, assignment, return, expression-statement, yield).
 *
 * @param statement - Statement to inspect.
 * @param names - Mutable set accumulating callee names.
 * @returns True if handled, false otherwise.
 */
function calledFunctionsInLinearStatement(statement: FlintIrStatement, names: Set<string>): boolean {
  if (statement.kind === 'let' || statement.kind === 'assignment') {
    calledFunctions(statement.value, names);
    return true;
  }
  if (statement.kind === 'return') {
    if (statement.value !== undefined) calledFunctions(statement.value, names);
    return true;
  }
  if (statement.kind === 'expression-statement') {
    calledFunctions(statement.expression, names);
    return true;
  }
  if (statement.kind === 'yield') {
    calledFunctions(statement.value, names);
    return true;
  }
  return false;
}

/**
 * Collects callee names from branching statements (if, switch, match-statement).
 *
 * @param statement - Statement to inspect.
 * @param names - Mutable set accumulating callee names.
 * @returns True if handled, false otherwise.
 */
function calledFunctionsInBranchStatement(statement: FlintIrStatement, names: Set<string>): boolean {
  if (statement.kind === 'if') {
    calledFunctions(statement.condition, names);
    calledFunctionsInStatements(statement.consequent, names);
    if (statement.alternate !== undefined) calledFunctionsInStatements(statement.alternate, names);
    return true;
  }
  if (statement.kind === 'switch') {
    calledFunctions(statement.value, names);
    for (const arm of statement.cases) calledFunctionsInStatements(arm.body, names);
    if (statement.defaultCase !== undefined) calledFunctionsInStatements(statement.defaultCase, names);
    return true;
  }
  if (statement.kind === 'match-statement') {
    calledFunctions(statement.value, names);
    for (const arm of statement.arms) calledFunctions(arm.value, names);
    return true;
  }
  return false;
}

/**
 * Collects callee names from loop statements (while, do-while, iterator-loop).
 *
 * @param statement - Statement to inspect.
 * @param names - Mutable set accumulating callee names.
 */
function calledFunctionsInLoopStatement(statement: FlintIrStatement, names: Set<string>): void {
  if (statement.kind === 'while' || statement.kind === 'do-while') {
    calledFunctions(statement.condition, names);
    calledFunctionsInStatements(statement.body, names);
    return;
  }
  if (statement.kind === 'iterator-loop') {
    calledFunctions(statement.iterator, names);
    calledFunctionsInStatements(statement.body, names);
  }
}

/**
 * Collects callee names from structured control flow statements.
 *
 * @param statement - Statement to inspect.
 * @param names - Mutable set accumulating callee names.
 */
function calledFunctionsInStructuredStatement(statement: FlintIrStatement, names: Set<string>): void {
  if (calledFunctionsInBranchStatement(statement, names)) return;
  calledFunctionsInLoopStatement(statement, names);
}

/**
 * Collects all function identifiers directly called within a statement block.
 *
 * @param statements - Sequence of IR statements.
 * @param names - Mutable set accumulating callee names.
 */
function calledFunctionsInStatements(statements: readonly FlintIrStatement[], names: Set<string>): void {
  for (const statement of statements) {
    if (calledFunctionsInLinearStatement(statement, names)) continue;
    calledFunctionsInStructuredStatement(statement, names);
  }
}

/**
 * Substitutes identifiers in an expression using a parameter replacement map.
 *
 * @param expression - Expression containing identifiers to replace.
 * @param substitutions - Mapping from parameter identifier to argument expression.
 * @returns Rewritten expression with substituted values.
 */
function substituteExpression(
  expression: FlintIrExpression,
  substitutions: ReadonlyMap<string, FlintIrExpression>,
): FlintIrExpression {
  if (expression.kind === 'identifier') {
    const replacement = substitutions.get(expression.name);
    return replacement === undefined ? expression : { ...replacement, span: expression.span };
  }
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => substituteExpression(argument, substitutions)),
    };
  if (expression.kind === 'unary')
    return { ...expression, operand: substituteExpression(expression.operand, substitutions) };
  if (expression.kind === 'binary')
    return {
      ...expression,
      left: substituteExpression(expression.left, substitutions),
      right: substituteExpression(expression.right, substitutions),
    };
  if (expression.kind === 'struct-value')
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [name, substituteExpression(value, substitutions)]),
      ),
    };
  if (expression.kind === 'enum-value')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => substituteExpression(argument, substitutions)),
    };
  if (expression.kind === 'match')
    return {
      ...expression,
      value: substituteExpression(expression.value, substitutions),
      arms: expression.arms.map((arm) => ({ ...arm, value: substituteExpression(arm.value, substitutions) })),
    };
  return expression;
}

/**
 * Counts the total number of references to a specific identifier in an expression tree.
 *
 * @param expression - Expression tree to inspect.
 * @param name - Identifier name to count.
 * @returns Total count of identifier occurrences.
 */
function identifierUses(expression: FlintIrExpression, name: string): number {
  if (expression.kind === 'identifier') return expression.name === name ? 1 : 0;
  if (expression.kind === 'call')
    return expression.arguments.reduce((count, argument) => count + identifierUses(argument, name), 0);
  if (expression.kind === 'unary') return identifierUses(expression.operand, name);
  if (expression.kind === 'binary')
    return identifierUses(expression.left, name) + identifierUses(expression.right, name);
  if (expression.kind === 'struct-value')
    return Object.values(expression.fields).reduce((count, value) => count + identifierUses(value, name), 0);
  if (expression.kind === 'enum-value')
    return expression.arguments.reduce((count, argument) => count + identifierUses(argument, name), 0);
  if (expression.kind === 'match')
    return (
      identifierUses(expression.value, name) +
      expression.arms.reduce((count, arm) => count + identifierUses(arm.value, name), 0)
    );
  return 0;
}

/**
 * Applies a recursive mapping function across all child sub-expressions of an IR expression.
 *
 * @param value - Root expression to traverse.
 * @param visit - Visitor callback to invoke on each sub-expression.
 * @returns Reconstructed expression with mapped children.
 */
function mapSubExpressions(
  value: FlintIrExpression,
  visit: (expr: FlintIrExpression) => FlintIrExpression,
): FlintIrExpression {
  switch (value.kind) {
    case 'call': {
      return { ...value, arguments: value.arguments.map((argument) => visit(argument)) };
    }
    case 'unary': {
      return { ...value, operand: visit(value.operand) };
    }
    case 'binary': {
      return { ...value, left: visit(value.left), right: visit(value.right) };
    }
    case 'struct-value': {
      return {
        ...value,
        fields: Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, visit(field)])),
      };
    }
    case 'enum-value': {
      return { ...value, arguments: value.arguments.map((argument) => visit(argument)) };
    }
    case 'match': {
      return {
        ...value,
        value: visit(value.value),
        arms: value.arms.map((arm) => ({ ...arm, value: visit(arm.value) })),
      };
    }
    default: {
      return value;
    }
  }
}

/**
 * Validates whether a function declaration is eligible for inlining.
 *
 * @param call - Call expression node to potentially inline.
 * @param declaration - Function declaration of the callee.
 * @param purity - Purity lookup table.
 * @param counters - Optimization counters accumulator.
 * @param functionName - Enclosing caller function name.
 * @returns Single return statement if eligible for inlining, otherwise undefined.
 */
function canInlineDeclaration(
  call: Extract<FlintIrExpression, { kind: 'call' }>,
  declaration: FlintIrFunction,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
  functionName: string,
): Extract<FlintIrStatement, { kind: 'return' }> | undefined {
  if (declaration.inlinePolicy === 'noinline') {
    counters.skipped.push({
      transformation: 'inline',
      status: 'skipped',
      functionName,
      span: call.span,
      reason: 'The callee is explicitly marked noinline.',
    });
    return undefined;
  }
  const returnStatement =
    declaration.body.length === 1 && declaration.body[0]?.kind === 'return' ? declaration.body[0] : undefined;
  if (returnStatement?.value === undefined || purity.get(call.callee) !== 'pure') {
    counters.skipped.push({
      transformation: 'inline',
      status: 'skipped',
      functionName,
      span: call.span,
      reason: 'Inlining is restricted to a single pure return expression to preserve effects and ordering.',
    });
    return undefined;
  }
  return returnStatement;
}

/**
 * Builds the parameter-to-argument substitution map for inlining a pure function call.
 *
 * @param call - Call expression node being inlined.
 * @param declaration - Function declaration of the callee.
 * @param returnValue - Callee return value expression.
 * @param purity - Purity lookup table.
 * @param counters - Optimization counters accumulator.
 * @param functionName - Enclosing caller function name.
 * @returns Parameter substitution map or undefined if argument duplication would cause effectful re-evaluation.
 */
function buildInlineSubstitutions(
  call: Extract<FlintIrExpression, { kind: 'call' }>,
  declaration: FlintIrFunction,
  returnValue: FlintIrExpression,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
  functionName: string,
): Map<string, FlintIrExpression> | undefined {
  if (call.arguments.length !== declaration.parameters.length) return undefined;
  const substitutions = new Map<string, FlintIrExpression>();
  for (const [index, parameter] of declaration.parameters.entries()) {
    const argument = call.arguments[index];
    if (argument === undefined) return undefined;
    const uses = identifierUses(returnValue, parameter.name);
    if (uses > 1 && expressionPurity(argument, purity) !== 'pure') {
      counters.skipped.push({
        transformation: 'inline',
        status: 'skipped',
        functionName,
        span: call.span,
        reason: 'Inlining would duplicate an effectful argument.',
      });
      return undefined;
    }
    substitutions.set(parameter.name, argument);
  }
  return substitutions;
}

/**
 * Attempts to inline a call site into a pure function body.
 *
 * @param call - Call expression node to potentially inline.
 * @param declaration - Function declaration of the callee.
 * @param purity - Purity lookup table.
 * @param counters - Optimization counters accumulator.
 * @param functionName - Enclosing caller function name.
 * @returns Inlined expression if eligible, otherwise the original call expression.
 */
function tryInlineCall(
  call: Extract<FlintIrExpression, { kind: 'call' }>,
  declaration: FlintIrFunction,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
  functionName: string,
): FlintIrExpression {
  const returnStatement = canInlineDeclaration(call, declaration, purity, counters, functionName);
  if (returnStatement?.value === undefined) return call;
  const substitutions = buildInlineSubstitutions(
    call,
    declaration,
    returnStatement.value,
    purity,
    counters,
    functionName,
  );
  if (substitutions === undefined) return call;
  const inlined = substituteExpression(returnStatement.value, substitutions);
  counters.functionsInlined += 1;
  counters.applied.push({
    transformation: 'inline',
    status: 'applied',
    functionName,
    span: call.span,
    reason: `Inlined the pure function '${call.callee}'.`,
  });
  return { ...inlined, span: call.span, ...(inlined.kind === 'call' ? { inlinedFrom: call.callee } : {}) };
}

/**
 * Recursively rewrites pure call expressions in an expression by inlining their bodies.
 *
 * @param expression - Expression to optimize via inlining.
 * @param functions - Available module functions.
 * @param purity - Purity classifications.
 * @param counters - Inlining metric counters.
 * @param functionName - Enclosing caller function name.
 * @returns Expression with eligible calls inlined.
 */
function inlineExpression(
  expression: FlintIrExpression,
  functions: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
  functionName: string,
): FlintIrExpression {
  const visit = (value: FlintIrExpression): FlintIrExpression => {
    const nested = mapSubExpressions(value, visit);
    if (nested.kind !== 'call') return nested;
    const declaration = functions.get(nested.callee);
    if (declaration === undefined) return nested;
    return tryInlineCall(nested, declaration, purity, counters, functionName);
  };
  return visit(expression);
}

/**
 * Transforms an iterator-loop statement, unrolling zero-bound iterations or recursing into children.
 *
 * @param statement - Iterator-loop statement.
 * @param declaration - Enclosing function declaration.
 * @param functions - Known module functions.
 * @param purity - Function purity classifications.
 * @param counters - Optimization counters accumulator.
 * @returns Array of transformed statements (empty array if unrolled).
 */
function transformIteratorLoopStatement(
  statement: Extract<FlintIrStatement, { kind: 'iterator-loop' }>,
  declaration: FlintIrFunction,
  functions: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
): readonly FlintIrStatement[] {
  if (statement.boundedLength === 0) {
    counters.iteratorUnrolled += 1;
    counters.applied.push({
      transformation: 'iterator-unroll',
      status: 'applied',
      functionName: declaration.name,
      span: statement.span,
      reason: 'Removed an iterator loop with a proven zero-length bound.',
    });
    return [];
  }
  counters.skipped.push({
    transformation: 'iterator-unroll',
    status: 'skipped',
    functionName: declaration.name,
    span: statement.span,
    reason:
      statement.boundedLength === undefined
        ? 'Iterator length is not statically bounded.'
        : 'The proven bound is not safe to unroll without duplicating resumable state.',
  });
  return [
    {
      ...statement,
      iterator: inlineExpression(statement.iterator, functions, purity, counters, declaration.name),
      body: transformStatements(statement.body, declaration, functions, purity, counters),
    },
  ];
}

/**
 * Transforms loop and branch statements during inlining pass.
 *
 * @param statement - Statement to transform.
 * @param declaration - Enclosing function declaration.
 * @param functions - Known module functions.
 * @param purity - Function purity classifications.
 * @param counters - Optimization counters accumulator.
 * @returns Array of transformed statements, or undefined if not a loop or branch.
 */
function transformLoopOrBranchStatement(
  statement: FlintIrStatement,
  declaration: FlintIrFunction,
  functions: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
): readonly FlintIrStatement[] | undefined {
  if (statement.kind === 'iterator-loop') {
    return transformIteratorLoopStatement(statement, declaration, functions, purity, counters);
  }
  if (statement.kind === 'if')
    return [
      {
        ...statement,
        condition: inlineExpression(statement.condition, functions, purity, counters, declaration.name),
        consequent: transformStatements(statement.consequent, declaration, functions, purity, counters),
        ...(statement.alternate === undefined
          ? {}
          : { alternate: transformStatements(statement.alternate, declaration, functions, purity, counters) }),
      },
    ];
  if (statement.kind === 'while' || statement.kind === 'do-while')
    return [
      {
        ...statement,
        condition: inlineExpression(statement.condition, functions, purity, counters, declaration.name),
        body: transformStatements(statement.body, declaration, functions, purity, counters),
      },
    ];
  return undefined;
}

/**
 * Transforms simple leaf statements (let, assignment, return, expression-statement, yield, match).
 *
 * @param statement - Statement to transform.
 * @param declaration - Enclosing function declaration.
 * @param functions - Known module functions.
 * @param purity - Function purity classifications.
 * @param counters - Optimization counters accumulator.
 * @returns Array of transformed statements.
 */
function transformSimpleStatement(
  statement: FlintIrStatement,
  declaration: FlintIrFunction,
  functions: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
): readonly FlintIrStatement[] {
  if (statement.kind === 'let' || statement.kind === 'assignment' || statement.kind === 'yield')
    return [{ ...statement, value: inlineExpression(statement.value, functions, purity, counters, declaration.name) }];
  if (statement.kind === 'return')
    return [
      {
        ...statement,
        ...(statement.value === undefined
          ? {}
          : { value: inlineExpression(statement.value, functions, purity, counters, declaration.name) }),
      },
    ];
  if (statement.kind === 'expression-statement')
    return [
      {
        ...statement,
        expression: inlineExpression(statement.expression, functions, purity, counters, declaration.name),
      },
    ];
  if (statement.kind === 'match-statement')
    return [
      {
        ...statement,
        value: inlineExpression(statement.value, functions, purity, counters, declaration.name),
        arms: statement.arms.map((arm) => ({
          ...arm,
          value: inlineExpression(arm.value, functions, purity, counters, declaration.name),
        })),
      },
    ];
  return [statement];
}

/**
 * Transforms a single statement by performing expression inlining and iterator unrolling.
 *
 * @param statement - Statement to transform.
 * @param declaration - Enclosing function declaration.
 * @param functions - Known module functions.
 * @param purity - Function purity classifications.
 * @param counters - Optimization counters accumulator.
 * @returns Array of transformed statements.
 */
function transformStatement(
  statement: FlintIrStatement,
  declaration: FlintIrFunction,
  functions: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
): readonly FlintIrStatement[] {
  const loopOrBranch = transformLoopOrBranchStatement(statement, declaration, functions, purity, counters);
  if (loopOrBranch !== undefined) return loopOrBranch;
  return transformSimpleStatement(statement, declaration, functions, purity, counters);
}

/**
 * Walks statements applying iterator loop unrolling and function call inlining.
 *
 * @param statements - Sequence of IR statements to transform.
 * @param declaration - Enclosing function declaration.
 * @param functions - Available module functions.
 * @param purity - Purity classifications.
 * @param counters - Optimization counters accumulator.
 * @returns Transformed statement list.
 */
function transformStatements(
  statements: readonly FlintIrStatement[],
  declaration: FlintIrFunction,
  functions: ReadonlyMap<string, FlintIrFunction>,
  purity: ReadonlyMap<string, FlintIrPurity>,
  counters: OptimizationCounters,
): readonly FlintIrStatement[] {
  return statements.flatMap((statement) => transformStatement(statement, declaration, functions, purity, counters));
}

/**
 * Checks and annotates a return statement if it represents a tail call.
 *
 * @param statement - Return statement node.
 * @param functions - Available module functions.
 * @param counters - Metric counters.
 * @param functionName - Enclosing caller function name.
 * @returns Annotated statement or undefined if not a tail call.
 */
function tryAnnotateReturnTailCall(
  statement: Extract<FlintIrStatement, { kind: 'return' }>,
  functions: ReadonlyMap<string, FlintIrFunction>,
  counters: OptimizationCounters,
  functionName: string,
): FlintIrStatement | undefined {
  if (statement.value?.kind === 'call' && functions.has(statement.value.callee)) {
    counters.tailCallsDetected += 1;
    counters.featureRequirements.add('tail-call');
    counters.applied.push({
      transformation: 'tail-call',
      status: 'applied',
      functionName,
      span: statement.span,
      reason: `Call to '${statement.value.callee}' is in tail position.`,
    });
    return { ...statement, value: { ...statement.value, tailPosition: true } };
  }
  return undefined;
}

/**
 * Checks and tags a statement if it represents a tail call, or recurses into branches.
 *
 * @param statement - Statement to inspect.
 * @param functions - Available module functions.
 * @param counters - Metric counters.
 * @param functionName - Enclosing caller function name.
 * @returns Statement with tail calls annotated.
 */
function annotateTailCallInStatement(
  statement: FlintIrStatement,
  functions: ReadonlyMap<string, FlintIrFunction>,
  counters: OptimizationCounters,
  functionName: string,
): FlintIrStatement {
  if (statement.kind === 'return') {
    const annotated = tryAnnotateReturnTailCall(statement, functions, counters, functionName);
    return annotated ?? statement;
  }
  if (statement.kind === 'if')
    return {
      ...statement,
      consequent: annotateTailCalls(statement.consequent, functions, counters, functionName),
      ...(statement.alternate === undefined
        ? {}
        : { alternate: annotateTailCalls(statement.alternate, functions, counters, functionName) }),
    };
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop')
    return { ...statement, body: annotateTailCalls(statement.body, functions, counters, functionName) };
  return statement;
}

/**
 * Identifies return statements that call known functions in tail position and tags them.
 *
 * @param statements - Statement sequence to inspect.
 * @param functions - Available module functions.
 * @param counters - Metric counters.
 * @param functionName - Enclosing caller function name.
 * @returns Statement list with tail calls annotated.
 */
function annotateTailCalls(
  statements: readonly FlintIrStatement[],
  functions: ReadonlyMap<string, FlintIrFunction>,
  counters: OptimizationCounters,
  functionName: string,
): readonly FlintIrStatement[] {
  return statements.map((statement) => annotateTailCallInStatement(statement, functions, counters, functionName));
}

/**
 * Traverses reachable functions and expands the reachable set based on function calls.
 *
 * @param byName - Map of functions by name.
 * @param reachable - Mutable set of reachable function names.
 */
function expandReachableFunctions(byName: ReadonlyMap<string, FlintIrFunction>, reachable: Set<string>): void {
  const pending = [...reachable];
  while (pending.length > 0) {
    const name = pending.pop();
    if (name === undefined) continue;
    const declaration = byName.get(name);
    if (declaration === undefined) continue;
    const calls = new Set<string>();
    calledFunctionsInStatements(declaration.body, calls);
    for (const called of calls)
      if (byName.has(called) && !reachable.has(called)) {
        reachable.add(called);
        pending.push(called);
      }
  }
}

/**
 * Eliminates unreferenced non-exported functions from the IR module call graph.
 *
 * @param module - IR module to prune.
 * @param minimumReachable - Function names that must be preserved even if not exported.
 * @returns Pruned module, count of removed functions, and sorted reachable names.
 */
function pruneFunctions(
  module: FlintIrModule,
  minimumReachable: readonly string[] = [],
): {
  module: FlintIrModule;
  removed: number;
  reachable: readonly string[];
} {
  const byName = new Map(module.functions.map((declaration) => [declaration.name, declaration]));
  const reachable = new Set(module.functions.filter(({ exported }) => exported).map(({ name }) => name));
  for (const name of minimumReachable) if (byName.has(name)) reachable.add(name);
  expandReachableFunctions(byName, reachable);
  const functions = module.functions.filter(({ name }) => reachable.has(name));
  return {
    module: { ...module, functions },
    removed: module.functions.length - functions.length,
    reachable: [...reachable].toSorted(),
  };
}

/**
 * Optimizes a Flint IR module using dead-code elimination, inlining, and constant folding.
 *
 * @param input - Unoptimized IR module.
 * @param mode - Optimization mode: 'debug' retains debug spans and disables folding, 'release' applies all passes.
 * @returns Optimization result containing the lowered AST module, IR module, and pass metrics.
 */
export function optimizeFlintIr(input: FlintIrModule, mode: 'debug' | 'release' = 'release'): FlintOptimizationResult {
  const before = countFlintIr(input);
  const analysis = analyzeFunctions(input);
  const analyzedInput: FlintIrModule = {
    ...input,
    functions: input.functions.map((declaration) => ({
      ...declaration,
      ...(analysis.analyses.get(declaration.name) === undefined
        ? {}
        : { analysis: analysis.analyses.get(declaration.name) }),
    })),
  };
  if (mode === 'debug')
    return {
      module: lowerFlintIrToModule(analyzedInput),
      ir: analyzedInput,
      report: {
        mode,
        passes: [],
        before,
        after: before,
        constantsFolded: 0,
        localsSimplified: 0,
        statementsRemoved: 0,
        functionsRemoved: 0,
        reachableFunctions: input.functions.map(({ name }) => name).toSorted(),
        appliedTransformations: [],
        skippedTransformations: [],
        featureRequirements: [],
        iteratorUnrolled: 0,
        functionsInlined: 0,
        tailCallsDetected: 0,
        optimisticBranches: 0,
        pureFunctions: [...analysis.purity]
          .filter(([, purity]) => purity === 'pure')
          .map(([name]) => name)
          .toSorted(),
        effectfulFunctions: [...analysis.purity]
          .filter(([, purity]) => purity !== 'pure')
          .map(([name]) => name)
          .toSorted(),
      },
    };
  const counters: OptimizationCounters = {
    constantsFolded: 0,
    localsSimplified: 0,
    statementsRemoved: 0,
    iteratorUnrolled: 0,
    functionsInlined: 0,
    tailCallsDetected: 0,
    optimisticBranches: 0,
    applied: [],
    skipped: [],
    featureRequirements: new Set(),
  };
  const functions = new Map(analyzedInput.functions.map((declaration) => [declaration.name, declaration]));
  const initialReachability = pruneFunctions(analyzedInput).reachable;
  const transformed: FlintIrModule = {
    ...analyzedInput,
    functions: analyzedInput.functions.map((declaration) => ({
      ...declaration,
      body: annotateTailCalls(
        transformStatements(
          optimizeStatements(declaration.body, new Map(), counters),
          declaration,
          functions,
          analysis.purity,
          counters,
        ),
        functions,
        counters,
        declaration.name,
      ),
    })),
  };
  const pruned = pruneFunctions(transformed, initialReachability);
  const after = countFlintIr(pruned.module);
  return {
    module: lowerFlintIrToModule(pruned.module),
    ir: pruned.module,
    report: {
      mode,
      passes: [
        'call-graph-analysis',
        'purity-analysis',
        'iterator-analysis',
        'constant-folding',
        'local-simplification',
        'dead-code-elimination',
        'bounded-iterator-unrolling',
        'inlining',
        'tail-call-analysis',
        'optimistic-conditional-analysis',
        'reachability-pruning',
      ],
      before,
      after,
      constantsFolded: counters.constantsFolded,
      localsSimplified: counters.localsSimplified,
      statementsRemoved: counters.statementsRemoved,
      functionsRemoved: pruned.removed,
      reachableFunctions: pruned.reachable,
      appliedTransformations: counters.applied,
      skippedTransformations: counters.skipped,
      featureRequirements: [...counters.featureRequirements].toSorted(),
      iteratorUnrolled: counters.iteratorUnrolled,
      functionsInlined: counters.functionsInlined,
      tailCallsDetected: counters.tailCallsDetected,
      optimisticBranches: counters.optimisticBranches,
      pureFunctions: [...analysis.purity]
        .filter(([, purity]) => purity === 'pure')
        .map(([name]) => name)
        .toSorted(),
      effectfulFunctions: [...analysis.purity]
        .filter(([, purity]) => purity !== 'pure')
        .map(([name]) => name)
        .toSorted(),
    },
  };
}

/**
 * Optimizes an AST module by lowering to IR, running optimization passes, and lifting back to AST.
 *
 * @param module - AST module to optimize.
 * @param mode - Optimization mode: 'debug' or 'release'.
 * @returns Optimization result with transformed AST, IR, and pass report.
 */
export function optimizeFlintModule(
  module: FlintModule,
  mode: 'debug' | 'release' = 'release',
): FlintOptimizationResult {
  return optimizeFlintIr(lowerFlintToIr(module), mode);
}
