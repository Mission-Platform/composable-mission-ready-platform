import { countFlintIr } from '../ir.js';

import type { FlintFrontendResult } from '../contracts.js';
import type { FlintIrExpression, FlintIrStatement, FlintIrModule } from '../ir.js';
import type { FlintSoNBoundsChecks } from '../son-ir.js';
import type {
  FlintAnalysisArrayBoundsFact,
  FlintAnalysisFacts,
  FlintAnalysisInterval,
  FlintAnalysisPointerRangeFact,
  FlintAnalysisSwitchCoverageFact,
} from './contracts.js';

/**
 * Extracts immediate expressions evaluated by a statement.
 *
 * @param statement IR statement.
 * @returns Array of immediate constituent expressions.
 */
function expressionsOf(statement: FlintIrStatement): FlintIrExpression[] {
  if (statement.kind === 'let' || statement.kind === 'assignment') return [statement.value];
  if (statement.kind === 'return' || statement.kind === 'yield')
    return statement.value === undefined ? [] : [statement.value];
  if (statement.kind === 'expression-statement') return [statement.expression];
  if (statement.kind === 'if' || statement.kind === 'while' || statement.kind === 'do-while')
    return [statement.condition];
  if (statement.kind === 'switch' || statement.kind === 'match-statement') return [statement.value];
  if (statement.kind === 'iterator-loop') return [statement.iterator];
  return [];
}

/**
 * No-op callback used when expression traversal requires no custom action.
 *
 * @param _expression Ignored expression node.
 */
function visitExpressionNoop(_expression: FlintIrExpression): void {
  // Intentionally blank no-op visitor
}

/**
 * Recursively visits all sub-expressions within an IR expression tree.
 *
 * @param expression Root expression.
 * @param visit Callback invoked for each child expression.
 */
function visitExpression(expression: FlintIrExpression, visit: (expression: FlintIrExpression) => void): void {
  visit(expression);
  if (expression.kind === 'call') for (const argument of expression.arguments) visitExpression(argument, visit);
  if (expression.kind === 'binary') {
    visitExpression(expression.left, visit);
    visitExpression(expression.right, visit);
  }
  if (expression.kind === 'unary') visitExpression(expression.operand, visit);
  if (expression.kind === 'index') {
    visitExpression(expression.receiver, visit);
    visitExpression(expression.index, visit);
  }
  if (expression.kind === 'struct-value')
    for (const field of Object.values(expression.fields)) visitExpression(field, visit);
  if (expression.kind === 'enum-value') for (const argument of expression.arguments) visitExpression(argument, visit);
  if (expression.kind === 'match') {
    visitExpression(expression.value, visit);
    for (const arm of expression.arms) visitExpression(arm.value, visit);
  }
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    for (const element of expression.elements) visitExpression(element, visit);
}

/**
 * Recursively visits all statements within an IR statement list.
 *
 * @param statements Array of statements.
 * @param visit Callback invoked for each statement.
 */
function visitStatements(statements: readonly FlintIrStatement[], visit: (statement: FlintIrStatement) => void): void {
  for (const statement of statements) {
    visit(statement);
    if (statement.kind === 'if') {
      visitStatements(statement.consequent, visit);
      if (statement.alternate !== undefined) visitStatements(statement.alternate, visit);
    }
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop')
      visitStatements(statement.body, visit);
    if (statement.kind === 'switch') {
      for (const { body } of statement.cases) visitStatements(body, visit);
      if (statement.defaultCase !== undefined) visitStatements(statement.defaultCase, visit);
    }
    if (statement.kind === 'match-statement')
      for (const { value } of statement.arms) visitExpression(value, visitExpressionNoop);
  }
}

/**
 * Computes the static value range interval of an expression based on known constants.
 *
 * @param expression Target expression.
 * @param constantsByName Map of known constant values by variable name.
 * @returns Inferred interval fact.
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
 * Computes static receiver array length if known at compile time.
 *
 * @param expression Receiver expression.
 * @returns Element length if statically known, or undefined.
 */
