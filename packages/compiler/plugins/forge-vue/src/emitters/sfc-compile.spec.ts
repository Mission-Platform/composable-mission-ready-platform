/**
 * Regression suite that runs generated SFCs through the **real** Vue compiler.
 *
 * The emitter's other suites assert on substrings, which cannot catch a whole
 * class of defect: output that reads plausibly but does not parse. Every case
 * here reproduces a shape that shipped broken to `packages/components` — a
 * binding literal with trailing commas, JSX kept verbatim in a render closure,
 * a slot marker with fallback content, and the conditional/list spellings the
 * markdown renderer uses.
 */
import { describe, expect, it } from "vitest";
import { parse, compileScript, compileTemplate } from "vue/compiler-sfc";

import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  moduleImport,
  prop,
  semanticModule,
  slot,
  spreadAttribute,
  state,
  statement,
  stringAttribute,
  textChild,
} from "../ir-test-helpers.js";

import { emitVueModule } from "./component.js";

import type { SemanticModule } from "@mission-platform/forge-plugin-api";

/** The neutral import every fixture module declares. */
const NEUTRAL_IMPORT = moduleImport(
  "import type { MpElement } from '@mission-platform/forge-jsx';",
  "@mission-platform/forge-jsx",
  { typeNames: ["MpElement"], typeOnly: true },
);

/**
 * Emit a fixture and compile the result the way `unplugin-vue` does. Throws with
 * the compiler's own diagnostic when the generated SFC does not parse.
 */
function compileFixture(module: SemanticModule, name: string): string {
  const code = emitVueModule(module, name).code;
  const parsed = parse(code, { filename: `${name}.vue` });
  const [error] = parsed.errors;
  if (error !== undefined) {
    throw new Error(`${name}.vue does not parse: ${error.message}\n\n${code}`);
  }
  // `compileScript` runs Babel over the script block *and* over every binding
  // expression in the template, which is where the shipped defects surfaced.
  compileScript(parsed.descriptor, { id: name });
  // The template compiler additionally enforces Vue's structural rules — where a
  // `:key` may sit, which directives may combine — that a parse cannot see.
  const template = parsed.descriptor.template;
  if (template !== null) {
    const compiled = compileTemplate({
      id: name,
      filename: `${name}.vue`,
      source: template.content,
    });
    const [templateError] = compiled.errors;
    if (templateError !== undefined) {
      const message =
        typeof templateError === "string"
          ? templateError
          : templateError.message;
      throw new Error(
        `${name}.vue has an invalid template: ${message}\n\n${code}`,
      );
    }
  }
  return code;
}

