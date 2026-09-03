import { lowerForgeWebScriptWasmFunctionToSsa, type ForgeWebScriptWasmSsaPlan } from './cfg.js';

import type {
  ForgeWebScriptWasmExpression,
  ForgeWebScriptWasmModule,
  ForgeWebScriptWasmPrimitiveType,
  ForgeWebScriptWasmSourceSpan,
  ForgeWebScriptWasmStatement,
} from './contracts.js';

export type ForgeWebScriptWasmSwitchStrategy = 'br-table' | 'sparse' | 'constant';

export interface ForgeWebScriptWasmOptimizationDiagnostic {
  readonly code: 'FWS-DISPATCH-001' | 'FWS-DISPATCH-002';
  readonly message: string;
  readonly span: ForgeWebScriptWasmSourceSpan;
}

export interface ForgeWebScriptWasmOptimizationPass {
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

export interface ForgeWebScriptWasmOptimizationReport {
  readonly stage: 'wasm';
  readonly optimization: 'debug' | 'release';
  readonly passes: readonly ForgeWebScriptWasmOptimizationPass[];
  readonly cfg: ReadonlyMap<string, ForgeWebScriptWasmSsaPlan>;
}

export interface ForgeWebScriptWasmStageIr {
  readonly module: ForgeWebScriptWasmModule;
  readonly report: ForgeWebScriptWasmOptimizationReport;
  readonly diagnostics: readonly ForgeWebScriptWasmOptimizationDiagnostic[];
}

type Environment = ReadonlyMap<string, ForgeWebScriptWasmExpression>;

function assignedNames(statements: readonly ForgeWebScriptWasmStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    if (statement.kind === 'assignment' && statement.index === undefined) names.add(statement.name);
    else
      switch (statement.kind) {
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
        case 'for': {
          if (statement.initializer !== undefined) assignedNames([statement.initializer], names);
          if (statement.update !== undefined) assignedNames([statement.update], names);
          assignedNames(statement.body, names);

          break;
        }
        case 'iterator-loop': {
          {
            assignedNames(statement.body, names);
            // No default
          }
          break;
        }
      }
  }
  return names;
}

const literal = (
  value: boolean | number | string,
  span: ForgeWebScriptWasmSourceSpan,
  type: ForgeWebScriptWasmPrimitiveType = typeof value === 'boolean'
    ? 'bool'
    : typeof value === 'string'
      ? 'string'
      : 'i32',
): ForgeWebScriptWasmExpression => ({
  kind: 'literal',
  value,
  type,
  span,
});

function pure(expression: ForgeWebScriptWasmExpression): boolean {
  if (expression.kind === 'literal' || expression.kind === 'identifier') return true;
  if (expression.kind === 'unary') return pure(expression.operand);
  if (expression.kind === 'binary') return pure(expression.left) && pure(expression.right);
  return false;
}

function normalizeInteger(value: number, type: ForgeWebScriptWasmPrimitiveType): number {
  // eslint-disable-next-line unicorn/prefer-math-trunc -- i32 normalization must preserve WebAssembly wrapping semantics.
  return type === 'u32' ? value >>> 0 : value | 0;
}

function foldNumbers(
  operator: Extract<ForgeWebScriptWasmExpression, { kind: 'binary' }>['operator'],
  left: number,
  right: number,
  type: ForgeWebScriptWasmPrimitiveType,
): boolean | number | undefined {
  if (type === 'i64' || type === 'u64') return undefined;
  const integer32 = type === 'i32' || type === 'u32';
  const a = integer32 ? normalizeInteger(left, type) : left;
  const b = integer32 ? normalizeInteger(right, type) : right;
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
    case '/': {
      if (b === 0) return undefined;
      return integer32 ? normalizeInteger(Math.trunc(a / b), type) : Math.trunc(a / b);
    }
    case '%': {
      if (b === 0) return undefined;
      return integer32 ? normalizeInteger(a % b, type) : a % b;
    }
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
    case '&&':
    case '||': {
      return undefined;
    }
  }
}

