import { describe, expect, it } from "vitest";

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
  textChild,
} from "./ir-test-helpers.js";
import { isVueLowered } from "./lower.js";

import { forgeVueFramework } from ".";

import type { TargetContext } from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "vue",
  moduleKind: "component",
  componentName: "Fixture",
};

describe("Vue Forge framework package", () => {
  it("exposes the Vue output contract and native compiler bundles", () => {
    const framework = forgeVueFramework();
    expect(framework.id).toBe("vue");
    expect(framework.outputLanguage).toBe("vue");
    expect(framework.build.vite?.({})).toHaveLength(1);
    expect(framework.build.tsdown?.({})).toHaveLength(2);
  });

  it("runs lower → optimize → generate over the neutral module", () => {
    const framework = forgeVueFramework();
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const [count, setCount] = useState(0);")],
        returnNode: element("button", {
          attributes: [
            expressionAttribute("onClick", "() => setCount(count + 1)"),
          ],
          children: [expressionChild("count")],
        }),
      }),
      state: [state("count", "setCount", { initializer: "0" })],
    });

    const lowered = framework.lower(module, CONTEXT);
    const optimized = framework.optimize(lowered, {
      neutral: { staticMarking: true, stableKeyInference: true },
    });
    const generated = framework.generate(optimized, CONTEXT);

    expect(isVueLowered(lowered.lowered)).toBe(true);
    expect(
      isVueLowered(optimized.lowered) && optimized.lowered.appliedOptimizations,
    ).toContain("vue:drop-unused-imports");
    expect(generated.lang).toBe("vue");
    expect(generated.code).toContain("const count = ref(0);");
  });

  it("lowers HtmlContent to Vue v-html markup", () => {
    const framework = forgeVueFramework();
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { HtmlContent, type MpElement } from '@mission-platform/forge-jsx';",
          "@mission-platform/forge-jsx",
          {
            valueNames: ["HtmlContent"],
            typeNames: ["MpElement"],
          },
        ),
      ],
      declarations: [
        statement(
          "interface FixtureProperties {\n  markup: string;\n}",
          "interface",
          { name: "FixtureProperties" },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
        returnNode: element("HtmlContent", {
          selfClosing: true,
          attributes: [
            expressionAttribute("html", "properties.markup"),
            stringAttribute("className", "host"),
            stringAttribute("aria-label", "trusted"),
          ],
        }),
      }),
      props: [prop("markup", "string")],
    });

    const generated = framework.generate(
      framework.lower(module, CONTEXT),
      CONTEXT,
    ).code;

    expect(generated).toContain('<div v-html="properties.markup"');
    expect(generated).toContain('class="host" aria-label="trusted"');
    expect(generated).not.toContain("{{ properties.markup }}");
    expect(generated).not.toContain("<HtmlContent");
  });

  it("lowers the neutral Suspense marker to Vue's native boundary and fallback slot", () => {
    const framework = forgeVueFramework();
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { Suspense } from '@mission-platform/forge-jsx';",
          "@mission-platform/forge-jsx",
          { valueNames: ["Suspense"] },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        returnNode: element("Suspense", {
          attributes: [
            expressionAttribute("fallback", "undefined", [
              element("span", { children: [textChild("Loading")] }),
            ]),
          ],
          children: [expressionChild("loadContent()")],
        }),
      }),
    });

    const generated = framework.generate(
      framework.lower(module, CONTEXT),
      CONTEXT,
    ).code;

    expect(generated).toContain('<Suspense v-bind="$attrs">');
    expect(generated).toContain("<template #fallback>");
    expect(generated).toContain("Loading");
    expect(generated).toContain("loadContent()");
    expect(generated).not.toContain("<Suspense fallback");
  });

  it("compiles a composable module to a Vue composable", () => {
    const framework = forgeVueFramework();
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "use-counter.ts",
      declarations: [
        statement(
          "export function useCounter(initial: number) {\n  const [count, setCount] = useState(initial);\n  return count;\n}",
          "function",
          { name: "useCounter", exported: true },
        ),
      ],
    });

    const generated = framework.generate(
      framework.lower(module, {
        ...CONTEXT,
        moduleKind: "composable",
      }),
      { ...CONTEXT, moduleKind: "composable" },
    );

    expect(generated.lang).toBe("ts");
    expect(generated.code).toContain("const count = ref(initial);");
  });
});
