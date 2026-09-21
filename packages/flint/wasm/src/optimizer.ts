import { lowerFlintWasmFunctionToSsa, type FlintWasmSsaPlan } from './cfg.js';
import { fold, pure, resolve, type Environment } from './constant-folding.js';
import {
  foldConstantSwitches,
  validateAndAnnotateSwitches,
  type FlintWasmOptimizationDiagnostic,
} from './switch-optimizer.js';

import type { FlintWasmExpression, FlintWasmModule, FlintWasmStatement } from './contracts.js';

/** Metadata describing an individual optimization pass and its metrics. */
export interface FlintWasmOptimizationPass {
  readonly name:
    | 'constant-propagation'
    | 'copy-propagation'
    | 'dead-code-elimination'
    | 'unreachable-block-removal'
    | 'pointer-offset-simplification'
    | 'direct-call-resolution'
    | 'function-layout'
    | 'bounds-check-elision';
  readonly applied: number;
  readonly skipped: number;
  readonly reason?: string;
}

/** Summary report tracking all applied WebAssembly optimization passes and diagnostics. */
export interface FlintWasmOptimizationReport {
  readonly stage: 'wasm';
  readonly optimization: 'debug' | 'release';
  readonly passes: readonly FlintWasmOptimizationPass[];
  readonly cfg: ReadonlyMap<string, FlintWasmSsaPlan>;
}

/** Intermediate representation snapshot of module state at an optimization stage. */
export interface FlintWasmStageIr {
  readonly module: FlintWasmModule;
  readonly report: FlintWasmOptimizationReport;
  readonly diagnostics: readonly FlintWasmOptimizationDiagnostic[];
}

// skipcq: JS-D1001, JS-R1005
function scanBranchAssignedNames(statement: FlintWasmStatement, names: Set<string>): void {
  if (statement.kind === 'if') {
    assignedNames(statement.consequent, names);
    if (statement.alternate !== undefined) assignedNames(statement.alternate, names);
  } else if (statement.kind === 'switch') {
    for (const arm of statement.cases) assignedNames(arm.body, names);
    if (statement.defaultCase !== undefined) assignedNames(statement.defaultCase, names);
  }
}

// skipcq: JS-D1001, JS-R1005
function scanLoopAssignedNames(statement: FlintWasmStatement, names: Set<string>): void {
  if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') {
    assignedNames(statement.body, names);
  } else if (statement.kind === 'for') {
    if (statement.initializer !== undefined) assignedNames([statement.initializer], names);
    if (statement.update !== undefined) assignedNames([statement.update], names);
    assignedNames(statement.body, names);
  }
}

// skipcq: JS-D1001
function scanStatementAssignedNames(statement: FlintWasmStatement, names: Set<string>): void {
  if (statement.kind === 'assignment' && statement.index === undefined) {
    names.add(statement.name);
    return;
  }
  scanBranchAssignedNames(statement, names);
  scanLoopAssignedNames(statement, names);
}

/** Scans statements collecting names of all reassigned local variables. */
function assignedNames(statements: readonly FlintWasmStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    scanStatementAssignedNames(statement, names);
  }
  return names;
}

/** Result returned from optimizing a statement list including folded statements and termination flag. */
interface StatementResult {
  readonly statements: readonly FlintWasmStatement[];
  readonly environment: Map<string, FlintWasmExpression>;
  readonly fallsThrough: boolean;
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
}

// skipcq: JS-D1001, JS-R1005
function optimizeLetStatement(
  statement: Extract<FlintWasmStatement, { kind: 'let' }>,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): {
  readonly statement: FlintWasmStatement;
  readonly constants: number;
  readonly copies: number;
  readonly offsets: number;
} {
  const resolved = fold(resolve(statement.value, environment));
  let constants = resolved.constants;
  let copies = 0;
  if (enabled && pure(resolved.expression)) {
    environment.set(statement.name, resolved.expression);
    if (resolved.expression.kind === 'identifier') copies += 1;
    else if (resolved.constants > 0 || resolved.expression.kind === 'literal') constants += 1;
  } else {
    environment.delete(statement.name);
  }
  return {
    statement: { ...statement, value: resolved.expression },
    constants,
    copies,
    offsets: resolved.offsets,
  };
}

