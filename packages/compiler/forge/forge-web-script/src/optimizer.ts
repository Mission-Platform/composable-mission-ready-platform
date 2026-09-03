import {
  countForgeWebScriptIr,
  lowerForgeWebScriptIrToModule,
  lowerForgeWebScriptToIr,
  type ForgeWebScriptIrCounts,
  type ForgeWebScriptIrExpression,
  type ForgeWebScriptIrFunction,
  type ForgeWebScriptIrModule,
  type ForgeWebScriptIrPurity,
  type ForgeWebScriptIrStatement,
} from './ir.js';

import type { ForgeWebScriptModule } from './ast.js';
import type { ForgeWebScriptSoNPassReport } from './son-ir.js';

/**
 * Legacy tree-IR optimizer, kept only as a compatibility adapter.
 *
 * `son-ir.ts`'s Sea-of-Nodes optimizer is the canonical optimization
 * boundary: `frontend.ts` builds the SoN graph from the *unoptimized* IR and
 * derives `optimizedIr`/`optimizedModule` (what the Wasm backend actually
 * compiles) from the SoN graph's own constant/copy-propagation, CSE, and
 * reachability passes. This module's `optimizeForgeWebScriptModule`/
 * `optimizeForgeWebScriptIr` no longer influence the compiled output; they
 * are retained solely to populate the backward-compatible
 * `ForgeWebScriptOptimizationReport` shape (and its richer pass-level detail
 * such as inlining/tail-call/iterator-unroll counters) for existing
 * consumers, and may be superseded once those decisions move onto the SoN
 * graph as well.
 */
export interface ForgeWebScriptOptimizationReport {
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
  readonly before: ForgeWebScriptIrCounts;
  readonly after: ForgeWebScriptIrCounts;
  readonly constantsFolded: number;
  readonly localsSimplified: number;
  readonly statementsRemoved: number;
  readonly functionsRemoved: number;
  readonly reachableFunctions: readonly string[];
  readonly appliedTransformations: readonly ForgeWebScriptOptimizationDecision[];
  readonly skippedTransformations: readonly ForgeWebScriptOptimizationDecision[];
  readonly featureRequirements: readonly string[];
  readonly iteratorUnrolled: number;
  readonly functionsInlined: number;
  readonly tailCallsDetected: number;
  readonly optimisticBranches: number;
  readonly pureFunctions: readonly string[];
  readonly effectfulFunctions: readonly string[];
  /** Ordered canonical SoN passes; legacy tree-IR pass data remains above. */
  readonly sonPasses?: readonly ForgeWebScriptSoNPassReport['name'][];
}

export interface ForgeWebScriptOptimizationDecision {
  readonly transformation: 'iterator-unroll' | 'inline' | 'tail-call' | 'optimistic-conditional' | 'dead-code';
  readonly status: 'applied' | 'skipped';
  readonly functionName?: string;
  readonly span?: ForgeWebScriptIrStatement['span'];
  readonly reason: string;
}

export interface ForgeWebScriptOptimizationResult {
  readonly module: ForgeWebScriptModule;
  readonly ir: ForgeWebScriptIrModule;
  readonly report: ForgeWebScriptOptimizationReport;
}

type Literal = Extract<ForgeWebScriptIrExpression, { kind: 'literal' }>;

interface OptimizationCounters {
  constantsFolded: number;
  localsSimplified: number;
  statementsRemoved: number;
  iteratorUnrolled: number;
  functionsInlined: number;
  tailCallsDetected: number;
  optimisticBranches: number;
  applied: ForgeWebScriptOptimizationDecision[];
  skipped: ForgeWebScriptOptimizationDecision[];
  featureRequirements: Set<string>;
}

function assignedNames(statements: readonly ForgeWebScriptIrStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    switch (statement.kind) {
      case 'assignment': {
        names.add(statement.name);
        break;
      }
      case 'if': {
        assignedNames(statement.consequent, names);
        if (statement.alternate !== undefined) assignedNames(statement.alternate, names);

        break;
      }
      case 'switch': {
        for (const arm of statement.cases) assignedNames(arm.body, names);
        if (statement.defaultCase !== undefined) assignedNames(statement.defaultCase, names);
        break;
      }
      case 'while':
      case 'do-while': {
        assignedNames(statement.body, names);
        break;
      }
      case 'iterator-loop': {
        assignedNames(statement.body, names);
        break;
      }
    }
  }
  return names;
}

