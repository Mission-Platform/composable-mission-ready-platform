import { countFlintIr } from '../ir.js';

import type { FlintFrontendResult } from '../contracts.js';
import type { FlintIrExpression, FlintIrStatement, FlintIrModule } from '../ir.js';
import type { FlintSoNBoundsChecks } from '../son-ir.js';
import type {
  FlintAnalysisArrayBoundsFact,
  FlintAnalysisFacts,
  FlintAnalysisInterval,
  FlintAnalysisOwnershipFact,
  FlintAnalysisPointerRangeFact,
  FlintAnalysisSwitchCoverageFact,
} from './contracts.js';

/**
 * Returns the optional value expression carried by return or yield statements.
 *
 * @param statement - Return or yield IR statement.
 * @returns Singleton array containing the value, or an empty array when absent.
 */
function optionalValueExpression(
  statement: Extract<FlintIrStatement, { kind: 'return' | 'yield' }>,
): FlintIrExpression[] {
  return statement.value === undefined ? [] : [statement.value];
}

/**
 * Extracts expressions from binding statements.
 *
 * @param statement - IR statement to inspect.
 * @returns Binding value expressions, or undefined when not a binding statement.
 */
function expressionsFromBinding(statement: FlintIrStatement): FlintIrExpression[] | undefined {
  if (statement.kind === 'let' || statement.kind === 'assignment') return [statement.value];
  return undefined;
}

/**
 * Extracts expressions from return/yield statements.
 *
 * @param statement - IR statement to inspect.
 * @returns Optional value expressions, or undefined when not a return/yield.
 */
function expressionsFromReturnOrYield(statement: FlintIrStatement): FlintIrExpression[] | undefined {
  if (statement.kind === 'return' || statement.kind === 'yield') return optionalValueExpression(statement);
  return undefined;
}

/**
 * Extracts expressions from condition-bearing statements.
 *
 * @param statement - IR statement to inspect.
 * @returns Condition expressions, or undefined when not a conditional statement.
 */
function expressionsFromCondition(statement: FlintIrStatement): FlintIrExpression[] | undefined {
  if (statement.kind === 'if' || statement.kind === 'while' || statement.kind === 'do-while') {
    return [statement.condition];
  }
  return undefined;
}

/**
 * Extracts expressions from switch/match statements.
 *
 * @param statement - IR statement to inspect.
 * @returns Scrutinee expressions, or undefined when not a switch/match.
 */
function expressionsFromSwitchOrMatch(statement: FlintIrStatement): FlintIrExpression[] | undefined {
  if (statement.kind === 'switch' || statement.kind === 'match-statement') return [statement.value];
  return undefined;
}

/**
 * Extracts immediate constituent expressions directly evaluated by a statement.
 *
 * @param statement - IR statement to inspect.
 * @returns Array of immediate IR expressions evaluated by the statement.
 */
function expressionsOf(statement: FlintIrStatement): FlintIrExpression[] {
  const fromBinding = expressionsFromBinding(statement);
  if (fromBinding !== undefined) return fromBinding;
  const fromReturn = expressionsFromReturnOrYield(statement);
  if (fromReturn !== undefined) return fromReturn;
  if (statement.kind === 'expression-statement') return [statement.expression];
  const fromCondition = expressionsFromCondition(statement);
  if (fromCondition !== undefined) return fromCondition;
  const fromSwitch = expressionsFromSwitchOrMatch(statement);
  if (fromSwitch !== undefined) return fromSwitch;
  if (statement.kind === 'iterator-loop') return [statement.iterator];
  return [];
}

/**
 * Recursively visits child expressions for call, binary, unary, and index nodes.
 *
 * @param expression - Parent expression whose children should be visited.
 * @param visit - Visitor callback invoked on each nested expression.
 */