function resolve(
  expression: ForgeWebScriptWasmExpression,
  environment: Environment,
  resolving = new Set<string>(),
): ForgeWebScriptWasmExpression {
  if (expression.kind === 'identifier') {
    if (resolving.has(expression.name)) return expression;
    const replacement = environment.get(expression.name);
    if (replacement === undefined || (replacement.kind === 'identifier' && replacement.name === expression.name))
      return expression;
    return resolve(replacement, environment, new Set(resolving).add(expression.name));
  }
  if (expression.kind === 'unary')
    return { ...expression, operand: resolve(expression.operand, environment, resolving) };
  if (expression.kind === 'binary')
    return {
      ...expression,
      left: resolve(expression.left, environment, resolving),
      right: resolve(expression.right, environment, resolving),
    };
  if (expression.kind === 'call')
    return {
      ...expression,
      arguments: expression.arguments.map((item) => resolve(item, environment, resolving)),
    };
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return { ...expression, elements: expression.elements.map((item) => resolve(item, environment, resolving)) };
  if (expression.kind === 'index')
    return {
      ...expression,
      receiver: resolve(expression.receiver, environment, resolving),
      index: resolve(expression.index, environment, resolving),
    };
  if (expression.kind === 'atomic')
    return {
      ...expression,
      address: resolve(expression.address, environment, resolving),
      ...(expression.value === undefined ? {} : { value: resolve(expression.value, environment, resolving) }),
      ...(expression.replacement === undefined
        ? {}
        : { replacement: resolve(expression.replacement, environment, resolving) }),
    };
  return expression;
}

