import { describe, expect, it } from "vitest";

import {
  forgeReactFramework,
  isReactLowered,
  REACT_OPTIMIZATIONS,
} from "./index.ts";
import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  moduleImport,
  neutralImport,
  semanticModule,
  slot,
  state,
  statement,
  stringAttribute,
  textChild,
  type SemanticModuleParts,
} from "./ir-test-helpers.ts";

import type {
  GeneratedModule,
  TargetContext,
  TargetIntentions,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "react",
  moduleKind: "component",
  componentName: "ForgeFixture",
};

/** Drive the plugin's three phases the way the compiler pipeline does. */
function compile(parts: SemanticModuleParts): GeneratedModule {
  const framework = forgeReactFramework();
  const lowered = framework.lower(semanticModule(parts), CONTEXT);
  const optimized = framework.optimize(lowered, { neutral: {} });
  return framework.generate(optimized, CONTEXT);
}

describe("React Forge framework package", () => {
  it("exposes the React output contract and JSX build bundles", () => {
    const framework = forgeReactFramework();

    expect(framework.id).toBe("react");
    expect(framework.outputLanguage).toBe("tsx");
    expect(framework.source.componentExtension).toBe(".tsx");
    expect(framework.build.vite?.({})).toHaveLength(1);
    expect(framework.build.tsdown?.({})).toHaveLength(1);
  });

  it("carries the lowered plan through the optimize phase", () => {
    const framework = forgeReactFramework();
    const module = semanticModule({
      imports: [neutralImport(["h", "useState"])],
      state: [
        state("open", "setOpen", { type: "boolean", initializer: "false" }),
      ],
      component: component({
        name: "ForgeFixture",
        body: [statement("const [open, setOpen] = useState(false);")],
        returnNode: element("div"),
      }),
    });
    const optimized: TargetIntentions = framework.optimize(
      framework.lower(module, CONTEXT),
      { neutral: {} },
    );

    expect(isReactLowered(optimized.lowered)).toBe(true);
    if (!isReactLowered(optimized.lowered)) {
      throw new Error("the React plugin must lower a React plan");
    }
    expect(optimized.lowered.plan.hooks.state).toEqual([
      {
        name: "open",
        setterName: "setOpen",
        type: "boolean",
        initializer: "false",
      },
    ]);
    expect(optimized.lowered.appliedOptimizations).toContain(
      REACT_OPTIMIZATIONS.dropUnusedImports,
    );
  });

  it("generates a client component with its hooks, props and events intact", () => {
    const generated = compile({
      imports: [neutralImport(["h", "useState"], ["MpChild"])],
      state: [
        state("open", "setOpen", { type: "boolean", initializer: "false" }),
      ],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        parameterType: "ForgeFixtureProperties",
        body: [
          statement("const [open, setOpen] = useState(false);"),
          statement(
            "return <button onClick={() => setOpen(!open)}>{properties.label}</button>;",
            "return",
            {
              renderNodes: [
                element("button", {
                  attributes: [
                    expressionAttribute("onClick", "() => setOpen(!open)"),
                  ],
                  children: [expressionChild("properties.label")],
                  source:
                    "<button onClick={() => setOpen(!open)}>{properties.label}</button>",
                }),
              ],
            },
          ),
        ],
      }),
    });

    expect(generated.lang).toBe("tsx");
    expect(generated.code.startsWith('"use client";')).toBe(true);
    expect(generated.code).toContain(
      'import { createElement as h, useState } from "react";',
    );
    expect(generated.code).toContain(
      "export function ForgeFixture(properties: ForgeFixtureProperties) {",
    );
    expect(generated.code).toContain(
      "const [open, setOpen] = useState(false);",
    );
    expect(generated.code).toContain("<button onClick={() => setOpen(!open)}>");
  });

  it("generates slots, dynamic nodes and aliased attributes from the neutral markers", () => {
    const generated = compile({
      imports: [neutralImport(["h", "Slot", "Dynamic"])],
      slots: [slot("header")],
      component: component({
        name: "ForgeFixture",
        parameter: "properties",
        returnNode: element("div", {
          attributes: [stringAttribute("class", "card")],
          children: [
            element("Slot", {
              attributes: [stringAttribute("name", "header")],
            }),
            element("Dynamic", {
              tagKind: "dynamic",
              attributes: [expressionAttribute("is", "properties.as")],
              children: [textChild("body")],
            }),
          ],
        }),
      }),
    });

    expect(generated.code).toContain('<div className="card">');
    expect(generated.code).toContain("{properties.header}");
    expect(generated.code).toContain('{h(properties.as, undefined, "body")}');
    expect(generated.code).toContain(
      'import { createElement as h } from "react";',
    );
  });

  it("generates a composable module without a component", () => {
    const generated = compile({
      moduleKind: "composable",
      imports: [
        moduleImport("import { useState } from 'react';", "react", {
          valueNames: ["useState"],
        }),
      ],
      declarations: [
        statement(
          "export function useToggle() {\n  return useState(false);\n}",
          "function",
          {
            name: "useToggle",
            exported: true,
          },
        ),
      ],
    });

    expect(generated.code).toContain("import { useState } from 'react';");
    expect(generated.code).toContain("export function useToggle() {");
  });
});