function visitSimpleChildren(expression: FlintIrExpression, visit: (expression: FlintIrExpression) => void): void {
  if (expression.kind === 'call') {
    for (const argument of expression.arguments) visitExpression(argument, visit);
    return;
  }
  if (expression.kind === 'binary') {
    visitExpression(expression.left, visit);
    visitExpression(expression.right, visit);
    return;
  }
  if (expression.kind === 'unary') {
    visitExpression(expression.operand, visit);
    return;
  }
  if (expression.kind === 'index') {
    visitExpression(expression.receiver, visit);
    visitExpression(expression.index, visit);
  }
}

/**
 * Recursively visits child expressions for match arms and collection literals.
 *
 * @param expression - Parent expression whose children should be visited.
 * @param visit - Visitor callback invoked on each nested expression.
 */
function visitMatchOrLiteralChildren(
  expression: FlintIrExpression,
  visit: (expression: FlintIrExpression) => void,
): void {
  if (expression.kind === 'match') {
    visitExpression(expression.value, visit);
    for (const arm of expression.arms) visitExpression(arm.value, visit);
    return;
  }
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') {
    for (const element of expression.elements) visitExpression(element, visit);
  }
}

/**
 * Recursively visits child expressions for composite value and match nodes.
 *
 * @param expression - Parent expression whose children should be visited.
 * @param visit - Visitor callback invoked on each nested expression.
 */
function visitCompositeChildren(expression: FlintIrExpression, visit: (expression: FlintIrExpression) => void): void {
  if (expression.kind === 'struct-value') {
    for (const field of Object.values(expression.fields)) visitExpression(field, visit);
    return;
  }
  if (expression.kind === 'enum-value') {
    for (const argument of expression.arguments) visitExpression(argument, visit);
    return;
  }
  visitMatchOrLiteralChildren(expression, visit);
}

/**
 * Traverses an IR expression tree in pre-order, invoking a visitor callback for each node.
 *
 * @param expression - Root IR expression to traverse.
 * @param visit - Visitor callback invoked on the expression and all child subexpressions.
 */
function visitExpression(expression: FlintIrExpression, visit: (expression: FlintIrExpression) => void): void {
  visit(expression);
  visitSimpleChildren(expression, visit);
  visitCompositeChildren(expression, visit);
}

/**
 * Visits nested blocks inside switch and match statements.
 *
 * @param statement - Switch or match statement.
 * @param visit - Visitor callback invoked on nested statements.
 */
function visitSwitchOrMatchBlocks(statement: FlintIrStatement, visit: (statement: FlintIrStatement) => void): void {
  if (statement.kind === 'switch') {
    for (const { body } of statement.cases) visitStatements(body, visit);
    if (statement.defaultCase !== undefined) visitStatements(statement.defaultCase, visit);
    return;
  }
  if (statement.kind === 'match-statement') {
    for (const { value } of statement.arms) {
      visitExpression(value, () => {
        // Traverse match arm expression without actions.
      });
    }
  }
}

/**
 * Visits nested statement blocks for branching and looping constructs.
 *
 * @param statement - Statement that may contain nested blocks.
 * @param visit - Visitor callback invoked on nested statements.
 */
function visitNestedStatementBlocks(statement: FlintIrStatement, visit: (statement: FlintIrStatement) => void): void {
  if (statement.kind === 'if') {
    visitStatements(statement.consequent, visit);
    if (statement.alternate !== undefined) visitStatements(statement.alternate, visit);
    return;
  }
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') {
    visitStatements(statement.body, visit);
    return;
  }
  visitSwitchOrMatchBlocks(statement, visit);
}

/**
 * Recursively visits all IR statements in a sequence, traversing nested blocks and branches.
 *
 * @param statements - Sequence of IR statements to traverse.
 * @param visit - Visitor callback invoked on each statement visited.
 */
function visitStatements(statements: readonly FlintIrStatement[], visit: (statement: FlintIrStatement) => void): void {
  for (const statement of statements) {
    visit(statement);
    visitNestedStatementBlocks(statement, visit);
  }
}

/**
 * Infers an interval range for an expression based on literal values and known constant bindings.
 *
 * @param expression - IR expression to evaluate for numeric bounds.
 * @param constantsByName - Map of known compile-time constant identifiers to numeric values.
 * @returns Interval representing minimum and maximum possible values.
 */