function fold(expression: ForgeWebScriptWasmExpression): {
  readonly expression: ForgeWebScriptWasmExpression;
  readonly constants: number;
  readonly offsets: number;
} {
  if (expression.kind === 'call') {
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
      if (first !== undefined)
        return {
          expression: first.expression,
          constants: argumentsWithFolds.reduce((total, item) => total + item.constants, 0),
          offsets: argumentsWithFolds.reduce((total, item) => total + item.offsets, 0),
        };
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
  if (expression.kind === 'unary') {
    const operand = fold(expression.operand);
    if (operand.expression.kind === 'literal') {
      if (expression.operator === '!' && typeof operand.expression.value === 'boolean')
        return {
          expression: literal(!operand.expression.value, expression.span),
          constants: operand.constants + 1,
          offsets: operand.offsets,
        };
      if (
        expression.operator === '-' &&
        typeof operand.expression.value === 'number' &&
        operand.expression.type !== 'i64' &&
        operand.expression.type !== 'u64'
      )
        return {
          expression: literal(
            operand.expression.type === 'i32' || operand.expression.type === 'u32'
              ? normalizeInteger(-operand.expression.value, operand.expression.type)
              : -operand.expression.value,
            expression.span,
            operand.expression.type,
          ),
          constants: operand.constants + 1,
          offsets: operand.offsets,
        };
    }
    return {
      expression: { ...expression, operand: operand.expression },
      constants: operand.constants,
      offsets: operand.offsets,
    };
  }
  if (expression.kind !== 'binary') return { expression, constants: 0, offsets: 0 };
  const left = fold(expression.left);
  const right = fold(expression.right);
  const a = left.expression;
  const b = right.expression;
  if (a.kind === 'literal' && b.kind === 'literal') {
    const av = a.value;
    const bv = b.value;
    let result: boolean | number | string | undefined;
    if (typeof av === 'number' && typeof bv === 'number') {
      result = foldNumbers(expression.operator, av, bv, a.type);
    } else if (expression.operator === '==' || expression.operator === '!=') {
      result = expression.operator === '==' ? av === bv : av !== bv;
    } else if (expression.operator === '&&' && typeof av === 'boolean' && typeof bv === 'boolean') result = av && bv;
    else if (expression.operator === '||' && typeof av === 'boolean' && typeof bv === 'boolean') result = av || bv;
    if (result !== undefined)
      return {
        expression: literal(
          result,
          expression.span,
          expression.operator === '<' ||
            expression.operator === '<=' ||
            expression.operator === '==' ||
            expression.operator === '!=' ||
            expression.operator === '>' ||
            expression.operator === '>=' ||
            expression.operator === '&&' ||
            expression.operator === '||'
            ? 'bool'
            : a.type,
        ),
        constants: left.constants + right.constants + 1,
        offsets: left.offsets + right.offsets,
      };
  }
  // Fold address expressions without touching unknown pointer arithmetic.
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
  return {
    expression: { ...expression, left: a, right: b },
    constants: left.constants + right.constants,
    offsets: left.offsets + right.offsets,
  };
}

interface StatementResult {
  readonly statements: readonly ForgeWebScriptWasmStatement[];
  readonly environment: Map<string, ForgeWebScriptWasmExpression>;
  readonly fallsThrough: boolean;
  readonly constants: number;
  readonly copies: number;
  readonly dead: number;
  readonly unreachable: number;
  readonly offsets: number;
}

function optimizeStatements(
  statements: readonly ForgeWebScriptWasmStatement[],
  input: Environment,
  enabled: boolean,
): StatementResult {
  const output: ForgeWebScriptWasmStatement[] = [];
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
    if (statement.kind === 'let') {
      const resolved = fold(resolve(statement.value, environment));
      constants += resolved.constants;
      offsets += resolved.offsets;
      if (enabled && pure(resolved.expression)) {
        environment.set(statement.name, resolved.expression);
        if (resolved.expression.kind === 'identifier') copies += 1;
        else if (resolved.constants > 0 || resolved.expression.kind === 'literal') constants += 1;
        // Keep the binding: propagation is an emitter optimization, while the
        // local remains necessary when a value crosses a call or loop boundary.
      } else environment.delete(statement.name);
      output.push({ ...statement, value: resolved.expression });
      continue;
    }
    if (statement.kind === 'assignment') {
      const value = fold(resolve(statement.value, environment));
      const index = statement.index === undefined ? undefined : fold(resolve(statement.index, environment));
      constants += value.constants;
      offsets += value.offsets;
      // An assignment can invalidate any previously propagated expression,
      // including aliases that depend on the assigned local.
      environment.clear();
      if (index === undefined) environment.set(statement.name, value.expression);
      output.push({
        ...statement,
        value: value.expression,
        ...(index === undefined ? {} : { index: index.expression }),
      });
      continue;
    }
    if (statement.kind === 'return') {
      const value = statement.value === undefined ? undefined : fold(resolve(statement.value, environment));
      if (value !== undefined) {
        constants += value.constants;
        offsets += value.offsets;
      }
      output.push({ ...statement, ...(value === undefined ? {} : { value: value.expression }) });
      fallsThrough = false;
      continue;
    }
    if (statement.kind === 'expression-statement') {
      const expression = fold(resolve(statement.expression, environment));
      constants += expression.constants;
      offsets += expression.offsets;
      if (enabled && pure(expression.expression)) {
        dead += 1;
        continue;
      }
      output.push({ ...statement, expression: expression.expression });
      environment.clear();
      continue;
    }
    if (statement.kind === 'if') {
      const condition = fold(resolve(statement.condition, environment));
      constants += condition.constants;
      const consequent = optimizeStatements(statement.consequent, new Map(environment), enabled);
      const alternate =
        statement.alternate === undefined
          ? undefined
          : optimizeStatements(statement.alternate, new Map(environment), enabled);
      constants += consequent.constants + (alternate?.constants ?? 0);
      copies += consequent.copies + (alternate?.copies ?? 0);
      dead += consequent.dead + (alternate?.dead ?? 0);
      unreachable += consequent.unreachable + (alternate?.unreachable ?? 0);
      offsets += consequent.offsets + (alternate?.offsets ?? 0);
      if (enabled && condition.expression.kind === 'literal' && typeof condition.expression.value === 'boolean') {
        const selected = condition.expression.value ? consequent : alternate;
        if (selected === undefined) continue;
        output.push(...selected.statements);
        environment.clear();
        for (const [name, value] of selected.environment.entries()) environment.set(name, value);
        fallsThrough = selected.fallsThrough;
      } else {
        output.push({
          ...statement,
          condition: condition.expression,
          consequent: consequent.statements,
          ...(alternate === undefined ? {} : { alternate: alternate.statements }),
        });
        environment.clear();
        if (alternate !== undefined && !consequent.fallsThrough && !alternate.fallsThrough) fallsThrough = false;
      }
      continue;
    }
    if (statement.kind === 'switch') {
      const value = fold(resolve(statement.value, environment));
      constants += value.constants;
      const cases = statement.cases.map((arm) => {
        const body = optimizeStatements(arm.body, new Map(environment), enabled);
        return { ...arm, body: body.statements, result: body };
      });
      const defaultResult =
        statement.defaultCase === undefined
          ? undefined
          : optimizeStatements(statement.defaultCase, new Map(environment), enabled);
      for (const { result } of cases) {
        constants += result.constants;
        copies += result.copies;
        dead += result.dead;
        unreachable += result.unreachable;
        offsets += result.offsets;
      }
      constants += defaultResult?.constants ?? 0;
      copies += defaultResult?.copies ?? 0;
      dead += defaultResult?.dead ?? 0;
      unreachable += defaultResult?.unreachable ?? 0;
      offsets += defaultResult?.offsets ?? 0;
      output.push({
        ...statement,
        value: value.expression,
        cases: cases.map(({ result: _result, ...arm }) => arm),
        ...(defaultResult === undefined ? {} : { defaultCase: defaultResult.statements }),
      });
      environment.clear();
      continue;
    }
    if (statement.kind === 'while' || statement.kind === 'for') {
      // Loops invalidate copies at the backedge. A false literal condition is safe to remove.
      const loopEnvironment = new Map(environment);
      const loopStatements =
        statement.kind === 'for'
          ? [
              ...(statement.initializer === undefined ? [] : [statement.initializer]),
              ...(statement.update === undefined ? [] : [statement.update]),
              ...statement.body,
            ]
          : statement.body;
      for (const name of assignedNames(loopStatements)) loopEnvironment.delete(name);
      const condition = fold(resolve(statement.condition, loopEnvironment));
      constants += condition.constants;
      if (enabled && condition.expression.kind === 'literal' && condition.expression.value === false) continue;
      const body = optimizeStatements(statement.body, new Map(), enabled);
      constants += body.constants;
      copies += body.copies;
      dead += body.dead;
      unreachable += body.unreachable;
      offsets += body.offsets;
      environment.clear();
      output.push({ ...statement, condition: condition.expression, body: body.statements });
      continue;
    }
    if (statement.kind === 'do-while') {
      const body = optimizeStatements(statement.body, new Map(), enabled);
      const loopEnvironment = new Map(environment);
      for (const name of assignedNames(statement.body)) loopEnvironment.delete(name);
      const condition = fold(resolve(statement.condition, loopEnvironment));
      constants += body.constants + condition.constants;
      copies += body.copies;
      dead += body.dead;
      unreachable += body.unreachable;
      offsets += body.offsets;
      environment.clear();
      output.push({ ...statement, body: body.statements, condition: condition.expression });
      continue;
    }
    if (statement.kind === 'iterator-loop') {
      output.push({ ...statement, iterator: resolve(statement.iterator, environment) });
      environment.clear();
      continue;
    }
    output.push(statement);
  }
  return { statements: output, environment, fallsThrough, constants, copies, dead, unreachable, offsets };
}

