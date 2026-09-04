import { describe, expect, it } from "vitest";

import {
  component,
  element,
  expressionChild,
  expressionAttribute,
  moduleImport,
  semanticModule,
  state,
  statement,
  stringAttribute,
  textChild,
} from "./ir-test-helpers.js";
import { isSolidLowered, SOLID_FRAMEWORK } from "./lower.js";
import {
  COLLAPSE_SINGLE_CHILD_FRAGMENTS,
  DROP_UNUSED_IMPORTS,
  HOIST_STATIC_SUBTREES,
  MEMOIZE_DYNAMIC_EXPRESSIONS,
  STABLE_LIST_KEYS,
} from "./optimize.js";

import { forgeSolidFramework } from ".";

import type { SolidLoweredModule } from "./lower.js";
import type {
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const COMPONENT_CONTEXT: TargetContext = {
  framework: SOLID_FRAMEWORK,
  moduleKind: "component",
  componentName: "Widget",
};

const COMPOSABLE_CONTEXT: TargetContext = {
  framework: SOLID_FRAMEWORK,
  moduleKind: "composable",
  componentName: "useCounter",
};

const ALL_ENABLED: TargetOptimizeOptions = { neutral: {} };

/** The Solid plan carried by a pipeline result. */
function loweredOf(intentions: TargetIntentions): SolidLoweredModule {
  const { lowered } = intentions;
  if (!isSolidLowered(lowered)) {
    throw new Error("The intentions carry no Solid plan.");
  }
  return lowered;
}

describe("Solid Forge framework package", () => {
  it("exposes separate Vite and Rolldown JSX bundles", () => {
    const framework = forgeSolidFramework();
    expect(framework.id).toBe("solid");
    expect(framework.outputLanguage).toBe("tsx");
    expect(framework.build.vite?.({})).toHaveLength(1);
    expect(framework.build.tsdown?.({})).toHaveLength(1);
  });

  it("drives a component through lower, optimize and generate", () => {
    const framework = forgeSolidFramework();
    const module = semanticModule({
      componentName: "Widget",
      imports: [
        moduleImport(
          "import { useState } from '@mission-platform/forge-jsx';",
          "@mission-platform/forge-jsx",
          {
            valueNames: ["useState"],
          },
        ),
      ],
      component: component({
        name: "Widget",
        parameter: "properties",
        body: [statement("const [open, setOpen] = useState(false);")],
        returnNode: element("div", {
          children: [
            element("span", {
              attributes: [stringAttribute("__mpStatic", "true")],
              children: [textChild("static")],
            }),
            element("em", {
              children: [expressionChild("items.filter(Boolean).length")],
            }),
            element("i", {
              children: [expressionChild("items.filter(Boolean).length")],
            }),
          ],
        }),
      }),
      state: [
        state("open", "setOpen", { type: "boolean", initializer: "false" }),
      ],
    });

    const optimized = framework.optimize(
      framework.lower(module, COMPONENT_CONTEXT),
      ALL_ENABLED,
    );
    const lowered = loweredOf(optimized);

    expect(optimized.framework).toBe(SOLID_FRAMEWORK);
    expect(lowered.appliedOptimizations).toEqual([
      HOIST_STATIC_SUBTREES,
      STABLE_LIST_KEYS,
      COLLAPSE_SINGLE_CHILD_FRAGMENTS,
      MEMOIZE_DYNAMIC_EXPRESSIONS,
      DROP_UNUSED_IMPORTS,
    ]);
    expect(lowered.plan.signals).toEqual([
      {
        accessor: "open",
        setter: "setOpen",
        type: "boolean",
        initializer: "false",
      },
    ]);
    expect(lowered.plan.solidImports).toContain("createSignal");
    expect(lowered.plan.solidImports).toContain("createMemo");

    const generated = framework.generate(optimized, COMPONENT_CONTEXT);

    expect(generated.lang).toBe("tsx");
    expect(generated.code).toContain(
      "const __mpHoist_0 = <span>static</span>;",
    );
    expect(generated.code).toContain(
      "const __mpMemo_0 = createMemo(() => items.filter(Boolean).length);",
    );
    expect(generated.code).toContain(
      "const [open, setOpen] = createSignal(false);",
    );
  });

  it("generates a composable module as plain TypeScript", () => {
    const framework = forgeSolidFramework();
    const module = semanticModule({
      moduleKind: "composable",
      componentName: "useCounter",
      imports: [
        moduleImport(
          "import { useState } from '@mission-platform/forge-jsx';",
          "@mission-platform/forge-jsx",
          {
            valueNames: ["useState"],
          },
        ),
      ],
      declarations: [
        statement(
          "export function useCounter() {\n  const [count, setCount] = useState(0);\n  return { count, setCount };\n}",
          "function",
          { name: "useCounter", exported: true },
        ),
      ],
    });

    const generated = framework.generate(
      framework.optimize(
        framework.lower(module, COMPOSABLE_CONTEXT),
        ALL_ENABLED,
      ),
      COMPOSABLE_CONTEXT,
    );

    expect(generated.lang).toBe("ts");
    expect(generated.code).toContain(
      "const [count, setCount] = createSignal(0);",
    );
    expect(generated.code).toContain(
      'import { createSignal } from "solid-js";',
    );
  });

  it("lowers the neutral Suspense marker to Solid's native boundary", () => {
    const framework = forgeSolidFramework();
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { Suspense } from '@mission-platform/forge-jsx';",
          "@mission-platform/forge-jsx",
          { valueNames: ["Suspense"] },
        ),
      ],
      component: component({
        name: "Widget",
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
      framework.optimize(
        framework.lower(module, COMPONENT_CONTEXT),
        ALL_ENABLED,
      ),
      COMPONENT_CONTEXT,
    ).code;

    expect(generated).toContain("<Suspense");
    expect(generated).toContain("fallback=");
    expect(generated).toContain("loadContent()");
    expect(generated).toContain('from "solid-js"');
    expect(generated).not.toContain("@mission-platform/forge-jsx");
  });
});