function literal(value: boolean | number | string, source: ForgeWebScriptIrExpression): Literal {
  if (source.kind === 'literal') return { ...source, value };
  return { kind: 'literal', value, type: 'bool', span: source.span };
}

function evaluateBinary(operator: string, left: Literal, right: Literal): boolean | number | string | undefined {
  if (operator === '&&' && typeof left.value === 'boolean' && typeof right.value === 'boolean')
    return left.value && right.value;
  if (operator === '||' && typeof left.value === 'boolean' && typeof right.value === 'boolean')
    return left.value || right.value;
  if (operator === '==' || operator === '!=')
    return operator === '==' ? left.value === right.value : left.value !== right.value;
  if (typeof left.value === 'string' || typeof right.value === 'string') return undefined;
  if (typeof left.value !== 'number' || typeof right.value !== 'number') return undefined;
  if ((operator === '/' || operator === '%') && right.value === 0) return undefined;
  switch (operator) {
    case '+': {
      return left.value + right.value;
    }
    case '-': {
      return left.value - right.value;
    }
    case '*': {
      return left.value * right.value;
    }
    case '/': {
      return left.value / right.value;
    }
    case '%': {
      return left.value % right.value;
    }
    case '<': {
      return left.value < right.value;
    }
    case '<=': {
      return left.value <= right.value;
    }
    case '>': {
      return left.value > right.value;
    }
    case '>=': {
      return left.value >= right.value;
    }
    default: {
      return undefined;
    }
  }
}

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

function expressionPurity(
  expression: ForgeWebScriptIrExpression,
  functions: ReadonlyMap<string, ForgeWebScriptIrPurity>,
): ForgeWebScriptIrPurity {
  switch (expression.kind) {
    case 'literal':
    case 'identifier':
    case 'function-value': {
      return 'pure';
    }
    case 'call': {
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
    case 'unary': {
      return expressionPurity(expression.operand, functions);
    }
    case 'binary': {
      return expressionPurity(expression.left, functions) === 'pure' &&
        expressionPurity(expression.right, functions) === 'pure'
        ? 'pure'
        : 'effectful';
    }
    case 'struct-value': {
      return Object.values(expression.fields).every((value) => expressionPurity(value, functions) === 'pure')
        ? 'pure'
        : 'effectful';
    }
    case 'enum-value': {
      return expression.arguments.every((argument) => expressionPurity(argument, functions) === 'pure')
        ? 'pure'
        : 'effectful';
    }
    case 'array-literal':
    case 'vector-literal': {
      return expression.elements.every((element) => expressionPurity(element, functions) === 'pure')
        ? 'pure'
        : 'effectful';
    }
    case 'index': {
      return expressionPurity(expression.receiver, functions) === 'pure' &&
        expressionPurity(expression.index, functions) === 'pure'
        ? 'pure'
        : 'effectful';
    }
    case 'match': {
      return expressionPurity(expression.value, functions) === 'pure' &&
        expression.arms.every((arm) => expressionPurity(arm.value, functions) === 'pure')
        ? 'pure'
        : 'effectful';
    }
  }
}

function containsYield(statements: readonly ForgeWebScriptIrStatement[]): boolean {
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

function staticallyBoundedIteratorYields(statements: readonly ForgeWebScriptIrStatement[]): number | undefined {
  let yields = 0;
  for (const statement of statements) {
    if (statement.kind !== 'yield') return undefined;
    yields += 1;
  }
  return yields;
}

function analyzeFunctions(module: ForgeWebScriptIrModule): {
  readonly analyses: ReadonlyMap<string, ForgeWebScriptIrFunction['analysis']>;
  readonly purity: ReadonlyMap<string, ForgeWebScriptIrPurity>;
} {
  const byName = new Map(module.functions.map((declaration) => [declaration.name, declaration]));
  const purity = new Map<string, ForgeWebScriptIrPurity>(module.functions.map(({ name }) => [name, 'unknown']));
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of module.functions) {
      const calls = new Set<string>();
      calledFunctionsInStatements(declaration.body, calls);
      const localPurity: ForgeWebScriptIrPurity = containsYield(declaration.body)
        ? 'effectful'
        : calls.size === 0
          ? 'pure'
          : [...calls].every((callee) => byName.has(callee) && purity.get(callee) === 'pure') &&
              declaration.body.every(
                (statement) =>
                  statement.kind !== 'expression-statement' ||
                  expressionPurity(statement.expression, purity) === 'pure',
              )
            ? 'pure'
            : 'effectful';
      if (purity.get(declaration.name) !== localPurity) {
        purity.set(declaration.name, localPurity);
        changed = true;
      }
    }
  }
  const analyses = new Map<string, ForgeWebScriptIrFunction['analysis']>();
  for (const declaration of module.functions) {
    const calls = new Set<string>();
    calledFunctionsInStatements(declaration.body, calls);
    const lastStatement = declaration.body.at(-1);
    const boundedLength = declaration.iterable === true ? staticallyBoundedIteratorYields(declaration.body) : undefined;
    analyses.set(declaration.name, {
      purity: purity.get(declaration.name) ?? 'unknown',
      calls: [...calls].toSorted(),
      tailCallable:
        purity.get(declaration.name) === 'pure' &&
        lastStatement?.kind === 'return' &&
        lastStatement.value?.kind === 'call',
      ...(boundedLength === undefined ? {} : { iteratorBoundedLength: boundedLength }),
    });
  }
  return { analyses, purity };
}