function interval(
  expression: FlintIrExpression,
  constantsByName: Readonly<Record<string, number>>,
): FlintAnalysisInterval {
  if (expression.kind === 'literal' && typeof expression.value === 'number')
    return { min: expression.value, max: expression.value, source: 'constant' };
  if (expression.kind === 'identifier' && constantsByName[expression.name] !== undefined)
    return { min: constantsByName[expression.name], max: constantsByName[expression.name], source: 'constant' };
  return { source: 'unknown' };
}

/**
 * Returns the fixed literal length of an array or vector literal receiver, if statically known.
 *
 * @param expression - Receiver expression being indexed.
 * @returns Number of literal elements, or undefined if receiver length is dynamic.
 */
function receiverLength(expression: FlintIrExpression): number | undefined {
  return expression.kind === 'array-literal' || expression.kind === 'vector-literal'
    ? expression.elements.length
    : undefined;
}

/**
 * Returns true when a known receiver length fully contains the index interval.
 *
 * @param index - Inferred numeric interval for the index operand.
 * @param length - Statically known receiver length.
 * @returns True when the access is proven in-bounds.
 */
function isProvenSafeIndex(index: FlintAnalysisInterval, length: number): boolean {
  return index.min !== undefined && index.max !== undefined && index.min >= 0 && index.max < length;
}

/**
 * Returns true when a known receiver length proves the index interval is invalid.
 *
 * @param index - Inferred numeric interval for the index operand.
 * @param length - Statically known receiver length.
 * @returns True when the access is proven out of range.
 */
function isOutOfRangeIndex(index: FlintAnalysisInterval, length: number): boolean {
  return (index.min !== undefined && index.min < 0) || (index.max !== undefined && index.max >= length);
}

/**
 * Classifies an index expression's bounds status from interval and receiver metadata.
 *
 * @param expression - Index expression under analysis.
 * @param index - Inferred numeric interval for the index operand.
 * @param length - Optional statically known receiver length.
 * @returns Bounds status label for the access site.
 */
function classifyIndexStatus(
  expression: Extract<FlintIrExpression, { kind: 'index' }>,
  index: FlintAnalysisInterval,
  length: number | undefined,
): FlintAnalysisArrayBoundsFact['status'] {
  if (length !== undefined && isProvenSafeIndex(index, length)) return 'proven-safe';
  if (length !== undefined && isOutOfRangeIndex(index, length)) return 'out-of-range';
  if (expression.boundsCheck === 'proven-safe') return 'proven-safe';
  if (expression.boundsCheck === 'required') return 'runtime-checked';
  return 'unknown';
}

/**
 * Collects array bounds facts for index expressions nested under one statement.
 *
 * @param statement - Statement whose expressions should be inspected.
 * @param functionName - Owning function name recorded on each fact.
 * @param knownConstants - Map of known constant identifiers to numeric values.
 * @param facts - Mutable collection receiving discovered bounds facts.
 */
function collectIndexBoundsFacts(
  statement: FlintIrStatement,
  functionName: string,
  knownConstants: Readonly<Record<string, number>>,
  facts: FlintAnalysisArrayBoundsFact[],
): void {
  for (const root of expressionsOf(statement)) {
    visitExpression(root, (expression) => {
      if (expression.kind !== 'index') return;
      const index = interval(expression.index, knownConstants);
      const length = receiverLength(expression.receiver);
      facts.push({
        functionName,
        receiver: expression.receiver.kind === 'identifier' ? expression.receiver.name : expression.receiver.kind,
        index,
        ...(length === undefined ? {} : { length }),
        status: classifyIndexStatus(expression, index, length),
        span: expression.span,
      });
    });
  }
}

/**
 * Analyzes indexing operations in a function to derive array bounds checking facts.
 * Determines whether each array access is proven safe, out-of-range, or requires runtime check.
 *
 * @param module - Module IR containing function declarations.
 * @param functionName - Name of the function to analyze.
 * @param knownConstants - Map of known constant identifiers to numeric values.
 * @returns Array of array bounds analysis facts for each index expression.
 */
