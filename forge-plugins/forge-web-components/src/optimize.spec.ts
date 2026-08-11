import { describe, expect, it } from "vitest";

import {
  booleanAttribute,
  component,
  element,
  expressionChild,
  listKey,
  prop,
  semanticModule,
  state,
  statement,
  textChild,
} from "./ir-test-helpers.ts";
import { lowerWebComponentsPlan } from "./lower.ts";
import {
  optimizeWebComponentsModule,
  optimizeWebComponentsPlan,
  WEB_COMPONENTS_OPTIMIZATIONS,
} from "./optimize.ts";

import type {
  WebComponentsLoweredModule,
  WebComponentsReactiveProperty,
} from "./lower.ts";
import type {
  SemanticModule,
  TargetContext,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "web-components",
  moduleKind: "component",
  componentName: "ForgeFixture",
  componentFolders: new Set(),
};

const ALL_PASSES = [
  WEB_COMPONENTS_OPTIMIZATIONS.dedupeReactiveProperties,
  WEB_COMPONENTS_OPTIMIZATIONS.narrowUnknownFields,
  WEB_COMPONENTS_OPTIMIZATIONS.hoistStaticTemplateParts,
  WEB_COMPONENTS_OPTIMIZATIONS.stableListKeys,
  WEB_COMPONENTS_OPTIMIZATIONS.dropUnusedRuntimeImports,
];

function lower(module: SemanticModule): WebComponentsLoweredModule {
  return lowerWebComponentsPlan(module, CONTEXT);
}

const DEFAULT_OPTIONS: TargetOptimizeOptions = { neutral: {} };

function optimize(
  module: SemanticModule,
  options: TargetOptimizeOptions = DEFAULT_OPTIONS,
): WebComponentsLoweredModule {
  return optimizeWebComponentsPlan(lower(module), options);
}

/** A component whose only job is to host the intentions under test. */
function hostModule(
  parts: Parameters<typeof semanticModule>[0] = {},
): SemanticModule {
  return semanticModule({
    component: component({
      name: "ForgeFixture",
      parameter: "properties",
      returnNode: element("span"),
    }),
    ...parts,
  });
}

/** The fully static return tree Stage-1 marks as hoistable. */
const STATIC_MODULE = semanticModule({
  component: component({
    name: "ForgeFixture",
    returnNode: element("span", {
      attributes: [booleanAttribute("__mpStatic")],
      children: [textChild("static")],
    }),
  }),
});

