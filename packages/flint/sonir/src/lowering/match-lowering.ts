import type {
  FlintExpression,
  FlintMatchArm,
  FlintMatchExpression,
  FlintMatchStatement,
  FlintSourceSpan,
} from "@mission-platform/flint-ast";

/**
 * Terminal leaf node in a decision tree representing a matched arm.
 */
export interface DecisionTreeLeaf {
  readonly kind: "leaf";
  readonly armIndex: number;
  readonly bindings: ReadonlyMap<string, FlintExpression>;
  readonly resultExpression?: FlintExpression;
}

/**
 * Branching switch node in a decision tree testing an expression.
 */
export interface DecisionTreeSwitch {
  readonly kind: "switch";
  readonly discriminant: FlintExpression;
  readonly cases: readonly {
    readonly value: number | boolean | string;
    readonly subtree: DecisionTreeNode;
  }[];
  readonly defaultSubtree?: DecisionTreeNode;
  readonly strategy: "br-table" | "sparse" | "binary-search";
}

/**
 * Failure node representing an unmatched branch or non-exhaustive trap.
 */
export interface DecisionTreeFail {
  readonly kind: "fail";
  readonly message: string;
  readonly span: FlintSourceSpan;
}

/**
 * Node in the pattern matching decision tree.
 */
export type DecisionTreeNode =
  DecisionTreeLeaf | DecisionTreeSwitch | DecisionTreeFail;

/**
 * Options configuring decision tree compilation.
 */
export interface DecisionTreeCompileOptions {
  readonly enumValueResolver?: (variantName: string) => number | undefined;
  readonly maxJumpTableDensityRatio?: number;
  readonly maxJumpTableSize?: number;
}

/**
 * Helper to resolve scalar case values to their canonical numeric representation.
 */
// skipcq: JS-R1005
function resolveNumericCaseValue(
  value: number | boolean | string,
  resolver?: (variantName: string) => number | undefined,
): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && resolver) return resolver(value);
  return undefined;
}

/**
 * Determines whether a collection of scalar case values is eligible for constant-time `br_table` dispatch.
 */
// skipcq: JS-R1005
export function isDenseSwitchEligible(
  values: readonly (number | boolean | string)[],
  options: DecisionTreeCompileOptions = {},
): boolean {
  const numericValues = values.map((value) =>
    resolveNumericCaseValue(value, options.enumValueResolver),
  );

  const valid = numericValues.filter(
    (candidate): candidate is number => candidate !== undefined,
  );
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
): "br-table" | "binary-search" | "sparse" {
  if (isDenseSwitchEligible(values, options)) {
    return "br-table";
  }
  const numericCount = values.filter(
    (value) =>
      typeof value === "number" ||
      typeof value === "boolean" ||
      options.enumValueResolver?.(String(value)) !== undefined,
  ).length;
  if (numericCount >= 4) {
    return "binary-search";
  }
  return "sparse";
}

/**
 * Lowers a pattern match arm into a decision tree leaf with extracted variable bindings.
 */
function lowerArmToLeaf(
  arm: FlintMatchArm,
  armIndex: number,
  discriminant: FlintExpression,
): DecisionTreeLeaf {
  const bindings = new Map<string, FlintExpression>();

  if (arm.pattern.kind === "variant" && arm.pattern.bindings.length > 0) {
    for (const binding of arm.pattern.bindings) {
      bindings.set(binding, discriminant);
    }
  }

  return {
    kind: "leaf",
    armIndex,
    bindings,
    resultExpression: arm.value,
  };
}

/**
 * Compiles a discriminant expression and match arms into an optimal Decision Tree.
 */
export function compileDecisionTree(
  discriminant: FlintExpression,
  arms: readonly FlintMatchArm[],
  options: DecisionTreeCompileOptions = {},
): DecisionTreeNode {
  if (arms.length === 0) {
    return {
      kind: "fail",
      message: "Non-exhaustive pattern match: match expression has zero arms",
      span: discriminant.span,
    };
  }

  const cases: {
    readonly value: number | boolean | string;
    readonly subtree: DecisionTreeNode;
  }[] = [];

  let defaultSubtree: DecisionTreeNode | undefined;
  const scalarValues: (number | boolean | string)[] = [];

  for (let index = 0; index < arms.length; index++) {
    const arm = arms[index]!;
    const pattern = arm.pattern;

    if (pattern.kind === "wildcard") {
      if (defaultSubtree === undefined) {
        defaultSubtree = lowerArmToLeaf(arm, index, discriminant);
      }
      break;
    }

    if (pattern.kind === "literal") {
      const val = pattern.value;
      cases.push({
        value: val,
        subtree: lowerArmToLeaf(arm, index, discriminant),
      });
      scalarValues.push(val);
    } else if (pattern.kind === "variant") {
      const variantName = pattern.name;
      const resolved = options.enumValueResolver
        ? options.enumValueResolver(variantName)
        : variantName;
      cases.push({
        value: resolved ?? variantName,
        subtree: lowerArmToLeaf(arm, index, discriminant),
      });
      scalarValues.push(resolved ?? variantName);
    }
  }

  if (defaultSubtree === undefined) {
    defaultSubtree = {
      kind: "fail",
      message:
        "Non-exhaustive pattern match: discriminant does not match any specified branch",
      span: discriminant.span,
    };
  }

  if (cases.length === 0) {
    return defaultSubtree;
  }

  const strategy = selectMatchStrategy(scalarValues, options);

  return {
    kind: "switch",
    discriminant,
    cases,
    defaultSubtree,
    strategy,
  };
}

/**
 * Lowers a match expression or statement into an optimal Decision Tree for WebAssembly execution.
 */
export function lowerMatchToDecisionTree(
  matchNode: FlintMatchExpression | FlintMatchStatement,
  options: DecisionTreeCompileOptions = {},
): DecisionTreeNode {
  return compileDecisionTree(matchNode.value, matchNode.arms, options);
}