function boundsFacts(
  module: FlintIrModule,
  functionName: string,
  knownConstants: Readonly<Record<string, number>>,
): FlintAnalysisArrayBoundsFact[] {
  const declaration = module.functions.find(({ name }) => name === functionName);
  const facts: FlintAnalysisArrayBoundsFact[] = [];
  for (const statement of declaration?.body ?? []) {
    visitStatements([statement], (current) => {
      collectIndexBoundsFacts(current, functionName, knownConstants, facts);
    });
  }
  return facts;
}

/**
 * Inspects memory subsystem calls within a function to extract pointer access range facts.
 *
 * @param module - Module IR containing function declarations.
 * @param functionName - Name of the function to analyze.
 * @param knownConstants - Map of known constant identifiers to numeric values.
 * @returns Array of pointer range analysis facts.
 */
function pointerFacts(
  module: FlintIrModule,
  functionName: string,
  knownConstants: Readonly<Record<string, number>>,
): FlintAnalysisPointerRangeFact[] {
  const declaration = module.functions.find(({ name }) => name === functionName);
  const facts: FlintAnalysisPointerRangeFact[] = [];
  for (const statement of declaration?.body ?? []) {
    for (const root of expressionsOf(statement))
      visitExpression(root, (expression) => {
        if (
          expression.kind !== 'call' ||
          typeof expression.standardLibrary !== 'string' ||
          !expression.standardLibrary.startsWith('memory-')
        )
          return;
        const pointer = expression.arguments[0];
        if (pointer === undefined) return;
        const range = interval(pointer, knownConstants);
        facts.push({
          functionName,
          pointer: pointer.kind === 'identifier' ? pointer.name : pointer.kind,
          range,
          checked: true,
          span: expression.span,
        });
      });
  }
  return facts;
}

/**
 * Extracts switch statement coverage facts, checking case counts, duplicates, and default clauses.
 *
 * @param module - Module IR containing function declarations.
 * @param functionName - Name of the function to analyze.
 * @returns Array of switch coverage facts for all switch statements in the function.
 */
function switchFacts(module: FlintIrModule, functionName: string): FlintAnalysisSwitchCoverageFact[] {
  const declaration = module.functions.find(({ name }) => name === functionName);
  const facts: FlintAnalysisSwitchCoverageFact[] = [];
  visitStatements(declaration?.body ?? [], (statement) => {
    if (statement.kind !== 'switch') return;
    const values = statement.cases.map(({ value }) => value);
    const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
    facts.push({
      functionName,
      caseCount: values.length,
      hasDefault: statement.defaultCase !== undefined,
      values,
      duplicateValues: [...new Set(duplicates)],
      span: statement.span,
    });
  });
  return facts;
}

/**
 * Determines whether an if statement nests a loop in either branch.
 *
 * @param statement - If statement to inspect.
 * @returns True when either branch contains a loop.
 */
function ifStatementHasLoop(statement: Extract<FlintIrStatement, { kind: 'if' }>): boolean {
  if (hasLoop(statement.consequent)) return true;
  return statement.alternate !== undefined && hasLoop(statement.alternate);
}

/**
 * Determines whether a switch statement nests a loop in any arm.
 *
 * @param statement - Switch statement to inspect.
 * @returns True when any case or default arm contains a loop.
 */
function switchStatementHasLoop(statement: Extract<FlintIrStatement, { kind: 'switch' }>): boolean {
  if (statement.cases.some(({ body }) => hasLoop(body))) return true;
  return statement.defaultCase !== undefined && hasLoop(statement.defaultCase);
}

/**
 * Determines whether a single statement introduces or nests a loop construct.
 *
 * @param statement - IR statement to inspect.
 * @returns True when the statement contains a loop.
 */
function statementHasLoop(statement: FlintIrStatement): boolean {
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') return true;
  if (statement.kind === 'if') return ifStatementHasLoop(statement);
  if (statement.kind === 'switch') return switchStatementHasLoop(statement);
  if (statement.kind === 'match-statement') {
    return statement.arms.some(({ value }) => value.kind === 'call' && value.callee === 'loop');
  }
  return false;
}