function optimizeExpression(
  expression: ForgeWebScriptIrExpression,
  locals: ReadonlyMap<string, Literal>,
  counters: Pick<OptimizationCounters, 'constantsFolded' | 'localsSimplified'>,
): ForgeWebScriptIrExpression {
  if (expression.kind === 'identifier') {
    const replacement = locals.get(expression.name);
    return replacement === undefined ? expression : { ...replacement, span: expression.span };
  }
  if (expression.kind === 'literal') return expression;
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => optimizeExpression(argument, locals, counters)),
    };
  if (expression.kind === 'function-value') return expression;
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
  if (expression.kind === 'index')
    return {
      ...expression,
      receiver: optimizeExpression(expression.receiver, locals, counters),
      index: optimizeExpression(expression.index, locals, counters),
    };
  if (expression.kind === 'unary') {
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
  if (expression.kind !== 'binary') return expression;
  const left = optimizeExpression(expression.left, locals, counters);
  const right = optimizeExpression(expression.right, locals, counters);
  if (left.kind === 'literal' && right.kind === 'literal') {
    const value = evaluateBinary(expression.operator, left, right);
    if (value !== undefined) {
      counters.constantsFolded += 1;
      return {
        ...left,
        value,
        type:
          expression.operator === '&&' ||
          expression.operator === '||' ||
          ['<', '<=', '==', '!=', '>', '>='].includes(expression.operator)
            ? 'bool'
            : left.type,
        span: expression.span,
      };
    }
  }
  if (expression.operator === '+' && right.kind === 'literal' && right.value === 0) {
    counters.localsSimplified += 1;
    return left;
  }
  if (expression.operator === '*' && right.kind === 'literal' && right.value === 1) {
    counters.localsSimplified += 1;
    return left;
  }
  return { ...expression, left, right };
}

