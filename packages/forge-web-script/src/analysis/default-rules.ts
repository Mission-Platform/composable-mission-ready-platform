import { FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES } from './contracts.js';

import type {
  ForgeWebScriptAnalysisContext,
  ForgeWebScriptAnalysisEvidence,
  ForgeWebScriptAnalysisFinding,
  ForgeWebScriptAnalysisRule,
} from './contracts.js';
import type { ForgeWebScriptTypeName } from '../ast.js';
import type { ForgeWebScriptIrExpression, ForgeWebScriptIrStatement } from '../ir.js';

type Constant = boolean | number | string | undefined;
type Environment = Map<string, Constant>;

interface RangeFlow {
  readonly environment: Environment;
  readonly reachable: boolean;
}

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

function evidence(
  message: string,
  span: ForgeWebScriptAnalysisFinding['span'],
  value?: Constant,
): ForgeWebScriptAnalysisEvidence {
  return { message, span, ...(value === undefined ? {} : { value }) };
}

function finding(
  context: ForgeWebScriptAnalysisContext,
  ruleId: string,
  category: ForgeWebScriptAnalysisFinding['category'],
  code: string,
  message: string,
  span: ForgeWebScriptAnalysisFinding['span'],
  hint: string,
  options?: Pick<ForgeWebScriptAnalysisFinding, 'severity' | 'evidence' | 'owasp' | 'cwe'>,
): ForgeWebScriptAnalysisFinding {
  return {
    code,
    ruleId,
    category,
    severity: options?.severity ?? 'error',
    message,
    fileName: context.fileName,
    span,
    hint,
    ...(options?.evidence === undefined ? {} : { evidence: options.evidence }),
    ...(options?.owasp === undefined ? {} : { owasp: options.owasp }),
    ...(options?.cwe === undefined ? {} : { cwe: options.cwe }),
  };
}

