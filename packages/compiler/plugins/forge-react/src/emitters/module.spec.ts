import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";
import { describe, expect, it } from "vitest";

import {
  booleanAttribute,
  component,
  element,
  expressionAttribute,
  expressionChild,
  fragment,
  moduleImport,
  neutralImport,
  semanticModule,
  slot,
  statement,
  stringAttribute,
  textChild,
  type SemanticModuleParts,
} from "../ir-test-helpers.ts";
import { planReactModule } from "../lower.ts";

import { emitReactModule } from "./module.ts";

function emit(parts: SemanticModuleParts): string {
  const module = semanticModule(parts);
  return emitReactModule(module, module.componentName);
}

describe("the React module emitter", () => {
  it("splits the neutral import into a react value import and the retained type imports", () => {
    const source = emit({
      imports: [
        neutralImport(
          ["h", "useState", "classNames"],
          ["MpChild", "ForgeVariant"],
        ),
      ],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("span", {
          children: [expressionChild("properties.label")],
        }),
      }),
      declarations: [
        statement("export type Slotted = MpChild;", "type-alias", {
          name: "Slotted",
        }),
      ],
    });

    expect(source).toContain(
      'import { createElement as h, useState } from "react";',
    );
    expect(source).toContain(
      'import { classNames } from "@mission-platform/forge-jsx";',
    );
    expect(source).toContain('import type { ReactNode } from "react";');
    expect(source).toContain(
      'import type { ForgeVariant } from "@mission-platform/forge-jsx";',
    );
  });

  it("renames every MpChild reference to ReactNode", () => {
    const source = emit({
      imports: [neutralImport([], ["MpChild"])],
      declarations: [
        statement("export type Slotted = MpChild | MpChild[];", "type-alias", {
          name: "Slotted",
        }),
      ],
    });

    expect(source).toContain("export type Slotted = ReactNode | ReactNode[];");
    expect(source).not.toContain("MpChild");
  });

  it("collapses an empty fragment to null and keeps it a valid child", () => {
    const source = emit({
      imports: [neutralImport(["h", "Fragment"])],
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", { children: [fragment()] }),
      }),
    });

    expect(source).toContain("{null}");
    expect(source).not.toContain("Fragment");
  });

  it("prints a fragment with children as the shorthand and imports Fragment", () => {
    const source = emit({
      imports: [neutralImport(["h"])],
      component: component({
        name: "ForgeFixture",
        returnNode: fragment(
          [element("span"), element("em")],
          "<Fragment><span /><em /></Fragment>",
        ),
      }),
    });

    expect(source).toContain("return <>");
    expect(source).toContain("</>;");
    expect(source).toContain(
      'import { createElement as h, Fragment } from "react";',
    );
  });

  it("passes slot-marked children of a component as props", () => {
    const source = emit({
      component: component({
        name: "ForgeFixture",
        returnNode: element("ForgeDropdown", {
          children: [
            element("button", {
              attributes: [stringAttribute("slot", "trigger")],
            }),
            textChild("panel"),
          ],
        }),
      }),
    });

    expect(source).toContain("<ForgeDropdown trigger={<button/>}>");
  });

  it("reads a named slot from the props parameter", () => {
    const source = emit({
      imports: [neutralImport(["h", "Slot"])],
      slots: [slot("header")],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("div", {
          children: [
            element("Slot", {
              attributes: [stringAttribute("name", "header")],
            }),
          ],
        }),
      }),
    });

    expect(source).toContain("{properties.header}");
    // The compile-time marker is consumed by the lowering, never imported.
    expect(source).not.toContain('Slot } from "react"');
  });

  it("lowers a scoped slot to a render-prop call with a fallback", () => {
    const source = emit({
      imports: [neutralImport(["h", "Slot"])],
      slots: [slot("item")],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("Slot", {
          attributes: [
            stringAttribute("name", "item"),
            expressionAttribute("index", "index"),
          ],
          children: [element("span")],
        }),
      }),
    });

    expect(source).toContain(
      'typeof properties.item === "function" ? properties.item({ index: index }) : properties.item',
    );
    expect(source).toContain("?? <>");
  });

  it("lowers the call form of the slot marker and the slot-presence check", () => {
    const source = emit({
      imports: [neutralImport(["h", "Slot", "hasSlot"])],
      slots: [slot("footer")],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        body: [
          statement(
            "const footer = hasSlot('footer') ? h(Slot, { name: 'footer' }) : undefined;",
          ),
          statement("return <div>{footer}</div>;", "return", {
            renderNodes: [
              element("div", {
                children: [expressionChild("footer")],
                source: "<div>{footer}</div>",
              }),
            ],
          }),
        ],
      }),
    });

    expect(source).toContain(
      "const footer = (properties.footer != null) ? properties.footer : undefined;",
    );
  });

  it("lowers a dynamic element to an h(…) call with aliased props", () => {
    const source = emit({
      imports: [neutralImport(["h", "Dynamic"])],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("Dynamic", {
          tagKind: "dynamic",
          attributes: [
            expressionAttribute("is", "properties.as"),
            stringAttribute("class", "card"),
          ],
          children: [textChild("label")],
        }),
      }),
    });

    expect(source).toContain(
      'return h(properties.as, { className: "card" }, "label");',
    );
  });

  it("aliases DOM attribute names to React vocabulary", () => {
    const source = emit({
      component: component({
        name: "ForgeFixture",
        returnNode: element("label", {
          attributes: [
            stringAttribute("class", "field"),
            stringAttribute("for", "name"),
            booleanAttribute("readonly"),
          ],
        }),
      }),
    });

    expect(source).toContain(
      '<label className="field" htmlFor="name" readOnly/>',
    );
  });

  it("collapses a className array into a classNames call and imports the helper", () => {
    const source = emit({
      imports: [neutralImport(["h"])],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("div", {
          attributes: [
            expressionAttribute("className", "['card', properties.variant]"),
          ],
        }),
      }),
    });

    expect(source).toContain(
      "<div className={classNames('card', properties.variant)}/>",
    );
    expect(source).toContain(
      'import { classNames } from "@mission-platform/forge-jsx";',
    );
  });

  it("adds the i18n hook import and injects the hook into a translating component", () => {
    const source = emit({
      imports: [
        moduleImport("import i18next from 'i18next';", "i18next", {
          defaultName: "i18next",
        }),
      ],
      component: component({
        name: "ForgeFixture",
        body: [
          statement("const label = i18next.t('forge.label');"),
          statement("return <span>{label}</span>;", "return", {
            renderNodes: [
              element("span", {
                children: [expressionChild("label")],
                source: "<span>{label}</span>",
              }),
            ],
          }),
        ],
      }),
    });

    expect(source).toContain(
      'import { useI18n } from "@mission-platform/i18n";',
    );
    expect(source).toContain("import i18next from 'i18next';");
    expect(source).toContain("const { t } = useI18n();");
    expect(source).toContain("const label = t('forge.label');");
  });

  it("flattens a relative sibling-component import", () => {
    const source = emit({
      imports: [
        moduleImport(
          "import { ForgeIcon } from '../forge-icon/forge-icon';",
          "../forge-icon/forge-icon",
          {
            valueNames: ["ForgeIcon"],
          },
        ),
      ],
      component: component({
        name: "ForgeFixture",
        returnNode: element("ForgeIcon"),
      }),
    });

    expect(source).toContain('import { ForgeIcon } from "./forge-icon";');
  });

  it("hoists a static-marked subtree to a module-level constant", () => {
    const source = emit({
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", {
          children: [
            element("svg", { attributes: [booleanAttribute(MP_STATIC_ATTR)] }),
          ],
        }),
      }),
    });

    expect(source).toContain("const __mpHoist_0 = <svg/>;");
    expect(source).toContain("{__mpHoist_0}");
    expect(source).not.toContain(MP_STATIC_ATTR);
  });

  it("prepends the use client directive to an interactive module", () => {
    const source = emit({
      imports: [neutralImport(["h"])],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("button", {
          attributes: [expressionAttribute("onClick", "properties.onClick")],
        }),
      }),
    });

    expect(source.startsWith('"use client";')).toBe(true);
  });

  it("never repeats a directive the neutral source already declared", () => {
    const parts: SemanticModuleParts = {
      imports: [neutralImport(["h", "useState"])],
      declarations: [statement("'use client';", "expression")],
      state: [{ name: "open", setterName: "setOpen" }],
      component: component({
        name: "ForgeFixture",
        body: [statement("const [open, setOpen] = useState(false);")],
        returnNode: element("div"),
      }),
    };
    const source = emit(parts);

    expect(source.split("'use client';")).toHaveLength(2);
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it("leaves a server module without a directive", () => {
    const source = emit({
      imports: [neutralImport(["h"])],
      component: component({
        name: "ForgeFixture",
        returnNode: element("span", { children: [textChild("hi")] }),
      }),
    });

    expect(source).not.toContain("use client");
  });

  it("leaves a static subtree inline when the plan disabled hoisting", () => {
    const module = semanticModule({
      component: component({
        name: "ForgeFixture",
        returnNode: element("div", {
          children: [
            element("svg", { attributes: [booleanAttribute(MP_STATIC_ATTR)] }),
          ],
        }),
      }),
    });
    const plan = planReactModule(module);
    const source = emitReactModule(module, "ForgeFixture", {
      ...plan,
      hoistStatic: false,
    });

    expect(source).not.toContain("__mpHoist_0");
    expect(source).toContain("<svg/>");
  });

  it("collapses a single-element fragment when the plan asks for it", () => {
    const module = semanticModule({
      imports: [neutralImport(["h", "Fragment"])],
      component: component({
        name: "ForgeFixture",
        returnNode: fragment(
          [element("span")],
          "<Fragment><span /></Fragment>",
        ),
      }),
    });
    const plan = planReactModule(module);
    const source = emitReactModule(module, "ForgeFixture", {
      ...plan,
      unwrapSingleChildFragments: true,
    });

    expect(source).toContain("return <span/>;");
    expect(source).not.toContain("<>");
  });

  it("keeps a composable whose return type is an inline object literal intact", () => {
    const declaration = [
      "export function useLabel(): { label: string; count: number; bump: () => void } {",
      "  const label = useMemo(() => 'static-label', []);",
      "  const [count, setCount] = useState(0);",
      "  return { label, count, bump: () => setCount(count + 1) };",
      "}",
    ].join("\n");
    const source = emit({
      moduleKind: "composable",
      fileName: "use-label.tsx",
      source: `import { useMemo, useState } from '@mission-platform/forge-jsx';\n\n${declaration}\n`,
      imports: [neutralImport(["useMemo", "useState"])],
      declarations: [
        statement(declaration, "function", {
          name: "useLabel",
          exported: true,
        }),
      ],
    });

    expect(source).toContain('import { useMemo, useState } from "react";');
    expect(source).toContain(
      "export function useLabel(): { label: string; count: number; bump: () => void } {",
    );
    expect(source).toContain("useMemo(() => 'static-label', [])");
    expect(source).toContain("const [count, setCount] = useState(0);");
    expect(source).not.toContain(":  {");
  });

  it("lowers a component return annotation that carries braces and type arguments", () => {
    const declaration = [
      "export function ForgeFixture(properties): MpElement & { extra: Record<string, MpChild> } {",
      "  return <span />;",
      "}",
    ].join("\n");
    const source = emit({
      source: `import { h, type MpChild, type MpElement } from '@mission-platform/forge-jsx';\n\n${declaration}\n`,
      imports: [neutralImport(["h"], ["MpChild", "MpElement"])],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("span"),
      }),
    });

    expect(source).toContain(
      "export function ForgeFixture(properties): ReactElement & { extra: Record<string, ReactNode> } {",
    );
    expect(source).toContain("return <span/>;");
    expect(source).not.toContain("MpChild");
    expect(source).not.toContain("MpElement");
  });
});