function optimizeStatements(
  statements: readonly ForgeWebScriptIrStatement[],
  locals: Map<string, Literal>,
  counters: OptimizationCounters,
): readonly ForgeWebScriptIrStatement[] {
  const result: ForgeWebScriptIrStatement[] = [];
  const mutableNames = assignedNames(statements);
  let terminated = false;
  for (const statement of statements) {
    if (terminated) {
      counters.statementsRemoved += 1;
      continue;
    }
    if (statement.kind === 'let') {
      const value = optimizeExpression(statement.value, locals, counters);
      if (value.kind === 'literal') locals.set(statement.name, value);
      else locals.delete(statement.name);
      if (value.kind === 'literal' && !mutableNames.has(statement.name)) {
        counters.statementsRemoved += 1;
        continue;
      }
      result.push({ ...statement, value });
      continue;
    }
    if (statement.kind === 'assignment') {
      const value = optimizeExpression(statement.value, locals, counters);
      locals.delete(statement.name);
      result.push({ ...statement, value });
      continue;
    }
    if (statement.kind === 'return') {
      const value = statement.value === undefined ? undefined : optimizeExpression(statement.value, locals, counters);
      result.push({ ...statement, ...(value === undefined ? {} : { value }) });
      terminated = true;
      continue;
    }
    if (statement.kind === 'expression-statement') {
      result.push({ ...statement, expression: optimizeExpression(statement.expression, locals, counters) });
      continue;
    }
    if (statement.kind === 'match-statement') {
      result.push({
        ...statement,
        value: optimizeExpression(statement.value, locals, counters),
        arms: statement.arms.map((arm) => ({ ...arm, value: optimizeExpression(arm.value, locals, counters) })),
      });
      continue;
    }
    if (statement.kind === 'switch') {
      result.push({
        ...statement,
        value: optimizeExpression(statement.value, locals, counters),
        cases: statement.cases.map((arm) => ({
          ...arm,
          body: optimizeStatements(arm.body, new Map(locals), counters),
        })),
        ...(statement.defaultCase === undefined
          ? {}
          : { defaultCase: optimizeStatements(statement.defaultCase, new Map(locals), counters) }),
      });
      // A value reassigned in any case is no longer a known constant after the switch.
      for (const arm of statement.cases) for (const name of assignedNames(arm.body)) locals.delete(name);
      if (statement.defaultCase !== undefined)
        for (const name of assignedNames(statement.defaultCase)) locals.delete(name);
      continue;
    }
    if (statement.kind === 'yield') {
      result.push({ ...statement, value: optimizeExpression(statement.value, locals, counters) });
      continue;
    }
    if (statement.kind === 'iterator-loop') {
      const bodyLocals = new Map(locals);
      // Loop-carried assignments and the iterator binding are not loop-invariant.
      for (const name of assignedNames(statement.body)) bodyLocals.delete(name);
      bodyLocals.delete(statement.binding);
      const body = optimizeStatements(statement.body, bodyLocals, counters);
      for (const name of assignedNames(statement.body)) locals.delete(name);
      result.push({
        ...statement,
        iterator: optimizeExpression(statement.iterator, locals, counters),
        body,
      });
      continue;
    }
    if (statement.kind === 'while' || statement.kind === 'do-while') {
      const bodyLocals = new Map(locals);
      for (const name of assignedNames(statement.body)) bodyLocals.delete(name);
      const condition = optimizeExpression(statement.condition, bodyLocals, counters);
      const body = optimizeStatements(statement.body, bodyLocals, counters);
      for (const name of assignedNames(statement.body)) locals.delete(name);
      result.push({ ...statement, condition, body });
      continue;
    }
    const condition = optimizeExpression(statement.condition, locals, counters);
    if (condition.kind === 'literal' && typeof condition.value === 'boolean') {
      const selected = condition.value ? statement.consequent : (statement.alternate ?? []);
      const optimized = optimizeStatements(selected, new Map(locals), counters);
      counters.statementsRemoved += 1;
      counters.optimisticBranches += 1;
      counters.applied.push({
        transformation: 'optimistic-conditional',
        status: 'applied',
        span: statement.span,
        reason: 'Selected the branch of a condition proven constant without evaluating a host call.',
      });
      result.push(...optimized);
      // The inlined branch was optimized against an isolated scope; drop constants
      // it reassigned so later statements do not read stale values.
      for (const name of assignedNames(selected)) locals.delete(name);
      if (optimized.some(({ kind }) => kind === 'return')) terminated = true;
    } else {
      if (statement.conditionalHint !== undefined)
        counters.skipped.push({
          transformation: 'optimistic-conditional',
          status: 'skipped',
          span: statement.span,
          reason: 'The condition is not proven constant; branch hints cannot change semantics.',
        });
      const consequent = optimizeStatements(statement.consequent, new Map(locals), counters);
      const alternate =
        statement.alternate === undefined
          ? undefined
          : optimizeStatements(statement.alternate, new Map(locals), counters);
      // A value reassigned in either branch is no longer a known constant after the if.
      for (const name of assignedNames(statement.consequent)) locals.delete(name);
      if (statement.alternate !== undefined) for (const name of assignedNames(statement.alternate)) locals.delete(name);
      result.push({ ...statement, condition, consequent, ...(alternate === undefined ? {} : { alternate }) });
    }
  }
  return result;
}

function calledFunctions(expression: ForgeWebScriptIrExpression, names: Set<string>): void {
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
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) calledFunctions(value, names);
      break;
    }
    case 'enum-value': {
      for (const value of expression.arguments) calledFunctions(value, names);
      break;
    }
    case 'match': {
      calledFunctions(expression.value, names);
      for (const arm of expression.arms) calledFunctions(arm.value, names);
      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) calledFunctions(element, names);
      break;
    }
    case 'index': {
      calledFunctions(expression.receiver, names);
      calledFunctions(expression.index, names);
      break;
    }
    // No default
  }
}

