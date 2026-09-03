import { describe, expect, it } from "vitest";

import {
  component,
  effect,
  element,
  listKey,
  memo,
  prop,
  semanticModule,
  slot,
  state,
  statement,
  templateRef,
} from "./ir-test-helpers.js";
import { isVueLowered, lowerVueModule } from "./lower.js";

import type {
  TargetContext,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "vue",
  moduleKind: "component",
  componentName: "Fixture",
};

describe("the Vue lowering phase turns neutral facts into a Vue plan", () => {
  it("plans refs, computed values, watchers and template refs", () => {
    const module = semanticModule({
      component: component({ name: "Fixture", parameter: "properties" }),
      state: [state("count", "setCount", { type: "number", initializer: "0" })],
      memos: [memo("total", "() => count * 2", ["count"])],
      effects: [
        effect("() => { track(); }", { dependencies: ["count"] }),
        effect("() => { mount(); }", { dependencies: [] }),
      ],
      refs: [
        templateRef("inputRef", "HTMLInputElement | null", "null"),
        templateRef("timer", "number"),
      ],
    });

    const { lowered } = lowerVueModule(module, CONTEXT);
    if (!isVueLowered(lowered)) {
      throw new Error("expected a Vue plan");
    }

    expect(lowered.reactiveState).toEqual([
      {
        name: "count",
        setterName: "setCount",
        typeText: "number",
        initializerText: "0",
      },
    ]);
    expect(lowered.computedValues).toEqual([
      {
        name: "total",
        factoryText: "() => count * 2",
        dependencies: ["count"],
      },
    ]);
    expect(lowered.watchers.map((watcher) => watcher.runsOnce)).toEqual([
      false,
      true,
    ]);
    expect(lowered.templateRefs).toEqual([
      {
        name: "inputRef",
        elementTypeText: "HTMLInputElement | null",
        initializerText: "null",
        useTemplateRef: true,
      },
      {
        name: "timer",
        elementTypeText: "number",
        initializerText: undefined,
        useTemplateRef: false,
      },
    ]);
  });

  it("resolves a state type from the explicit type, then the inferred one, then `unknown`", () => {
    const module = semanticModule({
      component: component({ name: "Fixture", parameter: "properties" }),
      state: [
        state("typed", "setTyped", { type: "string[]" }),
        state("inferred", "setInferred", { inferredType: "number" }),
        state("unknownState", "setUnknownState"),
      ],
    });

    const { lowered } = lowerVueModule(module, CONTEXT);
    if (!isVueLowered(lowered)) {
      throw new Error("expected a Vue plan");
    }

    expect(lowered.reactiveState.map((entry) => entry.typeText)).toEqual([
      "string[]",
      "number",
      "unknown",
    ]);
  });

  it("plans the `defineProps` contract, dropping `children` and flagging defaults", () => {
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
      }),
      propsType: "Readonly<FixtureProperties>",
      props: [
        prop("label", "string"),
        prop("size", "'sm' | 'md'", { optional: true, defaultValue: "'md'" }),
        prop("children", "MpChildren", { optional: true }),
      ],
    });

    const { lowered } = lowerVueModule(module, CONTEXT);
    if (!isVueLowered(lowered)) {
      throw new Error("expected a Vue plan");
    }

    expect(lowered.propsContract.parameterName).toBe("properties");
    expect(lowered.propsContract.typeText).toBe("Readonly<FixtureProperties>");
    expect(lowered.propsContract.props.map((entry) => entry.name)).toEqual([
      "label",
      "size",
    ]);
    expect(lowered.propsContract.requiresWithDefaults).toBe(true);
  });

  it("lists the exact `vue` bindings the plan needs", () => {
    const module = semanticModule({
      component: component({ name: "Fixture", parameter: "properties" }),
      state: [state("count", "setCount", { initializer: "0" })],
      memos: [memo("total", "() => count * 2")],
      effects: [
        effect("() => { track(); }"),
        effect("() => { mount(); }", {
          dependencies: [],
          cleanup: "() => stop()",
        }),
      ],
      refs: [templateRef("inputRef", "HTMLInputElement | null")],
      slots: [slot("footer")],
      dynamicNodes: ["properties.as"],
    });

    const { lowered } = lowerVueModule(module, CONTEXT);
    if (!isVueLowered(lowered)) {
      throw new Error("expected a Vue plan");
    }

    expect(lowered.vueImports.values).toEqual([
      "computed",
      "onMounted",
      "onUnmounted",
      "ref",
      "resolveComponent",
      "useSlots",
      "useTemplateRef",
      "watchEffect",
    ]);
  });

  it("carries slots, events, dynamic nodes, list keys and static subtrees into the plan", () => {
    const module = semanticModule({
      component: component({ name: "Fixture", parameter: "properties" }),
      slots: [slot("footer", "<span />")],
      events: [{ name: "change", handler: "(value: string) => void" }],
      dynamicNodes: ["properties.as"],
      listKeys: [
        listKey("properties.items", "item.id", true),
        listKey("rows", undefined, false),
      ],
      staticSubtrees: [{ start: 4, end: 9 }],
    });

    const { lowered } = lowerVueModule(module, CONTEXT);
    if (!isVueLowered(lowered)) {
      throw new Error("expected a Vue plan");
    }

    expect(lowered.slots).toEqual([
      { name: "footer", fallbackText: "<span />" },
    ]);
    expect(lowered.events).toEqual([
      { name: "change", handlerText: "(value: string) => void" },
    ]);
    expect(lowered.dynamicNodes).toEqual([{ expressionText: "properties.as" }]);
    expect(lowered.listKeys).toEqual([
      { sourceText: "properties.items", keyText: "item.id", stable: true },
      { sourceText: "rows", keyText: undefined, stable: false },
    ]);
    expect(lowered.staticSubtrees).toEqual([
      { start: 4, end: 9, hoisted: false },
    ]);
    expect(lowered.appliedOptimizations).toEqual([]);
  });

  it("detects a recursive component from its own render tree", () => {
    const recursive = semanticModule({
      componentName: "Tree",
      component: component({
        name: "Tree",
        parameter: "properties",
        body: [
          statement(
            "const children = properties.items.map((item) => <Tree item={item} />);",
          ),
        ],
        returnNode: element("ul", { selfClosing: true }),
      }),
    });
    const flat = semanticModule({
      componentName: "Leaf",
      component: component({
        name: "Leaf",
        parameter: "properties",
        returnNode: element("li", { selfClosing: true }),
      }),
    });

    const recursivePlan = lowerVueModule(recursive, CONTEXT).lowered;
    const flatPlan = lowerVueModule(flat, CONTEXT).lowered;

    expect(
      isVueLowered(recursivePlan) && recursivePlan.recursiveComponent,
    ).toBe(true);
    expect(isVueLowered(flatPlan) && flatPlan.recursiveComponent).toBe(false);
  });

  it("narrows only Vue plans with `isVueLowered`", () => {
    const foreign: TargetLoweredModule = {
      framework: "svelte",
      appliedOptimizations: [],
    };

    expect(isVueLowered(foreign)).toBe(false);
    expect(isVueLowered(undefined)).toBe(false);
  });
});