/**
 * Recursively checks whether any loop constructs (while, do-while, iterator-loop) exist in statements.
 *
 * @param statements - Sequence of IR statements to inspect.
 * @returns True if at least one loop construct is present.
 */
function hasLoop(statements: readonly FlintIrStatement[]): boolean {
  return statements.some((statement) => statementHasLoop(statement));
}

/**
 * Counts nested loops within an if statement, including both branches.
 *
 * @param statement - If statement whose nested blocks should be counted.
 * @returns Total nested loop count under the if statement.
 */
function loopCountInIf(statement: Extract<FlintIrStatement, { kind: 'if' }>): number {
  const alternateCount = statement.alternate === undefined ? 0 : loopCount(statement.alternate);
  return loopCount(statement.consequent) + alternateCount;
}

/**
 * Counts nested loops within a switch statement, including the default arm.
 *
 * @param statement - Switch statement whose nested blocks should be counted.
 * @returns Total nested loop count under the switch statement.
 */
function loopCountInSwitch(statement: Extract<FlintIrStatement, { kind: 'switch' }>): number {
  let count = 0;
  for (const arm of statement.cases) count += loopCount(arm.body);
  if (statement.defaultCase !== undefined) count += loopCount(statement.defaultCase);
  return count;
}

/**
 * Counts the total number of nested loop constructs present in a sequence of IR statements.
 *
 * @param statements - Sequence of IR statements to inspect.
 * @returns Total count of loop statements.
 */
function loopCount(statements: readonly FlintIrStatement[]): number {
  let count = 0;
  for (const statement of statements) {
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') count += 1;
    if (statement.kind === 'if') count += loopCountInIf(statement);
    if (statement.kind === 'switch') count += loopCountInSwitch(statement);
  }
  return count;
}

/**
 * Evaluates a binary arithmetic expression when both operands are known constants.
 *
 * @param operator - Binary operator token.
 * @param left - Evaluated left-hand numeric operand.
 * @param right - Evaluated right-hand numeric operand.
 * @returns Computed numeric result, or undefined when the operator is unsupported.
 */
function evaluateBinaryConstant(operator: string, left: number, right: number): number | undefined {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '*') return left * right;
  if (operator === '/' && right !== 0) return left / right;
  if (operator === '%' && right !== 0) return left % right;
  return undefined;
}

/**
 * Fold-evaluates an IR expression against the current local constant environment.
 *
 * @param expression - Expression to evaluate.
 * @param locals - Mutable map of local bindings already proven constant.
 * @returns Numeric value when statically known, otherwise undefined.
 */
function evaluateConstantExpression(
  expression: FlintIrExpression,
  locals: Readonly<Record<string, number>>,
): number | undefined {
  if (expression.kind === 'literal' && typeof expression.value === 'number') return expression.value;
  if (expression.kind === 'identifier') return locals[expression.name];
  if (expression.kind !== 'binary') return undefined;
  const left = evaluateConstantExpression(expression.left, locals);
  const right = evaluateConstantExpression(expression.right, locals);
  if (left === undefined || right === undefined) return undefined;
  return evaluateBinaryConstant(expression.operator, left, right);
}

/**
 * Records nested numeric literals discovered while walking an expression tree.
 *
 * @param expression - Expression tree to inspect for literal leaves.
 * @param result - Mutable map receiving discovered literal constants.
 */
function collectLiteralConstants(expression: FlintIrExpression, result: Record<string, number>): void {
  if (expression.kind === 'literal' && typeof expression.value === 'number') {
    result[`literal:${Object.keys(result).length}`] = expression.value;
  }
  if (expression.kind === 'call') {
    for (const argument of expression.arguments) collectLiteralConstants(argument, result);
  }
  if (expression.kind === 'binary') {
    collectLiteralConstants(expression.left, result);
    collectLiteralConstants(expression.right, result);
  }
  if (expression.kind === 'unary') collectLiteralConstants(expression.operand, result);
  if (expression.kind === 'index') {
    collectLiteralConstants(expression.receiver, result);
    collectLiteralConstants(expression.index, result);
  }
}

