/**
 * Vue **lowering** phase.
 *
 * Lowering translates the framework-neutral facts recorded on a
 * {@link SemanticModule} — state, memos, effects, refs, props, slots, events,
 * dynamic nodes, list keys and static subtrees — into the Vue decisions the
 * emitter later prints: which `ref`/`computed`/`watchEffect` declarations exist,
 * what `defineProps` looks like, and exactly which `vue` bindings the plan
 * needs. Nothing is printed here; the plan is data, so the optimizer can refine
 * it (see `./optimize.js`) before the emitter consumes it.
 *
 * The plan is exposed as a {@link VueLoweredModule} — a target-owned extension
 * of the plugin API's {@link TargetLoweredModule}, discriminated on its
 * `framework` field so consumers narrow it with {@link isVueLowered} instead of
 * casting.
 */
import type {
  SemanticIntentions,
  SemanticModule,
  SourceSpan,
  TargetContext,
  TargetIntentions,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

/** A `useState` lowered to a Vue `ref` declaration. */
export interface VueRefPlan {
  /** The state's local name (the `ref` binding). */
  readonly name: string;
  /** The neutral setter's name, whose calls become `<name>.value = …`. */
  readonly setterName?: string;
  /** The resolved element type (`type.text` → `inferredType` → `unknown`). */
  readonly typeText: string;
  /** The initializer expression, when the source declared one. */
  readonly initializerText?: string;
}

/** A `useMemo` lowered to a Vue `computed`. */
export interface VueComputedPlan {
  /** The computed's local name. */
  readonly name: string;
  /** The factory expression handed to `computed(…)`. */
  readonly factoryText: string;
  /** The neutral dependency list, kept for diagnostics and deduping. */
  readonly dependencies: readonly string[];
  /**
   * The computed this one is an alias of, set by `vue:dedupe-computed` when two
   * declarations share a factory. The emitter prints `const b = a;` for it.
   */
  readonly aliasOf?: string;
}

/** A `useEffect` lowered to a Vue watcher. */
export interface VueWatcherPlan {
  /** The effect callback source text. */
  readonly bodyText: string;
  /** The cleanup returned by the effect, when the source declared one. */
  readonly cleanupText?: string;
  /** The dependency expressions, or `undefined` for a run-every-update effect. */
  readonly dependencies?: readonly string[];
  /** Whether the effect runs once (`onMounted`) rather than on every change. */
  readonly runsOnce: boolean;
}

/** A `useRef` lowered to a Vue template ref (or a plain `shallowRef`). */
export interface VueTemplateRefPlan {
  /** The ref's local name. */
  readonly name: string;
  /** The referenced element type, with `| null`/`| undefined` retained. */
  readonly elementTypeText?: string;
  /** The initializer, when the source declared one. */
  readonly initializerText?: string;
  /** Whether the ref binds an element and can use `useTemplateRef`. */
  readonly useTemplateRef: boolean;
}

/** One member of the lowered `defineProps` contract. */
export interface VuePropPlan {
  readonly name: string;
  /** The resolved declared type, or `unknown` when the source omits one. */
  readonly typeText: string;
  readonly optional: boolean;
  /** The default value, which forces `withDefaults`. */
  readonly defaultText?: string;
}

/** The lowered `defineProps` shape. */
export interface VuePropsContract {
  /** The props parameter's local name (the `defineProps` binding). */
  readonly parameterName: string;
  /** The declared props type expression, when the parameter was annotated. */
  readonly typeText?: string;
  readonly props: readonly VuePropPlan[];
  /** Whether any prop carries a default, requiring `withDefaults`. */
  readonly requiresWithDefaults: boolean;
}

/** The `vue` bindings a plan needs. */
export interface VueRuntimeImports {
  /** Value imports (`ref`, `computed`, `watchEffect`, `onMounted`, …). */
  readonly values: readonly string[];
  /** Type-only imports (`Ref`, `ComputedRef`). */
  readonly types: readonly string[];
}

/** A slot the component renders. */
export interface VueSlotPlan {
  readonly name: string;
  readonly fallbackText?: string;
}

/** An event the component emits. */
export interface VueEventPlan {
  readonly name: string;
  readonly handlerText: string;
}

/** A `<component :is>` render target. */
export interface VueDynamicNodePlan {
  readonly expressionText: string;
}

/** A `v-for` key decision. */
export interface VueListKeyPlan {
  /** The iterated expression (`items`). */
  readonly sourceText: string;
  /** The key expression bound as `:key`, when one was inferred. */
  readonly keyText?: string;
  /** Whether the key is stable enough to keep. */
  readonly stable: boolean;
}

/** A statically-known subtree that may be hoisted. */
export interface VueStaticSubtreePlan {
  readonly start: number;
  readonly end: number;
  /** Whether the optimizer accepted the subtree for hoisting (`v-once`). */
  readonly hoisted: boolean;
}

/** The Vue target plan produced by {@link lowerVueModule}. */
export interface VueLoweredModule extends TargetLoweredModule {
  readonly framework: "vue";
  /** `useState` → `ref` declarations. */
  readonly reactiveState: readonly VueRefPlan[];
  /** State the optimizer proved never reassigned, emitted as a plain `const`. */
  readonly constantState: readonly VueRefPlan[];
  /** `useMemo` → `computed` declarations. */
  readonly computedValues: readonly VueComputedPlan[];
  /** `useEffect` → `watchEffect`/`onMounted` watchers. */
  readonly watchers: readonly VueWatcherPlan[];
  /** `useRef` → template refs. */
  readonly templateRefs: readonly VueTemplateRefPlan[];
  /** The `defineProps` shape. */
  readonly propsContract: VuePropsContract;
  /** The `vue` bindings the plan needs. */
  readonly vueImports: VueRuntimeImports;
  readonly slots: readonly VueSlotPlan[];
  readonly events: readonly VueEventPlan[];
  readonly dynamicNodes: readonly VueDynamicNodePlan[];
  readonly listKeys: readonly VueListKeyPlan[];
  /** Lists whose key could not be proven stable (recorded by the optimizer). */
  readonly unkeyedLists: readonly string[];
  readonly staticSubtrees: readonly VueStaticSubtreePlan[];
  /** Whether the component renders itself and needs the recursion helper. */
  readonly recursiveComponent: boolean;
}

/** Narrow a target plan to the Vue plan without casting. */
export function isVueLowered(
  lowered: TargetLoweredModule | undefined,
): lowered is VueLoweredModule {
  return lowered !== undefined && lowered.framework === "vue";
}

/** The resolved element type of a state intention. */
function stateType(
  type: string | undefined,
  inferred: string | undefined,
): string {
  return type ?? inferred ?? "unknown";
}

/** Whether an effect's dependency list marks it as a mount-only effect. */
function runsOnce(dependencies: readonly string[] | undefined): boolean {
  return dependencies !== undefined && dependencies.length === 0;
}

/** Whether a ref is bound to an element (and so becomes a template ref). */
function bindsElement(elementType: string | undefined): boolean {
  return (
    elementType !== undefined &&
    /\b(?:HTML|SVG)\w*Element\b|\bElement\b/.test(elementType)
  );
}

/** The `defineProps` contract lowered from the neutral prop intentions. */
function lowerProps(intentions: SemanticIntentions): VuePropsContract {
  const props: VuePropPlan[] = intentions.props
    .filter((prop) => prop.name !== "children")
    .map((prop) => ({
      name: prop.name,
      typeText: prop.type?.text ?? "unknown",
      optional: prop.optional,
      defaultText: prop.defaultValue?.text,
    }));
  return {
    parameterName: intentions.propsParameterName ?? "properties",
    typeText: intentions.propsType?.text,
    props,
    requiresWithDefaults: props.some((prop) => prop.defaultText !== undefined),
  };
}

/** The `vue` bindings the lowered declarations need, in a stable order. */
function lowerImports(
  reactiveState: readonly VueRefPlan[],
  computedValues: readonly VueComputedPlan[],
  watchers: readonly VueWatcherPlan[],
  templateRefs: readonly VueTemplateRefPlan[],
  dynamicNodes: readonly VueDynamicNodePlan[],
  slots: readonly VueSlotPlan[],
): VueRuntimeImports {
  const values: string[] = [];
  if (reactiveState.length > 0) {
    values.push("ref");
  }
  if (computedValues.length > 0) {
    values.push("computed");
  }
  for (const watcher of watchers) {
    if (watcher.runsOnce) {
      values.push("onMounted");
      if (watcher.cleanupText !== undefined) {
        values.push("onUnmounted");
      }
    } else if (watcher.dependencies === undefined) {
      values.push("watchEffect");
    } else {
      values.push("watch");
    }
  }
  for (const templateRef of templateRefs) {
    values.push(templateRef.useTemplateRef ? "useTemplateRef" : "shallowRef");
  }
  if (dynamicNodes.length > 0) {
    values.push("resolveComponent");
  }
  if (slots.length > 0) {
    values.push("useSlots");
  }
  return { values: [...new Set(values)].toSorted(), types: [] };
}

/** A static subtree span carried into the plan (not yet hoisted). */
function lowerStaticSubtree(span: SourceSpan): VueStaticSubtreePlan {
  return { start: span.start, end: span.end, hoisted: false };
}

/** Whether the component's render tree references the component itself. */
function isRecursive(ir: SemanticModule): boolean {
  const name = ir.componentName ?? ir.ast.component?.name;
  if (name === undefined || name.length === 0) {
    return false;
  }
  const pattern = new RegExp(String.raw`<${name}\b`);
  return (
    ir.ast.component?.body.some((statement) =>
      pattern.test(statement.text.text),
    ) === true
  );
}

/**
 * Lower a neutral module into the Vue target plan. The neutral module travels
 * on untouched so later phases keep full access to the IR.
 */
export function lowerVueModule(
  ir: SemanticModule,
  context: TargetContext,
): TargetIntentions {
  const { intentions } = ir;
  const reactiveState: VueRefPlan[] = intentions.state.map((state) => ({
    name: state.name,
    setterName: state.setterName,
    typeText: stateType(state.type?.text, state.inferredType),
    initializerText: state.initializer?.text,
  }));
  const computedValues: VueComputedPlan[] = intentions.memos.map((memo) => ({
    name: memo.name,
    factoryText: memo.factory.text,
    dependencies: (memo.dependencies ?? []).map(
      (dependency) => dependency.text,
    ),
  }));
  const watchers: VueWatcherPlan[] = intentions.effects.map((effect) => {
    const dependencies = effect.dependencies?.map(
      (dependency) => dependency.text,
    );
    return {
      bodyText: effect.body.text,
      cleanupText: effect.cleanup?.text,
      dependencies,
      runsOnce: runsOnce(dependencies),
    };
  });
  const templateRefs: VueTemplateRefPlan[] = intentions.refs.map((entry) => ({
    name: entry.name,
    elementTypeText: entry.elementType?.text,
    initializerText: entry.initializer?.text,
    useTemplateRef: bindsElement(entry.elementType?.text),
  }));
  const slots: VueSlotPlan[] = intentions.slots.map((slot) => ({
    name: slot.name,
    fallbackText: slot.fallback?.text,
  }));
  const events: VueEventPlan[] = intentions.events.map((event) => ({
    name: event.name,
    handlerText: event.handler.text,
  }));
  const dynamicNodes: VueDynamicNodePlan[] = intentions.dynamicNodes.map(
    (node) => ({
      expressionText: node.expression.text,
    }),
  );
  const listKeys: VueListKeyPlan[] = intentions.listKeys.map((listKey) => ({
    sourceText: listKey.source.text,
    keyText: listKey.key?.text,
    stable: listKey.stable,
  }));

  const lowered: VueLoweredModule = {
    framework: "vue",
    appliedOptimizations: [],
    reactiveState,
    constantState: [],
    computedValues,
    watchers,
    templateRefs,
    propsContract: lowerProps(intentions),
    vueImports: lowerImports(
      reactiveState,
      computedValues,
      watchers,
      templateRefs,
      dynamicNodes,
      slots,
    ),
    slots,
    events,
    dynamicNodes,
    listKeys,
    unkeyedLists: [],
    staticSubtrees: intentions.staticSubtrees.map((span) =>
      lowerStaticSubtree(span),
    ),
    recursiveComponent: isRecursive(ir),
  };

  return {
    framework: "vue",
    module: ir,
    context,
    diagnostics: ir.diagnostics,
    lowered,
  };
}
