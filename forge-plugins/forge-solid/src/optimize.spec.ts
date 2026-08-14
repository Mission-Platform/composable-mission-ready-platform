import { describe, expect, it } from "vitest";

import { emitSolidModule } from "./emitters/module.js";
import {
  component,
  element,
  expressionChild,
  listKey,
  semanticModule,
  statement,
  stringAttribute,
  textChild,
} from "./ir-test-helpers.js";
import { isSolidLowered, lowerSolidModule, SOLID_FRAMEWORK } from "./lower.js";
import {
  COLLAPSE_SINGLE_CHILD_FRAGMENTS,
  DROP_UNUSED_IMPORTS,
  HOIST_STATIC_SUBTREES,
  MEMOIZE_DYNAMIC_EXPRESSIONS,
  optimizeSolidModule,
  STABLE_LIST_KEYS,
} from "./optimize.js";

import type { SemanticModuleParts } from "./ir-test-helpers.js";
import type { SolidLoweredModule } from "./lower.js";
import type {
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: SOLID_FRAMEWORK,
  moduleKind: "component",
  componentName: "Widget",
};

const ALL_ENABLED: TargetOptimizeOptions = { neutral: {} };

/** Lower a fixture, then optimize it with the supplied neutral flags. */
function optimize(
  parts: SemanticModuleParts,
  options: TargetOptimizeOptions = ALL_ENABLED,
): TargetIntentions {
  return optimizeSolidModule(
    lowerSolidModule(semanticModule(parts), CONTEXT),
    options,
  );
}

/** The Solid plan carried by an optimized wrapper. */
function loweredOf(intentions: TargetIntentions): SolidLoweredModule {
  const { lowered } = intentions;
  if (!isSolidLowered(lowered)) {
    throw new Error("The intentions carry no Solid plan.");
  }
  return lowered;
}

/** A component whose markup repeats one non-trivial expression. */
const REPEATED_EXPRESSION: SemanticModuleParts = {
  component: component({
    name: "Widget",
    returnNode: element("div", {
      children: [
        element("span", {
          children: [expressionChild("items.filter(Boolean).length")],
        }),
        element("em", {
          children: [expressionChild("items.filter(Boolean).length")],
        }),
        element("i", { children: [expressionChild("title")] }),
      ],
    }),
  }),
};

/** Repeated markup expressions that capture the surrounding map callback parameter. */
const CALLBACK_LOCAL_EXPRESSION: SemanticModuleParts = {
  component: component({
    name: "Widget",
    returnNode: element("div", {
      children: [
        expressionChild("items.map((item) => <li />)", [
          element("li", {
            children: [
              element("span", {
                children: [expressionChild("item.label.toUpperCase()")],
              }),
              element("em", {
                children: [expressionChild("item.label.toUpperCase()")],
              }),
            ],
          }),
        ]),
      ],
    }),
  }),
};

/** A component whose markup carries a Stage-1 static marker. */
const STATIC_MARKED: SemanticModuleParts = {
  component: component({
    name: "Widget",
    returnNode: element("div", {
      children: [
        element("span", {
          attributes: [stringAttribute("__mpStatic", "true")],
          children: [textChild("hi")],
        }),
      ],
    }),
  }),
};

