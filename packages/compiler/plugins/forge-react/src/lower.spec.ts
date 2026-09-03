import { describe, expect, it } from "vitest";

import {
  component,
  dynamicNode,
  effect,
  element,
  event,
  expressionAttribute,
  expressionChild,
  listKey,
  memo,
  moduleImport,
  neutralImport,
  prop,
  reference,
  semanticModule,
  slot,
  state,
  statement,
  textChild,
  type SemanticModuleParts,
} from "./ir-test-helpers.ts";
import {
  isReactLowered,
  lowerReactModule,
  planReactModule,
  type ReactModulePlan,
} from "./lower.ts";

import type { TargetContext } from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "react",
  moduleKind: "component",
  componentName: "ForgeFixture",
};

function plan(parts: SemanticModuleParts): ReactModulePlan {
  return planReactModule(semanticModule(parts), CONTEXT.componentName);
}

describe("the React lowering phase", () => {
  it("plans a useState hook from a state intention", () => {
    const hooks = plan({
      state: [
        state("open", "setOpen", { type: "boolean", initializer: "false" }),
      ],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    }).hooks;

    expect(hooks.state).toEqual([
      {
        name: "open",
        setterName: "setOpen",
        type: "boolean",
        initializer: "false",
      },
    ]);
  });

  it("resolves a state type from its literal inference, then falls back to unknown", () => {
    const hooks = plan({
      state: [
        state("count", undefined, { inferredType: "number" }),
        state("payload"),
      ],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    }).hooks;

    expect(hooks.state[0]).toMatchObject({
      name: "count",
      setterName: "setCount",
      type: "number",
    });
    expect(hooks.state[1]).toMatchObject({
      name: "payload",
      setterName: "setPayload",
      type: "unknown",
    });
  });

  it("plans memo, effect and ref hooks with their dependencies", () => {
    const hooks = plan({
      memos: [memo("total", "items.length", ["items"])],
      effects: [effect("subscribe()", ["id"], "unsubscribe()")],
      refs: [reference("root", "HTMLDivElement")],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    }).hooks;

    expect(hooks.memos).toEqual([
      { name: "total", factory: "items.length", dependencies: ["items"] },
    ]);
    expect(hooks.effects).toEqual([
      { body: "subscribe()", cleanup: "unsubscribe()", dependencies: ["id"] },
    ]);
    expect(hooks.refs).toEqual([
      { name: "root", elementType: "HTMLDivElement" },
    ]);
  });

  it("plans props with their resolved types, optionality and parameter binding", () => {
    const lowered = plan({
      props: [
        prop("label", "string"),
        prop("variant", "'solid' | 'ghost'", true),
        prop("extra"),
      ],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        parameterType: "ForgeFixtureProperties",
        returnNode: element("div"),
      }),
    });

    expect(lowered.props).toEqual([
      { name: "label", type: "string", optional: false },
      { name: "variant", type: "'solid' | 'ghost'", optional: true },
      { name: "extra", type: "unknown", optional: false },
    ]);
    expect(lowered.propsParameter).toEqual({
      name: "properties",
      binding: "identifier",
      text: "properties",
      type: "ForgeFixtureProperties",
    });
  });

  it("plans the exact react bindings the module needs", () => {
    const imports = plan({
      imports: [
        neutralImport(
          ["h", "Fragment", "classNames", "Slot", "Teleport"],
          ["MpChild", "ForgeVariant"],
        ),
      ],
      state: [state("open", "setOpen")],
      effects: [effect("subscribe()")],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", { children: [textChild("hi")] }),
      }),
    }).reactImports;

    expect(imports.values).toEqual([
      "createElement",
      "Fragment",
      "useState",
      "useEffect",
    ]);
    expect(imports.types).toEqual(["ReactNode"]);
    expect(imports.adapterComponents).toEqual(["Teleport"]);
    expect(imports.runtimeValues).toEqual(["classNames"]);
    expect(imports.neutralTypes).toEqual(["ForgeVariant"]);
  });

  it("requires the client directive when the module binds an on* handler", () => {
    const directive = plan({
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("button", {
          attributes: [expressionAttribute("onClick", "properties.onClick")],
        }),
      }),
    }).clientDirective;

    expect(directive).toEqual({
      required: true,
      declared: false,
      handlers: true,
    });
  });

  it("records a directive the neutral source already declared", () => {
    const directive = plan({
      declarations: [statement("'use client';", "expression")],
      state: [state("open", "setOpen")],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    }).clientDirective;

    expect(directive).toEqual({
      required: true,
      declared: true,
      handlers: false,
    });
  });

  it("leaves a static module off the client", () => {
    const directive = plan({
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", { children: [textChild("hi")] }),
      }),
    }).clientDirective;

    expect(directive.required).toBe(false);
  });

  it("maps an i18next import onto the useI18n injection", () => {
    const i18n = plan({
      imports: [
        moduleImport("import i18next from 'i18next';", "i18next", {
          defaultName: "i18next",
        }),
      ],
      component: component({
        name: "ForgeFixture",
        body: [statement("const label = i18next.t('forge.label');")],
        returnNode: element("span", { children: [expressionChild("label")] }),
      }),
    }).i18n;

    expect(i18n).toEqual({
      importRequired: true,
      hookRequired: true,
      module: "@mission-platform/i18n",
      hook: "useI18n",
    });
  });

  it("never injects the hook twice when the source already calls useI18n", () => {
    const i18n = plan({
      imports: [
        moduleImport("import i18next from 'i18next';", "i18next", {
          defaultName: "i18next",
        }),
      ],
      component: component({
        name: "ForgeFixture",
        body: [
          statement("const { t } = useI18n();"),
          statement("const label = i18next.t('forge.label');"),
        ],
        returnNode: element("span", { children: [expressionChild("label")] }),
      }),
    }).i18n;

    expect(i18n.hookRequired).toBe(false);
  });

  it("carries slots, dynamic nodes and list keys into React shape", () => {
    const lowered = plan({
      slots: [slot("default"), slot("header", "<span />")],
      dynamicNodes: [dynamicNode("properties.as")],
      listKeys: [listKey("items", true, "item.id"), listKey("rows", false)],
      events: [event("change", "(value) => value")],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("div"),
      }),
    });

    expect(lowered.slots).toEqual([
      { name: "default", access: "properties.children" },
      { name: "header", access: "properties.header", fallback: "<span />" },
    ]);
    expect(lowered.dynamicNodes).toEqual([{ expression: "properties.as" }]);
    expect(lowered.listKeys).toEqual([
      { source: "items", key: "item.id", stable: true },
      { source: "rows", stable: false },
    ]);
    expect(lowered.clientDirective.handlers).toBe(true);
  });

  it("names the constant every static subtree hoists into", () => {
    const lowered = plan({
      staticSubtrees: [
        { start: 10, end: 20 },
        { start: 30, end: 44 },
      ],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    });

    expect(lowered.staticSubtrees).toEqual([
      { constantName: "__mpHoist_0", span: { start: 10, end: 20 } },
      { constantName: "__mpHoist_1", span: { start: 30, end: 44 } },
    ]);
    expect(lowered.hoistStatic).toBe(true);
    expect(lowered.unwrapSingleChildFragments).toBe(false);
  });

  it("returns intentions carrying the plan, narrowable without a cast", () => {
    const module = semanticModule({
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    });
    const intentions = lowerReactModule(module, CONTEXT);

    expect(intentions.framework).toBe("react");
    expect(intentions.module).toBe(module);
    expect(intentions.context).toBe(CONTEXT);
    expect(isReactLowered(intentions.lowered)).toBe(true);
    if (!isReactLowered(intentions.lowered)) {
      throw new Error("the React plugin must lower a React plan");
    }
    expect(intentions.lowered.appliedOptimizations).toEqual([]);
    expect(intentions.lowered.plan.componentName).toBe("ForgeFixture");
  });

  it("rejects a plan another target lowered", () => {
    expect(isReactLowered(undefined)).toBe(false);
    expect(isReactLowered({ framework: "vue", appliedOptimizations: [] })).toBe(
      false,
    );
  });
});