describe("the Vue emitter generates SFCs the Vue compiler accepts", () => {
  it("inlines a JSX child helper instead of leaving its local unbound", () => {
    const header = element("header", {
      children: [textChild("Title")],
      source: "<header>Title</header>",
    });
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Drawer",
        parameter: "properties",
        body: [
          statement("const headerNode = <header>Title</header>;", "variable", {
            name: "headerNode",
            renderNodes: [header],
          }),
        ],
        returnNode: element("section", {
          children: [expressionChild("headerNode")],
        }),
      }),
    });

    const code = compileFixture(module, "Drawer");

    expect(code).toContain("<header>");
    expect(code).toContain("Title");
    expect(code).not.toContain("headerNode");
  });

  it("compiles a class binding built from an array with a nested object literal", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Field",
        parameter: "properties",
        returnNode: element("input", {
          selfClosing: true,
          attributes: [
            expressionAttribute(
              "className",
              [
                "[",
                "  'field',",
                "  styles[`field--${properties.size}`],",
                "  {",
                "    ['field--error']: !!properties.error,",
                "    ['field--disabled']: properties.disabled,",
                "  },",
                "]",
              ].join("\n"),
            ),
          ],
        }),
      }),
      props: [
        prop("size", "string"),
        prop("error", "string", { optional: true }),
        prop("disabled", "boolean"),
      ],
    });

    const code = compileFixture(module, "Field");

    const binding = /:class="([^"]*)"/.exec(code)?.[1];
    expect(binding).toBeDefined();
    // Vue parses each binding as a standalone JavaScript expression, so the
    // authored multi-line literal has to survive as one well-formed expression.
    expect(binding).not.toContain("\n");
    expect(binding).toContain("['field--error']: !!properties.error");
  });

  it("keeps verbatim JSX intact on the render-closure path", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      declarations: [
        statement(
          "interface PanelProperties {\n  label: string;\n  max: number;\n}",
          "interface",
          {
            name: "PanelProperties",
          },
        ),
      ],
      component: component({
        name: "Panel",
        parameter: "properties",
        parameterType: "Readonly<PanelProperties>",
        // An unrecognised spread attribute forces the fallback, so the recorded
        // JSX is re-emitted as written instead of becoming a `<template>`.
        returnNode: element("div", {
          attributes: [
            spreadAttribute("extra"),
            expressionAttribute("className", "`panel--${properties.label}`"),
          ],
          children: [textChild("x")],
        }),
        returnExpression: [
          "(",
          "  <div {...extra} className={`panel--${properties.label}`}>",
          '    <ForgeField max={properties.max} title="Bounds">',
          "      {properties.label}",
          "    </ForgeField>",
          "  </div>",
          ")",
        ].join("\n"),
      }),
      props: [prop("label", "string"), prop("max", "number")],
    });

    const code = compileFixture(module, "Panel");

    expect(code).toContain('<script setup lang="tsx">');
    // A JSX attribute name is not an identifier read: `max={…}` must not become
    // the un-parseable `properties.max={…}`.
    expect(code).toContain("max={properties.max}");
    expect(code).not.toContain("properties.max=");
    // A JSX child container is not an object literal: `{label}` must not be
    // "expanded" to `{label: properties.label}`.
    expect(code).not.toMatch(/\{\s*\w+:\s*properties\./);
    expect(code).toContain("`panel--${properties.label}`");
  });

  it("lowers a slot marker with fallback content without swallowing later markup", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Bar",
        parameter: "properties",
        returnNode: element("div", {
          attributes: [spreadAttribute("extra")],
          children: [textChild("x")],
        }),
        returnExpression: [
          "(",
          "  <div {...extra}>",
          "    <div className={'bar__start'}>",
          '      <Slot name="brand">',
          "        <span>{properties.title}</span>",
          "      </Slot>",
          "    </div>",
          "    <div className={['bar__end', styles[`bar__end--${properties.align}`]]}>",
          "      <Slot />",
          "    </div>",
          "  </div>",
          ")",
        ].join("\n"),
      }),
      props: [prop("title", "string"), prop("align", "string")],
    });

    const code = compileFixture(module, "Bar");

    expect(code).toContain("slots.brand?.()");
    expect(code).toContain("slots.default?.()");
    // The marker's extent is structural: the sibling that follows the slot must
    // survive whole rather than being absorbed into the slot call.
    expect(code).toContain("bar__end");
    expect(code).toContain("`bar__end--${properties.align}`");
  });

  it("lowers nested drawer slot declarations in a render closure", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "DrawerShape",
        parameter: "properties",
        body: [
          statement(
            "const headerNode = h(Slot, { name: 'header' }, <h2>{properties.title}</h2>);",
            "variable",
            {
              name: "headerNode",
              renderNodes: [
                element("Slot", { source: '<Slot name="header" />' }),
              ],
            },
          ),
          statement('const footerNode = <Slot name="footer" />;', "variable", {
            name: "footerNode",
            renderNodes: [
              element("Slot", { source: '<Slot name="footer" />' }),
            ],
          }),
          statement(
            "const panel = <section {...extra}>{headerNode}{footerNode}</section>;",
            "variable",
            {
              name: "panel",
              renderNodes: [
                element("section", {
                  attributes: [spreadAttribute("extra")],
                  children: [
                    expressionChild("headerNode"),
                    expressionChild("footerNode"),
                  ],
                  source:
                    "<section {...extra}>{headerNode}{footerNode}</section>",
                }),
              ],
            },
          ),
        ],
        returnNode: element("section", {
          attributes: [spreadAttribute("extra")],
          children: [expressionChild("panel")],
        }),
        returnExpression: "panel",
      }),
      props: [prop("title", "string")],
      slots: [slot("header"), slot("footer")],
    });

    const code = compileFixture(module, "DrawerShape");

    expect(code).toContain("const slots = useSlots();");
    expect(code).toContain("slots.header?.() ?? (<h2>{properties.title}</h2>)");
    expect(code).toContain("slots.footer?.()");
    expect(code).not.toContain("<Slot");
    expect(code).not.toContain("h(Slot");
    expect(code).not.toMatch(/\{\s*slots\.(?:header|footer)/);
  });

  it("hosts a call of a node-returning function in a dynamic component, not an interpolation", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      declarations: [
        statement(
          "function variantIcon(variant: string): MpElement {\n  return <span>{variant}</span>;\n}",
          "function",
          { name: "variantIcon" },
        ),
      ],
      component: component({
        name: "Toast",
        parameter: "properties",
        returnNode: element("span", {
          children: [expressionChild("variantIcon(properties.variant)", [])],
        }),
      }),
      props: [prop("variant", "string")],
    });

    const code = compileFixture(module, "Toast");

    // The call returns a VNode. `{{ … }}` hands it to `toDisplayString`, which
    // JSON-serialises the circular structure and throws out of the render
    // function; only a dynamic component can host it.
    expect(code).toContain(
      '<component :is="variantIcon(properties.variant)" />',
    );
    expect(code).not.toContain("{{ variantIcon");
  });

  it("lowers a guard on a children-derived const to the default-slot presence test", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Banner",
        parameter: "properties",
        body: [
          statement(`const children = properties.children;`, "variable", {
            name: "children",
          }),
          statement(
            "const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];",
            "variable",
            { name: "childList" },
          ),
        ],
        returnNode: element("div", {
          children: [
            expressionChild(
              "childList.length > 0 ? <div className={'banner__content'}>{childList}</div> : undefined",
              [
                element("div", {
                  attributes: [
                    expressionAttribute("className", "'banner__content'"),
                  ],
                  children: [expressionChild("childList", [])],
                  source:
                    "<div className={'banner__content'}>{childList}</div>",
                }),
              ],
            ),
          ],
        }),
      }),
      props: [
        prop("children", "MpChild | readonly MpChild[]", { optional: true }),
      ],
    });

    const code = compileFixture(module, "Banner");

    // `childList` normalises `properties.children`, so it is consumed as
    // `<slot />` and never declared in the script. Emitting the authored guard
    // verbatim would compile to `_ctx.childList`, which is `undefined` at render
    // time — reading `.length` off it throws out of the render function and the
    // component renders nothing at all.
    expect(code).toContain('v-if="$slots.default"');
    expect(code).toContain("<slot />");
    expect(code).not.toContain("childList");
  });

  it("translates the neutral `className` attribute to Vue's `class` on the render-closure path", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Bar",
        parameter: "properties",
        returnNode: element("div", {
          attributes: [spreadAttribute("extra")],
          children: [textChild("x")],
        }),
        returnExpression: [
          "(",
          "  <div {...extra}>",
          "    <header className={['bar', { ['bar--sticky']: properties.sticky }]}>",
          "      <Slot />",
          "    </header>",
          "  </div>",
          ")",
        ].join("\n"),
      }),
      props: [prop("sticky", "boolean")],
    });

    const code = compileFixture(module, "Bar");

    // The `<template>` transformer translates the attribute while it prints the
    // markup; the closure keeps its JSX verbatim, so the translation has to
    // happen here too. Vue normalises the array/object class forms only under
    // `class` — left as `className` the array is assigned to the DOM property
    // as-is (`class="bar,[object Object]"`) and the component loses its styling.
    expect(code).toContain(
      "class={['bar', { ['bar--sticky']: properties.sticky }]}",
    );
    expect(code).not.toContain("className=");
  });

  it("keeps a slot-named prop the render closure reads as a value on `defineProps`", () => {
    const module = semanticModule({
      imports: [
        moduleImport(
          "import type { MpChild, MpElement } from '@mission-platform/forge-jsx';",
          "@mission-platform/forge-jsx",
          { typeNames: ["MpChild", "MpElement"], typeOnly: true },
        ),
      ],
      component: component({
        name: "Bar",
        parameter: "properties",
        returnNode: element("div", {
          attributes: [spreadAttribute("extra")],
          children: [textChild("x")],
        }),
        returnExpression: [
          "(",
          "  <div {...extra}>",
          '    <Slot name="brand">{properties.brand}</Slot>',
          '    <Slot name="end" />',
          "  </div>",
          ")",
        ].join("\n"),
      }),
      props: [
        prop("brand", "string | MpChild", { optional: true }),
        prop("end", "MpChild", { optional: true }),
      ],
      slots: [slot("brand"), slot("end")],
    });

    const code = compileFixture(module, "Bar");

    const defined = /defineProps<\{([\s\S]*?)\}>/.exec(code)?.[1];
    // A node-typed prop that names a slot leaves `defineProps` on the native
    // path, where `<slot>` is the only way to reach it — but this closure reads
    // `brand` as a *value*, and an undeclared prop reads back `undefined`, so
    // the consumer's `brand="…"` would render nothing at all.
    expect(defined).toContain("brand?:");
    expect(code).toContain("properties.brand");
    // `end` is reached through its slot alone, so it stays out.
    expect(defined).not.toContain("end?:");
    expect(code).toContain("slots.end?.()");
  });

  it("splits a conditional chain at the conditional operator, not at an inner `&&`", () => {
    const strong = element("strong", {
      children: [textChild("s")],
      source: "<strong>s</strong>",
    });
    const emphasis = element("em", {
      children: [textChild("e")],
      source: "<em>e</em>",
    });
    const plain = element("span", {
      children: [textChild("p")],
      source: "<span>p</span>",
    });
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Token",
        parameter: "properties",
        returnNode: element("div", {
          children: [
            expressionChild(
              [
                "properties.kind === 'strong' ? <strong>s</strong>",
                " : properties.kind === 'em' && properties.nested ? <em>e</em>",
                " : <span>p</span>",
              ].join(""),
              [strong, emphasis, plain],
            ),
          ],
        }),
      }),
      props: [prop("kind", "string"), prop("nested", "boolean")],
    });

    const code = compileFixture(module, "Token");

    expect(code).toContain("<strong v-if=");
    expect(code).toContain("<em v-else-if=");
    expect(code).toContain("<span v-else>");
    expect(code).not.toContain("{{");
  });

  it("drops the optional-chaining marker from a list projection source", () => {
    const item = element("li", {
      children: [expressionChild("entry")],
      source: "<li>{entry}</li>",
    });
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "List",
        parameter: "properties",
        returnNode: element("ul", {
          children: [
            expressionChild(
              "properties.entries?.map((entry) => <li>{entry}</li>)",
              [item],
            ),
          ],
        }),
      }),
      props: [prop("entries", "string[]", { optional: true })],
    });

    const code = compileFixture(module, "List");

    // `v-for` renders nothing for a nullish source, so the `?` is redundant —
    // and leaving it in place makes the binding un-parseable.
    expect(code).toContain('v-for="entry in properties.entries"');
    expect(code).not.toContain("properties.entries?");
  });

  it("moves the key onto the wrapping `<template>` when one iteration yields siblings", () => {
    const term = element("dt", {
      attributes: [expressionAttribute("key", "`term-${index}`")],
      children: [expressionChild("entry.term")],
      source: "<dt key={`term-${index}`}>{entry.term}</dt>",
    });
    const detail = element("dd", {
      attributes: [expressionAttribute("key", "`detail-${index}`")],
      children: [expressionChild("entry.detail")],
      source: "<dd key={`detail-${index}`}>{entry.detail}</dd>",
    });
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Terms",
        parameter: "properties",
        returnNode: element("dl", {
          children: [
            expressionChild(
              "properties.entries.flatMap((entry, index) => [" +
                "<dt key={`term-${index}`}>{entry.term}</dt>, " +
                "<dd key={`detail-${index}`}>{entry.detail}</dd>])",
              [term, detail],
            ),
          ],
        }),
      }),
      props: [prop("entries", "readonly { term: string; detail: string }[]")],
    });

    const code = compileFixture(module, "Terms");

    expect(code).toContain(
      '<template v-for="(entry, index) in properties.entries" :key="index">',
    );
    // Vue rejects a `:key` on a child of a `<template v-for>`: both projected
    // siblings share one iteration, so only the `<template>` may be keyed.
    expect(code).not.toContain("term-${index}");
    expect(code).not.toContain("detail-${index}");
    expect(code).toContain("{{ entry.term }}");
    expect(code).toContain("{{ entry.detail }}");
  });

  it("keeps a static attribute value out of the binding rewriter", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Badge",
        parameter: "properties",
        returnNode: element("span", {
          attributes: [
            stringAttribute("data-kind", "badge"),
            expressionAttribute("title", "properties.label"),
          ],
          children: [expressionChild("properties.label")],
        }),
      }),
      props: [prop("label", "string")],
    });

    const code = compileFixture(module, "Badge");

    expect(code).toContain('data-kind="badge"');
    expect(code).toContain(':title="properties.label"');
  });
});

