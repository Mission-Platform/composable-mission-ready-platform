import { describe, expect, it } from "vitest";

import { emitSvelteModule } from "./emitters/component.js";
import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  listKey,
  moduleImport,
  semanticModule,
  statement,
  stringAttribute,
  textChild,
} from "./ir-test-helpers.js";
import { isSvelteLowered, lowerSvelteModule } from "./lower.js";
import {
  DROP_EMPTY_EFFECTS,
  DROP_UNUSED_IMPORTS,
  HOIST_STATIC_MARKUP,
  optimizeSvelteModule,
  STABLE_EACH_KEYS,
  STATE_TO_DERIVED,
  SVELTE_OPTIMIZATIONS,
} from "./optimize.js";

import type { SvelteLoweredModule } from "./lower.js";
import type {
  SemanticModule,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "svelte",
  moduleKind: "component",
  componentName: "Fixture",
  componentFolders: new Set(),
};

const DEFAULT_OPTIONS: TargetOptimizeOptions = { neutral: {} };

function refine(
  module: SemanticModule,
  options: TargetOptimizeOptions = DEFAULT_OPTIONS,
): SvelteLoweredModule {
  const optimized = optimizeSvelteModule(
    lowerSvelteModule(module, CONTEXT),
    options,
  );
  if (!isSvelteLowered(optimized.lowered)) {
    throw new Error("expected a Svelte plan");
  }
  return optimized.lowered;
}

/** A component whose second state cell is only ever computed from the first. */
function derivableStateModule(): SemanticModule {
  const root = element("button", {
    attributes: [expressionAttribute("onClick", "() => setBase(base + 1)")],
    children: [expressionChild("scaled")],
    source: "<button onClick={() => setBase(base + 1)}>{scaled}</button>",
  });
  return semanticModule({
    component: component({
      name: "Fixture",
      parameter: "properties",
      body: [
        statement("const [base, setBase] = useState(1);"),
        statement("const [scaled, setScaled] = useState(base * 2);"),
      ],
      returned: { expression: root.expression!.text, nodes: [root] },
    }),
  });
}

/** A component with a static subtree, an unstable list key and a dead mount effect. */
function refinableModule(): SemanticModule {
  const banner = element("header", {
    attributes: [
      stringAttribute("__mpStatic", "true"),
      stringAttribute("class", "banner"),
    ],
    children: [textChild("Mission")],
    source: '<header class="banner">Mission</header>',
  });
  const root = element("section", {
    children: [banner],
    source: '<section><header class="banner">Mission</header></section>',
  });
  return semanticModule({
    imports: [
      moduleImport(
        "import { classNames } from '@mission-platform/forge';",
        "@mission-platform/forge",
        {
          valueNames: ["classNames"],
        },
      ),
    ],
    component: component({
      name: "Fixture",
      parameter: "properties",
      body: [statement("useEffect(() => {}, []);", "expression")],
      returned: { expression: root.expression!.text, nodes: [root] },
    }),
    listKeys: [
      listKey("rows", "row.id", true),
      listKey("cells", "index", false),
    ],
  });
}

describe("optimizeSvelteModule", () => {
  it("records every optimization it applied, once", () => {
    expect(refine(refinableModule()).appliedOptimizations).toEqual(
      SVELTE_OPTIMIZATIONS,
    );
  });

  it("is idempotent", () => {
    const module = refinableModule();
    const once = optimizeSvelteModule(
      lowerSvelteModule(module, CONTEXT),
      DEFAULT_OPTIONS,
    );
    const twice = optimizeSvelteModule(once, DEFAULT_OPTIONS);

    expect(twice.lowered).toEqual(once.lowered);
    expect(twice.lowered?.appliedOptimizations).toEqual(SVELTE_OPTIMIZATIONS);
  });

  it("leaves intentions without a Svelte plan untouched", () => {
    const module = refinableModule();
    const foreign: TargetIntentions = {
      framework: "vue",
      module,
      context: CONTEXT,
    };

    expect(optimizeSvelteModule(foreign, DEFAULT_OPTIONS)).toBe(foreign);
  });

  it("hoists static markup only while neutral static marking is enabled", () => {
    const module = refinableModule();

    expect(refine(module).hoistedStatic.map((entry) => entry.name)).toEqual([
      "__mpHoist_0",
    ]);

    const ungated = refine(module, { neutral: { staticMarking: false } });
    expect(ungated.hoistedStatic).toEqual([]);
    expect(ungated.appliedOptimizations).not.toContain(HOIST_STATIC_MARKUP);
  });

  it("keeps only stable each-keys while neutral key inference is enabled", () => {
    const module = refinableModule();

    const refined = refine(module);
    expect(refined.listKeys.map((entry) => entry.source)).toEqual(["rows"]);
    expect(refined.unkeyedLists).toEqual(["cells"]);

    const ungated = refine(module, { neutral: { stableKeyInference: false } });
    expect(ungated.listKeys.map((entry) => entry.source)).toEqual([
      "rows",
      "cells",
    ]);
    expect(ungated.unkeyedLists).toEqual([]);
    expect(ungated.appliedOptimizations).not.toContain(STABLE_EACH_KEYS);
  });

  it("drops an empty effect and the lifecycle import it needed", () => {
    const refined = refine(refinableModule());

    expect(refined.effects).toEqual([]);
    expect(refined.appliedOptimizations).toContain(DROP_EMPTY_EFFECTS);
    expect(
      refined.svelteImports.some((entry) => entry.module === "svelte"),
    ).toBe(false);
  });

  it("prunes a runtime import the refined plan never references", () => {
    const refined = refine(refinableModule());

    expect(refined.svelteImports).toEqual([]);
    expect(refined.appliedOptimizations).toContain(DROP_UNUSED_IMPORTS);
    expect(
      emitSvelteModule(refinableModule(), "Fixture", new Set(), refined).code,
    ).not.toContain("classNames");
  });

  it("converts state only ever computed from other state into $derived", () => {
    const module = derivableStateModule();
    const refined = refine(module);

    expect(refined.appliedOptimizations).toContain(STATE_TO_DERIVED);
    expect(refined.runeState.map((entry) => entry.name)).toEqual(["base"]);
    expect(refined.derived).toEqual([
      { name: "scaled", expression: "base * 2", kind: "derived" },
    ]);

    const code = emitSvelteModule(module, "Fixture", new Set(), refined).code;
    expect(code).toContain("let base = $state(1);");
    expect(code).toContain("const scaled = $derived(base * 2);");
    expect(code).not.toContain("$state(base * 2)");
  });

  it("keeps a state cell whose setter is still called", () => {
    const root = element("button", {
      attributes: [expressionAttribute("onClick", "() => setScaled(base * 3)")],
      children: [expressionChild("scaled")],
      source: "<button onClick={() => setScaled(base * 3)}>{scaled}</button>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement("const [base, setBase] = useState(1);"),
          statement("const [scaled, setScaled] = useState(base * 2);"),
        ],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
    });

    expect(refine(module).runeState.map((entry) => entry.name)).toEqual([
      "base",
      "scaled",
    ]);
  });
});
