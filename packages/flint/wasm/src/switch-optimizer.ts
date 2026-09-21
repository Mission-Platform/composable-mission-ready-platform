/**
 * Switch statement analysis, jump-table strategy selection, and constant branch elimination.
 */

import type { FlintWasmModule, FlintWasmSourceSpan, FlintWasmStatement } from './contracts.js';

/** Execution dispatch strategy applied to switch statement jump tables. */
export type FlintWasmSwitchStrategy = 'br-table' | 'sparse' | 'constant';

/** Diagnostic emitted by WebAssembly optimization passes. */
export interface FlintWasmOptimizationDiagnostic {
  readonly code: 'FLINT-DISPATCH-001' | 'FLINT-DISPATCH-002';
  readonly message: string;
  readonly span: FlintWasmSourceSpan;
}

/** Extracts the numeric integer value from a switch case branch arm. */
// skipcq: JS-R1005
export function caseValue(value: number | string, module: FlintWasmModule): number | undefined {
  if (typeof value === 'number') return Number.isInteger(value) ? value : undefined;
  for (const declaration of module.enumDeclarations ?? []) {
    const variant = declaration.variants.find((item) => item.name === value);
    if (variant !== undefined) return variant.value;
  }
  return undefined;
}

// skipcq: JS-D1001
function selectSwitchStrategy(validValues: readonly number[]): FlintWasmSwitchStrategy {
  if (validValues.length === 0) return 'sparse';
  const minimum = Math.min(...validValues);
  const maximum = Math.max(...validValues);
  const tableLength = maximum - minimum + 1;
  if (tableLength <= 65_536 && tableLength <= validValues.length * 4) {
    return 'br-table';
  }
  return 'sparse';
}

function validateSwitchCaseValues(
  statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
  values: readonly (number | undefined)[],
  diagnostics: FlintWasmOptimizationDiagnostic[],
): void {
  // eslint-disable-next-line unicorn/prefer-array-index-of -- indexOf(undefined) is stripped by no-useless-undefined rule.
  const undefinedIndex = values.findIndex((candidate) => candidate === undefined);
  if (undefinedIndex !== -1) {
    diagnostics.push({
      code: 'FLINT-DISPATCH-001',
      message: `Invalid switch case "${String(statement.cases[undefinedIndex]?.value)}".`,
      span: statement.span,
    });
  }
  const validValues = values.filter((value): value is number => value !== undefined);
  if (new Set(validValues).size !== validValues.length) {
    diagnostics.push({ code: 'FLINT-DISPATCH-002', message: 'Duplicate switch case value.', span: statement.span });
  }
}