function calledFunctionsInStatements(statements: readonly ForgeWebScriptIrStatement[], names: Set<string>): void {
  for (const statement of statements) {
    if (statement.kind === 'let') calledFunctions(statement.value, names);
    else if (statement.kind === 'assignment') calledFunctions(statement.value, names);
    else if (statement.kind === 'return' && statement.value !== undefined) calledFunctions(statement.value, names);
    else
      switch (statement.kind) {
        case 'expression-statement': {
          calledFunctions(statement.expression, names);
          break;
        }
        case 'if': {
          calledFunctions(statement.condition, names);
          calledFunctionsInStatements(statement.consequent, names);
          if (statement.alternate !== undefined) calledFunctionsInStatements(statement.alternate, names);

          break;
        }
        case 'switch': {
          calledFunctions(statement.value, names);
          for (const arm of statement.cases) calledFunctionsInStatements(arm.body, names);
          if (statement.defaultCase !== undefined) calledFunctionsInStatements(statement.defaultCase, names);
          break;
        }
        case 'while':
        case 'do-while': {
          calledFunctions(statement.condition, names);
          calledFunctionsInStatements(statement.body, names);
          break;
        }
        case 'match-statement': {
          calledFunctions(statement.value, names);
          for (const arm of statement.arms) calledFunctions(arm.value, names);
          break;
        }
        case 'yield': {
          calledFunctions(statement.value, names);
          break;
        }
        case 'iterator-loop': {
          calledFunctions(statement.iterator, names);
          calledFunctionsInStatements(statement.body, names);
          break;
        }
        // No default
      }
  }
}

function substituteExpression(
  expression: ForgeWebScriptIrExpression,
  substitutions: ReadonlyMap<string, ForgeWebScriptIrExpression>,
): ForgeWebScriptIrExpression {
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

function identifierUses(expression: ForgeWebScriptIrExpression, name: string): number {
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

function inlineExpression(
  expression: ForgeWebScriptIrExpression,
  functions: ReadonlyMap<string, ForgeWebScriptIrFunction>,
  purity: ReadonlyMap<string, ForgeWebScriptIrPurity>,
  counters: OptimizationCounters,
  functionName: string,
): ForgeWebScriptIrExpression {
  const visit = (value: ForgeWebScriptIrExpression): ForgeWebScriptIrExpression => {
    const nested =
      value.kind === 'call'
        ? { ...value, arguments: value.arguments.map((argument) => visit(argument)) }
        : value.kind === 'unary'
          ? { ...value, operand: visit(value.operand) }
          : value.kind === 'binary'
            ? { ...value, left: visit(value.left), right: visit(value.right) }
            : value.kind === 'struct-value'
              ? {
                  ...value,
                  fields: Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, visit(field)])),
                }
              : value.kind === 'enum-value'
                ? { ...value, arguments: value.arguments.map((argument) => visit(argument)) }
                : value.kind === 'match'
                  ? {
                      ...value,
                      value: visit(value.value),
                      arms: value.arms.map((arm) => ({ ...arm, value: visit(arm.value) })),
                    }
                  : value;
    if (nested.kind !== 'call') return nested;
    const declaration = functions.get(nested.callee);
    if (declaration === undefined) return nested;
    if (declaration.inlinePolicy === 'noinline') {
      counters.skipped.push({
        transformation: 'inline',
        status: 'skipped',
        functionName,
        span: nested.span,
        reason: 'The callee is explicitly marked noinline.',
      });
      return nested;
    }
    const returnStatement =
      declaration.body.length === 1 && declaration.body[0]?.kind === 'return' ? declaration.body[0] : undefined;
    if (returnStatement?.value === undefined || purity.get(nested.callee) !== 'pure') {
      counters.skipped.push({
        transformation: 'inline',
        status: 'skipped',
        functionName,
        span: nested.span,
        reason: 'Inlining is restricted to a single pure return expression to preserve effects and ordering.',
      });
      return nested;
    }
    if (nested.arguments.length !== declaration.parameters.length) return nested;
    const substitutions = new Map<string, ForgeWebScriptIrExpression>();
    for (const [index, parameter] of declaration.parameters.entries()) {
      const argument = nested.arguments[index];
      const uses = identifierUses(returnStatement.value, parameter.name);
      if (uses > 1 && expressionPurity(argument, purity) !== 'pure') {
        counters.skipped.push({
          transformation: 'inline',
          status: 'skipped',
          functionName,
          span: nested.span,
          reason: 'Inlining would duplicate an effectful argument.',
        });
        return nested;
      }
      substitutions.set(parameter.name, argument);
    }
    const inlined = substituteExpression(returnStatement.value, substitutions);
    counters.functionsInlined += 1;
    counters.applied.push({
      transformation: 'inline',
      status: 'applied',
      functionName,
      span: nested.span,
      reason: `Inlined the pure function '${nested.callee}'.`,
    });
    return { ...inlined, span: nested.span, ...(inlined.kind === 'call' ? { inlinedFrom: nested.callee } : {}) };
  };
  return visit(expression);
}