/**
 * A props interface whose members are declared the way a real component
 * declares them: documented, and spanning several lines each. The emitter
 * removes events, `@model` props and node-typed slot props from this contract,
 * and a per-line removal would leave a `) => void;` fragment behind.
 */
function multiLineModule(parts: {
  interfaceText: string;
  typeName: string;
  name: string;
  slots?: readonly string[];
}): SemanticModule {
  return semanticModule({
    imports: [NEUTRAL_IMPORT],
    declarations: [
      statement(parts.interfaceText, "interface", { name: parts.typeName }),
    ],
    component: component({
      name: parts.name,
      parameter: "properties",
      // `Readonly<…>` defeats the neutral prop inference, so the props are
      // recovered from the interface — exercising the same member reader.
      parameterType: `Readonly<${parts.typeName}>`,
      returnNode: element("div", {
        children: [expressionChild("properties.label")],
      }),
    }),
    slots: (parts.slots ?? []).map((name) => slot(name)),
  });
}

/**
 * The two places a member may survive: the carried-over interface declaration
 * and the emitted `defineProps<{ … }>()` type literal. Assertions target these
 * rather than the whole file, so a neutral type *import* is not mistaken for a
 * member that should have been removed.
 */
function propsContract(code: string, typeName: string): string {
  const declarationStart = code.indexOf(`interface ${typeName}`);
  const declarationEnd = code.indexOf("\n}", declarationStart);
  const propsStart = code.indexOf("defineProps<{");
  const propsEnd = code.indexOf("}>()", propsStart);
  return [
    declarationStart === -1
      ? ""
      : code.slice(declarationStart, declarationEnd + 2),
    propsStart === -1 ? "" : code.slice(propsStart, propsEnd + 4),
  ].join("\n");
}