// skipcq: JS-D1001
function optimizeAssignmentStatement(
  statement: Extract<FlintWasmStatement, { kind: 'assignment' }>,
  environment: Map<string, FlintWasmExpression>,
): { readonly statement: FlintWasmStatement; readonly constants: number; readonly offsets: number } {
  const value = fold(resolve(statement.value, environment));
  const index = statement.index === undefined ? undefined : fold(resolve(statement.index, environment));
  environment.clear();
  if (index === undefined) environment.set(statement.name, value.expression);
  return {
    statement: {
      ...statement,
      value: value.expression,
      ...(index === undefined ? {} : { index: index.expression }),
    },
    constants: value.constants,
    offsets: value.offsets,
  };
}

// skipcq: JS-D1001
function optimizeReturnStatement(
  statement: Extract<FlintWasmStatement, { kind: 'return' }>,
  environment: Map<string, FlintWasmExpression>,
): { readonly statement: FlintWasmStatement; readonly constants: number; readonly offsets: number } {
  const value = statement.value === undefined ? undefined : fold(resolve(statement.value, environment));
  return {
    statement: { ...statement, ...(value === undefined ? {} : { value: value.expression }) },
    constants: value?.constants ?? 0,
    offsets: value?.offsets ?? 0,
  };
}

// skipcq: JS-D1001
function optimizeExpressionStatement(
  statement: Extract<FlintWasmStatement, { kind: 'expression-statement' }>,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): {
  readonly statement?: FlintWasmStatement;
  readonly constants: number;
  readonly dead: number;
  readonly offsets: number;
} {
  const expression = fold(resolve(statement.expression, environment));
  if (enabled && pure(expression.expression)) {
    return { constants: expression.constants, dead: 1, offsets: expression.offsets };
  }
  environment.clear();
  return {
    statement: { ...statement, expression: expression.expression },
    constants: expression.constants,
    dead: 0,
    offsets: expression.offsets,
  };
}

// skipcq: JS-D1001
function selectConstantIfBranch(
  conditionValue: boolean,
  consequent: StatementResult,
  alternate: StatementResult | undefined,
  metrics: { constants: number; copies: number; dead: number; unreachable: number; offsets: number },
  environment: Map<string, FlintWasmExpression>,
): {
  readonly statements: readonly FlintWasmStatement[];
  readonly fallsThrough: boolean;
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
} {
  const selected = conditionValue ? consequent : alternate;
  if (selected === undefined) {
    return { statements: [], fallsThrough: true, ...metrics };
  }
  environment.clear();
  for (const [name, value] of selected.environment.entries()) environment.set(name, value);
  return {
    statements: selected.statements,
    fallsThrough: selected.fallsThrough,
    ...metrics,
  };
}

// skipcq: JS-D1001
function alternateMetrics(alternate: StatementResult | undefined): {
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
} {
  if (alternate === undefined) {
    return { constants: 0, copies: 0, dead: 0, unreachable: 0, offsets: 0 };
  }
  return alternate;
}

// skipcq: JS-D1001, JS-R1005
function optimizeIfStatement(
  statement: Extract<FlintWasmStatement, { kind: 'if' }>,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): {
  readonly statements: readonly FlintWasmStatement[];
  readonly fallsThrough: boolean;
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
} {
  const condition = fold(resolve(statement.condition, environment));
  const consequent = optimizeStatements(statement.consequent, new Map(environment), enabled);
  const alternate =
    statement.alternate === undefined
      ? undefined
      : optimizeStatements(statement.alternate, new Map(environment), enabled);
  const alt = alternateMetrics(alternate);
  const metrics = {
    constants: condition.constants + consequent.constants + alt.constants,
    copies: consequent.copies + alt.copies,
    dead: consequent.dead + alt.dead,
    unreachable: consequent.unreachable + alt.unreachable,
    offsets: consequent.offsets + alt.offsets,
  };

  if (enabled && condition.expression.kind === 'literal' && typeof condition.expression.value === 'boolean') {
    return selectConstantIfBranch(condition.expression.value, consequent, alternate, metrics, environment);
  }

  environment.clear();
  let fallsThrough = true;
  if (alternate !== undefined && !consequent.fallsThrough && !alternate.fallsThrough) {
    fallsThrough = false;
  }
  return {
    statements: [
      {
        ...statement,
        condition: condition.expression,
        consequent: consequent.statements,
        ...(alternate === undefined ? {} : { alternate: alternate.statements }),
      },
    ],
    fallsThrough,
    ...metrics,
  };
}