describe("the Web-Components optimization phase", () => {
  it("records every pass it runs, once", () => {
    const plan = optimize(hostModule());

    expect(plan.appliedOptimizations).toEqual(ALL_PASSES);
  });

  it("is idempotent in both the plan and the recorded passes", () => {
    const once = optimize(
      hostModule({
        props: [prop("label", "string")],
        listKeys: [listKey("rows()", false)],
      }),
    );
    const twice = optimizeWebComponentsPlan(once, { neutral: {} });

    expect(twice).toEqual(once);
    expect(twice.appliedOptimizations).toEqual(ALL_PASSES);
  });

  it("collapses a property and a state field that share a name, property first", () => {
    const plan = optimize(
      hostModule({
        props: [prop("label", "string")],
        state: [
          state("label", "setLabel", { initializer: "''" }),
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
        ],
      }),
    );

    expect(plan.reactiveProperties.map((property) => property.name)).toEqual([
      "label",
    ]);
    expect(plan.reactiveProperties[0]?.type).toBe("string");
    expect(plan.stateFields.map((field) => field.name)).toEqual(["open"]);
  });

  it("resolves a repeated declaration deterministically, keeping the declared type", () => {
    // Two records can name the same member (a discovered read and a declared
    // prop). The first survives, upgraded to the declared type, whichever order
    // the duplicates arrive in.
    const untyped: WebComponentsReactiveProperty = {
      name: "tone",
      attribute: "tone",
      type: "unknown",
      optional: true,
      declared: false,
      declaration: {},
    };
    const declared: WebComponentsReactiveProperty = {
      ...untyped,
      type: "Tone",
      declared: true,
    };
    const forwards = optimizeWebComponentsPlan(
      { ...lower(hostModule()), reactiveProperties: [untyped, declared] },
      { neutral: {} },
    );
    const backwards = optimizeWebComponentsPlan(
      { ...lower(hostModule()), reactiveProperties: [declared, untyped] },
      { neutral: {} },
    );

    expect(forwards.reactiveProperties).toEqual([declared]);
    expect(backwards.reactiveProperties).toEqual([declared]);
  });

  it("narrows an unknown field from a literal initializer without ever widening", () => {
    const plan = optimize(
      hostModule({
        props: [
          prop("tone", undefined, true, "'neutral'"),
          prop("mode", "Mode", true, "'idle'"),
        ],
        state: [
          state("title", "setTitle", { initializer: "'hello'" }),
          state("count", "setCount", { initializer: "42" }),
          state("flag", "setFlag", { initializer: "true" }),
          state("bag", "setBag", { initializer: "buildBag()" }),
        ],
      }),
    );

    expect(
      plan.reactiveProperties.map((property) => [property.name, property.type]),
    ).toEqual([
      ["tone", "string | undefined"],
      ["mode", "Mode | undefined"],
    ]);
    expect(plan.stateFields.map((field) => [field.name, field.type])).toEqual([
      ["title", "string"],
      ["count", "number"],
      ["flag", "boolean"],
      ["bag", "unknown"],
    ]);
    expect(JSON.stringify(plan)).not.toMatch(/\bany\b/u);
  });

  it("hoists a static template only while static marking is enabled", () => {
    const hoisted = optimize(STATIC_MODULE);
    const plain = optimize(STATIC_MODULE, {
      neutral: { staticMarking: false },
    });

    expect(hoisted.template.hoisted).toEqual([
      { name: "__mpStaticTpl_0", template: "<span>static</span>" },
    ]);
    expect(hoisted.appliedOptimizations).toContain(
      WEB_COMPONENTS_OPTIMIZATIONS.hoistStaticTemplateParts,
    );
    expect(plain.template.hoisted).toEqual([]);
    expect(plain.appliedOptimizations).not.toContain(
      WEB_COMPONENTS_OPTIMIZATIONS.hoistStaticTemplateParts,
    );
  });

  it("never hoists a template whose render head can change it", () => {
    const plan = optimize(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const heading = properties.label;")],
          returnNode: element("span", {
            attributes: [booleanAttribute("__mpStatic")],
            children: [textChild("x")],
          }),
        }),
        props: [prop("label", "string")],
      }),
    );

    expect(plan.template.hoisted).toEqual([]);
  });

  it("keeps only stable list keys while key inference is enabled", () => {
    const keys = [listKey("items", true, "item.id"), listKey("rows()", false)];
    const pruned = optimize(hostModule({ listKeys: keys }));
    const kept = optimize(hostModule({ listKeys: keys }), {
      neutral: { stableKeyInference: false },
    });

    expect(pruned.listKeys.map((key) => key.source)).toEqual(["items"]);
    expect(kept.listKeys.map((key) => key.source)).toEqual(["items", "rows()"]);
    expect(kept.appliedOptimizations).not.toContain(
      WEB_COMPONENTS_OPTIMIZATIONS.stableListKeys,
    );
  });

  it("prunes the runtime values the final plan no longer uses", () => {
    const plain = optimize(hostModule());
    const conditional = optimize(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            children: [
              expressionChild("properties.open && <b />", [
                element("b", { source: "<b />", selfClosing: true }),
              ]),
            ],
          }),
        }),
      }),
    );

    // `nothing` belongs to the structural header contract; the pass prunes
    // only `unsafeHtml` and unreferenced local JSX types.
    expect(plain.runtimeImports.values).toEqual([
      "ForgeElement",
      "html",
      "nothing",
    ]);
    expect(conditional.runtimeImports.values).toEqual([
      "ForgeElement",
      "html",
      "nothing",
    ]);
  });

  it("passes a foreign target plan through untouched", () => {
    const module = hostModule();
    const foreign = { framework: "vue", module, context: CONTEXT } as const;

    expect(optimizeWebComponentsModule(foreign, { neutral: {} })).toBe(foreign);
  });

  it("optimizes the lowered plan carried by the target intentions", () => {
    const intentions = optimizeWebComponentsModule(
      {
        framework: "web-components",
        module: STATIC_MODULE,
        context: CONTEXT,
        lowered: lower(STATIC_MODULE),
      },
      { neutral: {} },
    );

    expect(intentions.lowered?.appliedOptimizations).toEqual(ALL_PASSES);
  });
});
