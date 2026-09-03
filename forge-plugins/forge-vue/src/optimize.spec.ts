import { describe, expect, it } from "vitest";

import {
  component,
  effect,
  listKey,
  memo,
  semanticModule,
  state,
  statement,
  templateRef,
} from "./ir-test-helpers.js";
import { isVueLowered, lowerVueModule } from "./lower.js";
import {
  DEDUPE_COMPUTED,
  DROP_UNUSED_IMPORTS,
  HOIST_STATIC_SUBTREES,
  INLINE_SINGLE_USE_REFS,
  optimizeVueModule,
  STABLE_LIST_KEYS,
} from "./optimize.js";

import type { VueLoweredModule } from "./lower.js";
import type {
  SemanticModule,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "vue",
  moduleKind: "component",
  componentName: "Fixture",
};
const ALL_ENABLED: TargetOptimizeOptions = {
  neutral: {
    deadBranchPruning: true,
    staticMarking: true,
    stableKeyInference: true,
  },
};

/** The Vue plan of an optimized set of intentions. */
function planOf(intentions: TargetIntentions): VueLoweredModule {
  const { lowered } = intentions;
  if (!isVueLowered(lowered)) {
    throw new Error("expected a Vue plan");
  }
  return lowered;
}

/** A fixture exercising every optimization at once. */
function fixture(): SemanticModule {
  return semanticModule({
    component: component({
      name: "Fixture",
      parameter: "properties",
      body: [
        statement("const [count, setCount] = useState(0);"),
        statement('const [title] = useState("Mission");'),
        statement(
          "const first = useMemo(() => properties.items.length, [properties.items]);",
        ),
        statement(
          "const second = useMemo(() => properties.items.length, [properties.items]);",
        ),
        statement("const onClick = () => setCount(count + 1);"),
      ],
    }),
    // `title` is destructured without a setter, so it can never be reassigned.
    state: [
      state("count", "setCount", { initializer: "0" }),
      state("title", undefined, { initializer: '"Mission"' }),
    ],
    memos: [
      memo("first", "() => properties.items.length", ["properties.items"]),
      memo("second", "() => properties.items.length", ["properties.items"]),
    ],
    effects: [effect("() => { track(); }", { dependencies: ["count"] })],
    refs: [templateRef("inputRef", "HTMLInputElement | null")],
    listKeys: [
      listKey("properties.items", "item.id", true),
      listKey("rows", "index", false),
    ],
    staticSubtrees: [{ start: 3, end: 8 }],
  });
}

