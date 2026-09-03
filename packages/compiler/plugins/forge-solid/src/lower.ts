/**
 * The SolidJS lowering phase.
 *
 * `lower` translates the framework-neutral semantic facts into **Solid
 * decisions** before a single character of source is printed: which signals,
 * memos, effects, refs and props exist, how each is spelled in Solid's
 * vocabulary, and therefore which `solid-js` values the module will import. The
 * plan is carried on `TargetIntentions.lowered`, refined by `./optimize.ts`, and
 * consumed by the emitter — so the emitter prints a decision rather than making
 * one.
 *
 * The plan is a plain, serializable record discriminated on
 * `framework === 'solid'`, so {@link isSolidLowered} can narrow a
 * `TargetLoweredModule` without a cast.
 */
import { constantMemoValue } from "./transformers/constants.js";

import type {
  CompilerDiagnostic,
  DynamicNodeIntention,
  EffectIntention,
  GenericRenderNode,
  ListKeyIntention,
  MemoIntention,
  PropIntention,
  RefIntention,
  SemanticModule,
  SlotIntention,
  SourceSpan,
  StateIntention,
  TargetContext,
  TargetIntentions,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

/** The framework identifier every Solid plan is discriminated on. */
export const SOLID_FRAMEWORK = "solid";

/** The type text used when neither an annotation nor an inference is available. */
const UNKNOWN_TYPE = "unknown";

/** A `useState` cell lowered to a Solid signal. */
export interface SolidSignalPlan {
  /** The accessor binding — a **function**, so every read is a call. */
  readonly accessor: string;
  /** The setter binding (`setOpen`), synthesised when the source had none. */
  readonly setter: string;
  /** The resolved type text (`type.text` → `inferredType` → `unknown`). */
  readonly type: string;
  /** The initializer expression text, when the source provided one. */
  readonly initializer?: string;
}

/** A `useMemo` binding lowered to `createMemo`, or folded to a constant. */
export interface SolidMemoPlan {
  readonly name: string;
  /** The factory expression text passed to `createMemo`. */
  readonly factory: string;
  /** The constant the factory folds to, when it can never change. */
  readonly constant?: string;
  /** Whether the binding is a reactive accessor (a folded memo is a plain value). */
  readonly accessor: boolean;
}

/** A `useEffect` lowered to `createEffect`/`onMount`, with its optional `onCleanup`. */
export interface SolidEffectPlan {
  /** The Solid primitive the effect runs under. */
  readonly primitive: "createEffect" | "onMount";
  readonly body: string;
  /** The cleanup expression registered with `onCleanup`, when the source had one. */
  readonly cleanup?: string;
}

/** A `useRef` container and the element type it holds. */
export interface SolidRefPlan {
  readonly name: string;
  /** The element type the container is annotated with. */
  readonly elementType: string;
  readonly initializer?: string;
}

/** One declared prop and how Solid reads it. */
export interface SolidPropPlan {
  readonly name: string;
  readonly optional: boolean;
  readonly type: string;
  /** The default folded in through `mergeProps`, when the source declared one. */
  readonly defaultValue?: string;
}

/** A `<Dynamic is={…}>` node lowered to Solid's hyperscript. */
export interface SolidDynamicPlan {
  readonly expression: string;
}

/** A slot read, expressed as the props member Solid reads it from. */
export interface SolidSlotPlan {
  readonly name: string;
  readonly fallback?: string;
}

/** A list projection and the key Solid keeps for it. */
export interface SolidListKeyPlan {
  readonly source: string;
  readonly key?: string;
  readonly stable: boolean;
}

/** A repeated dynamic child expression promoted to its own memo. */
export interface SolidMemoizedExpression {
  /** The neutral expression text, matched verbatim against the render tree. */
  readonly expression: string;
  /** The `createMemo` binding the expression is read through. */
  readonly name: string;
}

/** The Solid-shaped decisions taken for one module. */
export interface SolidLoweringPlan {
  readonly signals: readonly SolidSignalPlan[];
  readonly memos: readonly SolidMemoPlan[];
  readonly effects: readonly SolidEffectPlan[];
  readonly refs: readonly SolidRefPlan[];
  readonly props: readonly SolidPropPlan[];
  /** Whether any prop declares a default, so `mergeProps` is required. */
  readonly mergeProps: boolean;
  /** Whether the props object is read through `splitProps` (defaults must be split out). */
  readonly splitProps: boolean;
  readonly dynamicNodes: readonly SolidDynamicPlan[];
  readonly slots: readonly SolidSlotPlan[];
  readonly listKeys: readonly SolidListKeyPlan[];
  /** Spans of the render subtrees Stage-1 marked static. */
  readonly staticSubtrees: readonly SourceSpan[];
  /** The exact `solid-js` value names the plan requires. */
  readonly solidImports: readonly string[];
  /** Lists that still render without a key after optimization. */
  readonly unkeyedLists: readonly string[];
  /** Whether static subtrees are promoted to module-level constants. */
  readonly hoistStatic: boolean;
  /** Whether a fragment wrapping a single child collapses to that child. */
  readonly collapseSingleChildFragments: boolean;
  /** Repeated dynamic child expressions promoted to memos. */
  readonly memoizedExpressions: readonly SolidMemoizedExpression[];
}

/** The Solid extension of the shared target plan contract. */
export interface SolidLoweredModule extends TargetLoweredModule {
  readonly framework: typeof SOLID_FRAMEWORK;
  readonly plan: SolidLoweringPlan;
}

/** Narrow a target plan to the Solid one; `false` for any other framework's plan. */
export function isSolidLowered(
  lowered: TargetLoweredModule | undefined,
): lowered is SolidLoweredModule {
  return lowered !== undefined && lowered.framework === SOLID_FRAMEWORK;
}

/** `setOpen` — the setter name a state cell uses when the source recorded none. */
function setterName(state: StateIntention): string {
  return (
    state.setterName ??
    `set${state.name.charAt(0).toUpperCase()}${state.name.slice(1)}`
  );
}

/** The resolved type text for a state cell: annotation, then inference, then `unknown`. */
function stateType(state: StateIntention): string {
  return state.type?.text ?? state.inferredType ?? UNKNOWN_TYPE;
}

/** Lower the state intentions to signal plans. */
function planSignals(state: readonly StateIntention[]): SolidSignalPlan[] {
  return state.map((cell) => ({
    accessor: cell.name,
    setter: setterName(cell),
    type: stateType(cell),
    initializer: cell.initializer?.text,
  }));
}

/** Lower the memo intentions, folding a factory that can never change. */
function planMemos(memos: readonly MemoIntention[]): SolidMemoPlan[] {
  return memos.map((memo) => {
    const constant = constantMemoValue(memo.factory.text);
    return {
      name: memo.name,
      factory: memo.factory.text,
      constant,
      accessor: constant === undefined,
    };
  });
}

/** Whether an effect's recorded dependencies make it mount-only. */
function isMountEffect(effect: EffectIntention): boolean {
  return effect.dependencies !== undefined && effect.dependencies.length === 0;
}

/** Lower the effect intentions, pairing each cleanup with `onCleanup`. */
function planEffects(effects: readonly EffectIntention[]): SolidEffectPlan[] {
  return effects.map((effect) => ({
    primitive: isMountEffect(effect)
      ? ("onMount" as const)
      : ("createEffect" as const),
    body: effect.body.text,
    cleanup: effect.cleanup?.text,
  }));
}

/** Lower the ref intentions to container plans. */
function planRefs(refs: readonly RefIntention[]): SolidRefPlan[] {
  return refs.map((reference) => ({
    name: reference.name,
    elementType: reference.elementType?.text ?? UNKNOWN_TYPE,
    initializer: reference.initializer?.text,
  }));
}

/** Lower the prop intentions, resolving each declared type. */
function planProps(props: readonly PropIntention[]): SolidPropPlan[] {
  return props.map((property) => ({
    name: property.name,
    optional: property.optional,
    type: property.type?.text ?? UNKNOWN_TYPE,
    defaultValue: property.defaultValue?.text,
  }));
}

/** Lower the dynamic-node intentions. */
function planDynamicNodes(
  dynamicNodes: readonly DynamicNodeIntention[],
): SolidDynamicPlan[] {
  return dynamicNodes.map((node) => ({ expression: node.expression.text }));
}

/** Lower the slot intentions. */
function planSlots(slots: readonly SlotIntention[]): SolidSlotPlan[] {
  return slots.map((slot) => ({
    name: slot.name,
    fallback: slot.fallback?.text,
  }));
}

/** Lower the list-key intentions. */
function planListKeys(
  listKeys: readonly ListKeyIntention[],
): SolidListKeyPlan[] {
  return listKeys.map((entry) => ({
    source: entry.source.text,
    key: entry.key?.text,
    stable: entry.stable,
  }));
}

/** Whether the render tree contains a control-flow shape Solid renders with `<Show>`. */
function usesConditionalRendering(
  renderTree: readonly GenericRenderNode[],
): boolean {
  return renderTree.some((node) =>
    node.children.some(
      (child) =>
        child.kind === "expression-node" &&
        (child.expression?.text ?? "").includes("?"),
    ),
  );
}

/**
 * The exact `solid-js` value names a plan requires, alphabetically ordered so a
 * re-run produces an identical list. Recomputing this is what makes
 * `solid:drop-unused-imports` a pure function of the plan.
 */
export function planSolidImports(
  plan: SolidLoweringPlan,
  conditional: boolean,
): string[] {
  const names = new Set<string>();
  if (plan.signals.length > 0) {
    names.add("createSignal");
  }
  if (
    plan.memos.some((memo) => memo.accessor) ||
    plan.memoizedExpressions.length > 0
  ) {
    names.add("createMemo");
  }
  for (const effect of plan.effects) {
    names.add(effect.primitive);
    if (effect.cleanup !== undefined) {
      names.add("onCleanup");
    }
  }
  if (plan.mergeProps) {
    names.add("mergeProps");
  }
  if (plan.splitProps) {
    names.add("splitProps");
  }
  if (plan.dynamicNodes.length > 0) {
    names.add("Dynamic");
  }
  if (plan.listKeys.length > 0) {
    names.add("For");
  }
  if (conditional) {
    names.add("Show");
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

/** Whether the module's markup needs Solid's `<Show>` control flow. */
export function needsShow(ir: SemanticModule): boolean {
  return usesConditionalRendering(ir.intentions.renderTree);
}

/** Build the Solid plan for a module's semantic facts. */
export function planSolidModule(ir: SemanticModule): SolidLoweringPlan {
  const { intentions } = ir;
  const props = planProps(intentions.props);
  const mergeProps = props.some(
    (property) => property.defaultValue !== undefined,
  );
  const plan: SolidLoweringPlan = {
    signals: planSignals(intentions.state),
    memos: planMemos(intentions.memos),
    effects: planEffects(intentions.effects),
    refs: planRefs(intentions.refs),
    props,
    mergeProps,
    splitProps: mergeProps && props.length > 1,
    dynamicNodes: planDynamicNodes(intentions.dynamicNodes),
    slots: planSlots(intentions.slots),
    listKeys: planListKeys(intentions.listKeys),
    staticSubtrees: intentions.staticSubtrees,
    unkeyedLists: [],
    // Solid's defaults before the target optimizer refines them: a component
    // body runs once, so hoisting is always worthwhile, while collapsing and
    // memoizing are opt-in refinements `./optimize.ts` turns on.
    hoistStatic: true,
    collapseSingleChildFragments: false,
    memoizedExpressions: [],
    solidImports: [],
  };
  return { ...plan, solidImports: planSolidImports(plan, needsShow(ir)) };
}

/** Lower neutral IR into Solid's target-intention wrapper, carrying the plan. */
export function lowerSolidModule(
  ir: SemanticModule,
  context: TargetContext,
): TargetIntentions {
  const diagnostics: readonly CompilerDiagnostic[] = ir.diagnostics ?? [];
  const lowered: SolidLoweredModule = {
    framework: SOLID_FRAMEWORK,
    appliedOptimizations: [],
    plan: planSolidModule(ir),
  };
  return {
    framework: SOLID_FRAMEWORK,
    module: ir,
    context,
    diagnostics,
    lowered,
  };
}
