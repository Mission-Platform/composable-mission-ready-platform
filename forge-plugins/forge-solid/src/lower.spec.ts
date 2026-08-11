import { describe, expect, it } from "vitest";

import {
  component,
  dynamicNode,
  effect,
  element,
  expressionChild,
  listKey,
  memo,
  prop,
  reference,
  semanticModule,
  slot,
  state,
} from "./ir-test-helpers.js";
import { isSolidLowered, lowerSolidModule, SOLID_FRAMEWORK } from "./lower.js";

import type { SemanticModuleParts } from "./ir-test-helpers.js";
import type { SolidLoweringPlan } from "./lower.js";
import type {
  TargetContext,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: SOLID_FRAMEWORK,
  moduleKind: "component",
  componentName: "Widget",
};

/** Lower a fixture and return its Solid plan, failing the spec when the guard rejects it. */
function plan(parts: SemanticModuleParts): SolidLoweringPlan {
  const lowered = lowerSolidModule(semanticModule(parts), CONTEXT).lowered;
  if (!isSolidLowered(lowered)) {
    throw new Error("lowerSolidModule did not produce a Solid plan.");
  }
  return lowered.plan;
}

describe("isSolidLowered", () => {
  it("accepts a Solid plan and rejects anything else", () => {
    const lowered = lowerSolidModule(semanticModule({}), CONTEXT).lowered;
    const foreign: TargetLoweredModule = {
      framework: "vue",
      appliedOptimizations: [],
    };

    expect(isSolidLowered(lowered)).toBe(true);
    expect(isSolidLowered(foreign)).toBe(false);
    expect(isSolidLowered(undefined)).toBe(false);
  });
});

describe("lowerSolidModule", () => {
  it("wraps the module, its context and its diagnostics", () => {
    const module = semanticModule({
      component: component({ name: "Widget", returnNode: element("div") }),
    });
    const intentions = lowerSolidModule(module, CONTEXT);

    expect(intentions.framework).toBe("solid");
    expect(intentions.module).toBe(module);
    expect(intentions.context).toBe(CONTEXT);
    expect(intentions.diagnostics).toEqual([]);
    expect(intentions.lowered?.appliedOptimizations).toEqual([]);
  });

  it("plans a signal per state cell, resolving names and types", () => {
    const { signals } = plan({
      state: [
        state("open", "setOpen", { type: "boolean", initializer: "false" }),
        state("count", undefined, { inferredType: "number" }),
        state("label"),
      ],
    });

    expect(signals).toEqual([
      {
        accessor: "open",
        setter: "setOpen",
        type: "boolean",
        initializer: "false",
      },
      {
        accessor: "count",
        setter: "setCount",
        type: "number",
        initializer: undefined,
      },
      {
        accessor: "label",
        setter: "setLabel",
        type: "unknown",
        initializer: undefined,
      },
    ]);
  });

  it("plans a createMemo for a reactive factory and folds a constant one", () => {
    const { memos } = plan({
      memos: [memo("total", "() => a + b"), memo("fixed", "() => 'x'")],
    });

    expect(memos).toEqual([
      {
        name: "total",
        factory: "() => a + b",
        constant: undefined,
        accessor: true,
      },
      { name: "fixed", factory: "() => 'x'", constant: "'x'", accessor: false },
    ]);
  });

  it("plans onMount for a mount-only effect and pairs a cleanup with onCleanup", () => {
    const { effects, solidImports } = plan({
      effects: [
        effect("() => { start(); }", { dependencies: [] }),
        effect("() => { track(count); }", {
          cleanup: "() => stop()",
          dependencies: ["count"],
        }),
      ],
    });

    expect(effects[0]?.primitive).toBe("onMount");
    expect(effects[1]).toEqual({
      primitive: "createEffect",
      body: "() => { track(count); }",
      cleanup: "() => stop()",
    });
    expect(solidImports).toContain("onCleanup");
  });

  it("plans a ref container with its element type", () => {
    const { refs } = plan({
      refs: [reference("node", "HTMLDivElement", "null")],
    });

    expect(refs).toEqual([
      { name: "node", elementType: "HTMLDivElement", initializer: "null" },
    ]);
  });

  it("plans mergeProps and splitProps only when a prop declares a default", () => {
    const withoutDefaults = plan({
      props: [prop("title", { type: "string" })],
    });
    const withDefaults = plan({
      props: [
        prop("title", { type: "string" }),
        prop("tone", { type: "string", defaultValue: "'plain'" }),
      ],
    });

    expect(withoutDefaults.mergeProps).toBe(false);
    expect(withoutDefaults.props).toEqual([
      {
        name: "title",
        optional: false,
        type: "string",
        defaultValue: undefined,
      },
    ]);
    expect(withDefaults.mergeProps).toBe(true);
    expect(withDefaults.splitProps).toBe(true);
    expect(withDefaults.solidImports).toEqual(
      expect.arrayContaining(["mergeProps", "splitProps"]),
    );
  });

  it("carries the slots, dynamic nodes, list keys and static subtrees into the plan", () => {
    const lowered = plan({
      slots: [slot("trigger", "<span />")],
      dynamicNodes: [dynamicNode("properties.tag")],
      listKeys: [listKey("items", { key: "item.id" })],
      staticSubtrees: [{ start: 10, end: 20 }],
    });

    expect(lowered.slots).toEqual([{ name: "trigger", fallback: "<span />" }]);
    expect(lowered.dynamicNodes).toEqual([{ expression: "properties.tag" }]);
    expect(lowered.listKeys).toEqual([
      { source: "items", key: "item.id", stable: true },
    ]);
    expect(lowered.staticSubtrees).toEqual([{ start: 10, end: 20 }]);
    expect(lowered.solidImports).toEqual(
      expect.arrayContaining(["Dynamic", "For"]),
    );
  });

  it("requires Show when the markup renders a conditional child", () => {
    const conditional = plan({
      component: component({
        name: "Widget",
        returnNode: element("div", {
          children: [expressionChild("open ? 'yes' : 'no'")],
        }),
      }),
    });

    expect(conditional.solidImports).toContain("Show");
    expect(plan({}).solidImports).toEqual([]);
  });

  it("defaults to hoisting statics and to no target-only refinements", () => {
    const defaults = plan({});

    expect(defaults.hoistStatic).toBe(true);
    expect(defaults.collapseSingleChildFragments).toBe(false);
    expect(defaults.memoizedExpressions).toEqual([]);
    expect(defaults.unkeyedLists).toEqual([]);
  });
});