function evaluate(expression: ForgeWebScriptIrExpression, environment: ReadonlyMap<string, Constant>): Constant {
  if (expression.kind === 'literal') return expression.value;
  if (expression.kind === 'identifier') return environment.get(expression.name);
  if (expression.kind === 'unary') {
    const operand = evaluate(expression.operand, environment);
    if (expression.operator === '-' && typeof operand === 'number') return -operand;
    if (expression.operator === '!' && typeof operand === 'boolean') return !operand;
    return undefined;
  }
  if (expression.kind !== 'binary') return undefined;
  const left = evaluate(expression.left, environment);
  const right = evaluate(expression.right, environment);
  if (typeof left === 'number' && typeof right === 'number') {
    switch (expression.operator) {
      case '+': {
        return left + right;
      }
      case '-': {
        return left - right;
      }
      case '*': {
        return left * right;
      }
      case '/': {
        return right === 0 ? undefined : left / right;
      }
      case '%': {
        return right === 0 ? undefined : left % right;
      }
      case '<': {
        return left < right;
      }
      case '<=': {
        return left <= right;
      }
      case '>': {
        return left > right;
      }
      case '>=': {
        return left >= right;
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
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    if (expression.operator === '&&') return left && right;
    if (expression.operator === '||') return left || right;
    if (expression.operator === '==') return left === right;
    if (expression.operator === '!=') return left !== right;
  }
  return undefined;
}

function typeName(type: ForgeWebScriptTypeName): string {
  return type.reference ?? type.name;
}

function constantLength(
  expression: ForgeWebScriptIrExpression,
  environment: ReadonlyMap<string, Constant>,
): number | undefined {
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') return expression.elements.length;
  if (expression.kind === 'literal' && typeof expression.value === 'string')
    return new TextEncoder().encode(expression.value).length;
  if (expression.kind === 'identifier') {
    const value = environment.get(`length:${expression.name}`);
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

function visitExpression(
  expression: ForgeWebScriptIrExpression,
  visit: (expression: ForgeWebScriptIrExpression) => void,
): void {
  visit(expression);
  switch (expression.kind) {
    case 'call': {
      for (const argument of expression.arguments) visitExpression(argument, visit);
      break;
    }
    case 'binary': {
      visitExpression(expression.left, visit);
      visitExpression(expression.right, visit);
      break;
    }
    case 'unary': {
      visitExpression(expression.operand, visit);
      break;
    }
    case 'index': {
      visitExpression(expression.receiver, visit);
      visitExpression(expression.index, visit);
      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) visitExpression(element, visit);
      break;
    }
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) visitExpression(value, visit);
      break;
    }
    case 'enum-value': {
      for (const argument of expression.arguments) visitExpression(argument, visit);
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

function visitStatements(
  statements: readonly ForgeWebScriptIrStatement[],
  visit: (statement: ForgeWebScriptIrStatement) => void,
): void {
  for (const statement of statements) {
    visit(statement);
    switch (statement.kind) {
      case 'if': {
        visitExpression(statement.condition, () => {});
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
}

function expressionsOf(statement: ForgeWebScriptIrStatement): readonly ForgeWebScriptIrExpression[] {
  switch (statement.kind) {
    case 'let': {
      return [statement.value];
    }
    case 'assignment': {
      return [statement.value];
    }
    case 'return': {
      return statement.value === undefined ? [] : [statement.value];
    }
    case 'expression-statement': {
      return [statement.expression];
    }
    case 'if': {
      return [statement.condition];
    }
    case 'while':
    case 'do-while': {
      return [statement.condition];
    }
    case 'match-statement': {
      return [statement.value];
    }
    case 'yield': {
      return [statement.value];
    }
    case 'iterator-loop': {
      return [statement.iterator];
    }
    case 'switch': {
      return [statement.value];
    }
  }
}

function guaranteedReturn(statements: readonly ForgeWebScriptIrStatement[]): boolean {
  for (const statement of statements) {
    if (statement.kind === 'return') return true;
    if (
      statement.kind === 'if' &&
      statement.alternate !== undefined &&
      guaranteedReturn(statement.consequent) &&
      guaranteedReturn(statement.alternate)
    )
      return true;
    if (
      (statement.kind === 'while' || statement.kind === 'do-while') &&
      statement.condition.kind === 'literal' &&
      statement.condition.value === true &&
      guaranteedReturn(statement.body)
    )
      return true;
    if (
      statement.kind === 'switch' &&
      statement.defaultCase !== undefined &&
      statement.cases.every((arm) => guaranteedReturn(arm.body)) &&
      guaranteedReturn(statement.defaultCase)
    )
      return true;
  }
  return false;
}

function containsConditional(statements: readonly ForgeWebScriptIrStatement[]): boolean {
  return statements.some((statement) => {
    if (statement.kind === 'if' || statement.kind === 'switch' || statement.kind === 'match-statement') return true;
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop')
      return containsConditional(statement.body);
    return false;
  });
}

const correctnessRule: ForgeWebScriptAnalysisRule = {
  id: 'fws.correctness.control-flow',
  category: 'control-flow',
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: ForgeWebScriptAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      if (typeName(declaration.result) !== 'unit' && !declaration.iterable && !guaranteedReturn(declaration.body))
        findings.push(
          finding(
            context,
            'fws.correctness.control-flow',
            'control-flow',
            `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.controlFlow}-001`,
            `Function '${declaration.name}' does not return a value on every path.`,
            declaration.span,
            'Return a value on every branch or make the function return unit.',
            { severity: 'error', cwe: ['CWE-457'] },
          ),
        );
      let reachable = true;
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
              `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.controlFlow}-002`,
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
              `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.controlFlow}-002`,
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

/* eslint-disable unicorn/consistent-function-scoping -- recursive visitors close over per-function findings. */
const rangeRule: ForgeWebScriptAnalysisRule = {
  id: 'fws.safety.ranges-and-bounds',
  category: 'memory',
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: ForgeWebScriptAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      const initialEnvironment: Environment = new Map();
      for (const parameter of declaration.parameters) initialEnvironment.set(parameter.name, undefined);
      // Each recursive call owns a state snapshot. Only facts equal on every reachable
      // branch are retained at a control-flow join.
      const visit = (
        statements: readonly ForgeWebScriptIrStatement[],
        input: ReadonlyMap<string, Constant>,
      ): RangeFlow => {
        const environment: Environment = new Map(input);
        let reachable = true;
        for (const statement of statements) {
          if (!reachable) break;
          for (const expression of expressionsOf(statement)) {
            visitExpression(expression, (node) => {
              if (
                node.kind === 'binary' &&
                (node.operator === '/' || node.operator === '%') &&
                evaluate(node.right, environment) === 0
              )
                findings.push(
                  finding(
                    context,
                    'fws.safety.ranges-and-bounds',
                    'memory',
                    `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.memory}-001`,
                    'Division by zero is provable on this path.',
                    node.right.span,
                    'Guard the divisor before performing the operation.',
                    { severity: 'error', cwe: ['CWE-369'] },
                  ),
                );
              if (node.kind === 'index') {
                const index = evaluate(node.index, environment);
                const length = constantLength(node.receiver, environment);
                if (
                  typeof index === 'number' &&
                  length !== undefined &&
                  (!Number.isInteger(index) || index < 0 || index >= length)
                )
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ranges-and-bounds',
                      'memory',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.memory}-002`,
                      `Collection index ${index} is outside its known length ${length}.`,
                      node.index.span,
                      'Use a bounds check or an option-returning collection operation.',
                      { severity: 'error', owasp: ['A08'], cwe: ['CWE-129'] },
                    ),
                  );
              }
              if (node.kind === 'call' && node.standardLibrary === 'array-length') {
                const receiver = node.arguments[0];
                if (receiver !== undefined)
                  environment.set(
                    `length:${receiver.kind === 'identifier' ? receiver.name : ''}`,
                    constantLength(receiver, environment),
                  );
              }
              if (
                node.kind === 'call' &&
                (node.standardLibrary === 'string-byte-at' ||
                  node.standardLibrary === 'bytes-byte-at' ||
                  node.standardLibrary === 'bytes-byte-at-u32')
              ) {
                const index = node.arguments.at(-1);
                const receiver = node.arguments[0];
                const value = index === undefined ? undefined : evaluate(index, environment);
                const length = receiver === undefined ? undefined : constantLength(receiver, environment);
                if (typeof value === 'number' && length !== undefined && (value < 0 || value >= length))
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ranges-and-bounds',
                      'memory',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.memory}-003`,
                      `Byte index ${value} is outside its known length ${length}.`,
                      index!.span,
                      'Check the index against the byte/string length.',
                      { severity: 'error', cwe: ['CWE-125'] },
                    ),
                  );
              }
              if (node.kind === 'call' && node.standardLibrary === 'string-slice') {
                const start = node.arguments.at(-2);
                const end = node.arguments.at(-1);
                const length =
                  node.arguments[0] === undefined ? undefined : constantLength(node.arguments[0], environment);
                const startValue = start === undefined ? undefined : evaluate(start, environment);
                const endValue = end === undefined ? undefined : evaluate(end, environment);
                if (
                  length !== undefined &&
                  typeof startValue === 'number' &&
                  typeof endValue === 'number' &&
                  (startValue < 0 || endValue < startValue || endValue > length)
                )
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ranges-and-bounds',
                      'memory',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.memory}-004`,
                      'String slice bounds exceed the known string length.',
                      node.span,
                      'Clamp or validate both slice bounds before slicing.',
                      { severity: 'error', cwe: ['CWE-125'] },
                    ),
                  );
              }
            });
          }
          if (statement.kind === 'let') {
            const value = evaluate(statement.value, environment);
            const bounds = integerBounds[statement.type.name];
            if (
              bounds !== undefined &&
              typeof value === 'number' &&
              (!Number.isInteger(value) || value < bounds[0] || value > bounds[1])
            )
              findings.push(
                finding(
                  context,
                  'fws.safety.ranges-and-bounds',
                  'memory',
                  `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.memory}-005`,
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
            environment.set(statement.name, value);
            const length = constantLength(statement.value, environment);
            if (length !== undefined) environment.set(`length:${statement.name}`, length);
          } else if (statement.kind === 'assignment')
            environment.set(statement.name, evaluate(statement.value, environment));
          if (statement.kind === 'return') {
            reachable = false;
            continue;
          }
          switch (statement.kind) {
            case 'if': {
              const branchInput = new Map(environment);
              const branches: RangeFlow[] = [visit(statement.consequent, branchInput)];
              if (statement.alternate === undefined)
                branches.push({ environment: new Map(branchInput), reachable: true });
              else branches.push(visit(statement.alternate, branchInput));
              const reachableBranches = branches.filter(({ reachable: branchReachable }) => branchReachable);
              if (reachableBranches.length === 0) reachable = false;
              else {
                environment.clear();
                for (const [name, value] of mergeEnvironments(
                  reachableBranches.map(({ environment: branchEnvironment }) => branchEnvironment),
                ))
                  environment.set(name, value);
              }

              break;
            }
            case 'while':
            case 'do-while':
            case 'iterator-loop': {
              visit(statement.body, new Map(environment));
              break;
            }
            case 'switch': {
              const branchInput = new Map(environment);
              const branches = statement.cases.map((arm) => visit(arm.body, branchInput));
              if (statement.defaultCase === undefined)
                branches.push({ environment: new Map(branchInput), reachable: true });
              else branches.push(visit(statement.defaultCase, branchInput));
              const reachableBranches = branches.filter(({ reachable: branchReachable }) => branchReachable);
              if (reachableBranches.length === 0) reachable = false;
              else {
                environment.clear();
                for (const [name, value] of mergeEnvironments(
                  reachableBranches.map(({ environment: branchEnvironment }) => branchEnvironment),
                ))
                  environment.set(name, value);
              }

              break;
            }
            // No default
          }
        }
        return { environment, reachable };
      };
      visit(declaration.body, initialEnvironment);
    }
    return findings;
  },
};

interface Allocation {
  readonly size: number | undefined;
  released: boolean;
}

interface OwnershipFlow {
  readonly allocations: Map<string, Allocation>;
  readonly environment: Environment;
  readonly reachable: boolean;
}

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

function mergeAllocations(states: readonly Map<string, Allocation>[]): Map<string, Allocation> {
  const merged = new Map<string, Allocation>();
  const first = states[0];
  if (first === undefined) return merged;
  const names = [...first.keys()].filter((name) => states.every((state) => state.has(name)));
  const mergedAliases = new Map<Allocation, Allocation>();
  for (const name of names) {
    const firstAllocation = first.get(name)!;
    let allocation = mergedAliases.get(firstAllocation);
    const aliases = names.filter((candidate) => first.get(candidate) === firstAllocation);
    const aliasingAgrees = aliases.every((candidate) =>
      states.every((state) => state.get(candidate) === state.get(name)),
    );
    if (allocation === undefined || !aliasingAgrees) {
      const candidates = states.map((state) => state.get(name)!);
      const size = candidates.every((candidate) => Object.is(candidate.size, candidates[0]!.size))
        ? candidates[0]!.size
        : undefined;
      allocation = { size, released: candidates.some((candidate) => candidate.released) };
      if (aliasingAgrees) mergedAliases.set(firstAllocation, allocation);
    }
    merged.set(name, allocation);
  }
  return merged;
}

function taintedExpression(expression: ForgeWebScriptIrExpression, tainted: ReadonlySet<string>): boolean {
  if (expression.kind === 'identifier') return tainted.has(expression.name);
  if (expression.kind === 'binary')
    return taintedExpression(expression.left, tainted) || taintedExpression(expression.right, tainted);
  if (expression.kind === 'unary') return taintedExpression(expression.operand, tainted);
  if (expression.kind === 'index')
    return taintedExpression(expression.receiver, tainted) || taintedExpression(expression.index, tainted);
  if (expression.kind === 'call') return expression.arguments.some((argument) => taintedExpression(argument, tainted));
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return expression.elements.some((element) => taintedExpression(element, tainted));
  if (expression.kind === 'struct-value')
    return Object.values(expression.fields).some((value) => taintedExpression(value, tainted));
  if (expression.kind === 'enum-value')
    return expression.arguments.some((argument) => taintedExpression(argument, tainted));
  if (expression.kind === 'match')
    return (
      taintedExpression(expression.value, tainted) ||
      expression.arms.some((arm) => taintedExpression(arm.value, tainted))
    );
  return false;
}

const ownershipRule: ForgeWebScriptAnalysisRule = {
  id: 'fws.safety.ownership-and-memory',
  category: 'ownership',
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: ForgeWebScriptAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      // Ownership state is copied at every branch so a release on one path cannot
      // make a sibling path look like a double release or use-after-release.
      const visit = (
        statements: readonly ForgeWebScriptIrStatement[],
        inputAllocations: ReadonlyMap<string, Allocation>,
        inputEnvironment: ReadonlyMap<string, Constant>,
      ): OwnershipFlow => {
        const allocations = cloneAllocations(inputAllocations);
        const environment: Environment = new Map(inputEnvironment);
        let reachable = true;
        for (const statement of statements) {
          if (!reachable) break;
          for (const expression of expressionsOf(statement))
            visitExpression(expression, (node) => {
              if (node.kind !== 'call') return;
              const operation = node.standardLibrary;
              const name = node.arguments[0]?.kind === 'identifier' ? node.arguments[0].name : undefined;
              if (operation === 'memory-alloc') {
                const size = node.arguments[0] === undefined ? undefined : evaluate(node.arguments[0], environment);
                if (typeof size === 'number' && size <= 0)
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ownership-and-memory',
                      'ownership',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-001`,
                      'Allocation size must be positive.',
                      node.arguments[0]!.span,
                      'Allocate a non-zero, policy-bounded region.',
                      { severity: 'error', cwe: ['CWE-789'] },
                    ),
                  );
                if (typeof size === 'number' && size > context.policy.limits.maxAllocationBytes)
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ownership-and-memory',
                      'ownership',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-002`,
                      'Allocation exceeds the configured analysis limit.',
                      node.span,
                      'Use bounded allocation sizes or raise the explicit policy limit.',
                      { severity: 'error', cwe: ['CWE-789'] },
                    ),
                  );
              }
              if (operation === 'memory-dealloc' && name !== undefined) {
                const allocation = allocations.get(name);
                if (allocation?.released === true)
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ownership-and-memory',
                      'ownership',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-003`,
                      `Pointer '${name}' is released more than once.`,
                      node.span,
                      'Release an owned allocation exactly once.',
                      { severity: 'error', owasp: ['A04'], cwe: ['CWE-415'] },
                    ),
                  );
                if (allocation !== undefined) {
                  const size = node.arguments[1] === undefined ? undefined : evaluate(node.arguments[1], environment);
                  if (typeof size === 'number' && size !== allocation.size)
                    findings.push(
                      finding(
                        context,
                        'fws.safety.ownership-and-memory',
                        'ownership',
                        `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-004`,
                        `Deallocation length ${size} does not match the owned allocation length ${allocation.size}.`,
                        node.span,
                        'Retain and pass the exact pointer-length pair returned by the allocator.',
                        { severity: 'error', cwe: ['CWE-761'] },
                      ),
                    );
                  allocation.released = true;
                }
              }
              if (
                (operation === 'memory-load-u32' ||
                  operation === 'memory-load-f64' ||
                  operation === 'memory-store-u32' ||
                  operation === 'memory-store-f64') &&
                name !== undefined &&
                allocations.get(name)?.released === true
              )
                findings.push(
                  finding(
                    context,
                    'fws.safety.ownership-and-memory',
                    'ownership',
                    `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-005`,
                    `Pointer '${name}' is used after release.`,
                    node.span,
                    'Do not use a pointer after transferring it to the deallocator.',
                    { severity: 'error', owasp: ['A04'], cwe: ['CWE-416'] },
                  ),
                );
            });
          if (statement.kind === 'let') {
            const value = statement.value;
            if (value.kind === 'call' && value.standardLibrary === 'memory-alloc') {
              const size = value.arguments[0] === undefined ? undefined : evaluate(value.arguments[0], environment);
              if (typeof size === 'number') allocations.set(statement.name, { size, released: false });
            } else if (
              value.kind === 'call' &&
              value.standardLibrary === 'memory-realloc' &&
              value.arguments[0]?.kind === 'identifier'
            ) {
              const old = allocations.get(value.arguments[0].name);
              const size = value.arguments[2] === undefined ? undefined : evaluate(value.arguments[2], environment);
              if (old !== undefined && size !== undefined && typeof size === 'number') {
                if (old.released)
                  findings.push(
                    finding(
                      context,
                      'fws.safety.ownership-and-memory',
                      'ownership',
                      `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.ownership}-005`,
                      `Pointer '${value.arguments[0].name}' is reallocated after release.`,
                      value.span,
                      'Reallocate only a live owned allocation.',
                      { severity: 'error', cwe: ['CWE-416'] },
                    ),
                  );
                old.released = true;
                allocations.set(statement.name, { size, released: false });
              }
            } else if (value.kind === 'identifier' && allocations.has(value.name)) {
              allocations.set(statement.name, allocations.get(value.name)!);
            }
            environment.set(statement.name, evaluate(statement.value, environment));
          } else if (
            statement.kind === 'assignment' &&
            statement.value.kind === 'identifier' &&
            allocations.has(statement.value.name)
          ) {
            allocations.set(statement.name, allocations.get(statement.value.name)!);
          }
          if (statement.kind === 'return') {
            reachable = false;
            continue;
          }
          switch (statement.kind) {
            case 'if': {
              const branchAllocations = cloneAllocations(allocations);
              const branchEnvironment = new Map(environment);
              const branches: OwnershipFlow[] = [visit(statement.consequent, branchAllocations, branchEnvironment)];
              if (statement.alternate === undefined)
                branches.push({
                  allocations: cloneAllocations(branchAllocations),
                  environment: new Map(branchEnvironment),
                  reachable: true,
                });
              else branches.push(visit(statement.alternate, branchAllocations, branchEnvironment));
              const reachableBranches = branches.filter(({ reachable: branchReachable }) => branchReachable);
              if (reachableBranches.length === 0) reachable = false;
              else {
                allocations.clear();
                for (const [name, allocation] of mergeAllocations(
                  reachableBranches.map(({ allocations: branchState }) => branchState),
                ))
                  allocations.set(name, allocation);
                environment.clear();
                for (const [name, value] of mergeEnvironments(
                  reachableBranches.map(({ environment: branchState }) => branchState),
                ))
                  environment.set(name, value);
              }

              break;
            }
            case 'while':
            case 'do-while':
            case 'iterator-loop': {
              visit(statement.body, allocations, environment);
              break;
            }
            case 'switch': {
              const branchAllocations = cloneAllocations(allocations);
              const branchEnvironment = new Map(environment);
              const branches = statement.cases.map((arm) => visit(arm.body, branchAllocations, branchEnvironment));
              if (statement.defaultCase === undefined)
                branches.push({
                  allocations: cloneAllocations(branchAllocations),
                  environment: new Map(branchEnvironment),
                  reachable: true,
                });
              else branches.push(visit(statement.defaultCase, branchAllocations, branchEnvironment));
              const reachableBranches = branches.filter(({ reachable: branchReachable }) => branchReachable);
              if (reachableBranches.length === 0) reachable = false;
              else {
                allocations.clear();
                for (const [name, allocation] of mergeAllocations(
                  reachableBranches.map(({ allocations: branchState }) => branchState),
                ))
                  allocations.set(name, allocation);
                environment.clear();
                for (const [name, value] of mergeEnvironments(
                  reachableBranches.map(({ environment: branchState }) => branchState),
                ))
                  environment.set(name, value);
              }

              break;
            }
            // No default
          }
        }
        return { allocations, environment, reachable };
      };
      visit(declaration.body, new Map(), new Map());
    }
    return findings;
  },
};