/**
 * Applies let or assignment constant updates into the local and result maps.
 *
 * @param statement - Let or assignment statement providing a candidate constant.
 * @param locals - Mutable local constant environment.
 * @param result - Mutable exported constant map.
 */
function bindStatementConstant(
  statement: Extract<FlintIrStatement, { kind: 'let' | 'assignment' }>,
  locals: Record<string, number>,
  result: Record<string, number>,
): void {
  collectLiteralConstants(statement.value, result);
  const value = evaluateConstantExpression(statement.value, locals);
  if (value === undefined) {
    if (statement.kind === 'assignment') Reflect.deleteProperty(locals, statement.name);
    return;
  }
  locals[statement.name] = value;
  result[statement.name] = value;
}

/**
 * Evaluates compile-time constant bindings and literal values in a function.
 * Tracks numeric bindings through let/assignment statements and arithmetic operations.
 *
 * @param module - Module IR containing function declarations.
 * @param functionName - Name of the function to inspect.
 * @returns Map of variable and literal names to known numeric constant values.
 */
function constants(module: FlintIrModule, functionName: string): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  const locals: Record<string, number> = {};
  const declaration = module.functions.find(({ name }) => name === functionName);
  for (const statement of declaration?.body ?? []) {
    if (statement.kind === 'let' || statement.kind === 'assignment') {
      bindStatementConstant(statement, locals, result);
      continue;
    }
    if (statement.kind === 'return' && statement.value !== undefined) {
      collectLiteralConstants(statement.value, result);
    }
  }
  return result;
}

/**
 * Creates an empty analysis facts structure used when IR is unavailable.
 *
 * @param boundsChecks - Active bounds checking mode recorded on optimization facts.
 * @returns Empty FlintAnalysisFacts instance.
 */
function emptyAnalysisFacts(boundsChecks: FlintSoNBoundsChecks): FlintAnalysisFacts {
  return {
    callGraph: [],
    controlFlow: [],
    types: [],
    ownership: [],
    ranges: [],
    arrayBounds: [],
    pointerRanges: [],
    aliasLifetimes: [],
    switchCoverage: [],
    optimization: { passes: [], boundsChecks },
    capabilities: [],
    resources: [],
  };
}

/**
 * Builds ownership facts for every function in a module.
 *
 * @param ir - Module IR containing function declarations.
 * @returns Ownership facts partitioned by ownership mode.
 */
function ownershipFacts(ir: FlintIrModule): FlintAnalysisOwnershipFact[] {
  return ir.functions.map((declaration) => ({
    functionName: declaration.name,
    ownedParameters: declaration.parameters.filter(({ type }) => type.ownership === 'owned').map(({ name }) => name),
    borrowedParameters: declaration.parameters
      .filter(({ type }) => type.ownership === 'borrowed')
      .map(({ name }) => name),
    sharedParameters: declaration.parameters.filter(({ type }) => type.ownership === 'shared').map(({ name }) => name),
  }));
}

/**
 * Builds alias lifetime facts from ownership facts and mutable reference parameters.
 *
 * @param ir - Module IR containing function declarations.
 * @param ownership - Ownership facts previously computed for the module.
 * @returns Alias lifetime facts for each function.
 */
function aliasLifetimeFacts(
  ir: FlintIrModule,
  ownership: readonly FlintAnalysisOwnershipFact[],
): FlintAnalysisFacts['aliasLifetimes'] {
  return ownership.map((fact) => ({
    functionName: fact.functionName,
    borrowed: fact.borrowedParameters,
    mutable:
      ir.functions
        .find(({ name }) => name === fact.functionName)
        ?.parameters.filter(({ type }) => type.referenceMode === 'mut-ref')
        .map(({ name }) => name) ?? [],
    shared: fact.sharedParameters,
    regionEscapes: [],
    releaseCount: 0,
  }));
}