function transformStatements(
  statements: readonly ForgeWebScriptIrStatement[],
  declaration: ForgeWebScriptIrFunction,
  functions: ReadonlyMap<string, ForgeWebScriptIrFunction>,
  purity: ReadonlyMap<string, ForgeWebScriptIrPurity>,
  counters: OptimizationCounters,
): readonly ForgeWebScriptIrStatement[] {
  return statements.flatMap((statement): ForgeWebScriptIrStatement[] => {
    if (statement.kind === 'iterator-loop') {
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
    if (statement.kind === 'let')
      return [
        { ...statement, value: inlineExpression(statement.value, functions, purity, counters, declaration.name) },
      ];
    if (statement.kind === 'assignment')
      return [
        { ...statement, value: inlineExpression(statement.value, functions, purity, counters, declaration.name) },
      ];
    if (statement.kind === 'return' && statement.value !== undefined)
      return [
        { ...statement, value: inlineExpression(statement.value, functions, purity, counters, declaration.name) },
      ];
    if (statement.kind === 'expression-statement')
      return [
        {
          ...statement,
          expression: inlineExpression(statement.expression, functions, purity, counters, declaration.name),
        },
      ];
    if (statement.kind === 'yield')
      return [
        { ...statement, value: inlineExpression(statement.value, functions, purity, counters, declaration.name) },
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
  });
}

function annotateTailCalls(
  statements: readonly ForgeWebScriptIrStatement[],
  functions: ReadonlyMap<string, ForgeWebScriptIrFunction>,
  counters: OptimizationCounters,
  functionName: string,
): readonly ForgeWebScriptIrStatement[] {
  return statements.map((statement) => {
    if (statement.kind === 'return' && statement.value?.kind === 'call' && functions.has(statement.value.callee)) {
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
    if (statement.kind === 'if')
      return {
        ...statement,
        consequent: annotateTailCalls(statement.consequent, functions, counters, functionName),
        ...(statement.alternate === undefined
          ? {}
          : { alternate: annotateTailCalls(statement.alternate, functions, counters, functionName) }),
      };
    if (statement.kind === 'while' || statement.kind === 'do-while')
      return { ...statement, body: annotateTailCalls(statement.body, functions, counters, functionName) };
    if (statement.kind === 'iterator-loop')
      return { ...statement, body: annotateTailCalls(statement.body, functions, counters, functionName) };
    return statement;
  });
}

function pruneFunctions(
  module: ForgeWebScriptIrModule,
  minimumReachable: readonly string[] = [],
): {
  module: ForgeWebScriptIrModule;
  removed: number;
  reachable: readonly string[];
} {
  const byName = new Map(module.functions.map((declaration) => [declaration.name, declaration]));
  const reachable = new Set(module.functions.filter(({ exported }) => exported).map(({ name }) => name));
  for (const name of minimumReachable) if (byName.has(name)) reachable.add(name);
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
  const functions = module.functions.filter(({ name }) => reachable.has(name));
  return {
    module: { ...module, functions },
    removed: module.functions.length - functions.length,
    reachable: [...reachable].toSorted(),
  };
}

export function optimizeForgeWebScriptIr(
  input: ForgeWebScriptIrModule,
  mode: 'debug' | 'release' = 'release',
): ForgeWebScriptOptimizationResult {
  const before = countForgeWebScriptIr(input);
  const analysis = analyzeFunctions(input);
  const analyzedInput: ForgeWebScriptIrModule = {
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
      module: lowerForgeWebScriptIrToModule(analyzedInput),
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
  const transformed: ForgeWebScriptIrModule = {
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
  const after = countForgeWebScriptIr(pruned.module);
  return {
    module: lowerForgeWebScriptIrToModule(pruned.module),
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

export function optimizeForgeWebScriptModule(
  module: ForgeWebScriptModule,
  mode: 'debug' | 'release' = 'release',
): ForgeWebScriptOptimizationResult {
  return optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(module), mode);
}