/* eslint-enable unicorn/consistent-function-scoping */
const resourceRule: ForgeWebScriptAnalysisRule = {
  id: 'fws.resource-bounds',
  category: 'resource',
  analyze: (context) => {
    const ir = context.ir;
    if (ir === undefined) return [];
    const findings: ForgeWebScriptAnalysisFinding[] = [];
    for (const declaration of ir.functions) {
      if (declaration.analysis?.calls.includes(declaration.name) && !containsConditional(declaration.body))
        findings.push(
          finding(
            context,
            'fws.resource-bounds',
            'resource',
            `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.resource}-003`,
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
              `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.resource}-001`,
              `Iterator bound ${statement.boundedLength} exceeds the configured loop limit.`,
              statement.span,
              'Bound the iterator or lower its maximum yield count.',
              { severity: 'error', owasp: ['A05'], cwe: ['CWE-834'] },
            ),
          );
        for (const expression of expressionsOf(statement))
          visitExpression(expression, (node) => {
            if (node.kind !== 'call') return;
            if (
              node.standardLibrary !== undefined &&
              (node.standardLibrary.startsWith('full-') ||
                node.standardLibrary.startsWith('prefix-') ||
                node.standardLibrary.startsWith('search'))
            ) {
              const input = node.arguments[0];
              if (
                input !== undefined &&
                input.kind === 'literal' &&
                typeof input.value === 'string' &&
                input.value.length > context.policy.limits.maxRegexInputLength
              )
                findings.push(
                  finding(
                    context,
                    'fws.resource-bounds',
                    'resource',
                    `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.resource}-002`,
                    'Regex input exceeds the configured deterministic work limit.',
                    input.span,
                    'Limit regex input length before invoking the standard library.',
                    { severity: 'error', owasp: ['A06'], cwe: ['CWE-1333'] },
                  ),
                );
            }
            const imported = ir.imports.find((item) => item.alias === node.callee);
            if (imported?.capability.startsWith('scheduler.') === true) asyncCalls += 1;
          });
      });
      if (asyncCalls > context.policy.limits.maxAsyncTasks)
        findings.push(
          finding(
            context,
            'fws.resource-bounds',
            'resource',
            `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.resource}-004`,
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

const capabilityRule: ForgeWebScriptAnalysisRule = {
  id: 'fws.security.capabilities-and-taint',
  category: 'security',
  analyze: (context) => {
    const module = context.ir;
    if (module === undefined) return [];
    const findings: ForgeWebScriptAnalysisFinding[] = [];
    const imports = new Map(module.imports.map((item) => [item.alias, item]));
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
            `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.security}-001`,
            `Capability '${imported.capability}' is not allowed by the active policy.`,
            imported.span,
            'Declare the capability explicitly in the requested capability allow-list and policy.',
            { severity: 'error', owasp: ['A01'], cwe: ['CWE-862'] },
          ),
        );
    }
    const sensitive = /(filesystem|network|socket|dom|eval|execute|secret|credential|token)/iu;
    for (const declaration of module.functions) {
      const tainted = new Set(
        declaration.parameters
          .filter(({ type }) => type.name === 'string' || type.name === 'bytes')
          .map(({ name }) => name),
      );
      // The traversal closes over this function's mutable facts and findings.
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const visit = (statements: readonly ForgeWebScriptIrStatement[]): void => {
        for (const statement of statements) {
          for (const expression of expressionsOf(statement))
            visitExpression(expression, (node) => {
              if (node.kind !== 'call') return;
              const importedCapability = imports.get(node.callee);
              if (importedCapability === undefined || !sensitive.test(importedCapability.capability)) return;
              if (node.arguments.some((argument) => argument.kind === 'identifier' && tainted.has(argument.name)))
                findings.push(
                  finding(
                    context,
                    'fws.security.capabilities-and-taint',
                    'security',
                    `${FORGE_WEB_SCRIPT_ANALYSIS_DIAGNOSTIC_CODES.security}-002`,
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
            });
          if (statement.kind === 'let' && taintedExpression(statement.value, tainted)) tainted.add(statement.name);
          if (statement.kind === 'assignment' && taintedExpression(statement.value, tainted))
            tainted.add(statement.name);
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
            // No default
          }
        }
      };
      visit(declaration.body);
    }
    return findings;
  },
};

export const FORGE_WEB_SCRIPT_DEFAULT_ANALYSIS_RULES: readonly ForgeWebScriptAnalysisRule[] = [
  correctnessRule,
  rangeRule,
  ownershipRule,
  resourceRule,
  capabilityRule,
];