/**
 * Builds optimization facts from optional Sea-of-Nodes and optimized IR artifacts.
 *
 * @param frontend - Frontend compiler result supplying SoN and optimized IR.
 * @param boundsChecks - Active bounds checking mode.
 * @returns Optimization fact summary for analysis consumers.
 */
function optimizationFacts(
  frontend: FlintFrontendResult,
  boundsChecks: FlintSoNBoundsChecks,
): FlintAnalysisFacts['optimization'] {
  const son = frontend.sonIr;
  return {
    ...(son?.graphHash === undefined ? {} : { graphHash: son.graphHash }),
    ...(son === undefined
      ? {}
      : {
          nodesBefore: son.nodes.length,
          nodesAfter:
            frontend.optimizedIr === undefined ? son.nodes.length : countFlintIr(frontend.optimizedIr).expressions,
        }),
    passes: son?.optimizationReport?.passes.map(({ name }) => name) ?? [],
    boundsChecks,
  };
}

/**
 * Computes semantic analysis facts across all functions in a frontend compiler artifact.
 * Aggregates call graphs, control flow statistics, ownership modes, constant ranges,
 * array bounds, pointer checks, and resource usage estimations.
 *
 * @param frontend - Frontend compiler result containing IR and SoN graph.
 * @param boundsChecks - Active bounds checking mode (defaults to frontend setting or 'runtime').
 * @returns Fully populated FlintAnalysisFacts structure.
 */
export function createFlintAnalysisFacts(
  frontend: FlintFrontendResult,
  boundsChecks: FlintSoNBoundsChecks = frontend.sonIr?.boundsChecks ?? 'runtime',
): FlintAnalysisFacts {
  const ir = frontend.ir;
  if (ir === undefined) return emptyAnalysisFacts(boundsChecks);

  const callGraph = ir.functions.map((declaration) => ({
    functionName: declaration.name,
    calls: declaration.analysis?.calls ?? [],
    span: declaration.span,
  }));
  const controlFlow = ir.functions.map((declaration) => {
    const counts = countFlintIr({ ...ir, functions: [declaration] });
    return {
      functionName: declaration.name,
      statementCount: counts.statements,
      expressionCount: counts.expressions,
      hasLoop: hasLoop(declaration.body),
      span: declaration.span,
    };
  });
  const types = ir.functions.map((declaration) => ({
    functionName: declaration.name,
    parameters: declaration.parameters.map(({ type }) => type.name),
    result: declaration.result.name,
  }));
  const ownership = ownershipFacts(ir);
  const ranges = ir.functions.map(({ name }) => ({ functionName: name, knownConstants: constants(ir, name) }));
  const arrayBounds = ir.functions.flatMap(({ name }) =>
    boundsFacts(ir, name, ranges.find((range) => range.functionName === name)?.knownConstants ?? {}),
  );
  const pointerRanges = ir.functions.flatMap(({ name }) =>
    pointerFacts(ir, name, ranges.find((range) => range.functionName === name)?.knownConstants ?? {}),
  );
  const switchCoverage = ir.functions.flatMap(({ name }) => switchFacts(ir, name));
  const aliasLifetimes = aliasLifetimeFacts(ir, ownership);
  const capabilities = ir.imports.map(({ capability, alias }) => ({
    capability,
    imports: [alias],
    source: frontend.links.sourceImports?.find(({ source }) => source === capability),
  }));
  const resources = controlFlow.map(({ functionName, statementCount, expressionCount }) => ({
    functionName,
    estimatedStatements: statementCount,
    estimatedExpressions: expressionCount,
    loopCount: loopCount(ir.functions.find(({ name }) => name === functionName)?.body ?? []),
  }));

  return {
    callGraph,
    controlFlow,
    types,
    ownership,
    ranges,
    arrayBounds,
    pointerRanges,
    aliasLifetimes,
    switchCoverage,
    optimization: optimizationFacts(frontend, boundsChecks),
    capabilities,
    resources,
  };
}
