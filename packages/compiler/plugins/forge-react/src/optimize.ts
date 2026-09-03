/**
 * The React **optimization** phase.
 *
 * Optimization refines the plan produced by `./lower` — it never touches the
 * neutral IR, so the same module can be lowered once and optimized under
 * different option sets. Each optimization honours the neutral flag that owns
 * it, records its identifier on {@link TargetLoweredModule.appliedOptimizations},
 * and is idempotent: re-running `optimizeReactModule` on its own result skips
 * every pass already recorded, so no identifier is ever listed twice.
 */
import { walkRenderNodes } from "@mission-platform/forge-plugin-api";
import { REACT_TYPE_ALIASES } from "@mission-platform/forge-plugin-api/compiler/ast.js";

import {
  hasRenderedFragment,
  isReactLowered,
  planReactModule,
  reactUsageText,
  REACT_FRAMEWORK,
  renderRoots,
  type ReactImportPlan,
  type ReactLoweredModule,
  type ReactModulePlan,
} from "./lower.js";
import { CLIENT_HOOKS } from "./transformers/aliases.js";

import type {
  SemanticModule,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

/** The identifiers recorded on a plan the React optimizer has refined. */
export const REACT_OPTIMIZATIONS = {
  /** Prune `react` bindings the plan no longer needs. */
  dropUnusedImports: "react:drop-unused-imports",
  /** Lift static-marked subtrees to module-level constants. */
  hoistStaticSubtrees: "react:hoist-static-subtrees",
  /** Keep only the list keys the neutral pass proved stable. */
  stableListKeys: "react:stable-list-keys",
  /** Collapse a `<>…</>` wrapper around a single element. */
  collapseFragments: "react:collapse-fragments",
  /** Drop the `'use client'` requirement from a plan with no interactivity left. */
  skipClientDirective: "react:skip-client-directive",
} as const;

/** React's own render factory name, imported as `createElement as h`. */
const CREATE_ELEMENT = "createElement";

/** React's fragment binding, referenced by every emitted `<>…</>`. */
const FRAGMENT = "Fragment";

/** The neutral names that lower to each React type name (`MpChild` → `ReactNode`). */
const REACT_TYPE_SOURCES: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(REACT_TYPE_ALIASES).map(([neutralName, reactName]) => [
    reactName,
    [reactName, neutralName],
  ]),
);

/** Whether the text references `name` as a bare identifier. */
function referencesIdentifier(text: string, name: string): boolean {
  return new RegExp(String.raw`\b${name}\b`).test(text);
}

/** Whether the render tree holds a `<Dynamic>` marker, which lowers to an `h(…)` call. */
function rendersDynamicNode(module: SemanticModule): boolean {
  let found = false;
  walkRenderNodes(renderRoots(module), (node) => {
    found ||= node.tagKind === "dynamic";
  });
  return found;
}

/** The names a hook plan requires regardless of what the neutral source imported. */
function requiredHookNames(plan: ReactModulePlan): readonly string[] {
  const required: string[] = [];
  if (plan.hooks.state.length > 0) required.push("useState");
  if (plan.hooks.memos.length > 0) required.push("useMemo");
  if (plan.hooks.effects.length > 0) required.push("useEffect");
  if (plan.hooks.refs.length > 0) required.push("useRef");
  return required;
}

/**
 * `react:drop-unused-imports` — prune the bindings **lowering added** that the
 * refined plan no longer needs.
 *
 * A binding survives only while something still asks for it: a hook implied by
 * an intention, a hook the module actually calls, the `Fragment` a `<>…</>`
 * needs, or a type the signature or a declaration still names.
 *
 * `createElement` is the one exception. It is imported as `createElement as h`,
 * so the render factory every emitted JSX element compiles to is never spelled
 * in the module text — pruning it by reference would delete the import the
 * output depends on. It is therefore kept whenever the neutral source imported
 * `h`, and otherwise only while the plan still calls it.
 */
