import { describe, expect, it } from "vitest";

import type {
  FlintExpression,
  FlintMatchArm,
  FlintSourceSpan,
} from "@mission-platform/flint-ast";

import { lowerFlintAstToLowLevelSon } from "../low-level/dialect.js";

import {
  compileDecisionTree,
  isDenseSwitchEligible,
} from "./match-lowering.js";

const dummySpan: FlintSourceSpan = {
  start: 0,
  end: 10,
  line: 1,
  column: 1,
  endLine: 1,
  endColumn: 10,
};

const dummyDiscriminant: FlintExpression = {
  kind: "identifier",
  name: "status",
  span: dummySpan,
};

function enumResolver(name: string): number | undefined {
  switch (name) {
    case "Pending": {
      return 0;
    }
    case "Active": {
      return 1;
    }
    case "Completed": {
      return 2;
    }
    default: {
      return undefined;
    }
  }
}

describe("Decision-Tree pattern matching lowering", () => {
  it("correctly identifies dense integer values as eligible for br_table", () => {
    expect(isDenseSwitchEligible([0, 1, 2, 3])).toBe(true);
    expect(isDenseSwitchEligible([10, 11, 12, 13, 14])).toBe(true);
    expect(isDenseSwitchEligible([0, 2, 4])).toBe(true);
    expect(isDenseSwitchEligible([1, 1000, 2000])).toBe(false);
  });

  it("compiles dense enum match arms into br_table decision tree nodes", () => {
    const arms: FlintMatchArm[] = [
      {
        kind: "match-arm",
        pattern: {
          kind: "variant",
          name: "Pending",
          bindings: [],
          span: dummySpan,
        },
        value: { kind: "literal", value: 100, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: "match-arm",
        pattern: {
          kind: "variant",
          name: "Active",
          bindings: [],
          span: dummySpan,
        },
        value: { kind: "literal", value: 200, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: "match-arm",
        pattern: {
          kind: "variant",
          name: "Completed",
          bindings: [],
          span: dummySpan,
        },
        value: { kind: "literal", value: 300, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: "match-arm",
        pattern: { kind: "wildcard", span: dummySpan },
        value: { kind: "literal", value: -1, span: dummySpan },
        span: dummySpan,
      },
    ];

    const tree = compileDecisionTree(dummyDiscriminant, arms, {
      enumValueResolver: enumResolver,
    });

    expect(tree.kind).toBe("switch");
    if (tree.kind === "switch") {
      expect(tree.strategy).toBe("br-table");
      expect(tree.cases).toHaveLength(3);
      expect(tree.cases[0]?.value).toBe(0);
      expect(tree.cases[1]?.value).toBe(1);
      expect(tree.cases[2]?.value).toBe(2);
      expect(tree.defaultSubtree?.kind).toBe("leaf");
    }
  });

  it("compiles sparse integer match arms into sparse search decision tree nodes", () => {
    const arms: FlintMatchArm[] = [
      {
        kind: "match-arm",
        pattern: { kind: "literal", value: 10, span: dummySpan },
        value: { kind: "literal", value: 1, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: "match-arm",
        pattern: { kind: "literal", value: 5000, span: dummySpan },
        value: { kind: "literal", value: 2, span: dummySpan },
        span: dummySpan,
      },
      {
        kind: "match-arm",
        pattern: { kind: "wildcard", span: dummySpan },
        value: { kind: "literal", value: 0, span: dummySpan },
        span: dummySpan,
      },
    ];

    const tree = compileDecisionTree(dummyDiscriminant, arms);

    expect(tree.kind).toBe("switch");
    if (tree.kind === "switch") {
      expect(tree.strategy).toBe("sparse");
      expect(tree.cases).toHaveLength(2);
      expect(tree.defaultSubtree?.kind).toBe("leaf");
    }
  });

  it("lowers literal, variant, wildcard, and default expression arms through guarded selection", () => {
    const ast = {
      kind: "module" as const,
      name: "low_level_match_expression",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "select_status",
          exported: true,
          genericParameters: [],
          parameters: [],
          result: {
            kind: "type-name" as const,
            name: "i32" as const,
            span: dummySpan,
          },
          body: [
            {
              kind: "return" as const,
              value: {
                kind: "match" as const,
                value: {
                  kind: "identifier" as const,
                  name: "status",
                  span: dummySpan,
                },
                arms: [
                  {
                    kind: "match-arm" as const,
                    pattern: {
                      kind: "literal" as const,
                      value: 0,
                      span: dummySpan,
                    },
                    value: {
                      kind: "literal" as const,
                      value: 10,
                      type: "i32" as const,
                      span: dummySpan,
                    },
                    span: dummySpan,
                  },
                  {
                    kind: "match-arm" as const,
                    pattern: {
                      kind: "variant" as const,
                      name: "Active",
                      bindings: [],
                      span: dummySpan,
                    },
                    value: {
                      kind: "literal" as const,
                      value: 20,
                      type: "i32" as const,
                      span: dummySpan,
                    },
                    span: dummySpan,
                  },
                  {
                    kind: "match-arm" as const,
                    pattern: { kind: "wildcard" as const, span: dummySpan },
                    value: {
                      kind: "literal" as const,
                      value: -1,
                      type: "i32" as const,
                      span: dummySpan,
                    },
                    span: dummySpan,
                  },
                ],
                span: dummySpan,
              },
              span: dummySpan,
            },
          ],
          span: dummySpan,
        },
      ],
      span: dummySpan,
    };

    const lowLevel = lowerFlintAstToLowLevelSon(ast);
    const variantCheck = lowLevel.nodes.find(
      (node) => node.constantValue === "__flint_match_variant:Active",
    );
    const branches = lowLevel.nodes.filter(
      (node) => node.opcode === "ctrl.branch",
    );
    const selections = lowLevel.nodes.filter(
      (node) => node.opcode === "val.select",
    );
    expect(
      lowLevel.nodes.filter((node) => node.opcode === "val.cmp_eq"),
    ).toHaveLength(1);
    expect(variantCheck).toBeDefined();
    expect(branches).toHaveLength(3);
    expect(selections).toHaveLength(2);

    const selectedArmConstants = lowLevel.nodes.filter(
      (node) =>
        node.opcode === "val.const" &&
        (node.constantValue === 10 ||
          node.constantValue === 20 ||
          node.constantValue === -1),
    );
    expect(selectedArmConstants).toHaveLength(3);
    for (const constant of selectedArmConstants) {
      expect(constant.controlInputs).toHaveLength(1);
      expect(
        branches.some((branch) => branch.id === constant.controlInputs[0]),
      ).toBe(true);
    }
    expect(selections.every((node) => node.valueInputs.length === 3)).toBe(
      true,
    );
  });

  it("lowers match statements with a condition on every arm before evaluating its value", () => {
    const ast = {
      kind: "module" as const,
      name: "low_level_match_statement",
      imports: [],
      sourceImports: [],
      structs: [],
      enums: [],
      interfaces: [],
      functions: [
        {
          kind: "function" as const,
          name: "visit_status",
          exported: true,
          genericParameters: [],
          parameters: [],
          result: {
            kind: "type-name" as const,
            name: "unit" as const,
            span: dummySpan,
          },
          body: [
            {
              kind: "match-statement" as const,
              value: {
                kind: "identifier" as const,
                name: "status",
                span: dummySpan,
              },
              arms: [
                {
                  kind: "match-arm" as const,
                  pattern: {
                    kind: "literal" as const,
                    value: 1,
                    span: dummySpan,
                  },
                  value: {
                    kind: "literal" as const,
                    value: 100,
                    type: "i32" as const,
                    span: dummySpan,
                  },
                  span: dummySpan,
                },
                {
                  kind: "match-arm" as const,
                  pattern: { kind: "wildcard" as const, span: dummySpan },
                  value: {
                    kind: "literal" as const,
                    value: 200,
                    type: "i32" as const,
                    span: dummySpan,
                  },
                  span: dummySpan,
                },
              ],
              span: dummySpan,
            },
          ],
          span: dummySpan,
        },
      ],
      span: dummySpan,
    };

    const lowLevel = lowerFlintAstToLowLevelSon(ast);
    const branches = lowLevel.nodes.filter(
      (node) => node.opcode === "ctrl.branch",
    );
    expect(branches).toHaveLength(2);
    const armConstants = lowLevel.nodes.filter(
      (node) =>
        node.opcode === "val.const" &&
        (node.constantValue === 100 || node.constantValue === 200),
    );
    expect(armConstants).toHaveLength(2);
    expect(
      armConstants.every((node) =>
        branches.some((branch) => branch.id === node.controlInputs[0]),
      ),
    ).toBe(true);
  });
});