function receiverLength(expression: FlintIrExpression): number | undefined {
  return expression.kind === 'array-literal' || expression.kind === 'vector-literal'
    ? expression.elements.length
    : undefined;
}

/**
 * Classifies the array bounds checking status from static index interval and receiver length.
 *
 * @param length Known receiver length, if available.
 * @param index Inferred index interval.
 * @param boundsCheck Bounds check hint on the expression.
 * @returns Classified bounds verification status.
 */
function classifyBoundsCheckStatus(
  length: number | undefined,
  index: FlintAnalysisInterval,
  boundsCheck: string | undefined,
): 'proven-safe' | 'out-of-range' | 'runtime-checked' | 'unknown' {
  if (length !== undefined && index.min !== undefined && index.max !== undefined) {
    if (index.min >= 0 && index.max < length) return 'proven-safe';
    if (index.min < 0 || index.max >= length) return 'out-of-range';
  }
  if (boundsCheck === 'proven-safe') return 'proven-safe';
  if (boundsCheck === 'required') return 'runtime-checked';
  return 'unknown';
}

/**
 * Collects array indexing bounds facts across a function body.
 *
 * @param module IR module.
 * @param functionName Target function name.
 * @param knownConstants Map of known integer constants.
 * @returns Array of bounds verification facts.
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
      for (const root of expressionsOf(current))
        visitExpression(root, (expression) => {
          if (expression.kind !== 'index') return;
          const index = interval(expression.index, knownConstants);
          const length = receiverLength(expression.receiver);
          const status = classifyBoundsCheckStatus(length, index, expression.boundsCheck);
          facts.push({
            functionName,
            receiver: expression.receiver.kind === 'identifier' ? expression.receiver.name : expression.receiver.kind,
            index,
            ...(length === undefined ? {} : { length }),
            status,
            span: expression.span,
          });
        });
    });
  }
  return facts;
}

/**
 * Collects pointer operation facts across a function body.
 *
 * @param module IR module.
 * @param functionName Target function name.
 * @param knownConstants Map of known integer constants.
 * @returns Array of pointer range facts.
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
 * Collects switch statement branch coverage facts.
 *
 * @param module IR module.
 * @param functionName Target function name.
 * @returns Array of switch coverage facts.
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
 * Checks whether an array of statements contains any loops.
 *
 * @param statements Statement list to analyze.
 * @returns True if at least one loop structure is present.
 */
function hasLoop(statements: readonly FlintIrStatement[]): boolean {
  return statements.some((statement) => {
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') return true;
    if (statement.kind === 'if')
      return hasLoop(statement.consequent) || (statement.alternate !== undefined && hasLoop(statement.alternate));
    if (statement.kind === 'switch')
      return (
        statement.cases.some(({ body }) => hasLoop(body)) ||
        (statement.defaultCase !== undefined && hasLoop(statement.defaultCase))
      );
    if (statement.kind === 'match-statement')
      return statement.arms.some(({ value }) => value.kind === 'call' && value.callee === 'loop');
    return false;
  });
}

/**
 * Counts the total number of loop statements in a statement tree.
 *
 * @param statements Statement list to analyze.
 * @returns Numeric loop count.
 */
function loopCount(statements: readonly FlintIrStatement[]): number {
  let count = 0;
  for (const statement of statements) {
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') count += 1;
    if (statement.kind === 'if')
      count +=
        loopCount(statement.consequent) + (statement.alternate === undefined ? 0 : loopCount(statement.alternate));
    if (statement.kind === 'switch') for (const arm of statement.cases) count += loopCount(arm.body);
    if (statement.kind === 'switch' && statement.defaultCase !== undefined) count += loopCount(statement.defaultCase);
  }
  return count;
}

/**
 * Evaluates a binary operator expression on known numeric operands.
 *
 * @param operator Binary operator.
 * @param left Left operand.
 * @param right Right operand.
 * @returns Evaluated numeric result or undefined.
 */
