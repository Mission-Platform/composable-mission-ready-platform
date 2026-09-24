import type {
  FlintExpression,
  FlintMatchArm,
  FlintMatchExpression,
  FlintMatchStatement,
  FlintStatement,
} from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

/**
 * Terminal leaf node in a decision tree representing a matched arm.
 */
export interface DecisionTreeLeaf {
  readonly kind: 'leaf';
  readonly armIndex: number;
  readonly bindings: ReadonlyMap<string, FlintExpression>;
  readonly resultExpression?: FlintExpression;
  readonly resultStatements?: readonly FlintStatement[];
}

/**
 * Branching switch node in a decision tree testing an expression.
 */
export interface DecisionTreeSwitch {
  readonly kind: 'switch';
  readonly discriminant: FlintExpression;
  readonly cases: readonly {
    readonly value: number | boolean | string;
    readonly subtree: DecisionTreeNode;
  }[];
  readonly defaultSubtree?: DecisionTreeNode;
  readonly strategy: 'br-table' | 'sparse' | 'binary-search';
}

/**
 * Failure node representing an unmatched branch or non-exhaustive trap.
 */
export interface DecisionTreeFail {
  readonly kind: 'fail';
  readonly message: string;
  readonly span: FlintSourceSpan;
}

/**
 * Node in the pattern matching decision tree.
 */
export type DecisionTreeNode = DecisionTreeLeaf | DecisionTreeSwitch | DecisionTreeFail;

/**
 * Options configuring decision tree compilation.
 */
export interface DecisionTreeCompileOptions {
  readonly enumValueResolver?: (variantName: string) => number | undefined;
  readonly maxJumpTableDensityRatio?: number;
  readonly maxJumpTableSize?: number;
}

/**
 * Determines whether a collection of scalar case values is eligible for constant-time `br_table` dispatch.
 */
export function isDenseSwitchEligible(
  values: readonly (number | boolean | string)[],
  options: DecisionTreeCompileOptions = {},
): boolean {
  const numericValues = values.map((value) => {
    if (typeof value === 'number') return Number.isInteger(value) ? value : undefined;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') return options.enumValueResolver?.(value);
    return;
  });

  const valid = numericValues.filter((candidate): candidate is number => candidate !== undefined);
  if (valid.length === 0 || valid.length !== values.length) return false;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min + 1;
  const maxRatio = options.maxJumpTableDensityRatio ?? 4;
  const maxSize = options.maxJumpTableSize ?? 65_536;

  return range <= maxSize && range <= valid.length * maxRatio;
}

/**
 * Selects the optimal match dispatch strategy based on density and value distribution.
 */
export function selectMatchStrategy(
  values: readonly (number | boolean | string)[],
  options: DecisionTreeCompileOptions = {},
): 'br-table' | 'binary-search' | 'sparse' {
  if (isDenseSwitchEligible(values, options)) {
    return 'br-table';
  }
  const numericCount = values.filter(
    (value) =>
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      options.enumValueResolver?.(String(value)) !== undefined,
  ).length;
  if (numericCount >= 4) {
    return 'binary-search';
  }
  return 'sparse';
}

/**
 * Compiles a list of match arms into an optimal pattern matching decision tree.
 */
export function compileDecisionTree(
  discriminant: FlintExpression,
  arms: readonly FlintMatchArm[],
  options: DecisionTreeCompileOptions = {},
): DecisionTreeNode {
  if (arms.length === 0) {
    return {
      kind: 'fail',
      message: 'Non-exhaustive pattern match: no arms provided.',
      span: discriminant.span,
    };
  }

  const cases: { value: number | boolean | string; subtree: DecisionTreeNode }[] = [];
  let defaultSubtree: DecisionTreeNode | undefined;

  for (const [index, arm] of arms.entries()) {
    const pattern = arm.pattern;
    if (pattern.kind === 'wildcard') {
      const leaf: DecisionTreeLeaf = {
        kind: 'leaf',
        armIndex: index,
        bindings: new Map(),
        resultExpression: arm.value,
      };
      defaultSubtree = leaf;
      break;
    }

    if (pattern.kind === 'literal') {
      const leaf: DecisionTreeLeaf = {
        kind: 'leaf',
        armIndex: index,
        bindings: new Map(),
        resultExpression: arm.value,
      };
      cases.push({ value: pattern.value, subtree: leaf });
    } else if (pattern.kind === 'variant') {
      const resolvedValue = options.enumValueResolver?.(pattern.name) ?? pattern.name;
      const bindings = new Map<string, FlintExpression>();
      for (const name of pattern.bindings) {
        bindings.set(name, discriminant);
      }
      const leaf: DecisionTreeLeaf = {
        kind: 'leaf',
        armIndex: index,
        bindings,
        resultExpression: arm.value,
      };
      cases.push({ value: resolvedValue, subtree: leaf });
    }
  }

  if (cases.length === 0 && defaultSubtree !== undefined) {
    return defaultSubtree;
  }

  const caseValues = cases.map((item) => item.value);
  const strategy = selectMatchStrategy(caseValues, options);

  return {
    kind: 'switch',
    discriminant,
    cases,
    defaultSubtree,
    strategy,
  };
}

/**
 * Lowers a match expression into a decision tree representation.
 */
export function lowerMatchExpression(
  expression: FlintMatchExpression,
  options: DecisionTreeCompileOptions = {},
): DecisionTreeNode {
  return compileDecisionTree(expression.value, expression.arms, options);
}

/**
 * Lowers a match statement into a decision tree representation.
 */
export function lowerMatchStatement(
  statement: FlintMatchStatement,
  options: DecisionTreeCompileOptions = {},
): DecisionTreeNode {
  return compileDecisionTree(statement.value, statement.arms, options);
}