describe("optimizeSolidModule", () => {
  it("leaves an intention wrapper without a Solid plan untouched", () => {
    const intentions: TargetIntentions = {
      framework: "vue",
      module: semanticModule({}),
      context: CONTEXT,
      lowered: { framework: "vue", appliedOptimizations: [] },
    };

    expect(optimizeSolidModule(intentions, ALL_ENABLED)).toBe(intentions);
  });

  it("records every optimization it ran", () => {
    expect(
      loweredOf(optimize(REPEATED_EXPRESSION)).appliedOptimizations,
    ).toEqual([
      HOIST_STATIC_SUBTREES,
      STABLE_LIST_KEYS,
      COLLAPSE_SINGLE_CHILD_FRAGMENTS,
      MEMOIZE_DYNAMIC_EXPRESSIONS,
      DROP_UNUSED_IMPORTS,
    ]);
  });

  it("is idempotent — a second run changes neither the plan nor the identifiers", () => {
    const once = optimize(REPEATED_EXPRESSION);
    const twice = optimizeSolidModule(once, ALL_ENABLED);

    expect(loweredOf(twice).appliedOptimizations).toEqual(
      loweredOf(once).appliedOptimizations,
    );
    expect(loweredOf(twice).plan).toEqual(loweredOf(once).plan);
  });

  describe("solid:hoist-static-subtrees", () => {
    it("promotes the marked subtree to a module constant", () => {
      const intentions = optimize(STATIC_MARKED);
      const lowered = loweredOf(intentions);

      expect(lowered.plan.hoistStatic).toBe(true);
      expect(
        emitSolidModule(intentions.module, { plan: lowered.plan }).code,
      ).toContain("const __mpHoist_0 = <span>hi</span>;");
    });

    it("is gated on the neutral staticMarking flag", () => {
      const intentions = optimize(STATIC_MARKED, {
        neutral: { staticMarking: false },
      });
      const lowered = loweredOf(intentions);

      expect(lowered.appliedOptimizations).not.toContain(HOIST_STATIC_SUBTREES);
      expect(lowered.plan.hoistStatic).toBe(false);
      expect(
        emitSolidModule(intentions.module, { plan: lowered.plan }).code,
      ).not.toContain("__mpHoist_0");
    });
  });

  describe("solid:stable-list-keys", () => {
    const lists: SemanticModuleParts = {
      listKeys: [
        listKey("rows", { key: "row.id" }),
        listKey("cells", { key: "index", stable: false }),
        listKey("items"),
      ],
    };

    it("keeps only the stable keys and records the lists left unkeyed", () => {
      const { plan } = loweredOf(optimize(lists));

      expect(plan.listKeys).toEqual([
        { source: "rows", key: "row.id", stable: true },
      ]);
      expect(plan.unkeyedLists).toEqual(["cells", "items"]);
    });

    it("is gated on the neutral stableKeyInference flag", () => {
      const lowered = loweredOf(
        optimize(lists, { neutral: { stableKeyInference: false } }),
      );

      expect(lowered.appliedOptimizations).not.toContain(STABLE_LIST_KEYS);
      expect(lowered.plan.listKeys).toHaveLength(3);
      expect(lowered.plan.unkeyedLists).toEqual([]);
    });
  });

  describe("solid:collapse-single-child-fragments", () => {
    it("drops a fragment that only wraps one element", () => {
      const parts: SemanticModuleParts = {
        component: component({
          name: "Widget",
          returnNode: element("Fragment", {
            tagKind: "fragment",
            children: [element("article", { children: [textChild("body")] })],
          }),
        }),
      };
      const optimized = optimize(parts);
      const module = semanticModule(parts);

      expect(loweredOf(optimized).plan.collapseSingleChildFragments).toBe(true);
      expect(
        emitSolidModule(module, { plan: loweredOf(optimized).plan }).code,
      ).not.toContain("<>");
      // Without the refinement the grouping fragment is preserved.
      expect(emitSolidModule(module).code).toContain("<>");
    });
  });

  describe("solid:memoize-dynamic-expressions", () => {
    it("promotes a repeated dynamic child expression to a single memo", () => {
      const intentions = optimize(REPEATED_EXPRESSION);
      const { plan } = loweredOf(intentions);

      expect(plan.memoizedExpressions).toEqual([
        { expression: "items.filter(Boolean).length", name: "__mpMemo_0" },
      ]);

      const code = emitSolidModule(intentions.module, { plan }).code;
      expect(code).toContain(
        "const __mpMemo_0 = createMemo(() => items.filter(Boolean).length);",
      );
      expect(code.match(/__mpMemo_0\(\)/g)).toHaveLength(2);
      expect(code).toContain('import { createMemo } from "solid-js";');
    });

    it("emits createMemo after body locals the expression reads", () => {
      const parts: SemanticModuleParts = {
        component: component({
          name: "SchemaForm",
          parameter: "properties",
          body: [
            statement("const currentFields = properties.fields ?? [];"),
            statement(
              "const renderField = (field: { key: string }) => field.key;",
            ),
            statement(
              "return <div>{currentFields.map((field) => renderField(field))}</div>;",
              "return",
            ),
          ],
          returnNode: element("div", {
            children: [
              expressionChild(
                "currentFields.map((field) => renderField(field))",
              ),
              expressionChild(
                "currentFields.map((field) => renderField(field))",
              ),
            ],
          }),
        }),
      };
      const intentions = optimize(parts);
      const { plan } = loweredOf(intentions);
      const code = emitSolidModule(intentions.module, { plan }).code;

      expect(plan.memoizedExpressions).toEqual([
        {
          expression: "currentFields.map((field) => renderField(field))",
          name: "__mpMemo_0",
        },
      ]);

      const currentFieldsAt = code.indexOf(
        "const currentFields = properties.fields ?? [];",
      );
      const renderFieldAt = code.indexOf(
        "const renderField = (field: { key: string }) => field.key;",
      );
      const memoAt = code.indexOf(
        "const __mpMemo_0 = createMemo(() => currentFields.map((field) => renderField(field)));",
      );
      const returnAt = code.indexOf("return (");

      expect(currentFieldsAt).toBeGreaterThan(-1);
      expect(renderFieldAt).toBeGreaterThan(currentFieldsAt);
      expect(memoAt).toBeGreaterThan(renderFieldAt);
      expect(returnAt).toBeGreaterThan(memoAt);
    });

    it("emits createMemo before early-return control flow that closes over it", () => {
      const parts: SemanticModuleParts = {
        component: component({
          name: "WizardForm",
          parameter: "properties",
          body: [
            statement("const currentFields = properties.fields ?? [];"),
            statement(
              "const renderField = (field: { key: string }) => field.key;",
            ),
            statement(
              "const renderStep = () => <div>{currentFields.map((field) => renderField(field))}</div>;",
            ),
            statement(
              "if (properties.wizard) {\n  return <div>{renderStep()}</div>;\n}",
            ),
            statement(
              "return <div>{currentFields.map((field) => renderField(field))}</div>;",
              "return",
            ),
          ],
          returnNode: element("div", {
            children: [
              expressionChild(
                "currentFields.map((field) => renderField(field))",
              ),
              expressionChild(
                "currentFields.map((field) => renderField(field))",
              ),
            ],
          }),
        }),
      };
      const intentions = optimize(parts);
      const { plan } = loweredOf(intentions);
      const code = emitSolidModule(intentions.module, { plan }).code;

      const renderFieldAt = code.indexOf(
        "const renderField = (field: { key: string }) => field.key;",
      );
      const memoAt = code.indexOf(
        "const __mpMemo_0 = createMemo(() => currentFields.map((field) => renderField(field)));",
      );
      const earlyIfAt = code.indexOf("if (properties.wizard)");

      expect(renderFieldAt).toBeGreaterThan(-1);
      expect(memoAt).toBeGreaterThan(renderFieldAt);
      expect(earlyIfAt).toBeGreaterThan(memoAt);
    });

    it("does not hoist expressions that capture a callback-local binding", () => {
      const { plan } = loweredOf(optimize(CALLBACK_LOCAL_EXPRESSION));

      expect(plan.memoizedExpressions).toEqual([]);
      expect(
        emitSolidModule(semanticModule(CALLBACK_LOCAL_EXPRESSION), { plan })
          .code,
      ).not.toContain("createMemo");
    });

    it("leaves a cheap or single-use expression alone", () => {
      const { plan } = loweredOf(
        optimize({
          component: component({
            name: "Widget",
            returnNode: element("div", {
              children: [
                element("span", {
                  children: [expressionChild("properties.title")],
                }),
                element("em", {
                  children: [expressionChild("properties.title")],
                }),
                element("i", {
                  children: [expressionChild("other.compute(1)")],
                }),
              ],
            }),
          }),
        }),
      );

      expect(plan.memoizedExpressions).toEqual([]);
    });
  });

  describe("solid:drop-unused-imports", () => {
    it("recomputes the solid-js imports from the refined plan", () => {
      const { plan } = loweredOf(
        optimize({ listKeys: [listKey("rows", { stable: false })] }),
      );

      // `For` was required while the unstable list key was still planned.
      expect(plan.listKeys).toEqual([]);
      expect(plan.solidImports).not.toContain("For");
    });

    it("adds the values a later refinement introduced", () => {
      const { plan } = loweredOf(optimize(REPEATED_EXPRESSION));

      expect(plan.solidImports).toContain("createMemo");
    });
  });
});