function evaluateBinaryNumeric(operator: string, left: number, right: number): number | undefined {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '*') return left * right;
  if (operator === '/' && right !== 0) return left / right;
  if (operator === '%' && right !== 0) return left % right;
  return undefined;
}

/**
 * Statically discovers integer constant bindings and literal occurrences within a function.
 *
 * @param module IR module.
 * @param functionName Target function name.
 * @returns Map of discovered constant values.
 */
function constants(module: FlintIrModule, functionName: string): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  const locals = new Map<string, number>();
  const evaluate = (expression: FlintIrExpression): number | undefined => {
    if (expression.kind === 'literal' && typeof expression.value === 'number') return expression.value;
    if (expression.kind === 'identifier') return locals.get(expression.name);
    if (expression.kind !== 'binary') return undefined;
    const left = evaluate(expression.left);
    const right = evaluate(expression.right);
    if (left === undefined || right === undefined) return undefined;
    return evaluateBinaryNumeric(expression.operator, left, right);
  };
  const visit = (expression: FlintIrExpression): void => {
    if (expression.kind === 'literal' && typeof expression.value === 'number')
      result[`literal:${Object.keys(result).length}`] = expression.value;
    if (expression.kind === 'call') for (const argument of expression.arguments) visit(argument);
    if (expression.kind === 'binary') {
      visit(expression.left);
      visit(expression.right);
    }
    if (expression.kind === 'unary') visit(expression.operand);
    if (expression.kind === 'index') {
      visit(expression.receiver);
      visit(expression.index);
    }
  };
  const declaration = module.functions.find(({ name }) => name === functionName);
  for (const statement of declaration?.body ?? []) {
    if (statement.kind === 'let') {
      visit(statement.value);
      const value = evaluate(statement.value);
      if (value !== undefined) {
        locals.set(statement.name, value);
        result[statement.name] = value;
      }
    }
    if (statement.kind === 'assignment') {
      visit(statement.value);
      const value = evaluate(statement.value);
      if (value === undefined) {
        locals.delete(statement.name);
      } else {
        locals.set(statement.name, value);
        result[statement.name] = value;
      }
    }
    if (statement.kind === 'return' && statement.value !== undefined) visit(statement.value);
  }
  return result;
}

/**
 * Constructs the aggregated semantic facts collection for a frontend compilation result.
 *
 * @param frontend Frontend compilation result.
 * @param boundsChecks Active bounds checking mode.
 * @returns Fully populated FlintAnalysisFacts object.
 */
export function createFlintAnalysisFacts(
  frontend: FlintFrontendResult,
  boundsChecks: FlintSoNBoundsChecks = frontend.sonIr?.boundsChecks ?? 'runtime',
): FlintAnalysisFacts {
  const ir = frontend.ir;
  if (ir === undefined) {
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
  const ownership = ir.functions.map((declaration) => ({
    functionName: declaration.name,
    ownedParameters: declaration.parameters.filter(({ type }) => type.ownership === 'owned').map(({ name }) => name),
    borrowedParameters: declaration.parameters
      .filter(({ type }) => type.ownership === 'borrowed')
      .map(({ name }) => name),
    sharedParameters: declaration.parameters.filter(({ type }) => type.ownership === 'shared').map(({ name }) => name),
  }));
  const ranges = ir.functions.map(({ name }) => ({ functionName: name, knownConstants: constants(ir, name) }));
  const arrayBounds = ir.functions.flatMap(({ name }) =>
    boundsFacts(ir, name, ranges.find((range) => range.functionName === name)?.knownConstants ?? {}),
  );
  const pointerRanges = ir.functions.flatMap(({ name }) =>
    pointerFacts(ir, name, ranges.find((range) => range.functionName === name)?.knownConstants ?? {}),
  );
  const switchCoverage = ir.functions.flatMap(({ name }) => switchFacts(ir, name));
  const aliasLifetimes = ownership.map((fact) => ({
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
  const son = frontend.sonIr;
  const optimization = {
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
    optimization,
    capabilities,
    resources,
  };
}
