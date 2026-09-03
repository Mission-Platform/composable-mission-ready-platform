/**
 * The SolidJS optimization phase.
 *
 * `optimize` refines the plan `./lower.ts` produced. Every pass is a pure
 * function of the plan (plus the neutral render tree it reads facts from), each
 * records its identifier on `appliedOptimizations`, and none runs twice for the
 * same identifier — so `optimize(optimize(x))` equals `optimize(x)`:
 *
 * - `solid:hoist-static-subtrees` — gated on `neutral.staticMarking`: a Solid
 *   component body runs once, so a subtree Stage-1 marked static is created
 *   once at module scope instead of inside every reactive owner. Turning the
 *   neutral flag off turns the promotion off with it.
 * - `solid:stable-list-keys` — gated on `neutral.stableKeyInference`: only keys
 *   the frontend proved stable survive; the lists left without one are recorded
 *   so the emitter (and a diagnostic consumer) can see them.
 * - `solid:collapse-single-child-fragments` — a fragment that wraps exactly one
 *   element only exists to group, so it is dropped.
 * - `solid:memoize-dynamic-expressions` — a dynamic child expression rendered in
 *   more than one place is promoted to a single `createMemo`, so it is
 *   evaluated once per change instead of once per use site.
 * - `solid:drop-unused-imports` — runs last and recomputes `solidImports` from
 *   the refined plan, so a value an earlier pass removed the need for is not
 *   imported.
 */
import {
  isSolidLowered,
  needsShow,
  planSolidImports,
  SOLID_FRAMEWORK,
} from "./lower.js";