function dropUnusedImports(
  plan: ReactModulePlan,
  module: SemanticModule,
): ReactModulePlan {
  const usage = reactUsageText(module);
  const declared = new Set(plan.reactImports.declared);
  const required = new Set(requiredHookNames(plan));
  const values = plan.reactImports.values.filter((name) => {
    if (required.has(name)) {
      return true;
    }
    if (name === FRAGMENT) {
      return hasRenderedFragment(renderRoots(module));
    }
    if (name === CREATE_ELEMENT) {
      return (
        declared.has(name) ||
        plan.dynamicNodes.length > 0 ||
        rendersDynamicNode(module) ||
        /\bh\s*\(/.test(usage)
      );
    }
    return referencesIdentifier(usage, name);
  });
  const types = plan.reactImports.types.filter((name) =>
    (REACT_TYPE_SOURCES.get(name) ?? [name]).some((source) =>
      referencesIdentifier(usage, source),
    ),
  );
  const reactImports: ReactImportPlan = { ...plan.reactImports, values, types };
  return { ...plan, reactImports };
}

/** Whether the optimized plan still contains anything React must render on the client. */
function hasInteractivity(plan: ReactModulePlan): boolean {
  return (
    plan.clientDirective.handlers ||
    plan.hooks.state.length > 0 ||
    plan.hooks.effects.length > 0 ||
    plan.hooks.refs.length > 0 ||
    plan.reactImports.values.some((name) => CLIENT_HOOKS.has(name))
  );
}

/** Read the plan an earlier phase lowered, or lower one now. */
function planOf(intentions: TargetIntentions): ReactLoweredModule {
  return isReactLowered(intentions.lowered)
    ? intentions.lowered
    : {
        framework: REACT_FRAMEWORK,
        appliedOptimizations: [],
        plan: planReactModule(
          intentions.module,
          intentions.context.componentName,
        ),
      };
}

/**
 * Refine the React plan.
 *
 * Static hoisting and stable-key selection are owned by the neutral flags that
 * produced their inputs: with `staticMarking` disabled the marked subtrees stay
 * inline, and with `stableKeyInference` disabled every inferred key is kept.
 */
export function optimizeReactModule(
  intentions: TargetIntentions,
  options: TargetOptimizeOptions,
): TargetIntentions {
  const lowered = planOf(intentions);
  const applied = [...lowered.appliedOptimizations];
  let plan = lowered.plan;

  const record = (identifier: string): boolean => {
    if (applied.includes(identifier)) {
      return false;
    }
    applied.push(identifier);
    return true;
  };

  if (options.neutral.staticMarking === false) {
    plan = { ...plan, hoistStatic: false, staticSubtrees: [] };
  } else if (record(REACT_OPTIMIZATIONS.hoistStaticSubtrees)) {
    plan = { ...plan, hoistStatic: true };
  }

  if (
    options.neutral.stableKeyInference !== false &&
    record(REACT_OPTIMIZATIONS.stableListKeys)
  ) {
    plan = { ...plan, listKeys: plan.listKeys.filter((entry) => entry.stable) };
  }

  if (record(REACT_OPTIMIZATIONS.collapseFragments)) {
    plan = { ...plan, unwrapSingleChildFragments: true };
  }

  if (record(REACT_OPTIMIZATIONS.dropUnusedImports)) {
    plan = dropUnusedImports(plan, intentions.module);
  }

  if (
    record(REACT_OPTIMIZATIONS.skipClientDirective) &&
    plan.clientDirective.required &&
    !hasInteractivity(plan)
  ) {
    plan = {
      ...plan,
      clientDirective: { ...plan.clientDirective, required: false },
    };
  }

  const next: ReactLoweredModule = {
    framework: REACT_FRAMEWORK,
    appliedOptimizations: applied,
    plan,
  };
  return { ...intentions, lowered: next };
}
