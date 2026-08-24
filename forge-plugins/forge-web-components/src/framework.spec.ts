import { describe, expect, it, vi } from "vitest";

import { createCompilerPipeline } from "../../../vite-plugins/forge/src/compiler/pipeline.ts";

import {
  emitWebComponentModule,
  forgeWebComponentsFramework,
  isWebComponentsLowered,
} from "./index.ts";
import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  moduleImport,
  prop,
  semanticModule,
  state,
  statement,
  stringAttribute,
} from "./ir-test-helpers.ts";

import type {
  GeneratedModule,
  SemanticModule,
  TargetContext,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

const NEUTRAL_IMPORT = moduleImport(
  "import { HtmlContent, useState, type MpElement } from '@mission-platform/forge';",
  "@mission-platform/forge",
  { valueNames: ["HtmlContent", "useState"], typeNames: ["MpElement"] },
);

/** Run the plugin end to end for a component module. */
function generate(
  module: Parameters<typeof emitWebComponentModule>[0],
  context: Partial<TargetContext> = {},
): GeneratedModule {
  const framework = forgeWebComponentsFramework();
  const targetContext: TargetContext = {
    framework: "web-components",
    moduleKind: module.moduleKind,
    componentName: module.componentName,
    ...context,
  };
  const lowered = framework.lower(module, targetContext);
  return framework.generate(
    framework.optimize(lowered, { neutral: {} }),
    targetContext,
  );
}

/** Run the plugin's lower → optimize phases and return the refined plan. */
function plan(module: SemanticModule): TargetLoweredModule | undefined {
  const framework = forgeWebComponentsFramework();
  const targetContext: TargetContext = {
    framework: "web-components",
    moduleKind: module.moduleKind,
    componentName: module.componentName,
  };
  return framework.optimize(framework.lower(module, targetContext), {
    neutral: {},
  }).lowered;
}

describe("Web Components Forge framework package", () => {
  it("provides host metadata for shared components", () => {
    const framework = forgeWebComponentsFramework();
    const hosts = framework.prepareComponentHosts?.([]);

    expect(hosts?.get("forge-dropdown")).toEqual({
      baseTag: "div",
      invocation: "is-attribute",
    });
    expect(hosts?.get("forge-typography")).toEqual({
      invocation: "custom-tag",
    });
  });

  it("provides TypeScript output without framework compiler bundles", () => {
    const framework = forgeWebComponentsFramework();
    expect(framework.id).toBe("web-components");
    expect(framework.outputLanguage).toBe("ts");
    expect(framework.build.vite?.({})).toEqual([]);
    expect(framework.build.tsdown?.({})).toEqual([]);
  });

  it("lowers dynamic tags and spreads before generation", () => {
    const framework = forgeWebComponentsFramework();
    const generateSpy = vi.spyOn(framework, "generate");

    expect(() =>
      createCompilerPipeline().compile(
        {
          source: [
            "export function Fixture({ tag, rest }: { tag: string; rest: Record<string, unknown> }) {",
            "  return <Dynamic is={tag} {...rest} />;",
            "}",
          ].join("\n"),
          fileName: "src/Fixture.tsx",
          moduleKind: "component",
          componentName: "Fixture",
        },
        framework,
      ),
    ).not.toThrow();

    expect(generateSpy).toHaveBeenCalled();
  });

  it("uses an autonomous host when a component can return a dynamic root", () => {
    const generated = createCompilerPipeline().compile(
      {
        source: [
          "import { h, type MpElement } from '@mission-platform/forge';",
          "export function Fixture({ tag, wrapped }: { tag: string; wrapped: boolean }): MpElement {",
          "  if (!wrapped) return h(tag, {}, 'content');",
          "  return <span>content</span>;",
          "}",
        ].join("\n"),
        fileName: "src/Fixture.tsx",
        moduleKind: "component",
        componentName: "Fixture",
      },
      forgeWebComponentsFramework(),
    );

    expect(generated.code).toContain(
      "export class FixtureElement extends ForgeElement {",
    );
    expect(generated.code).toContain("dynamicElement(tag,");
    expect(generated.code).not.toContain("{ extends: 'span' }");
    expect(generated.code).toContain(
      "customElements.define('fixture', FixtureElement);",
    );
  });

  it("generates the element module from the semantic IR alone", () => {
    const generated = generate(
      semanticModule({
        imports: [NEUTRAL_IMPORT],
        componentName: "ForgeFixture",
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            children: [expressionChild("properties.label")],
          }),
        }),
        props: [prop("label", "string")],
      }),
    );

    expect(generated.lang).toBe("ts");
    expect(generated.code).toContain(
      "export class ForgeFixtureElement extends ForgeElementMixin(HTMLSpanElement) {",
    );
    expect(generated.code).toContain(
      "customElements.define('forge-fixture', ForgeFixtureElement, { extends: 'span' });",
    );
    expect(generated.code).toContain("  declare label: string;");
  });

  it("keeps a render-local helper when its name is also a prop", () => {
    const generated = generate(
      semanticModule({
        componentName: "ForgeFixture",
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const renderField = () => 'field';"),
            statement("return <span>{renderField()}</span>;", "return"),
          ],
          returnNode: element("span", {
            children: [expressionChild("renderField()")],
          }),
        }),
        props: [prop("renderField", "() => string")],
      }),
    );

    expect(generated.code).toContain("const renderField = () => 'field';");
    expect(generated.code).toContain('document.createElement("span")');
    expect(generated.code).toContain("renderField()");
    expect(generated.code).not.toContain("this.renderField()");
  });

  it("carries a refined target plan between its phases", () => {
    const lowered = plan(
      semanticModule({
        componentName: "ForgeFixture",
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            children: [expressionChild("properties.label")],
          }),
        }),
        props: [prop("label", "string")],
      }),
    );

    expect(lowered?.framework).toBe("web-components");
    expect(lowered?.appliedOptimizations).toContain(
      "web-components:drop-unused-runtime-imports",
    );
    expect(isWebComponentsLowered(lowered)).toBe(true);
    expect(
      isWebComponentsLowered(lowered) && lowered.reactiveProperties,
    ).toEqual([
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

  it("routes a composable module through the hook emitter", () => {
    const generated = generate(
      semanticModule({
        moduleKind: "composable",
        imports: [
          moduleImport(
            "import { useState } from '@mission-platform/forge';",
            "@mission-platform/forge",
            {
              valueNames: ["useState"],
            },
          ),
        ],
        declarations: [
          statement(
            "export function useValue(): number {\n  return 1;\n}",
            "function",
            {
              name: "useValue",
              exported: true,
            },
          ),
        ],
      }),
    );

    expect(generated.lang).toBe("ts");
    expect(generated.code).toContain(
      "import { useState } from '@mission-platform/forge';",
    );
    expect(generated.code).toContain("export function useValue(): number {");
    expect(generated.code).not.toContain("ForgeElement");
  });

  it("lowers HtmlContent to the native unsafeHtml template value", () => {
    const generated = emitWebComponentModule(
      semanticModule({
        imports: [NEUTRAL_IMPORT],
        declarations: [
          statement(
            "interface FixtureProperties {\n  markup: string;\n}",
            "interface",
            {
              name: "FixtureProperties",
            },
          ),
        ],
        component: component({
          name: "Fixture",
          parameter: "properties",
          returnNode: element("HtmlContent", {
            selfClosing: true,
            attributes: [
              expressionAttribute("html", "properties.markup"),
              stringAttribute("className", "host"),
            ],
          }),
        }),
        props: [prop("markup", "string")],
      }),
      "Fixture",
    ).code;

    expect(generated).toContain("domTemplate(__mpDomDefinition");
    expect(generated).toContain("unsafeHtml(this.markup)");
    expect(generated).not.toContain(".innerHTML=");
    expect(generated).not.toContain("<HtmlContent");
  });

  it("emits a fully typed element class with no any token", () => {
    const generated = emitWebComponentModule(
      semanticModule({
        imports: [NEUTRAL_IMPORT],
        declarations: [
          statement(
            "export interface FixtureProperties {\n  label: string;\n  variant?: Variant;\n}",
            "interface",
            { name: "FixtureProperties", exported: true },
          ),
        ],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const [mode, setMode] = useState<Mode>('idle');"),
            statement("const [open, setOpen] = useState(false);"),
            statement("const [bag, setBag] = useState(buildBag());"),
          ],
          returnNode: element("button", {
            attributes: [
              expressionAttribute("onClick", "() => setOpen(!open)"),
            ],
            children: [
              expressionChild("properties.label"),
              expressionChild("mode"),
            ],
          }),
        }),
        props: [prop("label", "string"), prop("variant", "Variant", true)],
        state: [
          state("mode", "setMode", { type: "Mode", initializer: "'idle'" }),
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
          state("bag", "setBag", { initializer: "buildBag()" }),
        ],
      }),
      "ForgeFixture",
    ).code;

    expect(generated).toContain("  declare label: string;");
    expect(generated).toContain("  declare variant: Variant | undefined;");
    expect(generated).toContain("  declare mode: Mode;");
    expect(generated).toContain("    this.mode = 'idle';");
    expect(generated).toContain("  declare open: boolean;");
    expect(generated).toContain("    this.open = false;");
    expect(generated).toContain("  declare bag: unknown;");
    expect(generated).toContain("    this.bag = buildBag();");
    expect(generated).toContain('name: "click"');
    expect(generated).toContain("() => this.open = !this.open");
    expect(generated).not.toMatch(/\bany\b/u);
  });
});
