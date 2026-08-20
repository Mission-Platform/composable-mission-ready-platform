import { describe, expect, it } from "vitest";

import {
  component,
  effect,
  element,
  elementRef,
  expressionAttribute,
  expressionChild,
  fragment,
  dynamicNode,
  listKey,
  memo,
  prop,
  semanticModule,
  spreadAttribute,
  state,
  statement,
} from "./ir-test-helpers.ts";
import {
  isWebComponentsLowered,
  lowerWebComponentsModule,
  lowerWebComponentsPlan,
} from "./lower.ts";

import type { WebComponentsLoweredModule } from "./lower.ts";
import type {
  SemanticModule,
  TargetContext,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "web-components",
  moduleKind: "component",
  componentName: "ForgeFixture",
  componentFolders: new Set(),
};

function lower(module: SemanticModule): WebComponentsLoweredModule {
  return lowerWebComponentsPlan(module, CONTEXT);
}

/** The component's own props interface, retained beside the generated class. */
const BUTTON_PROPERTIES = statement(
  [
    "export interface ButtonProperties {",
    "  variant?: Variant;",
    "  disabled?: boolean;",
    "}",
  ].join("\n"),
  "interface",
  { name: "ButtonProperties", exported: true },
);

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

describe("the Web-Components lowering phase", () => {
  it("derives the element identity from the target context", () => {
    const plan = lower(hostModule());

    expect(plan.framework).toBe("web-components");
    expect(plan.className).toBe("ForgeFixtureElement");
    expect(plan.tagName).toBe("forge-fixture");
    expect(plan.appliedOptimizations).toEqual([]);
  });

  it.each([
    ["div", "HTMLDivElement"],
    ["span", "HTMLSpanElement"],
    ["p", "HTMLParagraphElement"],
    ["h1", "HTMLHeadingElement"],
    ["h6", "HTMLHeadingElement"],
  ] as const)("selects a customized built-in for <%s>", (tag, constructor) => {
    const plan = lower(
      hostModule({
        component: component({
          name: "ForgeFixture",
          returnNode: element(tag),
        }),
      }),
    );

    expect(plan.host).toEqual({
      kind: "customized-built-in",
      baseTag: tag,
      constructorExpression: constructor,
      registrationExtends: tag,
      registrationOptions: { extends: tag },
      invocation: "is-attribute",
    });
    expect(plan.shadow).toEqual({ mode: "open" });
    expect(plan.internals).toEqual({ attach: true });
  });

  it.each([
    ["missing root", undefined, "missing-root"],
    ["a fragment root", fragment([]), "fragment-root"],
    [
      "an invalid intrinsic root",
      element("1div", { tagKind: "element" }),
      "invalid-root",
    ],
    ["an unsupported intrinsic root", element("button"), "unsupported-root"],
  ] as const)(
    "retains an autonomous host for %s",
    (_label, returnNode, reason) => {
      const plan = lower(
        hostModule({
          component: component({ name: "ForgeFixture", returnNode }),
        }),
      );

      expect(plan.host).toMatchObject({
        kind: "autonomous",
        constructorExpression: "ForgeElement",
        invocation: "custom-tag",
        fallbackReason: reason,
      });
    },
  );

  it("retains an autonomous host for a dynamic root", () => {
    const plan = lower(
      hostModule({
        component: component({
          name: "ForgeFixture",
          returnNode: element("tag", { tagKind: "dynamic" }),
        }),
      }),
    );

    expect(plan.host.fallbackReason).toBe("dynamic-root");
  });

  it("narrows a target plan without casting", () => {
    const plan = lower(hostModule());

    expect(isWebComponentsLowered(plan)).toBe(true);
    expect(isWebComponentsLowered(undefined)).toBe(false);
    expect(
      isWebComponentsLowered({ framework: "vue", appliedOptimizations: [] }),
    ).toBe(false);
  });

  it("resolves a reactive property from its declared prop type", () => {
    const plan = lower(hostModule({ props: [prop("label", "string")] }));

    expect(plan.reactiveProperties).toEqual([
      {
        name: "label",
        attribute: "label",
        type: "string",
        optional: false,
        declared: true,
        inherited: false,
        defaultValue: undefined,
        declaration: {},
      },
    ]);
  });

  it("widens an optional prop with undefined", () => {
    const plan = lower(
      hostModule({ props: [prop("variant", "Variant", true)] }),
    );

    expect(plan.reactiveProperties[0]?.type).toBe("Variant | undefined");
  });

  it("falls back to unknown for a property discovered in the render tree", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            attributes: [expressionAttribute("title", "properties.hint")],
          }),
        }),
      }),
    );

    expect(
      plan.reactiveProperties.map((property) => [
        property.name,
        property.type,
        property.declared,
      ]),
    ).toEqual([["hint", "unknown", false]]);
  });

  it("annotates a property against the component own props interface", () => {
    const plan = lower(
      semanticModule({
        declarations: [BUTTON_PROPERTIES],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "ButtonProperties",
          returnNode: element("span", {
            attributes: [expressionAttribute("title", "properties.variant")],
            children: [expressionChild("properties.disabled")],
          }),
        }),
      }),
    );

    expect(
      plan.reactiveProperties.map((property) => [
        property.name,
        property.type,
        property.declared,
      ]),
    ).toEqual([
      ["variant", "ButtonProperties['variant']", true],
      ["disabled", "ButtonProperties['disabled']", true],
    ]);
  });

  it("keeps an interface member optionality exactly, since the field is declared", () => {
    const plan = lower(
      semanticModule({
        declarations: [
          statement(
            "export interface FieldProperties {\n  locale: string;\n  label?: string;\n}",
            "interface",
            {
              name: "FieldProperties",
              exported: true,
            },
          ),
        ],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "Readonly<FieldProperties>",
          returnNode: element("span", {
            attributes: [
              expressionAttribute("lang", "properties.locale"),
              expressionAttribute("title", "properties.label"),
            ],
          }),
        }),
      }),
    );

    // Neither member is widened: the printer emits `declare`, so a required prop
    // keeps its exact type rather than admitting the constructor's `undefined`.
    expect(
      plan.reactiveProperties.map((property) => [property.name, property.type]),
    ).toEqual([
      ["locale", "FieldProperties['locale']"],
      ["label", "FieldProperties['label']"],
    ]);
  });

  it("sees through a Readonly-wrapped props type", () => {
    const plan = lower(
      semanticModule({
        declarations: [BUTTON_PROPERTIES],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "Readonly<ButtonProperties>",
          returnNode: element("span", {
            attributes: [expressionAttribute("title", "properties.variant")],
          }),
        }),
      }),
    );

    expect(plan.reactiveProperties[0]?.type).toBe(
      "ButtonProperties['variant']",
    );
  });

  it("prefers the props interface over a separately declared prop type", () => {
    const plan = lower(
      semanticModule({
        declarations: [BUTTON_PROPERTIES],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "ButtonProperties",
          returnNode: element("span"),
        }),
        props: [prop("variant", "string", true)],
      }),
    );

    expect(plan.reactiveProperties[0]?.type).toBe(
      "ButtonProperties['variant']",
    );
  });

  it("falls back for a name the props interface does not declare", () => {
    const plan = lower(
      semanticModule({
        declarations: [BUTTON_PROPERTIES],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "ButtonProperties",
          // `describedBy` is never declared by the props interface, so the
          // retained declaration cannot vouch for it and the reference is not
          // emitted.
          returnNode: element("span", {
            attributes: [
              expressionAttribute("title", "properties.variant"),
              expressionAttribute("aria-describedby", "properties.describedBy"),
            ],
          }),
        }),
      }),
    );

    expect(
      plan.reactiveProperties.map((property) => [property.name, property.type]),
    ).toEqual([
      ["variant", "ButtonProperties['variant']"],
      ["describedBy", "unknown"],
    ]);
  });

  it("ignores a props type the module does not retain", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "ButtonProperties",
          returnNode: element("span", {
            attributes: [expressionAttribute("title", "properties.variant")],
          }),
        }),
      }),
    );

    expect(plan.reactiveProperties[0]?.type).toBe("unknown");
  });

  it("lifts a neutral useId call into a per-instance field", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const generatedId = useId();"),
            statement("const resolved = generatedId;"),
          ],
          returnNode: element("span", {
            attributes: [expressionAttribute("id", "generatedId")],
          }),
        }),
      }),
    );

    expect(plan.generatedIds).toEqual([
      { name: "generatedId", type: "string" },
    ]);
    // Lifted out of `render()`, so the id is handed out once per element.
    expect(plan.template.head).toEqual(["const resolved = this.generatedId;"]);
    expect(plan.template.template).toBe("<span id=${this.generatedId}></span>");
    expect(plan.runtimeImports.values).toContain("useId");
  });

  it("imports useId only when the component asks for one", () => {
    expect(lower(hostModule()).generatedIds).toEqual([]);
    expect(lower(hostModule()).runtimeImports.values).not.toContain("useId");
  });

  it("leaves an unrecognised useId declaration in the render head", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const [first, second] = [useId(), useId()];")],
          returnNode: element("span"),
        }),
      }),
    );

    expect(plan.generatedIds).toEqual([]);
    expect(plan.template.head).toEqual([
      "const [first, second] = [useId(), useId()];",
    ]);
    // The head still calls it, so the import survives.
    expect(plan.runtimeImports.values).toContain("useId");
  });

  it("never lowers the slotted children prop to a property", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("div", {
            children: [expressionChild("properties.children")],
          }),
        }),
        props: [prop("children", "MpChild", true)],
      }),
    );

    expect(plan.reactiveProperties).toEqual([]);
  });

  it("resolves state types from the explicit argument, the declared type, then the literal", () => {
    const plan = lower(
      hostModule({
        state: [
          state("mode", "setMode", { type: "Mode", initializer: "'idle'" }),
          state("label", "setLabel", { type: "string | undefined" }),
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
          state("bag", "setBag", { initializer: "buildBag()" }),
        ],
      }),
    );

    expect(
      plan.stateFields.map((field) => [field.name, field.type, field.declared]),
    ).toEqual([
      ["mode", "Mode", true],
      ["label", "string | undefined", true],
      ["open", "boolean", true],
      ["bag", "unknown", false],
    ]);
    expect(
      plan.stateFields.every((field) => field.declaration.state === true),
    ).toBe(true);
  });

  it("keeps a state cell that collides with a property, leaving the collapse to the optimizer", () => {
    const plan = lower(
      hostModule({
        props: [prop("label", "string")],
        state: [state("label", "setLabel", { initializer: '""' })],
      }),
    );

    expect(plan.reactiveProperties.map((property) => property.name)).toEqual([
      "label",
    ]);
    expect(plan.stateFields.map((field) => field.name)).toEqual(["label"]);
  });

  it("scopes the render head and drops hooks, returns and no-ops", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const [open, setOpen] = useState(false);"),
            statement("useEffect(() => { track('open'); }, []);", "expression"),
            statement("void properties;", "expression"),
            statement("const heading = properties.label.toUpperCase();"),
            statement("return <span />;", "return"),
          ],
          returnNode: element("span"),
        }),
        props: [prop("label", "string")],
        state: [
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
        ],
      }),
    );

    expect(plan.template.head).toEqual([
      "const heading = this.label.toUpperCase();",
    ]);
  });

  it("lowers a memo into a getter expression scoped to the element", () => {
    const plan = lower(
      hostModule({
        props: [prop("items", "readonly string[]")],
        memos: [memo("total", "() => items.length", ["items"])],
      }),
    );

    expect(plan.derived).toEqual([
      {
        name: "total",
        body: { kind: "expression", expression: "this.items.length" },
        dependencies: ["this.items"],
      },
    ]);
  });

  it("unwraps a block-bodied memo factory into getter statements", () => {
    const factory = [
      "() => {",
      "    const query = filter.trim();",
      "    if (query === '') {",
      "      return items;",
      "    }",
      "    return items.filter((item) => item.includes(query));",
      "  }",
    ].join("\n");
    const plan = lower(
      hostModule({
        props: [prop("items", "readonly string[]"), prop("filter", "string")],
        memos: [memo("matches", factory, ["items", "filter"])],
      }),
    );

    // A block must never be wrapped in `return`, or its `{` parses as an object
    // literal; the statements become the getter's body verbatim, dedented.
    expect(plan.derived[0]?.body).toEqual({
      kind: "block",
      statements: [
        "const query = this.filter.trim();",
        "if (query === '') {",
        "  return this.items;",
        "}",
        "return this.items.filter((item) => item.includes(query));",
      ],
    });
  });

  it("invokes a memo factory it cannot recognise as a zero-argument arrow", () => {
    const plan = lower(
      hostModule({
        props: [prop("items", "readonly string[]")],
        memos: [memo("total", "buildTotal(items)")],
      }),
    );

    expect(plan.derived[0]?.body).toEqual({
      kind: "expression",
      expression: "(buildTotal(this.items))()",
    });
  });

  it("lowers an effect into connected and disconnected callbacks with a cleanup field", () => {
    const plan = lower(
      hostModule({
        effects: [
          effect("() => { start(); }", "() => stop()"),
          effect("() => { warmUp(); }"),
        ],
      }),
    );

    expect(plan.cleanupFields).toEqual([
      { name: "__mpCleanup0", type: "(() => void) | undefined" },
    ]);
    expect(plan.lifecycle).toEqual([
      {
        callback: "connectedCallback",
        callsSuper: true,
        statements: [
          "this.__mpCleanup0 = (() => { start(); })();",
          "(() => { warmUp(); })();",
        ],
      },
      {
        callback: "disconnectedCallback",
        callsSuper: true,
        statements: [
          "this.__mpCleanup0?.();",
          "this.__mpCleanup0 = undefined;",
        ],
      },
      {
        callback: "updatedCallback",
        callsSuper: true,
        statements: [
          "this.__mpCleanup0?.();",
          "this.__mpCleanup0 = undefined;",
          "this.__mpCleanup0 = (() => { start(); })();",
          "(() => { warmUp(); })();",
        ],
      },
    ]);
  });

  it("lowers a ref into a typed current cell", () => {
    const plan = lower(
      hostModule({
        refs: [
          elementRef("wrapper", "HTMLElement | null", "null"),
          elementRef("bare"),
        ],
      }),
    );

    // A self-contained seed keeps its constructor position: nothing it reads
    // lives in `render()`, so there is nothing to defer to `setup()`.
    expect(plan.elementRefs).toEqual([
      {
        name: "wrapper",
        elementType: "HTMLElement | null",
        initializer: "null",
        deferred: false,
      },
      {
        name: "bare",
        elementType: "unknown",
        initializer: "undefined",
        deferred: false,
      },
    ]);
  });

  it("keeps every list key until the optimizer prunes them", () => {
    const plan = lower(
      hostModule({
        listKeys: [listKey("items", true, "item.id"), listKey("rows()", false)],
      }),
    );

    expect(plan.listKeys).toEqual([
      { source: "items", key: "item.id", stable: true },
      { source: "rows()", key: undefined, stable: false },
    ]);
  });

  it("imports only the runtime values the plan reaches for", () => {
    const plain = lower(hostModule());
    const conditional = lower(
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

    // The direct-DOM result and `nothing` are structural; compatibility `html`
    // is imported only when retained legacy code reaches for it.
    expect(plain.runtimeImports).toEqual({
      values: ["ForgeElement", "DomTemplateResult", "nothing"],
      types: [],
      localTypes: [],
    });
    expect(conditional.runtimeImports.values).toEqual([
      "ForgeElement",
      "DomTemplateResult",
      "dynamicElement",
      "nothing",
    ]);
    // The `static properties` map is annotated with the runtime's own
    // contract, so its type rides the same header whenever the map is emitted.
    expect(conditional.runtimeImports.types).toEqual(["PropertyDeclaration"]);
  });

  it("reports the local JSX types a retained declaration still references", () => {
    const plan = lower(
      semanticModule({
        declarations: [
          statement(
            "export interface FixtureProperties {\n  media?: MpChild;\n}",
            "interface",
            {
              name: "FixtureProperties",
              exported: true,
            },
          ),
        ],
      }),
    );

    expect(plan.runtimeImports.localTypes).toEqual(["MpChild"]);
    expect(plan.retainedDeclarations).toEqual([
      "export interface FixtureProperties {\n  media?: MpChild;\n}",
    ]);
  });

  it("lowers retained neutral dynamic-element calls to the native runtime", () => {
    const plan = lower(
      semanticModule({
        declarations: [statement("export const content = h('div', {});")],
      }),
    );

    expect(plan.retainedDeclarations).toEqual([
      "export const content = dynamicElement('div', {});",
    ]);
    expect(plan.runtimeImports.values).toContain("dynamicElement");
  });

  it("lowers spread bindings without diagnostics", () => {
    const intentions = lowerWebComponentsModule(
      semanticModule({
        fileName: "src/Fixture.tsx",
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            attributes: [
              spreadAttribute("rest", {
                start: 41,
                end: 50,
                line: 3,
                column: 17,
              }),
            ],
          }),
        }),
        dynamicNodes: [
          dynamicNode("tag", {
            start: 24,
            end: 27,
            line: 3,
            column: 1,
          }),
        ],
      }),
      CONTEXT,
    );

    expect(intentions.framework).toBe("web-components");
    expect(intentions.lowered).toBeDefined();
    expect(intentions.diagnostics).toEqual([]);
    expect(intentions.lowered?.template.template).toContain("dynamicElement");
  });

  it("lowers a module with no component into a slot-only plan", () => {
    const plan = lower(semanticModule({}));

    expect(plan.template.template).toBe("<slot></slot>");
    expect(plan.template.head).toEqual([]);
    expect(plan.reactiveProperties).toEqual([]);
    expect(plan.stateFields).toEqual([]);
  });

  it("classifies direct children aliases as default-slot outlets", () => {
    const plan = lower(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const children = properties.children;")],
          returnNode: element("div", {
            children: [expressionChild("children")],
          }),
        }),
        props: [prop("children", "MpChild", true)],
      }),
    );

    expect(plan.template.template).toBe("<div><slot></slot></div>");
  });
});