// skipcq: JS-D1001
function accumulateSwitchMetrics(
  cases: readonly { readonly result: StatementResult }[],
  defaultResult: StatementResult | undefined,
): { constants: number; copies: number; dead: number; unreachable: number; offsets: number } {
  let constants = 0;
  let copies = 0;
  let dead = 0;
  let unreachable = 0;
  let offsets = 0;
  for (const { result } of cases) {
    constants += result.constants;
    copies += result.copies;
    dead += result.dead;
    unreachable += result.unreachable;
    offsets += result.offsets;
  }
  if (defaultResult !== undefined) {
    constants += defaultResult.constants;
    copies += defaultResult.copies;
    dead += defaultResult.dead;
    unreachable += defaultResult.unreachable;
    offsets += defaultResult.offsets;
  }
  return { constants, copies, dead, unreachable, offsets };
}

// skipcq: JS-D1001
function optimizeSwitchStatement(
  statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): {
  readonly statements: readonly FlintWasmStatement[];
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
} {
  const value = fold(resolve(statement.value, environment));
  const cases = statement.cases.map((arm) => {
    const body = optimizeStatements(arm.body, new Map(environment), enabled);
    return { ...arm, body: body.statements, result: body };
  });

  const defaultResult =
    statement.defaultCase === undefined
      ? undefined
      : optimizeStatements(statement.defaultCase, new Map(environment), enabled);

  const metrics = accumulateSwitchMetrics(cases, defaultResult);
  environment.clear();
  return {
    statements: [
      {
        ...statement,
        value: value.expression,
        cases: cases.map(({ result: _result, ...arm }) => arm),
        ...(defaultResult === undefined ? {} : { defaultCase: defaultResult.statements }),
      },
    ],
    constants: value.constants + metrics.constants,
    copies: metrics.copies,
    dead: metrics.dead,
    unreachable: metrics.unreachable,
    offsets: metrics.offsets,
  };
}

// skipcq: JS-D1001
function loopAssignedNames(
  statement: Extract<FlintWasmStatement, { kind: 'while' | 'for' | 'do-while' }>,
): Set<string> {
  const loopStatements =
    statement.kind === 'for'
      ? [
          ...(statement.initializer === undefined ? [] : [statement.initializer]),
          ...(statement.update === undefined ? [] : [statement.update]),
          ...statement.body,
        ]
      : statement.body;
  return assignedNames(loopStatements);
}

// skipcq: JS-D1001
function optimizeWhileOrFor(
  statement: Extract<FlintWasmStatement, { kind: 'while' | 'for' }>,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): {
  readonly statements: readonly FlintWasmStatement[];
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
} {
  const loopEnvironment = new Map(environment);
  for (const name of loopAssignedNames(statement)) loopEnvironment.delete(name);
  const condition = fold(resolve(statement.condition, loopEnvironment));
  if (enabled && condition.expression.kind === 'literal' && condition.expression.value === false) {
    return {
      statements: [],
      constants: condition.constants,
      copies: 0,
      dead: 0,
      unreachable: 0,
      offsets: condition.offsets,
    };
  }
  const body = optimizeStatements(statement.body, new Map(), enabled);
  environment.clear();
  return {
    statements: [{ ...statement, condition: condition.expression, body: body.statements }],
    constants: condition.constants + body.constants,
    copies: body.copies,
    dead: body.dead,
    unreachable: body.unreachable,
    offsets: condition.offsets + body.offsets,
  };
}

// skipcq: JS-D1001
function optimizeDoWhile(
  statement: Extract<FlintWasmStatement, { kind: 'do-while' }>,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): {
  readonly statement: FlintWasmStatement;
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
} {
  const body = optimizeStatements(statement.body, new Map(), enabled);
  const loopEnvironment = new Map(environment);
  for (const name of assignedNames(statement.body)) loopEnvironment.delete(name);
  const condition = fold(resolve(statement.condition, loopEnvironment));
  environment.clear();
  return {
    statement: { ...statement, body: body.statements, condition: condition.expression },
    constants: body.constants + condition.constants,
    copies: body.copies,
    dead: body.dead,
    unreachable: body.unreachable,
    offsets: body.offsets + condition.offsets,
  };
}