describe("the Vue emitter removes whole member declarations from the props contract", () => {
  it("strips a multi-line event prop and declares it with `defineEmits`", () => {
    const code = compileFixture(
      multiLineModule({
        typeName: "PickerProperties",
        name: "Picker",
        interfaceText: [
          "export interface PickerProperties {",
          "  /** The visible label. */",
          "  label: string;",
          "",
          "  /** Fired when the selection changes. */",
          "  onSelectionChange?: (",
          "    next: readonly string[],",
          "    meta: { source: 'keyboard' | 'pointer' },",
          "  ) => void;",
          "}",
        ].join("\n"),
      }),
      "Picker",
    );

    expect(code).toContain("const emit = defineEmits<{");
    expect(code).toContain(
      "selectionChange: [next: readonly string[], meta: { source: 'keyboard' | 'pointer' }];",
    );
    // The declaration leaves the props contract in one piece: neither its name,
    // nor its parameters, nor the `) => void;` tail may survive.
    const contract = propsContract(code, "PickerProperties");
    expect(contract).not.toContain("onSelectionChange");
    expect(contract).not.toContain("next: readonly string[]");
    expect(contract).not.toContain(") => void");
    expect(contract).not.toContain("Fired when the selection changes");
    // The neighbouring member and its documentation are untouched.
    expect(contract).toContain("/** The visible label. */");
    expect(contract).toContain("label: string;");
  });

  it("strips two adjacent multi-line event props without orphaning their JSDoc", () => {
    const code = compileFixture(
      multiLineModule({
        typeName: "RangeProperties",
        name: "Range",
        interfaceText: [
          "export interface RangeProperties {",
          "  /** The visible label. */",
          "  label: string;",
          "",
          "  /**",
          "   * Fired when the lower bound moves.",
          "   */",
          "  onLowerChange?: (",
          "    next: number,",
          "  ) => void;",
          "",
          "  /**",
          "   * Fired when the upper bound moves.",
          "   */",
          "  onUpperChange?: (",
          "    next: number,",
          "  ) => void;",
          "",
          "  /** The visual tone. */",
          "  tone?: string;",
          "}",
        ].join("\n"),
      }),
      "Range",
    );

    expect(code).toContain("lowerChange: [next: number];");
    expect(code).toContain("upperChange: [next: number];");
    const contract = propsContract(code, "RangeProperties");
    expect(contract).not.toContain("onLowerChange");
    expect(contract).not.toContain("onUpperChange");
    expect(contract).not.toContain(") => void");
    expect(contract).not.toContain("next: number");
    expect(contract).not.toContain("Fired when the lower bound moves");
    expect(contract).not.toContain("Fired when the upper bound moves");
    expect(contract).toContain("label: string;");
    expect(contract).toContain("/** The visual tone. */");
    expect(contract).toContain("tone?: string;");
  });

  it("strips a multi-line `@model` prop and its paired change event", () => {
    const code = compileFixture(
      multiLineModule({
        typeName: "TagsProperties",
        name: "Tags",
        interfaceText: [
          "export interface TagsProperties {",
          "  /** The visible label. */",
          "  label: string;",
          "",
          "  /**",
          "   * The selected tags.",
          "   *",
          "   * @model onValueChange",
          "   */",
          "  value?:",
          "    | readonly string[]",
          "    | undefined;",
          "",
          "  /** Fired when the selection changes. */",
          "  onValueChange?: (",
          "    next: readonly string[],",
          "  ) => void;",
          "}",
        ].join("\n"),
      }),
      "Tags",
    );

    expect(code).toContain("const value = defineModel");
    // Both halves of the two-way binding leave the props contract whole.
    const contract = propsContract(code, "TagsProperties");
    expect(contract).not.toContain("onValueChange");
    expect(contract).not.toContain("value?");
    expect(contract).not.toContain("| undefined");
    expect(contract).not.toContain(") => void");
    expect(contract).not.toContain("The selected tags");
    expect(contract).toContain("label: string;");
  });

  it("lowers the neutral `hasSlot` marker inside a lifted `computed`", () => {
    // `hasSlot` is compile-time vocabulary with no runtime existence. The
    // template and render-closure paths lowered it, but a derived declaration
    // reached the script dialect untouched and shipped the bare call — the
    // `ReferenceError: hasSlot is not defined` the compiled component library
    // threw at render time.
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Card",
        parameter: "properties",
        body: [
          statement(
            "const hasHeader = properties.title !== undefined || hasSlot('header');",
            "variable",
            {
              name: "hasHeader",
            },
          ),
        ],
        returnNode: element("section", {
          children: [
            element("header", {
              attributes: [expressionAttribute("hidden", "!hasHeader")],
              children: [textChild("x")],
            }),
          ],
        }),
      }),
      props: [prop("title", "string", { optional: true })],
      slots: [slot("header")],
    });

    const code = compileFixture(module, "Card");

    expect(code).not.toContain("hasSlot(");
    expect(code).toContain("|| !!slots.header");
    // The lowered form reads the `useSlots()` binding, which the assembler adds
    // exactly because the body mentions `slots`.
    expect(code).toContain("const slots = useSlots();");
    expect(code).toContain("useSlots");
  });

  it("leaves a `hasSlot` mention inside a comment exactly as authored", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Note",
        parameter: "properties",
        body: [
          // The leading documentation must not hide the declaration from the
          // reader, and the marker named in the inline comment is prose.
          statement(
            "/** The slot to fill. */\nconst slotName = /* hasSlot('header') */ 'header';",
            "variable",
            {
              name: "slotName",
            },
          ),
        ],
        returnNode: element("p", {
          attributes: [expressionAttribute("data-slot", "slotName")],
          children: [textChild("x")],
        }),
      }),
    });

    const code = compileFixture(module, "Note");

    expect(code).toContain("const slotName =");
    expect(code).toContain("hasSlot('header')");
    expect(code).not.toContain("slots.header");
  });

  it("collapses a CSS-Module class keyed by a template literal", () => {
    // `styles['card']` already collapsed to its literal class name, but a
    // modifier keyed by a template literal did not — leaving the generated SFC
    // reading a `styles` object it never declares.
    const module = semanticModule({
      imports: [
        NEUTRAL_IMPORT,
        moduleImport(
          "import styles from './card.module.scss';",
          "./card.module.scss",
          { defaultName: "styles" },
        ),
      ],
      component: component({
        name: "Tile",
        parameter: "properties",
        body: [
          statement(
            "const classes = [styles['card'], styles[`card--${properties.size}`]];",
            "variable",
            {
              name: "classes",
            },
          ),
        ],
        returnNode: element("article", {
          attributes: [expressionAttribute("className", "classes")],
          children: [textChild("x")],
        }),
      }),
      props: [prop("size", "string")],
    });

    const code = compileFixture(module, "Tile");

    expect(code).not.toContain("styles[");
    expect(code).toContain("'card'");
    expect(code).toContain("`card--${properties.size}`");
  });

  it("collapses CSS-Module reads inside an extracted auxiliary module", () => {
    // The auxiliary module is rendered with an empty binding table, because
    // every binding inside it is a prop. The CSS-Module locals are the one
    // exception: leaving them out made the auxiliary SFC read a `styles` object
    // it never declares.
    const item = element("li", {
      attributes: [expressionAttribute("className", "styles['tree__item']")],
      children: [
        expressionChild("item.label"),
        expressionChild("renderItems(item.children as TreeNode[])"),
      ],
      source:
        "<li className={styles['tree__item']}>{item.label}{renderItems(item.children as TreeNode[])}</li>",
    });
    const module = semanticModule({
      imports: [
        NEUTRAL_IMPORT,
        moduleImport(
          "import styles from './tree.module.scss';",
          "./tree.module.scss",
          { defaultName: "styles" },
        ),
      ],
      declarations: [
        statement(
          "interface TreeNode {\n  label: string;\n  children?: TreeNode[];\n}",
          "interface",
          {
            name: "TreeNode",
          },
        ),
      ],
      component: component({
        name: "Tree",
        parameter: "properties",
        body: [
          statement(
            [
              "const renderItems = (entries: TreeNode[]): MpElement[] =>",
              `  entries.map((item) => (${item.expression?.text ?? ""}));`,
            ].join("\n"),
            "variable",
            { name: "renderItems", renderNodes: [item] },
          ),
        ],
        returnNode: element("ul", {
          children: [expressionChild("renderItems(properties.items)")],
        }),
      }),
      props: [prop("items", "TreeNode[]")],
    });

    const { extraModules } = emitVueModule(module, "Tree");
    const auxiliary = extraModules.find((extra) => extra.name === "tree-item");

    expect(auxiliary).toBeDefined();
    expect(auxiliary?.code).not.toContain("styles[");
    expect(auxiliary?.code).toContain("'tree__item'");
  });

  it("rewrites a reactive read that follows a comment ending in a full stop", () => {
    // The look-behind that recognises `a.count` as a member access has to ignore
    // comments: a documented line ending in `.` made the next identifier look
    // like a property name, so the read was emitted bare and threw at runtime.
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Banner",
        parameter: "properties",
        body: [
          statement("const [count, setCount] = useState(0);"),
          statement(
            [
              "const banner = [",
              "  'banner',",
              "  // The running total, appended last.",
              "  count > 0 ? 'banner--active' : undefined,",
              "];",
            ].join("\n"),
            "variable",
            { name: "banner" },
          ),
        ],
        returnNode: element("div", {
          attributes: [expressionAttribute("className", "banner")],
          children: [textChild("x")],
        }),
      }),
      state: [state("count", "setCount", { initializer: "0" })],
    });

    const code = compileFixture(module, "Banner");

    expect(code).toContain("count.value > 0");
  });

  it("strips a multi-line node-typed slot prop", () => {
    const code = compileFixture(
      multiLineModule({
        typeName: "BarProperties",
        name: "Bar",
        slots: ["brand"],
        interfaceText: [
          "export interface BarProperties {",
          "  /** The visible label. */",
          "  label: string;",
          "",
          "  /**",
          "   * Branding rendered at the start.",
          "   */",
          "  brand?:",
          "    | MpElement",
          "    | undefined;",
          "",
          "  /** The visual tone. */",
          "  tone?: string;",
          "}",
        ].join("\n"),
      }),
      "Bar",
    );

    // Slot content is reached through `<slot name="brand">`, so it is neither a
    // runtime prop nor a member of the carried-over contract.
    const contract = propsContract(code, "BarProperties");
    expect(contract).not.toContain("brand");
    expect(contract).not.toContain("MpElement");
    expect(contract).not.toContain("| undefined");
    expect(contract).not.toContain("Branding rendered at the start");
    expect(contract).toContain("label: string;");
    expect(contract).toContain("tone?: string;");
  });

  it("keeps a markup helper that a script dispatcher calls, and the helpers that one calls", () => {
    // `renderBody` dispatches to three view helpers and is itself only reachable
    // from the markup. Each view helper is a JSX-valued const, which the emitter
    // normally drops on the understanding that the markup inlines it — but here
    // the call sites are in `renderBody`'s *script* body, where there is nothing
    // to inline into. Dropping them shipped a `<script setup>` calling three
    // functions it had just deleted: `forge-scheduler` threw on first render.
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      component: component({
        name: "Scheduler",
        parameter: "properties",
        body: [
          statement(
            'const renderMonth = (): MpElement => <div class="month" />;',
            "variable",
            {
              name: "renderMonth",
              renderNodes: [
                element("div", {
                  selfClosing: true,
                  attributes: [stringAttribute("className", "month")],
                }),
              ],
            },
          ),
          statement(
            'const renderYear = (): MpElement => <div class="year" />;',
            "variable",
            {
              name: "renderYear",
              renderNodes: [
                element("div", {
                  selfClosing: true,
                  attributes: [stringAttribute("className", "year")],
                }),
              ],
            },
          ),
          statement(
            [
              "const renderBody = (): MpElement => {",
              "  if (properties.view === 'month') return renderMonth();",
              "  return renderYear();",
              "};",
            ].join("\n"),
            "variable",
            { name: "renderBody" },
          ),
        ],
        returnNode: element("div", {
          attributes: [stringAttribute("className", "scheduler")],
          children: [expressionChild("renderBody()")],
        }),
      }),
      props: [prop("view", "string")],
    });

    const code = compileFixture(module, "Scheduler");
    const script =
      /<script setup[^>]*>([\s\S]*?)<\/script>/.exec(code)?.[1] ?? "";

    // Every function the script calls is declared in the same script.
    for (const name of ["renderMonth", "renderYear"]) {
      expect(script).toContain(`${name}()`);
      expect(script).toMatch(
        new RegExp(String.raw`(?:const|function)\s+${name}\b`),
      );
    }
    // Retaining them must not cost the native `<template>`.
    expect(code).not.toContain("native <template> unavailable");
    expect(code).not.toContain("const render = () =>");
    // A retained JSX body forces `lang="tsx"`, which the assembler detects.
    expect(code).toContain('<script setup lang="tsx">');
  });
});
