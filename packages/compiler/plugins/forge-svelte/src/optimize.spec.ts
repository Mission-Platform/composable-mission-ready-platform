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
        "import { classNames } from '@mission-platform/forge-jsx';",
        "@mission-platform/forge-jsx",
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

  it("does not hoist static-marked rows that close over each-block locals", () => {
    // Regression: ForgeList's mapped `<li>{item.label}</li>` is static-marked
    // by the neutral compiler, but a parameterless `{#snippet}` cannot see the
    // `{#each}` binding `item`.
    const item = element("li", {
      attributes: [
        stringAttribute("__mpStatic", "true"),
        expressionAttribute("key", "index"),
      ],
      children: [expressionChild("item.label")],
      source: "<li key={index}>{item.label}</li>",
    });
    const root = element("ul", {
      children: [
        expressionChild(
          "items.map((item, index) => <li key={index}>{item.label}</li>)",
          [item],
        ),
      ],
      source:
        "<ul>{items.map((item, index) => <li key={index}>{item.label}</li>)}</ul>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const items = properties.items;")],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      props: [{ name: "items", optional: false }],
      listKeys: [listKey("items", "index", true)],
      staticSubtrees: [item.span],
    });

    const refined = refine(module);
    expect(refined.staticSubtrees).toHaveLength(1);
    expect(refined.hoistedStatic).toEqual([]);

    const code = emitSvelteModule(module, "Fixture", new Set(), refined).code;
    expect(code).not.toContain("{#snippet");
    expect(code).toContain("{#each items as item, index (index)}");
    expect(code).toContain("<li>{item.label}</li>");
  });

  it("does not let a same-named parameter in an unrelated setup statement mark an each-block local as top-level", () => {
    // Regression: ForgeSelect's `selectOption = (option: SelectOption) => {…}`
    // parameter must not leak into the top-level binding set used to gate
    // hoisting for the unrelated `options.map((option) => <option>…</option>)`
    // row — a same-named arrow-function parameter is scoped to that function
    // only, not visible from a parameterless hoisted `{#snippet}`. Hoisting it
    // anyway throws `ReferenceError: option is not defined` at render time.
    const optionRow = element("option", {
      attributes: [
        stringAttribute("__mpStatic", "true"),
        expressionAttribute("value", "option.value"),
      ],
      children: [expressionChild("option.label")],
      source: "<option value={option.value}>{option.label}</option>",
    });
    const root = element("select", {
      children: [
        expressionChild(
          "options.map((option) => <option value={option.value}>{option.label}</option>)",
          [optionRow],
        ),
      ],
      source:
        "<select>{options.map((option) => <option value={option.value}>{option.label}</option>)}</select>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement("const options = properties.options;"),
          statement(
            "const selectOption = (option: SelectOption): void => { commit(option.value); };",
          ),
        ],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      props: [{ name: "options", optional: false }],
      listKeys: [listKey("options", "option.value", true)],
    });

    const refined = refine(module);
    expect(refined.staticSubtrees).toHaveLength(1);
    expect(refined.hoistedStatic).toEqual([]);

    const code = emitSvelteModule(module, "Fixture", new Set(), refined).code;
    expect(code).not.toContain("{#snippet");
    expect(code).toContain(
      "<option value={option.value}>{option.label}</option>",
    );
  });

  it("does not hoist description-style rows whose only free locals are in children or template keys", () => {
    // ForgeList description rows use `` key={`term-${index}`} `` and nested
    // component children `{item.term ?? item.label}`. Both must block hoisting.
    const term = element("dt", {
      attributes: [
        stringAttribute("__mpStatic", "true"),
        expressionAttribute("key", "`term-${index}`"),
        expressionAttribute("className", "styles['term']"),
      ],
      children: [
        element("ForgeTypography", {
          attributes: [stringAttribute("variant", "body-md")],
          children: [expressionChild("item.term ?? item.label")],
          source:
            '<ForgeTypography variant="body-md">{item.term ?? item.label}</ForgeTypography>',
        }),
      ],
      source:
        "<dt key={`term-${index}`} className={styles['term']}><ForgeTypography variant=\"body-md\">{item.term ?? item.label}</ForgeTypography></dt>",
    });
    const root = element("dl", {
      children: [
        expressionChild(
          "items.flatMap((item, index) => [<dt key={`term-${index}`}>{item.term}</dt>])",
          [term],
        ),
      ],
      source:
        "<dl>{items.flatMap((item, index) => [<dt key={`term-${index}`}>{item.term}</dt>])}</dl>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement("const items = properties.items;"),
          statement("const styles = {};"),
        ],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      props: [{ name: "items", optional: false }],
      listKeys: [listKey("items", undefined, false)],
      staticSubtrees: [term.span],
    });

    const refined = refine(module);
    expect(refined.staticSubtrees).toHaveLength(1);
    // The free `item` / `index` reads must keep this candidate out of
    // parameterless snippet hoisting even when styles is top-level.
    expect(refined.hoistedStatic).toEqual([]);
    expect(
      emitSvelteModule(module, "Fixture", new Set(), refined).code,
    ).not.toContain("{#snippet");
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
