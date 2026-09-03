/**
 * Vue **optimization** phase.
 *
 * The optimizer refines the plan produced by `./lower.js` — it never touches the
 * neutral IR, and it never prints. Each optimization is:
 *
 * - **gated** on the neutral option that owns it, so a consumer disabling
 *   `staticMarking` or `stableKeyInference` disables the matching Vue pass;
 * - **idempotent** — re-running the optimizer over an already-optimized plan
 *   produces the same plan and never records an identifier twice;
 * - **recorded** by identifier on {@link VueLoweredModule.appliedOptimizations},
 *   which the emitter reads to decide what it may take advantage of.
 */
import { isVueLowered } from "./lower.js";

import type {
  VueComputedPlan,
  VueLoweredModule,
  VueRefPlan,
  VueRuntimeImports,
  VueStaticSubtreePlan,
} from "./lower.js";
import type {
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

/** Prune `vue` imports the refined plan no longer needs. */
export const DROP_UNUSED_IMPORTS = "vue:drop-unused-imports";
/** Hoist fully static subtrees (module constants / `v-once`). */
export const HOIST_STATIC_SUBTREES = "vue:hoist-static-subtrees";
/** Keep only list keys proven stable, recording the lists left unkeyed. */
export const STABLE_LIST_KEYS = "vue:stable-list-keys";
/** Collapse `computed` declarations that share a factory. */
export const DEDUPE_COMPUTED = "vue:dedupe-computed";
/** Emit never-reassigned state as a plain `const` instead of a `ref`. */
export const INLINE_SINGLE_USE_REFS = "vue:inline-single-use-refs";

/** Every optimization identifier the Vue target can record, in application order. */
export const VUE_OPTIMIZATIONS: readonly string[] = [
  INLINE_SINGLE_USE_REFS,
  DEDUPE_COMPUTED,
  HOIST_STATIC_SUBTREES,
  STABLE_LIST_KEYS,
  DROP_UNUSED_IMPORTS,
];

/**
 * Whether a state entry can never be reassigned. Only state the neutral IR
 * recorded **without a setter** qualifies: a recorded setter may be invoked from
 * a nested closure, a listener attribute or a hook argument the plan does not
 * model, so demoting on "the setter looks unused" would freeze genuinely
 * mutable state into a constant.
 */
function isReadOnlyState(state: VueRefPlan): boolean {
  return state.setterName === undefined;
}

/** The `vue` value imports the plan still needs. */
function requiredImports(plan: VueLoweredModule): Set<string> {
  const required = new Set<string>();
  if (plan.reactiveState.length > 0) {
    required.add("ref");
  }
  if (plan.computedValues.some((computed) => computed.aliasOf === undefined)) {
    required.add("computed");
  }
  for (const watcher of plan.watchers) {
    if (watcher.runsOnce) {
      required.add("onMounted");
    } else if (watcher.dependencies === undefined) {
      required.add("watchEffect");
    } else {
      required.add("onMounted");
      required.add("watch");
    }
    if (watcher.runsOnce && watcher.cleanupText !== undefined) {
      required.add("onUnmounted");
    }
  }
  for (const templateRef of plan.templateRefs) {
    required.add(templateRef.useTemplateRef ? "useTemplateRef" : "shallowRef");
  }
  if (plan.dynamicNodes.length > 0) {
    required.add("resolveComponent");
  }
  if (plan.slots.length > 0) {
    required.add("useSlots");
  }
  return required;
}

/** Move setter-less state out of `reactiveState` into `constantState`. */
function inlineSingleUseRefs(plan: VueLoweredModule): VueLoweredModule {
  const reactiveState: VueRefPlan[] = [];
  const constantState: VueRefPlan[] = [...plan.constantState];
  for (const state of plan.reactiveState) {
    (isReadOnlyState(state) ? constantState : reactiveState).push(state);
  }
  return { ...plan, reactiveState, constantState };
}

/** Point every duplicate `computed` at the first declaration of its factory. */
function dedupeComputed(plan: VueLoweredModule): VueLoweredModule {
  const canonical = new Map<string, string>();
  const computedValues: VueComputedPlan[] = plan.computedValues.map(
    (computed) => {
      if (computed.aliasOf !== undefined) {
        return computed;
      }
      const key = computed.factoryText.replaceAll(/\s+/g, " ").trim();
      const owner = canonical.get(key);
      if (owner === undefined) {
        canonical.set(key, computed.name);
        return computed;
      }
      return { ...computed, aliasOf: owner };
    },
  );
  return { ...plan, computedValues };
}

/** Accept every recorded static subtree for hoisting. */
function hoistStaticSubtrees(plan: VueLoweredModule): VueLoweredModule {
  const staticSubtrees: VueStaticSubtreePlan[] = plan.staticSubtrees.map(
    (subtree) => (subtree.hoisted ? subtree : { ...subtree, hoisted: true }),
  );
  return { ...plan, staticSubtrees };
}

/** Keep only stable list keys, recording the lists left without one. */
function stableListKeys(plan: VueLoweredModule): VueLoweredModule {
  const listKeys = plan.listKeys.map((listKey) =>
    listKey.stable ? listKey : { ...listKey, keyText: undefined },
  );
  const unkeyedLists = [
    ...new Set([
      ...plan.unkeyedLists,
      ...listKeys
        .filter((listKey) => listKey.keyText === undefined)
        .map((listKey) => listKey.sourceText),
    ]),
  ];
  return { ...plan, listKeys, unkeyedLists };
}

/** Drop `vue` imports no decision in the plan calls for any more. */
function dropUnusedImports(plan: VueLoweredModule): VueLoweredModule {
  const required = requiredImports(plan);
  const vueImports: VueRuntimeImports = {
    values: plan.vueImports.values.filter((name) => required.has(name)),
    types: plan.vueImports.types,
  };
  return { ...plan, vueImports };
}

/** Apply one optimization, recording it exactly once. */
function applyOnce(
  plan: VueLoweredModule,
  identifier: string,
  enabled: boolean,
  transform: (current: VueLoweredModule) => VueLoweredModule,
): VueLoweredModule {
  if (!enabled || plan.appliedOptimizations.includes(identifier)) {
    return plan;
  }
  const optimized = transform(plan);
  return {
    ...optimized,
    appliedOptimizations: [...plan.appliedOptimizations, identifier],
  };
}

/**
 * Refine a lowered Vue plan. Intentions carrying a foreign (or missing) plan are
 * returned untouched, so the optimizer is safe to run in any pipeline.
 */
export function optimizeVueModule(
  intentions: TargetIntentions,
  options: TargetOptimizeOptions,
): TargetIntentions {
  const { lowered } = intentions;
  if (!isVueLowered(lowered)) {
    return intentions;
  }
  const neutral = options.neutral;
  let plan = applyOnce(lowered, INLINE_SINGLE_USE_REFS, true, (current) =>
    inlineSingleUseRefs(current),
  );
  plan = applyOnce(plan, DEDUPE_COMPUTED, true, (current) =>
    dedupeComputed(current),
  );
  plan = applyOnce(
    plan,
    HOIST_STATIC_SUBTREES,
    neutral.staticMarking === true,
    (current) => hoistStaticSubtrees(current),
  );
  plan = applyOnce(
    plan,
    STABLE_LIST_KEYS,
    neutral.stableKeyInference === true,
    (current) => stableListKeys(current),
  );
  plan = applyOnce(plan, DROP_UNUSED_IMPORTS, true, (current) =>
    dropUnusedImports(current),
  );
  return { ...intentions, lowered: plan };
}
