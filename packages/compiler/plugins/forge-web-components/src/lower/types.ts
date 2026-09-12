import type {
  GenericRenderNode,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";
import type { DomTemplateSource } from "../transformers/template.js";

/** The plugin's framework ID, and the discriminator of its lowered plan. */
export const WEB_COMPONENTS_FRAMEWORK = "web-components";

/** The type emitted when neither a declared nor an inferred type is available. */
export const UNKNOWN_TYPE = "unknown";

/** The local JSX element/child type names a generated module can reference. */
export const LOCAL_ELEMENT_TYPES = ["MpElement", "MpChild"] as const;

/** A `ForgeElement` reactive-property descriptor, mirroring the native runtime's contract. */
export interface WebComponentsPropertyDeclaration {
  /** When `true`, the member is internal render state and observes no attribute. */
  readonly state?: boolean;
}

/** A reactive **property**: an externally settable input mirrored from an attribute. */
export interface WebComponentsReactiveProperty {
  readonly name: string;
  /** The observed attribute — the runtime lower-cases every non-state property name. */
  readonly attribute: string;
  /** Fully resolved type text; never `any`, `unknown` only as a last resort. */
  readonly type: string;
  readonly optional: boolean;
  /** Whether {@link type} came from a declared prop type rather than the fallback. */
  readonly declared: boolean;
  /**
   * Whether the name is already an `HTMLElement` member the element inherits, in
   * which case the class declares no field of its own.
   */
  readonly inherited: boolean;
  readonly defaultValue?: string;
  readonly declaration: WebComponentsPropertyDeclaration;
}

/** A reactive **state** field: an internal cell whose setter re-renders the element. */
export interface WebComponentsStateField {
  readonly name: string;
  readonly setterName?: string;
  /** Fully resolved type text; never `any`, `unknown` only as a last resort. */
  readonly type: string;
  /** Whether {@link type} came from a declared or inferred type rather than the fallback. */
  readonly declared: boolean;
  readonly initializer?: string;
  /**
   * Whether {@link initializer} runs in the element's one-time `setup()` rather
   * than in its constructor, because it reads a value only the render body has.
   */
  readonly deferred: boolean;
  readonly declaration: WebComponentsPropertyDeclaration;
}

/**
 * The body of a derived getter, already rewritten into element-instance scope:
 * a concise memo factory returns a single expression, a block-bodied one brings
 * its own statements (which the getter must run rather than return).
 */
export type WebComponentsDerivedBody =
  | { readonly kind: "expression"; readonly expression: string }
  | { readonly kind: "block"; readonly statements: readonly string[] };

/** A memoized value, lowered to a getter backed by an optional instance cache. */
export interface WebComponentsDerivedValue {
  readonly name: string;
  readonly body: WebComponentsDerivedBody;
  /** Omitted when the source omitted dependencies, preserving recomputation. */
  readonly dependencies?: readonly string[];
}

/**
 * A render-head constant **promoted** to an element member.
 *
 * A memo getter, a lifecycle callback and a field initializer are all emitted
 * *outside* `render()`, so a local the render head declares does not exist for
 * them. Promoting the declaration to a member is what makes such a read
 * resolvable — through `this.<name>` — instead of dangling.
 */
export interface WebComponentsPromotedLocal {
  readonly name: string;
  /**
   * `field` — a **function** value, assigned once so its identity is stable;
   * `getter` — a pure derivation, recomputed on every read so it always reflects
   * the element's current property values.
   */
  readonly kind: "field" | "getter";
  /** The rewritten initializer text. */
  readonly expression: string;
  /** Statements a getter runs before returning (a replayed props pattern). */
  readonly statements: readonly string[];
}

/** A neutral `useId()` binding, lowered to an instance field seeded once per element. */
export interface WebComponentsGeneratedId {
  readonly name: string;
  /** The type of the generated id — always the runtime's `string`. */
  readonly type: string;
}

/** A `useRef` binding, lowered to a `{ current }` cell held by the element. */
export interface WebComponentsElementRef {
  readonly name: string;
  /** The type of `current`; never `any`. */
  readonly elementType: string;
  readonly initializer: string;
  /** Whether the cell is created in `setup()` rather than in the constructor. */
  readonly deferred: boolean;
}

/**
 * The element's one-time **setup** phase.
 */
export interface WebComponentsSetupPhase {
  /** Render-head statements replayed before the deferred seeds, in head order. */
  readonly replay: readonly string[];
}

/** A private field retaining an effect's cleanup function between lifecycle callbacks. */
export interface WebComponentsCleanupField {
  readonly name: string;
  readonly type: string;
}

/** The custom-element lifecycle callbacks a plan can generate. */
export type WebComponentsLifecycleCallback =
  "connectedCallback" | "disconnectedCallback" | "updatedCallback";

/** One generated lifecycle callback and the statements it runs. */
export interface WebComponentsLifecycleHook {
  readonly callback: WebComponentsLifecycleCallback;
  /** Whether `ForgeElement` implements the callback, so the body must chain `super`. */
  readonly callsSuper: boolean;
  readonly statements: readonly string[];
}

/** A fully static template chunk hoisted to a module-level constant. */
export interface WebComponentsStaticTemplatePart {
  readonly name: string;
  readonly template: string;
}

/** The lowered `render()` plan: its head statements and its lit-html template. */
export interface WebComponentsTemplatePlan {
  /** The lit-html template text, without its enclosing `html\`…\``. */
  readonly template: string;
  /** Direct-DOM factory and typed values emitted for generated JSX. */
  readonly dom: DomTemplateSource;
  /** Render-head statements, already lowered and scoped to the element instance. */
  readonly head: readonly string[];
  /** Whether Stage-1 marked the returned tree as fully static. */
  readonly staticRoot: boolean;
  /** Static chunks hoisted out of `render()` (populated by the optimizer). */
  readonly hoisted: readonly WebComponentsStaticTemplatePart[];
}

/** A list-rendering key candidate retained for the target's list output. */
export interface WebComponentsListKey {
  readonly source: string;
  readonly key?: string;
  readonly stable: boolean;
}

/** The imports a generated element module needs. */
export interface WebComponentsRuntimeImports {
  /** Values imported from `@mission-platform/forge-adapters/web-components`. */
  readonly values: readonly string[];
  /** Types imported from `@mission-platform/forge-adapters/web-components`. */
  readonly types: readonly string[];
  /** Local JSX type names imported from the co-located `./mp-jsx-types` module. */
  readonly localTypes: readonly string[];
}

/** The host form used by a generated custom element. */
export type WebComponentsHostKind = "customized-built-in" | "autonomous";

/** Stable reasons why a component cannot use a customized built-in host. */
export type WebComponentsHostFallbackReason =
  | "missing-root"
  | "fragment-root"
  | "dynamic-root"
  | "component-root"
  | "ambiguous-root"
  | "invalid-root"
  | "unsupported-root";

/** The `customElements.define` options emitted for a customized built-in. */
export interface WebComponentsRegistrationOptions {
  readonly extends: string;
}

/** Host selection and invocation metadata for a generated component. */
export interface WebComponentsHostPlan {
  readonly kind: WebComponentsHostKind;
  /** The intrinsic tag used as the native base, when one was selected. */
  readonly baseTag?: string;
  /** The constructor expression used by the generated class. */
  readonly constructorExpression: string;
  /** The `extends` value passed to `customElements.define`, when applicable. */
  readonly registrationExtends?: string;
  /** The complete registration options, when the host is customized-built-in. */
  readonly registrationOptions?: WebComponentsRegistrationOptions;
  /** How references to this component are represented in generated templates. */
  readonly invocation: "is-attribute" | "custom-tag";
  /** Stable explanation for an autonomous fallback. */
  readonly fallbackReason?: WebComponentsHostFallbackReason;
}

/** Typed shadow-root policy retained by the target plan. */
export interface WebComponentsShadowPolicy {
  readonly mode: "open" | "closed";
  readonly delegatesFocus?: boolean;
  readonly serializable?: boolean;
  readonly clonable?: boolean;
  readonly slotAssignment?: "named" | "manual";
}

/** ElementInternals capabilities requested by a generated component. */
export interface WebComponentsInternalsPolicy {
  readonly attach: boolean;
  readonly aria?: Readonly<Record<string, string>>;
  readonly formAssociated?: boolean;
  readonly formValue?: string;
}

/** The compatibility table for roots that can safely be customized built-ins. */
export const WEBCOMPONENTS_NATIVE_HOSTS = {
  div: "HTMLDivElement",
  span: "HTMLSpanElement",
  p: "HTMLParagraphElement",
  h1: "HTMLHeadingElement",
  h2: "HTMLHeadingElement",
  h3: "HTMLHeadingElement",
  h4: "HTMLHeadingElement",
  h5: "HTMLHeadingElement",
  h6: "HTMLHeadingElement",
} as const satisfies Readonly<Record<string, string>>;

/** Compatibility defaults preserved for generated components. */
export const DEFAULT_WEBCOMPONENTS_SHADOW_POLICY: WebComponentsShadowPolicy = {
  mode: "open",
};

/** Internals are capability-gated by the runtime; form association stays opt-in. */
export const DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY: WebComponentsInternalsPolicy =
  {
    attach: true,
  };

/** Optimization records applied to a plan. */
export type WebComponentsAppliedOptimization = string;

/** The Web-Components target plan produced by `lower` and refined by `optimize`. */
export interface WebComponentsLoweredModule extends TargetLoweredModule {
  readonly framework: typeof WEB_COMPONENTS_FRAMEWORK;
  readonly host: WebComponentsHostPlan;
  readonly shadow: WebComponentsShadowPolicy;
  readonly internals: WebComponentsInternalsPolicy;
  /** The registered custom-element tag (`ForgeInView` → `forge-in-view`). */
  readonly tagName: string;
  /** The generated class name (`ForgeInView` → `ForgeInViewElement`). */
  readonly className: string;
  /** Source-relative CSS sidecar URLs used by the generated element's shadow root. */
  readonly styleUrls: readonly string[];
  readonly reactiveProperties: readonly WebComponentsReactiveProperty[];
  readonly stateFields: readonly WebComponentsStateField[];
  readonly derived: readonly WebComponentsDerivedValue[];
  /** Render-head constants promoted to members so a lifted scope can read them. */
  readonly promotedLocals: readonly WebComponentsPromotedLocal[];
  readonly generatedIds: readonly WebComponentsGeneratedId[];
  readonly elementRefs: readonly WebComponentsElementRef[];
  readonly cleanupFields: readonly WebComponentsCleanupField[];
  /** The statements replayed by `setup()` for the seeds deferred out of the constructor. */
  readonly setup: WebComponentsSetupPhase;
  readonly lifecycle: readonly WebComponentsLifecycleHook[];
  readonly template: WebComponentsTemplatePlan;
  readonly listKeys: readonly WebComponentsListKey[];
  readonly runtimeImports: WebComponentsRuntimeImports;
  /** Module-level declarations kept beside the class, already lowered. */
  readonly retainedDeclarations: readonly string[];
  readonly appliedOptimizations: readonly string[];
}

/** Narrow a target plan to the Web-Components plan without casting. */
export function isWebComponentsLowered(
  lowered: TargetLoweredModule | undefined,
): lowered is WebComponentsLoweredModule {
  return lowered?.framework === WEB_COMPONENTS_FRAMEWORK;
}