interface SingleStatementOptimizationResult {
  readonly statements: readonly FlintWasmStatement[];
  readonly fallsThrough?: boolean;
  readonly constants: number;
  readonly copies?: number;
  readonly dead?: number;
  readonly unreachable?: number;
  readonly offsets: number;
}

// skipcq: JS-D1001, JS-R1005
function optimizeDeclarationOrEffect(
  statement: FlintWasmStatement,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): SingleStatementOptimizationResult | undefined {
  if (statement.kind === 'let') {
    const result = optimizeLetStatement(statement, environment, enabled);
    return {
      statements: [result.statement],
      constants: result.constants,
      copies: result.copies,
      offsets: result.offsets,
    };
  }
  if (statement.kind === 'assignment') {
    const result = optimizeAssignmentStatement(statement, environment);
    return { statements: [result.statement], constants: result.constants, offsets: result.offsets };
  }
  if (statement.kind === 'return') {
    const result = optimizeReturnStatement(statement, environment);
    return {
      statements: [result.statement],
      fallsThrough: false,
      constants: result.constants,
      offsets: result.offsets,
    };
  }
  if (statement.kind === 'expression-statement') {
    const result = optimizeExpressionStatement(statement, environment, enabled);
    return {
      statements: result.statement === undefined ? [] : [result.statement],
      constants: result.constants,
      dead: result.dead,
      offsets: result.offsets,
    };
  }
  return undefined;
}

// skipcq: JS-D1001, JS-R1005
function optimizeSingleStatement(
  statement: FlintWasmStatement,
  environment: Map<string, FlintWasmExpression>,
  enabled: boolean,
): SingleStatementOptimizationResult {
  const declOrEffect = optimizeDeclarationOrEffect(statement, environment, enabled);
  if (declOrEffect !== undefined) return declOrEffect;

  switch (statement.kind) {
    case 'if': {
      return optimizeIfStatement(statement, environment, enabled);
    }
    case 'switch': {
      return optimizeSwitchStatement(statement, environment, enabled);
    }
    case 'while':
    case 'for': {
      return optimizeWhileOrFor(statement, environment, enabled);
    }
    case 'do-while': {
      const result = optimizeDoWhile(statement, environment, enabled);
      return {
        statements: [result.statement],
        constants: result.constants,
        copies: result.copies,
        dead: result.dead,
        unreachable: result.unreachable,
        offsets: result.offsets,
      };
    }
    case 'iterator-loop': {
      environment.clear();
      return {
        statements: [{ ...statement, iterator: resolve(statement.iterator, environment) }],
        constants: 0,
        offsets: 0,
      };
    }
    default: {
      return { statements: [statement], constants: 0, offsets: 0 };
    }
  }
}

/** Optimizes a sequence of statements by eliminating dead code and simplifying branches. */
// skipcq: JS-R1005
function optimizeStatements(
  statements: readonly FlintWasmStatement[],
  input: Environment,
  enabled: boolean,
): StatementResult {
  const output: FlintWasmStatement[] = [];
  const environment = new Map(input);
  let constants = 0;
  let copies = 0;
  let dead = 0;
  let unreachable = 0;
  let offsets = 0;
  let fallsThrough = true;

  for (const statement of statements) {
    if (!fallsThrough) {
      unreachable += 1;
      continue;
    }
    const result = optimizeSingleStatement(statement, environment, enabled);
    constants += result.constants;
    copies += result.copies ?? 0;
    dead += result.dead ?? 0;
    unreachable += result.unreachable ?? 0;
    offsets += result.offsets;
    if (result.fallsThrough !== undefined) {
      fallsThrough = result.fallsThrough;
    }
    output.push(...result.statements);
  }
  return { statements: output, environment, fallsThrough, constants, copies, dead, unreachable, offsets };
}