describe("the Vue optimization phase refines the lowered plan", () => {
  it("records every enabled optimization exactly once", () => {
    const optimized = optimizeVueModule(
      lowerVueModule(fixture(), CONTEXT),
      ALL_ENABLED,
    );

    expect(planOf(optimized).appliedOptimizations).toEqual([
      INLINE_SINGLE_USE_REFS,
      DEDUPE_COMPUTED,
      HOIST_STATIC_SUBTREES,
      STABLE_LIST_KEYS,
      DROP_UNUSED_IMPORTS,
    ]);
  });

  it("is idempotent: re-optimizing an optimized plan changes nothing", () => {
    const once = optimizeVueModule(
      lowerVueModule(fixture(), CONTEXT),
      ALL_ENABLED,
    );
    const twice = optimizeVueModule(once, ALL_ENABLED);

    expect(planOf(twice)).toEqual(planOf(once));
    expect(planOf(twice).appliedOptimizations).toHaveLength(5);
  });

  it("moves setter-less state to `constantState` and keeps state that has a setter reactive", () => {
    const plan = planOf(
      optimizeVueModule(lowerVueModule(fixture(), CONTEXT), ALL_ENABLED),
    );

    expect(plan.reactiveState.map((entry) => entry.name)).toEqual(["count"]);
    expect(plan.constantState.map((entry) => entry.name)).toEqual(["title"]);
  });

  it("keeps state whose recorded setter is never called in the module reactive", () => {
    // A recorded setter may be invoked from a closure, a listener attribute or a
    // hook argument the plan does not model, so its apparent absence from the
    // module text must never demote the state to a constant.
    const unusedSetter = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement(
            "const [height, setHeight] = useState<number>(properties.initial);",
          ),
        ],
      }),
      state: [
        state("height", "setHeight", {
          type: "number",
          initializer: "properties.initial",
        }),
      ],
    });

    const plan = planOf(
      optimizeVueModule(lowerVueModule(unusedSetter, CONTEXT), ALL_ENABLED),
    );

    expect(plan.reactiveState.map((entry) => entry.name)).toEqual(["height"]);
    expect(plan.constantState).toEqual([]);
  });

  it("aliases a duplicate computed onto the first declaration of its factory", () => {
    const plan = planOf(
      optimizeVueModule(lowerVueModule(fixture(), CONTEXT), ALL_ENABLED),
    );

    expect(
      plan.computedValues.map((computed) => [computed.name, computed.aliasOf]),
    ).toEqual([
      ["first", undefined],
      ["second", "first"],
    ]);
  });

  it("drops the `vue` imports the refined plan no longer needs", () => {
    const constantOnly = (): SemanticModule =>
      semanticModule({
        component: component({
          name: "Fixed",
          parameter: "properties",
          body: [statement('const [title] = useState("Mission");')],
        }),
        state: [state("title", undefined, { initializer: '"Mission"' })],
      });

    const lowered = planOf(lowerVueModule(constantOnly(), CONTEXT));
    const optimized = planOf(
      optimizeVueModule(lowerVueModule(constantOnly(), CONTEXT), ALL_ENABLED),
    );

    // Lowering plans a `ref` for the state; inlining it as a constant leaves the
    // import unused, so the pruning pass removes it.
    expect(lowered.vueImports.values).toEqual(["ref"]);
    expect(optimized.vueImports.values).toEqual([]);
    // A plan that still needs `ref`/`computed` keeps them.
    expect(
      planOf(optimizeVueModule(lowerVueModule(fixture(), CONTEXT), ALL_ENABLED))
        .vueImports.values,
    ).toEqual(["computed", "onMounted", "ref", "useTemplateRef", "watch"]);
  });

  it("gates static hoisting on the neutral `staticMarking` flag", () => {
    const enabled = planOf(
      optimizeVueModule(lowerVueModule(fixture(), CONTEXT), ALL_ENABLED),
    );
    const disabled = planOf(
      optimizeVueModule(lowerVueModule(fixture(), CONTEXT), {
        neutral: { staticMarking: false },
      }),
    );

    expect(enabled.staticSubtrees).toEqual([
      { start: 3, end: 8, hoisted: true },
    ]);
    expect(enabled.appliedOptimizations).toContain(HOIST_STATIC_SUBTREES);
    expect(disabled.staticSubtrees).toEqual([
      { start: 3, end: 8, hoisted: false },
    ]);
    expect(disabled.appliedOptimizations).not.toContain(HOIST_STATIC_SUBTREES);
  });

  it("gates list-key filtering on the neutral `stableKeyInference` flag", () => {
    const enabled = planOf(
      optimizeVueModule(lowerVueModule(fixture(), CONTEXT), ALL_ENABLED),
    );
    const disabled = planOf(
      optimizeVueModule(lowerVueModule(fixture(), CONTEXT), {
        neutral: { stableKeyInference: false },
      }),
    );

    expect(enabled.listKeys.map((entry) => entry.keyText)).toEqual([
      "item.id",
      undefined,
    ]);
    expect(enabled.unkeyedLists).toEqual(["rows"]);
    expect(disabled.listKeys.map((entry) => entry.keyText)).toEqual([
      "item.id",
      "index",
    ]);
    expect(disabled.unkeyedLists).toEqual([]);
  });

  it("leaves intentions without a Vue plan untouched", () => {
    const intentions: TargetIntentions = {
      framework: "svelte",
      module: fixture(),
      context: CONTEXT,
      lowered: { framework: "svelte", appliedOptimizations: [] },
    };

    expect(optimizeVueModule(intentions, ALL_ENABLED)).toBe(intentions);
  });
});
