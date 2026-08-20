import { describe, expect, it } from "vitest";

import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  moduleImport,
  prop,
  semanticModule,
  statement,
  stringAttribute,
} from "../ir-test-helpers.ts";

import { emitWebComponentModule } from "./module.ts";

const NEUTRAL_IMPORT = moduleImport(
  "import { classNames, h, useState, type MpElement, type MpRenderProperty } from '@mission-platform/forge';",
  "@mission-platform/forge",
  {
    valueNames: ["classNames", "h", "useState"],
    typeNames: ["MpElement", "MpRenderProperty"],
  },
);

describe("the Web-Components module emitter", () => {
  it("prepends the structural native runtime header and omits unused conditional values", () => {
    const { code } = emitWebComponentModule(semanticModule({}), "ForgeFixture");

    expect(
      code.startsWith(
        "import { ForgeElement, DomTemplateResult, nothing } from '@mission-platform/forge/web-components';",
      ),
    ).toBe(true);
    expect(code).not.toContain("unsafeHtml");
    expect(code).not.toContain("from 'lit'");
  });

  it("emits source-relative own and shared stylesheet URLs for shadow-root loading", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [
          moduleImport(
            "import './forge-card.module.scss';",
            "./forge-card.module.scss",
            { sideEffectOnly: true },
          ),
          moduleImport(
            "import '../../styles/size.scss';",
            "../../styles/size.scss",
            { sideEffectOnly: true },
          ),
        ],
      }),
      "ForgeCard",
    );

    expect(code).toContain("static readonly styleUrls: readonly string[] = [");
    expect(code).toContain(
      'new URL("./forge-card.css", import.meta.url).href,',
    );
    expect(code).toContain(
      'new URL("../../styles/size.css", import.meta.url).href,',
    );
  });

  it("adds the conditional runtime values a template actually reaches for", () => {
    const { code } = emitWebComponentModule(
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
      "ForgeFixture",
    );

    // The class declares reactive members, so the runtime's `PropertyDeclaration`
    // contract rides the same header as an inline type specifier.
    expect(
      code.startsWith(
        "import { ForgeElement, DomTemplateResult, dynamicElement, nothing, ForgeElementMixin, type PropertyDeclaration } from '@mission-platform/forge/web-components';",
      ),
    ).toBe(true);
  });

  it("keeps neutral runtime values and redirects the local JSX types", () => {
    const { code } = emitWebComponentModule(
      semanticModule({ imports: [NEUTRAL_IMPORT] }),
      "ForgeFixture",
    );

    expect(code).toContain(
      "import { classNames } from '@mission-platform/forge';",
    );
    expect(code).toContain(
      "import type { MpRenderProperty } from './mp-jsx-types';",
    );
    expect(code).not.toContain("useState");
    expect(code).not.toMatch(
      /import \{[^}]*\bh\b[^}]*\} from '@mission-platform\/forge'/u,
    );
  });

  it("keeps an ordinary neutral type import a retained declaration still references", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [
          moduleImport(
            "import { type ClassValue, h, type MpChild, type MpRenderProperty } from '@mission-platform/forge';",
            "@mission-platform/forge",
            {
              valueNames: ["h"],
              typeNames: ["ClassValue", "MpChild", "MpRenderProperty"],
            },
          ),
        ],
        declarations: [
          statement(
            "export interface FixtureProperties {\n  className?: ClassValue;\n  children?: MpChild;\n}",
            "interface",
            {
              name: "FixtureProperties",
              exported: true,
            },
          ),
        ],
      }),
      "ForgeFixture",
    );

    // `ClassValue` is framework-agnostic and the interface naming it is retained
    // verbatim, so it keeps its neutral import; the element primitives resolve
    // through the generated local module instead.
    expect(code).toContain(
      "import type { ClassValue } from '@mission-platform/forge';",
    );
    expect(code).toContain(
      "import type { MpRenderProperty } from './mp-jsx-types';",
    );
    expect(code).toContain("import type { MpChild } from './mp-jsx-types';");
    expect(code).not.toContain(
      "import type { ClassValue } from './mp-jsx-types';",
    );
  });

  it("turns a sibling component import into a registration plus a type re-import", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [
          moduleImport(
            "import { ForgeTabs, type TabItem } from '../forge-tabs';",
            "../forge-tabs",
            {
              valueNames: ["ForgeTabs"],
              typeNames: ["TabItem"],
            },
          ),
        ],
      }),
      "ForgeFixture",
      new Set(["forge-tabs"]),
    );

    expect(code).toContain("import './forge-tabs.js';");
    expect(code).toContain("import type { TabItem } from './forge-tabs.js';");
    expect(code).not.toContain("ForgeTabs,");
  });

  it("preserves a non-component relative import and a bare package import verbatim", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [
          moduleImport(
            "import styles from './fixture.module.css';",
            "./fixture.module.css",
            {
              defaultName: "styles",
              valueNames: ["styles"],
            },
          ),
          moduleImport(
            "import { formatDate } from 'date-utilities';",
            "date-utilities",
            {
              valueNames: ["formatDate"],
            },
          ),
        ],
      }),
      "ForgeFixture",
      new Set(["forge-tabs"]),
    );

    expect(code).toContain("import styles from './fixture.module.css';");
    expect(code).toContain("import { formatDate } from 'date-utilities';");
  });

  it("retains bare package side effects for external Forge components", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [
          moduleImport(
            "import { ForgeDropdown } from '@mission-platform/float';",
            "@mission-platform/float",
            { valueNames: ["ForgeDropdown"] },
          ),
        ],
      }),
      "ForgeFixture",
    );

    expect(code).toContain("import '@mission-platform/float';");
  });

  it("keeps retained declarations and lowers the markup they carry", () => {
    const icon = element("span", {
      source: '<span class="icon" />',
      selfClosing: true,
      attributes: [stringAttribute("class", "icon")],
    });
    const { code } = emitWebComponentModule(
      semanticModule({
        declarations: [
          statement(
            "export interface FixtureProperties {\n  label: string;\n}",
            "interface",
            {
              name: "FixtureProperties",
              exported: true,
            },
          ),
          statement(
            'function icon(): MpElement {\n  return <span class="icon" />;\n}',
            "function",
            {
              name: "icon",
              renderNodes: [icon],
            },
          ),
        ],
      }),
      "ForgeFixture",
    );

    // The props interface is carried through verbatim — it inherits nothing and
    // declares no catch-all index signature.
    expect(code).toContain("export interface FixtureProperties {");
    expect(code).not.toContain("extends MpProperties");
    expect(code).not.toContain("[key: string]:");
    expect(code).toContain('return html`<span class="icon"></span>`;');
    expect(code).not.toContain('<span class="icon" />');
  });

  it("imports the element types the emitted module still references", () => {
    const { code } = emitWebComponentModule(
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
      "ForgeFixture",
    );

    expect(code).toContain("import type { MpChild } from './mp-jsx-types';");
  });

  it("replaces the component function with the registered element class", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [NEUTRAL_IMPORT],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("button", {
            attributes: [expressionAttribute("className", "properties.tone")],
            children: [expressionChild("properties.label")],
          }),
        }),
        props: [prop("label", "string"), prop("tone", "string", true)],
      }),
      "ForgeFixture",
    );

    expect(code).toContain(
      "export class ForgeFixtureElement extends ForgeElement {",
    );
    expect(code).toContain("  declare label: string;");
    expect(code).toContain("  declare tone: string | undefined;");
    expect(code).toContain(
      "return new DomTemplateResult(__mpDomDefinition, [this.tone, this.label]);",
    );
    expect(code).toContain(
      "customElements.define('forge-fixture', ForgeFixtureElement);",
    );
    expect(code).not.toMatch(/\bany\b/u);
  });

  it("keeps the props interface beside the class the indexed-access fields reference", () => {
    const { code } = emitWebComponentModule(
      semanticModule({
        imports: [NEUTRAL_IMPORT],
        declarations: [
          statement(
            [
              "export interface ButtonProperties {",
              "  variant?: Variant;",
              "  disabled?: boolean;",
              "}",
            ].join("\n"),
            "interface",
            { name: "ButtonProperties", exported: true },
          ),
        ],
        component: component({
          name: "ForgeButton",
          parameter: "properties",
          parameterType: "ButtonProperties",
          returnNode: element("button", {
            attributes: [expressionAttribute("title", "properties.variant")],
            children: [expressionChild("properties.disabled")],
          }),
        }),
      }),
      "ForgeButton",
    );

    expect(code).toContain("export interface ButtonProperties {");
    expect(code).not.toContain("extends MpProperties");
    expect(code).not.toContain("[key: string]:");
    expect(code).toContain("  declare variant: ButtonProperties['variant'];");
    expect(code).toContain("  declare disabled: ButtonProperties['disabled'];");
    expect(code).toContain(
      "  static readonly properties: Record<string, PropertyDeclaration> = {",
    );
    expect(code).toContain("type PropertyDeclaration");
    expect(code).not.toContain("unknown");
    expect(code).not.toMatch(/\bany\b/u);
  });

  it("imports the native useId only for a component that generates one", () => {
    const withId = emitWebComponentModule(
      semanticModule({
        component: component({
          name: "ForgeField",
          parameter: "properties",
          body: [statement("const generatedId = useId();")],
          returnNode: element("input", {
            attributes: [expressionAttribute("id", "generatedId")],
          }),
        }),
      }),
      "ForgeField",
    );
    const withoutId = emitWebComponentModule(
      semanticModule({
        component: component({
          name: "ForgeField",
          parameter: "properties",
          returnNode: element("input"),
        }),
      }),
      "ForgeField",
    );

    expect(withId.code).toContain(
      "import { ForgeElement, DomTemplateResult, nothing, useId } from '@mission-platform/forge/web-components';",
    );
    expect(withId.code).toContain("  readonly generatedId: string;");
    expect(withId.code).toContain("    this.generatedId = useId();");
    expect(withoutId.code).not.toContain("useId");
  });
});