// skipcq: JS-D1001, JS-R1005
function visitCompoundExpressionCalls(
  expression: FlintWasmExpression,
  functions: ReadonlySet<string>,
  recordCall: () => void,
): void {
  switch (expression.kind) {
    case 'binary': {
      visitExpressionDirectCalls(expression.left, functions, recordCall);
      visitExpressionDirectCalls(expression.right, functions, recordCall);
      break;
    }
    case 'unary': {
      visitExpressionDirectCalls(expression.operand, functions, recordCall);
      break;
    }
    case 'index': {
      visitExpressionDirectCalls(expression.receiver, functions, recordCall);
      visitExpressionDirectCalls(expression.index, functions, recordCall);
      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) visitExpressionDirectCalls(element, functions, recordCall);
      break;
    }
    case 'atomic': {
      visitExpressionDirectCalls(expression.address, functions, recordCall);
      if (expression.value !== undefined) visitExpressionDirectCalls(expression.value, functions, recordCall);
      if (expression.replacement !== undefined)
        visitExpressionDirectCalls(expression.replacement, functions, recordCall);
      break;
    }
    default: {
      break;
    }
  }
}

// skipcq: JS-D1001
function visitExpressionDirectCalls(
  expression: FlintWasmExpression,
  functions: ReadonlySet<string>,
  recordCall: () => void,
): void {
  if (expression.kind === 'call') {
    if (expression.standardLibrary === undefined && functions.has(expression.callee)) recordCall();
    for (const argument of expression.arguments) visitExpressionDirectCalls(argument, functions, recordCall);
    return;
  }
  visitCompoundExpressionCalls(expression, functions, recordCall);
}

// skipcq: JS-D1001, JS-R1005
function visitBranchStatementCalls(
  statement: FlintWasmStatement,
  functions: ReadonlySet<string>,
  recordCall: () => void,
): void {
  if (statement.kind === 'if') {
    visitExpressionDirectCalls(statement.condition, functions, recordCall);
    for (const innerStatement of statement.consequent) visitStatementDirectCalls(innerStatement, functions, recordCall);
    if (statement.alternate !== undefined) {
      for (const innerStatement of statement.alternate)
        visitStatementDirectCalls(innerStatement, functions, recordCall);
    }
  } else if (statement.kind === 'switch') {
    visitExpressionDirectCalls(statement.value, functions, recordCall);
    for (const arm of statement.cases) {
      for (const innerStatement of arm.body) visitStatementDirectCalls(innerStatement, functions, recordCall);
    }
    if (statement.defaultCase !== undefined) {
      for (const innerStatement of statement.defaultCase)
        visitStatementDirectCalls(innerStatement, functions, recordCall);
    }
  }
}

// skipcq: JS-D1001, JS-R1005
function visitLoopStatementCalls(
  statement: FlintWasmStatement,
  functions: ReadonlySet<string>,
  recordCall: () => void,
): void {
  switch (statement.kind) {
    case 'while':
    case 'do-while': {
      visitExpressionDirectCalls(statement.condition, functions, recordCall);
      for (const innerStatement of statement.body) visitStatementDirectCalls(innerStatement, functions, recordCall);
      break;
    }
    case 'for': {
      visitExpressionDirectCalls(statement.condition, functions, recordCall);
      if (statement.initializer !== undefined) visitStatementDirectCalls(statement.initializer, functions, recordCall);
      if (statement.update !== undefined) visitStatementDirectCalls(statement.update, functions, recordCall);
      for (const innerStatement of statement.body) visitStatementDirectCalls(innerStatement, functions, recordCall);
      break;
    }
    case 'iterator-loop': {
      visitExpressionDirectCalls(statement.iterator, functions, recordCall);
      for (const innerStatement of statement.body) visitStatementDirectCalls(innerStatement, functions, recordCall);
      break;
    }
    default: {
      break;
    }
  }
}

// skipcq: JS-D1001, JS-R1005
function visitStatementDirectCalls(
  statement: FlintWasmStatement,
  functions: ReadonlySet<string>,
  recordCall: () => void,
): void {
  if (statement.kind === 'let' || statement.kind === 'assignment') {
    visitExpressionDirectCalls(statement.value, functions, recordCall);
    if (statement.kind === 'assignment' && statement.index !== undefined) {
      visitExpressionDirectCalls(statement.index, functions, recordCall);
    }
    return;
  }
  if (statement.kind === 'return') {
    if (statement.value !== undefined) visitExpressionDirectCalls(statement.value, functions, recordCall);
    return;
  }
  if (statement.kind === 'expression-statement') {
    visitExpressionDirectCalls(statement.expression, functions, recordCall);
    return;
  }
  if (statement.kind === 'yield') {
    visitExpressionDirectCalls(statement.value, functions, recordCall);
    return;
  }
  visitBranchStatementCalls(statement, functions, recordCall);
  visitLoopStatementCalls(statement, functions, recordCall);
}