import type {
  SolidLoweredModule,
  SolidLoweringPlan,
  SolidMemoizedExpression,
} from "./lower.js";
import type {
  GenericRenderChild,
  GenericRenderNode,
  SemanticModule,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

/** Promote `__mpStatic` subtrees to module-level constants. */
export const HOIST_STATIC_SUBTREES = "solid:hoist-static-subtrees";

/** Keep only the list keys the frontend proved stable. */
export const STABLE_LIST_KEYS = "solid:stable-list-keys";

/** Drop a fragment that wraps exactly one element. */
export const COLLAPSE_SINGLE_CHILD_FRAGMENTS =
  "solid:collapse-single-child-fragments";

/** Promote a repeated dynamic child expression to a single memo. */
export const MEMOIZE_DYNAMIC_EXPRESSIONS = "solid:memoize-dynamic-expressions";

/** Recompute the `solid-js` imports from the refined plan. */
export const DROP_UNUSED_IMPORTS = "solid:drop-unused-imports";

/** Prefix for the memo bindings `solid:memoize-dynamic-expressions` introduces. */
export const MP_MEMO_PREFIX = "__mpMemo_";

/** Expressions cheap enough that a memo would cost more than it saves. */
const TRIVIAL_EXPRESSION = /^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*$/;

/** The plan under construction, plus the identifiers recorded so far. */
interface OptimizationState {
  plan: SolidLoweringPlan;
  readonly applied: string[];
}

/** Whether an optimization has already run for this plan. */
function alreadyApplied(state: OptimizationState, identifier: string): boolean {
  return state.applied.includes(identifier);
}

/** Record an optimization as applied, keeping the identifier list unique. */
function record(state: OptimizationState, identifier: string): void {
  if (!alreadyApplied(state, identifier)) {
    state.applied.push(identifier);
  }
}

/**
 * `solid:hoist-static-subtrees`. The plan already asks for hoisting, so the
 * pass's real work is honouring the neutral gate: with `staticMarking` off the
 * marked subtrees stay inline and the identifier is not recorded.
 */
function hoistStaticSubtrees(state: OptimizationState, enabled: boolean): void {
  if (alreadyApplied(state, HOIST_STATIC_SUBTREES)) {
    return;
  }
  if (!enabled) {
    state.plan = { ...state.plan, hoistStatic: false };
    return;
  }
  state.plan = { ...state.plan, hoistStatic: true };
  record(state, HOIST_STATIC_SUBTREES);
}

/**
 * `solid:stable-list-keys`. An unstable key is worse than none — Solid would
 * recreate every row on each render — so only the stable entries survive, and
 * the sources left unkeyed are recorded on the plan.
 */
function stableListKeys(state: OptimizationState, enabled: boolean): void {
  if (!enabled || alreadyApplied(state, STABLE_LIST_KEYS)) {
    return;
  }
  const stable = state.plan.listKeys.filter(
    (entry) => entry.stable && entry.key !== undefined,
  );
  const unkeyed = state.plan.listKeys
    .filter((entry) => !(entry.stable && entry.key !== undefined))
    .map((entry) => entry.source);
  state.plan = {
    ...state.plan,
    listKeys: stable,
    unkeyedLists: [...state.plan.unkeyedLists, ...unkeyed],
  };
  record(state, STABLE_LIST_KEYS);
}

/** `solid:collapse-single-child-fragments`. */
function collapseSingleChildFragments(state: OptimizationState): void {
  if (alreadyApplied(state, COLLAPSE_SINGLE_CHILD_FRAGMENTS)) {
    return;
  }
  state.plan = { ...state.plan, collapseSingleChildFragments: true };
  record(state, COLLAPSE_SINGLE_CHILD_FRAGMENTS);
}

/**
 * Every render child reachable from a node, including whether an enclosing
 * interpolation can introduce lexical bindings for it.
 */
function walkChildren(
  nodes: readonly GenericRenderNode[],
  visit: (child: GenericRenderChild, hasEnclosingExpression: boolean) => void,
  hasEnclosingExpression = false,
): void {
  for (const node of nodes) {
    for (const child of node.children) {
      visit(child, hasEnclosingExpression);
      if (child.kind === "render-node") {
        walkChildren([child], visit, hasEnclosingExpression);
      } else if (child.kind === "expression-node") {
        // Nested markup belongs to the expression's source. That source may be
        // a map/reduce callback or another closure, whose locals do not exist
        // at the component scope where optimizer memos are declared.
        walkChildren(child.nested, visit, true);
      }
    }
  }
}

/** Count repeated non-trivial dynamic expressions that are safe at component scope. */
function countDynamicExpressions(ir: SemanticModule): Map<string, number> {
  const counts = new Map<string, number>();
  const roots =
    ir.intentions.renderTree.length > 0
      ? ir.intentions.renderTree
      : ir.ast.renderNodes;
  walkChildren(roots, (child, hasEnclosingExpression) => {
    if (child.kind !== "expression-node" || hasEnclosingExpression) {
      return;
    }
    const text = child.expression?.text.trim();
    if (text === undefined || text === "" || TRIVIAL_EXPRESSION.test(text)) {
      return;
    }
    counts.set(text, (counts.get(text) ?? 0) + 1);
  });
  return counts;
}

/**
 * `solid:memoize-dynamic-expressions`. The memo names are assigned in the
 * expressions' first-seen order, so a re-run assigns the same names.
 */
function memoizeDynamicExpressions(
  state: OptimizationState,
  ir: SemanticModule,
): void {
  if (alreadyApplied(state, MEMOIZE_DYNAMIC_EXPRESSIONS)) {
    return;
  }
  const memoized: SolidMemoizedExpression[] = [];
  for (const [expression, count] of countDynamicExpressions(ir)) {
    if (count > 1) {
      memoized.push({
        expression,
        name: `${MP_MEMO_PREFIX}${memoized.length}`,
      });
    }
  }
  state.plan = { ...state.plan, memoizedExpressions: memoized };
  record(state, MEMOIZE_DYNAMIC_EXPRESSIONS);
}

/** `solid:drop-unused-imports`. */
function dropUnusedImports(state: OptimizationState, ir: SemanticModule): void {
  if (alreadyApplied(state, DROP_UNUSED_IMPORTS)) {
    return;
  }
  state.plan = {
    ...state.plan,
    solidImports: planSolidImports(state.plan, needsShow(ir)),
  };
  record(state, DROP_UNUSED_IMPORTS);
}

/**
 * Refine a lowered Solid plan. An intention wrapper that carries no Solid plan
 * (a direct call, or another target's) is returned untouched.
 */
export function optimizeSolidModule(
  intentions: TargetIntentions,
  options: TargetOptimizeOptions,
): TargetIntentions {
  if (!isSolidLowered(intentions.lowered)) {
    return intentions;
  }
  const state: OptimizationState = {
    plan: intentions.lowered.plan,
    applied: [...intentions.lowered.appliedOptimizations],
  };

  hoistStaticSubtrees(state, options.neutral.staticMarking !== false);
  stableListKeys(state, options.neutral.stableKeyInference !== false);
  collapseSingleChildFragments(state);
  memoizeDynamicExpressions(state, intentions.module);
  // Last: the import list is recomputed from the plan the passes above left.
  dropUnusedImports(state, intentions.module);

  const lowered: SolidLoweredModule = {
    framework: SOLID_FRAMEWORK,
    appliedOptimizations: state.applied,
    plan: state.plan,
  };
  return { ...intentions, lowered };
}