function caseValue(value: number | string, module: ForgeWebScriptWasmModule): number | undefined {
  if (typeof value === 'number') return Number.isInteger(value) ? value : undefined;
  for (const declaration of module.enumDeclarations ?? []) {
    const variant = declaration.variants.find((item) => item.name === value);
    if (variant !== undefined) return variant.value;
  }
  return undefined;
}

function validateAndAnnotateSwitches(
  statements: readonly ForgeWebScriptWasmStatement[],
  module: ForgeWebScriptWasmModule,
  diagnostics: ForgeWebScriptWasmOptimizationDiagnostic[],
  enabled: boolean,
): readonly ForgeWebScriptWasmStatement[] {
  return statements.map((statement) => {
    if (statement.kind === 'switch') {
      const values = statement.cases.map((arm) => caseValue(arm.value, module));
      if (values.includes(undefined)) {
        let index = -1;
        for (const [candidateIndex, value] of values.entries()) {
          if (value === undefined) {
            index = candidateIndex;
            break;
          }
        }
        diagnostics.push({
          code: 'FWS-DISPATCH-001',
          message: `Invalid switch case "${String(statement.cases[index]?.value)}".`,
          span: statement.span,
        });
      }
      const validValues = values.filter((value): value is number => value !== undefined);
      if (new Set(validValues).size !== validValues.length)
        diagnostics.push({ code: 'FWS-DISPATCH-002', message: 'Duplicate switch case value.', span: statement.span });
      const minimum = validValues.length === 0 ? 0 : Math.min(...validValues);
      const maximum = validValues.length === 0 ? 0 : Math.max(...validValues);
      const tableLength = maximum - minimum + 1;
      const strategy: ForgeWebScriptWasmSwitchStrategy =
        validValues.length === 0
          ? 'sparse'
          : tableLength <= 65_536 && tableLength <= validValues.length * 4
            ? 'br-table'
            : 'sparse';
      return {
        ...statement,
        ...(enabled ? { strategy } : {}),
        cases: statement.cases.map((arm, index) => ({
          ...arm,
          value: values[index] ?? arm.value,
          body: validateAndAnnotateSwitches(arm.body, module, diagnostics, enabled),
        })),
        ...(statement.defaultCase === undefined
          ? {}
          : { defaultCase: validateAndAnnotateSwitches(statement.defaultCase, module, diagnostics, enabled) }),
      };
    }
    if (statement.kind === 'if')
      return {
        ...statement,
        consequent: validateAndAnnotateSwitches(statement.consequent, module, diagnostics, enabled),
        ...(statement.alternate === undefined
          ? {}
          : { alternate: validateAndAnnotateSwitches(statement.alternate, module, diagnostics, enabled) }),
      };
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'for')
      return { ...statement, body: validateAndAnnotateSwitches(statement.body, module, diagnostics, enabled) };
    if (statement.kind === 'iterator-loop')
      return { ...statement, body: validateAndAnnotateSwitches(statement.body, module, diagnostics, enabled) };
    return statement;
  });
}