// skipcq: JS-D1001
function validateSwitchStatement(
  statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
  module: FlintWasmModule,
  diagnostics: FlintWasmOptimizationDiagnostic[],
  enabled: boolean,
): FlintWasmStatement {
  const values = statement.cases.map((arm) => caseValue(arm.value, module));
  validateSwitchCaseValues(statement, values, diagnostics);

  const validValues = values.filter((value): value is number => value !== undefined);
  const strategy = selectSwitchStrategy(validValues);

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

/** Validates switch case arms for uniqueness and selects jump table vs linear search strategy. */
export function validateAndAnnotateSwitches(
  statements: readonly FlintWasmStatement[],
  module: FlintWasmModule,
  diagnostics: FlintWasmOptimizationDiagnostic[],
  enabled: boolean,
): readonly FlintWasmStatement[] {
  // skipcq: JS-R1005
  return statements.map((statement) => {
    if (statement.kind === 'switch') {
      return validateSwitchStatement(statement, module, diagnostics, enabled);
    }
    if (statement.kind === 'if') {
      return {
        ...statement,
        consequent: validateAndAnnotateSwitches(statement.consequent, module, diagnostics, enabled),
        ...(statement.alternate === undefined
          ? {}
          : { alternate: validateAndAnnotateSwitches(statement.alternate, module, diagnostics, enabled) }),
      };
    }
    if (
      statement.kind === 'while' ||
      statement.kind === 'do-while' ||
      statement.kind === 'for' ||
      statement.kind === 'iterator-loop'
    ) {
      return { ...statement, body: validateAndAnnotateSwitches(statement.body, module, diagnostics, enabled) };
    }
    return statement;
  });
}

// skipcq: JS-D1001
function foldSwitchBranch(
  statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
  cases: readonly { readonly value: number | string; readonly body: readonly FlintWasmStatement[] }[],
  defaultCase: { readonly statements: readonly FlintWasmStatement[]; readonly folded: number } | undefined,
  module: FlintWasmModule,
): readonly FlintWasmStatement[] | undefined {
  const value = statement.value;
  if (value.kind !== 'literal') return undefined;

  const selected = cases.find((arm) => caseValue(arm.value, module) === value.value);
  if (selected !== undefined) {
    return selected.body;
  }
  if (defaultCase !== undefined) {
    return defaultCase.statements;
  }
  return [];
}

// skipcq: JS-D1001, JS-R1005
function foldSwitchStatement(
  statement: Extract<FlintWasmStatement, { kind: 'switch' }>,
  module: FlintWasmModule,
  enabled: boolean,
): { readonly statements: readonly FlintWasmStatement[]; readonly folded: number } {
  let folded = 0;
  const cases = statement.cases.map((arm) => {
    const result = foldConstantSwitches(arm.body, module, enabled);
    folded += result.folded;
    return { ...arm, body: result.statements };
  });
  const defaultCase =
    statement.defaultCase === undefined ? undefined : foldConstantSwitches(statement.defaultCase, module, enabled);
  folded += defaultCase?.folded ?? 0;

  if (enabled) {
    const branch = foldSwitchBranch(statement, cases, defaultCase, module);
    if (branch !== undefined) {
      return { statements: branch, folded: folded + 1 };
    }
  }

  return {
    statements: [
      {
        ...statement,
        cases,
        ...(defaultCase === undefined ? {} : { defaultCase: defaultCase.statements }),
      },
    ],
    folded,
  };
}

// skipcq: JS-D1001
function foldIfStatement(
  statement: Extract<FlintWasmStatement, { kind: 'if' }>,
  module: FlintWasmModule,
  enabled: boolean,
): { readonly statement: FlintWasmStatement; readonly folded: number } {
  const consequent = foldConstantSwitches(statement.consequent, module, enabled);
  const alternate =
    statement.alternate === undefined ? undefined : foldConstantSwitches(statement.alternate, module, enabled);
  const folded = consequent.folded + (alternate?.folded ?? 0);
  return {
    statement: {
      ...statement,
      consequent: consequent.statements,
      ...(alternate === undefined ? {} : { alternate: alternate.statements }),
    },
    folded,
  };
}

// skipcq: JS-D1001
function foldLoopStatement(
  statement: Extract<FlintWasmStatement, { kind: 'while' | 'do-while' | 'for' | 'iterator-loop' }>,
  module: FlintWasmModule,
  enabled: boolean,
): { readonly statement: FlintWasmStatement; readonly folded: number } {
  const body = foldConstantSwitches(statement.body, module, enabled);
  return { statement: { ...statement, body: body.statements }, folded: body.folded };
}

/** Eliminates switch statements with known constant discriminants by selecting the matching arm. */
// skipcq: JS-R1005
export function foldConstantSwitches(
  statements: readonly FlintWasmStatement[],
  module: FlintWasmModule,
  enabled: boolean,
): { readonly statements: readonly FlintWasmStatement[]; readonly folded: number } {
  let folded = 0;
  const output: FlintWasmStatement[] = [];

  for (const statement of statements) {
    if (statement.kind === 'switch') {
      const result = foldSwitchStatement(statement, module, enabled);
      folded += result.folded;
      output.push(...result.statements);
      continue;
    }

    if (statement.kind === 'if') {
      const result = foldIfStatement(statement, module, enabled);
      folded += result.folded;
      output.push(result.statement);
      continue;
    }

    if (
      statement.kind === 'while' ||
      statement.kind === 'do-while' ||
      statement.kind === 'for' ||
      statement.kind === 'iterator-loop'
    ) {
      const result = foldLoopStatement(statement, module, enabled);
      folded += result.folded;
      output.push(result.statement);
      continue;
    }

    output.push(statement);
  }

  return { statements: output, folded };
}