/** Traverses expressions collecting all directly called function identifiers. */
function directCalls(module: FlintWasmModule): number {
  const functions = new Set(module.functions.map(({ name }) => name));
  let count = 0;
  // skipcq: JS-D1001
  const recordCall = () => {
    count += 1;
  };
  for (const { body } of module.functions) {
    for (const statement of body) {
      visitStatementDirectCalls(statement, functions, recordCall);
    }
  }
  return count;
}

/** Executes the full suite of WebAssembly optimization passes on an IR module. */
export function optimizeFlintWasmModule(
  module: FlintWasmModule,
  optimization: 'debug' | 'release' = 'release',
): FlintWasmStageIr {
  const enabled = optimization === 'release';
  const diagnostics: FlintWasmOptimizationDiagnostic[] = [];
  let constants = 0;
  let copies = 0;
  let dead = 0;
  let unreachable = 0;
  let offsets = 0;
  let constantSwitches = 0;
  const optimizedFunctions = module.functions.map((declaration) => {
    const result = optimizeStatements(declaration.body, new Map(), enabled);
    constants += result.constants;
    copies += result.copies;
    dead += result.dead;
    unreachable += result.unreachable;
    offsets += result.offsets;
    const annotated = validateAndAnnotateSwitches(result.statements, module, diagnostics, enabled);
    const folded = foldConstantSwitches(annotated, module, enabled);
    constantSwitches += folded.folded;
    return {
      ...declaration,
      body: folded.statements,
    };
  });
  // Exported slots stay in source order so the stable ABI/export section does
  // not move; private slots are name-sorted for reproducible internal layout.
  const privateFunctions = optimizedFunctions
    .filter(({ exported }) => !exported)
    .toSorted((left, right) => left.name.localeCompare(right.name));
  let privateIndex = 0;
  const laidOutFunctions = optimizedFunctions.map((declaration) => {
    if (declaration.exported) return declaration;
    const optimized = privateFunctions[privateIndex++];
    return optimized ?? declaration;
  });
  const optimizedModule: FlintWasmModule = { ...module, functions: laidOutFunctions };
  const cfg = new Map(
    laidOutFunctions.map((declaration) => [declaration.name, lowerFlintWasmFunctionToSsa(declaration)]),
  );
  const calls = directCalls(optimizedModule);
  const passes: FlintWasmOptimizationPass[] = [
    { name: 'constant-propagation', applied: constants + constantSwitches, skipped: 0 },
    { name: 'copy-propagation', applied: copies, skipped: 0 },
    { name: 'dead-code-elimination', applied: dead, skipped: 0 },
    { name: 'unreachable-block-removal', applied: unreachable, skipped: 0 },
    { name: 'pointer-offset-simplification', applied: offsets, skipped: 0 },
    { name: 'direct-call-resolution', applied: calls, skipped: 0 },
    {
      name: 'function-layout',
      applied: optimizedFunctions.every((item, index) => laidOutFunctions[index] === item) ? 0 : 1,
      skipped: 0,
    },
    {
      name: 'bounds-check-elision',
      applied: 0,
      skipped: 1,
      reason: 'No proof-carrying bounds annotations are present at the Wasm boundary.',
    },
  ];
  if (!enabled) {
    for (const pass of passes) {
      if (pass.name === 'bounds-check-elision') continue;
      (pass as { applied: number; skipped: number; reason?: string }).applied = 0;
      (pass as { applied: number; skipped: number; reason?: string }).skipped = 1;
      (pass as { applied: number; skipped: number; reason?: string }).reason = 'Debug optimization is disabled.';
    }
  }
  return {
    module: optimizedModule,
    diagnostics,
    report: { stage: 'wasm', optimization, passes, cfg },
  };
}