function foldConstantSwitches(
  statements: readonly ForgeWebScriptWasmStatement[],
  module: ForgeWebScriptWasmModule,
  enabled: boolean,
): { readonly statements: readonly ForgeWebScriptWasmStatement[]; readonly folded: number } {
  let folded = 0;
  const output: ForgeWebScriptWasmStatement[] = [];
  for (const statement of statements) {
    switch (statement.kind) {
      case 'switch': {
        const cases = statement.cases.map((arm) => {
          const result = foldConstantSwitches(arm.body, module, enabled);
          folded += result.folded;
          return { ...arm, body: result.statements };
        });
        const defaultCase =
          statement.defaultCase === undefined
            ? undefined
            : foldConstantSwitches(statement.defaultCase, module, enabled);
        folded += defaultCase?.folded ?? 0;
        const value = statement.value;
        if (enabled && value.kind === 'literal') {
          const selected = cases.find((arm) => caseValue(arm.value, module) === value.value);
          if (selected !== undefined) {
            output.push(...selected.body);
            folded += 1;
            continue;
          }
          if (defaultCase !== undefined) {
            output.push(...defaultCase.statements);
            folded += 1;
            continue;
          }
        }
        output.push({
          ...statement,
          cases,
          ...(defaultCase === undefined ? {} : { defaultCase: defaultCase.statements }),
        });

        break;
      }
      case 'if': {
        const consequent = foldConstantSwitches(statement.consequent, module, enabled);
        const alternate =
          statement.alternate === undefined ? undefined : foldConstantSwitches(statement.alternate, module, enabled);
        folded += consequent.folded + (alternate?.folded ?? 0);
        output.push({
          ...statement,
          consequent: consequent.statements,
          ...(alternate === undefined ? {} : { alternate: alternate.statements }),
        });

        break;
      }
      case 'while':
      case 'do-while':
      case 'for':
      case 'iterator-loop': {
        const body = foldConstantSwitches(statement.body, module, enabled);
        folded += body.folded;
        output.push({ ...statement, body: body.statements });

        break;
      }
      default: {
        output.push(statement);
      }
    }
  }
  return { statements: output, folded };
}

