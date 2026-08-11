import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";
import { describe, expect, it } from "vitest";

import { emitReactModule } from "./emitters/index.ts";
import {
  booleanAttribute,
  component,
  element,
  expressionAttribute,
  fragment,
  listKey,
  neutralImport,
  semanticModule,
  state,
  statement,
  textChild,
  type SemanticModuleParts,
} from "./ir-test-helpers.ts";
import {
  isReactLowered,
  lowerReactModule,
  type ReactModulePlan,
} from "./lower.ts";
import { optimizeReactModule, REACT_OPTIMIZATIONS } from "./optimize.ts";

import type {
  SemanticModule,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const CONTEXT = {
  framework: "react",
  moduleKind: "component",
  componentName: "ForgeFixture",
} as const;

const DEFAULT_OPTIONS: TargetOptimizeOptions = { neutral: {} };

const EVERY_OPTIMIZATION = [
  REACT_OPTIMIZATIONS.hoistStaticSubtrees,
  REACT_OPTIMIZATIONS.stableListKeys,
  REACT_OPTIMIZATIONS.collapseFragments,
  REACT_OPTIMIZATIONS.dropUnusedImports,
  REACT_OPTIMIZATIONS.skipClientDirective,
];

function optimize(
  parts: SemanticModuleParts,
  options: TargetOptimizeOptions = DEFAULT_OPTIONS,
): TargetIntentions {
  return optimizeReactModule(
    lowerReactModule(semanticModule(parts), CONTEXT),
    options,
  );
}

function planOf(intentions: TargetIntentions): ReactModulePlan {
  if (!isReactLowered(intentions.lowered)) {
    throw new Error("the React optimizer must return a React plan");
  }
  return intentions.lowered.plan;
}

function appliedTo(intentions: TargetIntentions): readonly string[] {
  if (!isReactLowered(intentions.lowered)) {
    throw new Error("the React optimizer must return a React plan");
  }
  return intentions.lowered.appliedOptimizations;
}

function generate(module: SemanticModule, plan: ReactModulePlan): string {
  return emitReactModule(module, CONTEXT.componentName, plan);
}

describe("the React optimization phase", () => {
  it("records every optimization it applied", () => {
    const optimized = optimize({
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", { children: [textChild("hi")] }),
      }),
    });

    expect(appliedTo(optimized)).toEqual(EVERY_OPTIMIZATION);
  });

  it("never records the same optimization twice", () => {
    const once = optimize({
      imports: [neutralImport(["h", "useState"])],
      state: [state("open", "setOpen")],
      component: component({
        name: "ForgeFixture",
        body: [statement("const [open, setOpen] = useState(false);")],
        returnNode: element("div"),
      }),
    });
    const twice = optimizeReactModule(once, DEFAULT_OPTIONS);

    expect(appliedTo(twice)).toEqual(EVERY_OPTIMIZATION);
    expect(planOf(twice)).toEqual(planOf(once));
  });

  it("lowers a plan on the fly when the intentions carry none", () => {
    const module = semanticModule({
      component: component({
        name: "ForgeFixture",
        returnNode: element("div"),
      }),
    });
    const optimized = optimizeReactModule(
      { framework: "react", module, context: CONTEXT },
      DEFAULT_OPTIONS,
    );

    expect(planOf(optimized).componentName).toBe("ForgeFixture");
    expect(appliedTo(optimized)).toEqual(EVERY_OPTIMIZATION);
  });

  it("hoists static subtrees, and leaves them inline when static marking is off", () => {
    const parts: SemanticModuleParts = {
      staticSubtrees: [{ start: 4, end: 12 }],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", {
          children: [
            element("svg", { attributes: [booleanAttribute(MP_STATIC_ATTR)] }),
          ],
        }),
      }),
    };
    const enabled = optimize(parts);
    const disabled = optimize(parts, { neutral: { staticMarking: false } });

    expect(appliedTo(enabled)).toContain(
      REACT_OPTIMIZATIONS.hoistStaticSubtrees,
    );
    expect(planOf(enabled).hoistStatic).toBe(true);
    expect(generate(enabled.module, planOf(enabled))).toContain(
      "const __mpHoist_0 = <svg/>;",
    );

    expect(appliedTo(disabled)).not.toContain(
      REACT_OPTIMIZATIONS.hoistStaticSubtrees,
    );
    expect(planOf(disabled).hoistStatic).toBe(false);
    expect(planOf(disabled).staticSubtrees).toEqual([]);
    expect(generate(disabled.module, planOf(disabled))).not.toContain(
      "__mpHoist_0",
    );
  });

  it("keeps only stable list keys, unless stable-key inference is off", () => {
    const parts: SemanticModuleParts = {
      listKeys: [listKey("items", true, "item.id"), listKey("rows", false)],
      component: component({ name: "ForgeFixture", returnNode: element("ul") }),
    };
    const enabled = optimize(parts);
    const disabled = optimize(parts, {
      neutral: { stableKeyInference: false },
    });

    expect(appliedTo(enabled)).toContain(REACT_OPTIMIZATIONS.stableListKeys);
    expect(planOf(enabled).listKeys).toEqual([
      { source: "items", key: "item.id", stable: true },
    ]);

    expect(appliedTo(disabled)).not.toContain(
      REACT_OPTIMIZATIONS.stableListKeys,
    );
    expect(planOf(disabled).listKeys).toHaveLength(2);
  });

  it("collapses a fragment wrapping a single element", () => {
    const optimized = optimize({
      imports: [neutralImport(["h", "Fragment"])],
      component: component({
        name: "ForgeFixture",
        returnNode: fragment(
          [element("span")],
          "<Fragment><span /></Fragment>",
        ),
      }),
    });
    const source = generate(optimized.module, planOf(optimized));

    expect(appliedTo(optimized)).toContain(
      REACT_OPTIMIZATIONS.collapseFragments,
    );
    expect(planOf(optimized).unwrapSingleChildFragments).toBe(true);
    expect(source).toContain("return <span/>;");
    expect(source).not.toContain("Fragment");
  });

  it("prunes react bindings the module never references", () => {
    const optimized = optimize({
      imports: [neutralImport(["h", "useState", "useId"], ["MpChild"])],
      component: component({
        name: "ForgeFixture",
        body: [
          statement("const id = useId();"),
          statement("return <div id={id} />;", "return", {
            renderNodes: [
              element("div", {
                attributes: [expressionAttribute("id", "id")],
                source: "<div id={id} />",
              }),
            ],
          }),
        ],
      }),
    });
    const source = generate(optimized.module, planOf(optimized));

    // `createElement` stays: it is imported as `createElement as h`, the factory the JSX compiles to.
    expect(planOf(optimized).reactImports.values).toEqual([
      "createElement",
      "useId",
    ]);
    expect(planOf(optimized).reactImports.types).toEqual([]);
    expect(source).toContain(
      'import { createElement as h, useId } from "react";',
    );
    expect(source).not.toContain("useState");
    expect(source).not.toContain("ReactNode");
  });

  it("keeps the bindings the plan still needs", () => {
    const optimized = optimize({
      imports: [neutralImport(["h", "useState"], ["MpChild"])],
      state: [state("open", "setOpen")],
      declarations: [
        statement("type Slotted = MpChild;", "type-alias", { name: "Slotted" }),
      ],
      component: component({
        name: "ForgeFixture",
        body: [statement("const [open, setOpen] = useState(false);")],
        returnNode: element("div"),
      }),
    });

    expect(planOf(optimized).reactImports.values).toEqual([
      "createElement",
      "useState",
    ]);
    expect(planOf(optimized).reactImports.types).toEqual(["ReactNode"]);
  });

  it("drops the client directive once the plan has no interactivity left", () => {
    const optimized = optimize({
      imports: [neutralImport(["h", "useState"])],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", { children: [textChild("static")] }),
      }),
    });
    const source = generate(optimized.module, planOf(optimized));

    expect(appliedTo(optimized)).toContain(
      REACT_OPTIMIZATIONS.skipClientDirective,
    );
    expect(planOf(optimized).clientDirective.required).toBe(false);
    expect(source).not.toContain("use client");
  });

  it("keeps the client directive for a module that binds handlers", () => {
    const optimized = optimize({
      imports: [neutralImport(["h"])],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("button", {
          attributes: [expressionAttribute("onClick", "properties.onClick")],
        }),
      }),
    });
    const source = generate(optimized.module, planOf(optimized));

    expect(planOf(optimized).clientDirective.required).toBe(true);
    expect(source.startsWith('"use client";')).toBe(true);
  });
});
