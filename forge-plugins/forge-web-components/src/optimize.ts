/**
 * Target optimizations applied to the Web-Components plan produced by
 * `./lower`.
 *
 * Every pass is a pure plan → plan refinement, is **idempotent** (running the
 * optimizer twice yields an identical plan and an identical
 * `appliedOptimizations` list), and records its identifier only once. Passes
 * that mirror a neutral Stage-1 optimization are gated on the matching
 * {@link NeutralOptimizeOptions} flag, which — like the neutral compiler —
 * counts as enabled unless it is explicitly `false`.
 *
 * The passes run in dependency order: the field passes first (they change the
 * emitted text), then template hoisting and list-key pruning, then the runtime
 * import prune last, so it sees the final plan.
 */
import {
  isWebComponentsLowered,
  resolveRuntimeImports,
  staticTemplateName,
  UNKNOWN_TYPE,
  widenOptionalType,
  type WebComponentsLoweredModule,
  type WebComponentsReactiveProperty,
  type WebComponentsStateField,
} from "./lower.js";

import type {
  NeutralOptimizeOptions,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

/** Identifiers recorded in {@link WebComponentsLoweredModule.appliedOptimizations}. */
export const WEB_COMPONENTS_OPTIMIZATIONS = {
  /** Collapse a property and a state field that share a name; the property wins. */
  dedupeReactiveProperties: "web-components:dedupe-reactive-properties",
  /** Tighten an `unknown` field whose initializer implies a safe literal type. */
  narrowUnknownFields: "web-components:narrow-unknown-fields",
  /** Build a fully static template once, at module scope, instead of per render. */
  hoistStaticTemplateParts: "web-components:hoist-static-template-parts",
  /** Keep only the list keys Stage-1 proved stable. */
  stableListKeys: "web-components:stable-list-keys",
  /** Import only the native runtime values the final plan actually uses. */
  dropUnusedRuntimeImports: "web-components:drop-unused-runtime-imports",
} as const;

/** A recorded Web-Components optimization identifier. */
export type WebComponentsOptimization =
  (typeof WEB_COMPONENTS_OPTIMIZATIONS)[keyof typeof WEB_COMPONENTS_OPTIMIZATIONS];

/** A neutral flag counts as enabled unless it is explicitly disabled. */
function enabled(flag: boolean | undefined): boolean {
  return flag !== false;
}

/** The literal type a safe primitive initializer implies, or `undefined`. */
function literalTypeOf(text: string | undefined): string | undefined {
  const value = text?.trim();
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  if (
    /^'(?:[^\\']|\\.)*'$/.test(value) ||
    /^"(?:[^\\"]|\\.)*"$/.test(value) ||
    /^`[^$`\\]*`$/.test(value)
  ) {
    return "string";
  }
  if (/^[+-]?\d+n$/.test(value)) {
    return "bigint";
  }
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
    return "number";
  }
  if (value === "true" || value === "false") {
    return "boolean";
  }
  return undefined;
}

/**
 * Collapse duplicate reactive members.
 *
 * A neutral component may seed local state from a same-named prop, and a props
 * type may repeat a member. A class cannot declare a field twice — and a
 * duplicate `static properties` key is a hard parse error — so each name is
 * kept once: the first declaration in source order wins, upgraded to the first
 * *declared* type found for that name, and a property always beats a state
 * cell (the external input is the source of truth).
 */
function dedupeReactiveProperties(
  plan: WebComponentsLoweredModule,
): WebComponentsLoweredModule {
  const properties = new Map<string, WebComponentsReactiveProperty>();
  for (const property of plan.reactiveProperties) {
    const kept = properties.get(property.name);
    if (kept === undefined) {
      properties.set(property.name, property);
      continue;
    }
    if (!kept.declared && property.declared) {
      properties.set(property.name, {
        ...kept,
        type: property.type,
        declared: true,
      });
    }
  }

  const stateFields = new Map<string, WebComponentsStateField>();
  for (const field of plan.stateFields) {
    if (properties.has(field.name)) {
      continue;
    }
    const kept = stateFields.get(field.name);
    if (kept === undefined) {
      stateFields.set(field.name, field);
      continue;
    }
    if (!kept.declared && field.declared) {
      stateFields.set(field.name, {
        ...kept,
        type: field.type,
        declared: true,
      });
    }
  }

  return {
    ...plan,
    reactiveProperties: [...properties.values()],
    stateFields: [...stateFields.values()],
  };
}

/**
 * Tighten a field that fell back to `unknown` but whose initializer (a state
 * cell's seed, a prop's default) is a primitive literal. A declared type is
 * never touched, so this can only narrow, and the inferred types are limited to
 * `string` / `number` / `boolean` / `bigint` — never `any`.
 */
function narrowUnknownFields(
  plan: WebComponentsLoweredModule,
): WebComponentsLoweredModule {
  const reactiveProperties = plan.reactiveProperties.map((property) => {
    if (property.declared || property.type !== UNKNOWN_TYPE) {
      return property;
    }
    const literal = literalTypeOf(property.defaultValue);
    if (literal === undefined) {
      return property;
    }
    return {
      ...property,
      type: property.optional ? widenOptionalType(literal) : literal,
    };
  });

  const stateFields = plan.stateFields.map((field) => {
    if (field.declared || field.type !== UNKNOWN_TYPE) {
      return field;
    }
    const literal = literalTypeOf(field.initializer);
    return literal === undefined ? field : { ...field, type: literal };
  });

  return { ...plan, reactiveProperties, stateFields };
}

/**
 * Hoist a fully static template out of `render()`. Stage-1 marks a static
 * subtree, so a marked root whose render head is empty depends on nothing and
 * can be built once as a module-level constant.
 */
function hoistStaticTemplateParts(
  plan: WebComponentsLoweredModule,
): WebComponentsLoweredModule {
  const { template } = plan;
  if (
    !template.staticRoot ||
    template.head.length > 0 ||
    !template.dom.hot ||
    template.hoisted.length > 0
  ) {
    return plan;
  }
  return {
    ...plan,
    template: {
      ...template,
      hoisted: [{ name: staticTemplateName(0), template: template.dom.create }],
    },
  };
}

/** Keep only the list keys Stage-1 proved stable; an unstable key is worse than none. */
function stableListKeys(
  plan: WebComponentsLoweredModule,
): WebComponentsLoweredModule {
  const listKeys = plan.listKeys.filter((listKey) => listKey.stable);
  return listKeys.length === plan.listKeys.length
    ? plan
    : { ...plan, listKeys };
}

/** Import only the native runtime values and local JSX types the final plan uses. */
function dropUnusedRuntimeImports(
  plan: WebComponentsLoweredModule,
): WebComponentsLoweredModule {
  return { ...plan, runtimeImports: resolveRuntimeImports(plan) };
}

/** One optimization pass and the neutral flag that gates it. */
interface OptimizationPass {
  readonly id: WebComponentsOptimization;
  readonly gate: (neutral: NeutralOptimizeOptions) => boolean;
  readonly run: (
    plan: WebComponentsLoweredModule,
  ) => WebComponentsLoweredModule;
}

const PASSES: readonly OptimizationPass[] = [
  {
    id: WEB_COMPONENTS_OPTIMIZATIONS.dedupeReactiveProperties,
    gate: () => true,
    run: dedupeReactiveProperties,
  },
  {
    id: WEB_COMPONENTS_OPTIMIZATIONS.narrowUnknownFields,
    gate: () => true,
    run: narrowUnknownFields,
  },
  {
    id: WEB_COMPONENTS_OPTIMIZATIONS.hoistStaticTemplateParts,
    gate: (neutral) => enabled(neutral.staticMarking),
    run: hoistStaticTemplateParts,
  },
  {
    id: WEB_COMPONENTS_OPTIMIZATIONS.stableListKeys,
    gate: (neutral) => enabled(neutral.stableKeyInference),
    run: stableListKeys,
  },
  {
    id: WEB_COMPONENTS_OPTIMIZATIONS.dropUnusedRuntimeImports,
    gate: () => true,
    run: dropUnusedRuntimeImports,
  },
];

/** Refine a lowered Web-Components plan, recording each pass that ran. */
export function optimizeWebComponentsPlan(
  plan: WebComponentsLoweredModule,
  options: TargetOptimizeOptions,
): WebComponentsLoweredModule {
  const applied = new Set<string>(plan.appliedOptimizations);
  let optimized = plan;
  for (const pass of PASSES) {
    if (!pass.gate(options.neutral)) {
      continue;
    }
    optimized = pass.run(optimized);
    applied.add(pass.id);
  }
  return { ...optimized, appliedOptimizations: [...applied] };
}

/** Optimize the Web-Components target intentions; other targets pass through. */
export function optimizeWebComponentsModule(
  intentions: TargetIntentions,
  options: TargetOptimizeOptions,
): TargetIntentions {
  const { lowered } = intentions;
  if (!isWebComponentsLowered(lowered)) {
    return intentions;
  }
  return {
    ...intentions,
    lowered: optimizeWebComponentsPlan(lowered, options),
  };
}