function directCalls(module: ForgeWebScriptWasmModule): number {
  const functions = new Set(module.functions.map(({ name }) => name));
  let count = 0;
  const visit = (expression: ForgeWebScriptWasmExpression): void => {
    switch (expression.kind) {
      case 'call': {
        if (expression.standardLibrary === undefined && functions.has(expression.callee)) count += 1;
        for (const argument of expression.arguments) visit(argument);

        break;
      }
      case 'binary': {
        visit(expression.left);
        visit(expression.right);

        break;
      }
      case 'unary': {
        visit(expression.operand);
        break;
      }
      case 'index': {
        visit(expression.receiver);
        visit(expression.index);

        break;
      }
      case 'array-literal':
      case 'vector-literal': {
        for (const element of expression.elements) visit(element);
        break;
      }
      case 'atomic': {
        visit(expression.address);
        if (expression.value !== undefined) visit(expression.value);
        if (expression.replacement !== undefined) visit(expression.replacement);

        break;
      }
      // No default
    }
  };
  const visitStatements = (statements: readonly ForgeWebScriptWasmStatement[]): void => {
    for (const statement of statements) {
      switch (statement.kind) {
        case 'let':
        case 'assignment': {
          visit(statement.value);
          if (statement.kind === 'assignment' && statement.index !== undefined) visit(statement.index);

          break;
        }
        case 'return': {
          if (statement.value !== undefined) visit(statement.value);

          break;
        }
        case 'expression-statement': {
          visit(statement.expression);
          break;
        }
        case 'if': {
          visit(statement.condition);
          visitStatements(statement.consequent);
          if (statement.alternate !== undefined) visitStatements(statement.alternate);

          break;
        }
        case 'switch': {
          visit(statement.value);
          for (const arm of statement.cases) visitStatements(arm.body);
          if (statement.defaultCase !== undefined) visitStatements(statement.defaultCase);

          break;
        }
        case 'while':
        case 'do-while': {
          visit(statement.condition);
          visitStatements(statement.body);

          break;
        }
        case 'for': {
          visit(statement.condition);
          if (statement.initializer !== undefined) visitStatements([statement.initializer]);
          if (statement.update !== undefined) visitStatements([statement.update]);
          visitStatements(statement.body);

          break;
        }
        case 'iterator-loop': {
          visit(statement.iterator);
          visitStatements(statement.body);

          break;
        }
        case 'yield': {
          {
            visit(statement.value);
            // No default
          }
          break;
        }
      }
    }
  };
  for (const { body } of module.functions) visitStatements(body);
  return count;
}

export function optimizeForgeWebScriptWasmModule(
  module: ForgeWebScriptWasmModule,
  optimization: 'debug' | 'release' = 'release',
): ForgeWebScriptWasmStageIr {
  const enabled = optimization === 'release';
  const diagnostics: ForgeWebScriptWasmOptimizationDiagnostic[] = [];
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
  const laidOutFunctions = optimizedFunctions.map((declaration) =>
    declaration.exported ? declaration : privateFunctions[privateIndex++]!,
  );
  const optimizedModule: ForgeWebScriptWasmModule = { ...module, functions: laidOutFunctions };
  const cfg = new Map(
    laidOutFunctions.map((declaration) => [declaration.name, lowerForgeWebScriptWasmFunctionToSsa(declaration)]),
  );
  const calls = directCalls(optimizedModule);
  const passes: ForgeWebScriptWasmOptimizationPass[] = [
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
