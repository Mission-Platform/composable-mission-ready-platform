/**
 * Neutral IR → Web-Components **target plan**.
 *
 * `lower` is where the neutral facts a component states (props, state cells,
 * memos, effects, refs, its render tree) are translated into the custom-element
 * decisions the emitters print: the tag name, the reactive property/state
 * fields *with their resolved TypeScript types*, derived getters, lifecycle
 * callbacks, element refs, the lit-html template, and the exact runtime imports
 * the plan needs.
 *
 * Type resolution lives here rather than in the emitter so a target field is
 * typed once, from the neutral contract, and every later phase (optimization,
 * emission, tests) reads the same answer:
 * - a reactive property is annotated against the component's **own props type**
 *   when its parameter names one that the module retains —
 *   `variant: ButtonProperties['variant']` — which is exact and follows the
 *   interface as it changes (see `./transformers/props-type`),
 * - otherwise it takes its {@link PropIntention.type} text, widened with
 *   `| undefined` when the prop is optional,
 * - a state field takes its {@link StateIntention.type} text, else its
 *   literal-derived {@link StateIntention.inferredType},
 * - `unknown` is the only fallback — a lowered plan never contains `any`.
 *
 * The plan is a plain data record discriminated on
 * {@link WebComponentsLoweredModule.framework}, so `generate` narrows it with
 * {@link isWebComponentsLowered} instead of casting.
 */
import {
  createCompilerDiagnostic,
  walkRenderNodes,
} from "@mission-platform/forge-plugin-api";
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";

import {
  type ElementScope,
  HAS_SLOT_RUNTIME,
  isFunctionExpressionText,
  isPureExpressionText,
  matchingBracket,
  MODULE_SCOPE,
  rewriteExpressionText,
  splitArrowFactoryBody,
  splitTopLevel,
  topLevelAssignmentIndex,
} from "./transformers/expression.js";
import {
  leadingObjectPattern,
  parsePropsBinding,
  type PropsBinding,
  propsBindingStatement,
} from "./transformers/props-binding.js";
import {
  indexedAccessType,
  resolvePropsTypeReference,
  type PropsTypeReference,
} from "./transformers/props-type.js";
import {
  kebabCase,
  lowerStatementText,
  renderNodeToTemplate,
  type TemplateContext,
} from "./transformers/template.js";

import type {
  CompilerDiagnostic,
  GenericComponent,
  GenericRenderNode,
  GenericStatement,
  PropIntention,
  SemanticModule,
  StateIntention,
  TargetContext,
  TargetIntentions,
  TargetLoweredModule,
} from "@mission-platform/forge-plugin-api";

/** The plugin's framework ID, and the discriminator of its lowered plan. */
export const WEB_COMPONENTS_FRAMEWORK = "web-components";

/** The type emitted when neither a declared nor an inferred type is available. */
export const UNKNOWN_TYPE = "unknown";

/** The type an optional property or an unseeded state cell is widened with. */
const UNDEFINED_TYPE = "undefined";

/** The default props parameter name when the component declares none. */
const DEFAULT_PROPS_PARAMETER = "properties";

/** The neutral prop that is rendered through slots rather than declared on the element. */
const SLOTTED_PROP = "children";

/** Hook variable declarations that are lifted out of `render()` into element members. */
const LIFTED_HOOK_DECLARATION = /\buse(?:State|Ref|Memo)\s*[(<]/;

/** Hook expression statements that become lifecycle callbacks. */
const LIFTED_HOOK_EFFECT = /\buseEffect\s*\(/;

/**
 * A neutral `const <name> = useId();` declaration, lifted out of `render()`.
 *
 * The native runtime's {@link useId} hands out a document-unique id per call,
 * so it must run **once per element instance** rather than on every render —
 * the declaration therefore becomes an instance field, not a render-head
 * statement. Anything more elaborate than this shape is left in the head.
 */
const GENERATED_ID_DECLARATION =
  /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*useId\s*\(\s*\)\s*;?$/;

/** The native runtime values a generated element module can import, in header order. */
const RUNTIME_VALUES = [
  "ForgeElement",
  "html",
  "nothing",
  HAS_SLOT_RUNTIME,
  "unsafeHtml",
  "useId",
] as const;

/** The native runtime **types** a generated element module can import. */
const RUNTIME_PROPERTY_DECLARATION_TYPE = "PropertyDeclaration";

/**
 * Runtime values every generated element module imports, whatever it renders.
 *
 * `ForgeElement` and `html` are structural (the class extends one and `render()`
 * returns the other), and `nothing` is the target's header contract: it is the
 * sentinel every absent binding lowers to, so the native header is always
 * `import { ForgeElement, html, nothing } from '@mission-platform/forge/web-components';`.
 * Only `unsafeHtml` — needed exclusively by a raw-HTML hole — is pruned when unused.
 */
const STRUCTURAL_RUNTIME_VALUES: ReadonlySet<string> = new Set([
  "ForgeElement",
  "html",
  "nothing",
]);

/** The local JSX element/child type names a generated module can reference. */
export const LOCAL_ELEMENT_TYPES = ["MpElement", "MpChild"] as const;

/** The name of the module-level constant a hoisted static template is bound to. */
const STATIC_TEMPLATE_PREFIX = "__mpStaticTpl";

/** The name of the field an effect's cleanup function is retained in. */
const CLEANUP_FIELD_PREFIX = "__mpCleanup";

/** The type of a retained effect cleanup function. */
const CLEANUP_FIELD_TYPE = "(() => void) | undefined";

/** Diagnostic emitted for a render node whose tag is computed at runtime. */
const DYNAMIC_TAG_DIAGNOSTIC = "FORGE_WC_DYNAMIC_TAG_UNSUPPORTED";

/** Diagnostic emitted for a `{...spread}` binding, which lit-html cannot express. */
const SPREAD_ATTRIBUTE_DIAGNOSTIC = "FORGE_WC_SPREAD_ATTRIBUTE_UNSUPPORTED";

/** A `const { … } = <propsParameter>;` statement, capturing its pattern and source object. */
const PROPS_DESTRUCTURING =
  /^(?:const|let|var)\s+(\{[\S\s]*\})\s*=\s*([A-Za-z_$][\w$]*)\s*;?$/;

/**
 * Property names an element already inherits from `HTMLElement` (or `Element` /
 * `Node`), for which the generated class declares **no field of its own**.
 *
 * A subclass member must stay assignable to the base's, so re-declaring `id` as
 * `ButtonProperties['id']` (i.e. `string | undefined`) against the inherited
 * `id: string` is an error. Omitting the declaration is the sound resolution:
 * the inherited member already supplies a type, the name stays in
 * `static properties` so the runtime installs its reactive accessor exactly as
 * before — the generated runtime behaviour is byte-identical — and reads such as
 * `this.id` keep working.
 *
 * The set is matched by exact name, never by prefix: a component may legitimately
 * declare `ariaLabelMax`, which is *not* a DOM member and must keep its own
 * typed field.
 */
const INHERITED_ELEMENT_MEMBERS: ReadonlySet<string> = new Set([
  // Node / Element
  "className",
  "id",
  "innerHTML",
  "nodeValue",
  "outerHTML",
  "role",
  "scrollLeft",
  "scrollTop",
  "slot",
  "textContent",
  // HTMLElement
  "accessKey",
  "autocapitalize",
  "autofocus",
  "contentEditable",
  "dir",
  "draggable",
  "enterKeyHint",
  "hidden",
  "inert",
  "innerText",
  "inputMode",
  "lang",
  "nonce",
  "outerText",
  "popover",
  "spellcheck",
  "style",
  "tabIndex",
  "title",
  "translate",
  "writingSuggestions",
  // ARIAMixin — the exact member names only
  "ariaAtomic",
  "ariaAutoComplete",
  "ariaBusy",
  "ariaChecked",
  "ariaColCount",
  "ariaColIndex",
  "ariaColSpan",
  "ariaCurrent",
  "ariaDescription",
  "ariaDisabled",
  "ariaExpanded",
  "ariaHasPopup",
  "ariaHidden",
  "ariaKeyShortcuts",
  "ariaLabel",
  "ariaLevel",
  "ariaLive",
  "ariaModal",
  "ariaMultiLine",
  "ariaMultiSelectable",
  "ariaOrientation",
  "ariaPlaceholder",
  "ariaPosInSet",
  "ariaPressed",
  "ariaReadOnly",
  "ariaRelevant",
  "ariaRequired",
  "ariaRoleDescription",
  "ariaRowCount",
  "ariaRowIndex",
  "ariaRowSpan",
  "ariaSelected",
  "ariaSetSize",
  "ariaSort",
  "ariaValueMax",
  "ariaValueMin",
  "ariaValueNow",
  "ariaValueText",
]);

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
   * which case the class declares no field of its own (see
   * {@link INHERITED_ELEMENT_MEMBERS}).
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
   * than in its constructor, because it reads a value only the render body has
   * (see {@link WebComponentsSetupPhase}).
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

/** A memoized value, lowered to a getter recomputed on read. */
export interface WebComponentsDerivedValue {
  readonly name: string;
  readonly body: WebComponentsDerivedBody;
  readonly dependencies: readonly string[];
}

/**
 * A render-head constant **promoted** to an element member.
 *
 * A memo getter, a lifecycle callback and a field initializer are all emitted
 * *outside* `render()`, so a local the render head declares does not exist for
 * them. Promoting the declaration to a member is what makes such a read
 * resolvable — through `this.<name>` — instead of dangling.
 *
 * Only a provably effect-free declaration is promoted (see
 * {@link promotedHeadLocals}); anything else stays in `render()`.
 */
export interface WebComponentsPromotedLocal {
  readonly name: string;
  /**
   * `field` — a **function** value, assigned once so its identity is stable
   * (an `addEventListener` / `removeEventListener` pair must see the same
   * function); `getter` — a pure derivation, recomputed on every read so it
   * always reflects the element's current property values.
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
 *
 * A seed such as `useState(parseTime(modelValue))` reads a reactive property, and
 * a property only holds a value once the host's attributes have been adopted —
 * which happens on connection, long after the constructor has run. Worse, the
 * value is usually reached through a render-head constant (`const initial =
 * parseTime(modelValue);`) that could not be proved effect-free and therefore
 * stays in `render()`, so a constructor seed would reference a name that does
 * not exist there at all.
 *
 * Such a seed is deferred to `ForgeElement.setup()`, which the runtime calls
 * after attribute adoption and before the first render, exactly once per element
 * — a reconnect must not re-seed and discard what the user has since changed.
 * The head statements the seed needs are replayed there first, in head order and
 * transitively closed, and **only** those.
 *
 * Replaying rather than caching is deliberate. In the neutral source the head
 * *is* the component body, so `const initial = parseTime(modelValue);` already
 * runs on every render; evaluating it once more during setup performs no call
 * the authored component does not already perform on each pass. Caching it in a
 * field would instead *reduce* the number of evaluations and give the value an
 * identity the source never promised. Only a plain `const` (or a function)
 * declaration is ever replayed — see {@link headReplay}.
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
  "connectedCallback" | "disconnectedCallback";

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
  /** Values imported from `@mission-platform/forge/web-components`. */
  readonly values: readonly string[];
  /** Types imported from `@mission-platform/forge/web-components` (`PropertyDeclaration`). */
  readonly types: readonly string[];
  /** Local JSX type names imported from the co-located `./mp-jsx-types` module. */
  readonly localTypes: readonly string[];
}

/** The Web-Components target plan produced by `lower` and refined by `optimize`. */
export interface WebComponentsLoweredModule extends TargetLoweredModule {
  readonly framework: typeof WEB_COMPONENTS_FRAMEWORK;
  /** The registered custom-element tag (`ForgeInView` → `forge-in-view`). */
  readonly tagName: string;
  /** The generated class name (`ForgeInView` → `ForgeInViewElement`). */
  readonly className: string;
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

/** Escape a name for embedding in a regular expression. */
function escapeForPattern(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Whether the given text references the bare identifier `name`. */
export function referencesIdentifier(text: string, name: string): boolean {
  return new RegExp(
    String.raw`(?<![\w$])${escapeForPattern(name)}(?![\w$])`,
  ).test(text);
}

/**
 * Whether the text reads `name` as a **scope** identifier rather than as the
 * member name of something else.
 *
 * `modelValue?.format` reads `modelValue`, not `format`, so a local called
 * `format` is neither needed by that text nor blocked by it. The distinction
 * matters for {@link promotedHeadLocals}, which would otherwise refuse to promote
 * a derivation whose members happen to share a name with a render-head local.
 */
function referencesLocal(text: string, name: string): boolean {
  const pattern = new RegExp(
    String.raw`(?<![\w$])${escapeForPattern(name)}(?![\w$])`,
    "g",
  );
  for (const match of text.matchAll(pattern)) {
    const before = text.slice(0, match.index).trimEnd();
    // `a.b` / `a?.b` — but `...b` is a spread of `b`, which *is* a read.
    if (!before.endsWith(".") || before.endsWith("..")) {
      return true;
    }
  }
  return false;
}

/** Every `<propsParameter>.<name>` member read found in the given source texts. */
function collectPropertyReads(
  propsParameterName: string,
  texts: readonly string[],
): string[] {
  const pattern = new RegExp(
    String.raw`(?<![\w$.])${escapeForPattern(propsParameterName)}\s*\??\.\s*([A-Za-z_$][\w$]*)`,
    "g",
  );
  const names: string[] = [];
  for (const text of texts) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined) {
        names.push(name);
      }
    }
  }
  return names;
}

/** Every expression text carried by a render tree's attributes and interpolated children. */
function collectRenderExpressionTexts(
  nodes: readonly GenericRenderNode[],
): string[] {
  const texts: string[] = [];
  walkRenderNodes(nodes, (node) => {
    if (typeof node.tag !== "string") {
      texts.push(node.tag.text);
    }
    for (const attribute of node.attributes) {
      if (attribute.kind === "jsx-spread-attribute") {
        texts.push(attribute.expression.text);
        continue;
      }
      if (
        attribute.value?.kind === "expression" &&
        attribute.value.expression !== undefined
      ) {
        texts.push(attribute.value.expression.text);
      }
    }
    for (const child of node.children) {
      if (child.kind === "expression-node" && child.expression !== undefined) {
        texts.push(child.expression.text);
      }
    }
  });
  return texts;
}

/** Whether a component-body statement is a hook lifted into a field or lifecycle callback. */
function isHookStatement(statement: GenericStatement): boolean {
  const text = statement.text.text;
  if (statement.statementKind === "variable") {
    return (
      LIFTED_HOOK_DECLARATION.test(text) ||
      generatedIdName(statement) !== undefined
    );
  }
  return (
    statement.statementKind === "expression" && LIFTED_HOOK_EFFECT.test(text)
  );
}

/** The name a `const <name> = useId();` statement binds, when it has that exact shape. */
function generatedIdName(statement: GenericStatement): string | undefined {
  if (statement.statementKind !== "variable") {
    return undefined;
  }
  return GENERATED_ID_DECLARATION.exec(statement.text.text.trim())?.[1];
}

/** Lower every `const <name> = useId();` in the component body into an instance field. */
function loweredGeneratedIds(
  component: GenericComponent,
): WebComponentsGeneratedId[] {
  const ids: WebComponentsGeneratedId[] = [];
  for (const statement of component.body) {
    const name = generatedIdName(statement);
    if (name !== undefined) {
      ids.push({ name, type: "string" });
    }
  }
  return ids;
}

/** Whether a component-body statement is a pure no-op (`void x;`, empty) that never affects render. */
function isNoOpStatement(statement: GenericStatement): boolean {
  const text = statement.text.text.trim();
  if (text.length === 0 || text === ";") {
    return true;
  }
  return statement.statementKind === "expression" && /^void\b/.test(text);
}

/**
 * The reactive property names of a component: declared props, the members of
 * every props destructuring, plus discovered `properties.x` reads.
 *
 * The destructured members matter because the neutral frontend only reports a
 * prop the *parameter* declares — a component that takes a whole props object
 * and destructures it in its body declares none, and used to produce an element
 * class with no properties at all.
 */
function reactivePropertyNames(
  component: GenericComponent,
  props: readonly PropIntention[],
  propsParameterName: string,
  bindings: readonly PropsBindingSite[],
): string[] {
  const names = new Set<string>(props.map((prop) => prop.name));
  for (const site of bindings) {
    for (const member of site.binding.members) {
      names.add(member);
    }
  }
  const texts = [
    ...component.body.map((statement) => statement.text.text),
    ...collectRenderExpressionTexts(
      component.returnNode === undefined ? [] : [component.returnNode],
    ),
  ];
  for (const name of collectPropertyReads(propsParameterName, texts)) {
    names.add(name);
  }
  names.delete(SLOTTED_PROP);
  return [...names];
}

/** A props object pattern, and where the component states it. */
interface PropsBindingSite {
  readonly binding: PropsBinding;
  /**
   * `true` when the pattern is the component's parameter. A body pattern already
   * survives into the render head as a statement (rewritten to `= this`), but a
   * parameter one has no statement, so the head has to be given one.
   */
  readonly fromParameter: boolean;
}

/** Every props object pattern the component destructures, parameter first. */
function propsBindingSites(
  component: GenericComponent,
  propsParameterName: string,
): PropsBindingSite[] {
  const sites: PropsBindingSite[] = [];
  const { parameter } = component;
  if (parameter?.binding === "object-pattern") {
    const pattern = leadingObjectPattern(parameter.text);
    const binding =
      pattern === undefined ? undefined : parsePropsBinding(pattern);
    if (binding !== undefined) {
      sites.push({ binding, fromParameter: true });
    }
  }
  for (const statement of component.body) {
    if (statement.statementKind !== "variable") {
      continue;
    }
    const match = PROPS_DESTRUCTURING.exec(statement.text.text.trim());
    if (match?.[2] !== propsParameterName) {
      continue;
    }
    const binding = parsePropsBinding(match[1] ?? "");
    if (binding !== undefined) {
      sites.push({ binding, fromParameter: false });
    }
  }
  return sites;
}

/**
 * Replay the props patterns a lifted scope reads as `const { … } = this;`.
 *
 * A memo getter and a lifecycle callback are lifted *out* of the render body, so
 * the locals the pattern bound there no longer exist. Re-stating the pattern
 * against the element restores them with their original defaults, which is why
 * the reads themselves are left bare rather than rewritten to `this.<member>`.
 */
function replayedPropsBindings(
  sites: readonly PropsBindingSite[],
  texts: readonly string[],
): string[] {
  const isRead = (name: string): boolean =>
    texts.some((text) => referencesIdentifier(text, name));
  return sites.flatMap((site) => {
    const statement = propsBindingStatement(site.binding, isRead);
    return statement === undefined ? [] : [statement];
  });
}

/**
 * The alias map for a **field-initializer** position.
 *
 * A class field initializer has no statement slot in front of it, so a props
 * pattern cannot be replayed there — `useRef(clamp(modelValue, min, max))`
 * lowers to a field whose initializer still reads the pattern's locals. Each
 * single-name entry therefore maps to its member read with the default folded
 * in, which is the one place the default has to be inlined rather than replayed.
 *
 * A nested pattern names no single member, so it is left out: it keeps the
 * previous behaviour instead of being lowered to something untrue.
 *
 * The member is read as `this['name']` rather than `this.name`: a reactive
 * property is a declaration-only field (the runtime owns its accessor), and
 * TypeScript reports `TS2729 — used before its initialization` for *any* such
 * field read from a field initializer, however early it is declared. Element
 * access carries the identical indexed-access type and no such flow assertion.
 */
function fieldInitializerAliases(
  sites: readonly PropsBindingSite[],
): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const site of sites) {
    for (const entry of site.binding.entries) {
      const local = entry.locals.length === 1 ? entry.locals[0] : undefined;
      if (
        entry.member === undefined ||
        local === undefined ||
        aliases.has(local)
      ) {
        continue;
      }
      const read = `this['${entry.member}']`;
      aliases.set(
        local,
        entry.defaultValue === undefined
          ? read
          : `(${read} ?? ${entry.defaultValue})`,
      );
    }
  }
  return aliases;
}

/**
 * The default a props pattern applies to `member`, when one of them does.
 *
 * It is recorded on the plan (never as a field initializer, which would shadow
 * the runtime's reactive accessor) so `./optimize` can still narrow a property
 * that resolved to `unknown` but is defaulted to a literal.
 */
function bindingDefaultOf(
  sites: readonly PropsBindingSite[],
  member: string,
): string | undefined {
  for (const site of sites) {
    for (const entry of site.binding.entries) {
      if (entry.member === member && entry.defaultValue !== undefined) {
        return entry.defaultValue;
      }
    }
  }
  return undefined;
}

/**
 * The `const <name> = <initializer>;` a render-head statement declares, when it
 * has exactly that shape.
 *
 * A single `const` declarator binding one plain name is the only form that can
 * be promoted: `let`/`var` may be reassigned later in the head, a destructuring
 * binds several names at once, and a multi-declarator statement would have to be
 * split. The top-level `=` is found with {@link topLevelAssignmentIndex}, so a
 * function-typed annotation's `=>` is not mistaken for it.
 */
function headConstant(
  statement: GenericStatement,
): { name: string; initializer: string } | undefined {
  const text = statement.text.text.trim();
  const keyword = /^const\s+/.exec(text);
  if (statement.statementKind !== "variable" || keyword === null) {
    return undefined;
  }
  const body = text.slice(keyword[0].length).replace(/;$/, "");
  if (splitTopLevel(body, ",").length > 1) {
    return undefined;
  }
  const assignment = topLevelAssignmentIndex(body);
  if (assignment < 0) {
    return undefined;
  }
  const name = /^([A-Za-z_$][\w$]*)\s*(?::[\S\s]+)?$/.exec(
    body.slice(0, assignment).trim(),
  )?.[1];
  const initializer = body.slice(assignment + 1).trim();
  return name === undefined || initializer.length === 0
    ? undefined
    : { name, initializer };
}

/**
 * Every name a render-head statement binds.
 *
 * Deliberately over-approximate: every identifier of a binding form counts, so a
 * pattern's renames, nested names and defaults all register. A name too many
 * only makes {@link promotedHeadLocals} refuse a promotion; a name missed would
 * let it promote a declaration that reads a local no longer in scope.
 */
function declaredHeadNames(statement: GenericStatement): string[] {
  if (
    statement.statementKind === "function" ||
    statement.statementKind === "class"
  ) {
    return statement.name === undefined ? [] : [statement.name];
  }
  return statement.statementKind === "variable"
    ? declaredNamesOfText(statement.text.text)
    : [];
}

/**
 * Every name a **planned** head statement text binds.
 *
 * The render head is planned as text — a body statement lowered through the
 * template context, or a props pattern replayed against the element — so
 * {@link headReplay}, which works from the printed head, resolves a name to its
 * declaration from the same over-approximation {@link declaredHeadNames} uses.
 */
function declaredNamesOfText(text: string): string[] {
  const trimmed = text.trim();
  const declaration = /^(?:function|class)\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
  if (declaration?.[1] !== undefined) {
    return [declaration[1]];
  }
  const keyword = /^(?:const|let|var)\s+/.exec(trimmed);
  if (keyword === null) {
    return [];
  }
  const names: string[] = [];
  for (const declarator of splitTopLevel(
    trimmed.slice(keyword[0].length).replace(/;$/, ""),
    ",",
  )) {
    const assignment = topLevelAssignmentIndex(declarator);
    const binding = (
      assignment < 0 ? declarator : declarator.slice(0, assignment)
    ).trim();
    const simple = /^([A-Za-z_$][\w$]*)\s*(?::[\S\s]+)?$/.exec(binding)?.[1];
    if (simple !== undefined) {
      names.push(simple);
      continue;
    }
    // A pattern: take its bracketed form only, so a trailing type annotation does
    // not contribute the type's own name.
    if (/^[[{]/.test(binding)) {
      names.push(
        ...patternNames(binding.slice(0, matchingBracket(binding, 0) + 1)),
      );
    }
  }
  return names;
}

/**
 * Every name a destructuring pattern **binds**.
 *
 * Only the bound side counts: `{ format: alias = 'md' }` binds `alias`, while
 * `format` is the member it reads and `'md'` is a default. Collecting either of
 * those would make {@link promotedHeadLocals} treat an unrelated name (or a
 * word inside a string) as a render-head local and refuse sound promotions.
 */
function patternNames(pattern: string): string[] {
  const names: string[] = [];
  for (const element of splitTopLevel(pattern.slice(1, -1), ",")) {
    const assignment = topLevelAssignmentIndex(element);
    const binding = (assignment < 0 ? element : element.slice(0, assignment))
      .replace(/^\s*\.{3}/, "")
      .trim();
    if (binding.length === 0) {
      continue;
    }
    const keyed = splitTopLevel(binding, ":");
    const bound = (
      keyed.length > 1 ? keyed.slice(1).join(":") : binding
    ).trim();
    if (/^[[{]/.test(bound)) {
      names.push(
        ...patternNames(bound.slice(0, matchingBracket(bound, 0) + 1)),
      );
      continue;
    }
    const name = /^([A-Za-z_$][\w$]*)/.exec(bound)?.[1];
    if (name !== undefined) {
      names.push(name);
    }
  }
  return names;
}

/** A render-head constant that may become a member, and how it would be emitted. */
interface PromotionCandidate {
  readonly name: string;
  readonly initializer: string;
  readonly kind: "field" | "getter";
}

/**
 * Decide which render-head constants are promoted to element members.
 *
 * A statement qualifies only when all three hold:
 * 1. a **lifted** scope reads its name (or a promoted declaration does), so the
 *    promotion repairs a read that would otherwise dangle — an untouched head
 *    keeps `render()` exactly as it was,
 * 2. its initializer is provably effect-free: a function value (creating a
 *    closure does nothing) or a call-free expression. A call could mutate, and a
 *    getter evaluates lazily and possibly more than once, so an unprovable
 *    statement stays in `render()` and its lifted read keeps falling back,
 * 3. every name it reads still resolves outside `render()`: a member, a local a
 *    props pattern binds (replayed for a getter, aliased for a field), or
 *    another promoted constant. A read of a head local that stays behind
 *    disqualifies it — transitively, so a rejection propagates to its readers.
 */
function promotedHeadLocals(
  head: readonly GenericStatement[],
  liftedTexts: readonly string[],
  members: ReadonlySet<string>,
  replayableLocals: ReadonlySet<string>,
  aliasedLocals: ReadonlySet<string>,
): PromotionCandidate[] {
  const candidates = new Map<string, PromotionCandidate>();
  const headNames = new Set<string>();
  for (const statement of head) {
    for (const name of declaredHeadNames(statement)) {
      headNames.add(name);
    }
  }
  for (const statement of head) {
    const constant = headConstant(statement);
    if (
      constant === undefined ||
      members.has(constant.name) ||
      candidates.has(constant.name)
    ) {
      continue;
    }
    const kind = isFunctionExpressionText(constant.initializer)
      ? "field"
      : isPureExpressionText(constant.initializer)
        ? "getter"
        : undefined;
    if (kind !== undefined) {
      candidates.set(constant.name, { ...constant, kind });
    }
  }

  const promoted = new Set<string>();
  for (const name of candidates.keys()) {
    if (liftedTexts.some((text) => referencesLocal(text, name))) {
      promoted.add(name);
    }
  }

  const rejected = new Set<string>();
  let settled = false;
  while (!settled) {
    settled = true;
    // Iterated over the (stable) candidate map, since the promoted set is
    // narrowed and widened as the fixpoint settles.
    for (const [name, candidate] of candidates) {
      if (!promoted.has(name)) {
        continue;
      }
      if (rejected.has(name)) {
        promoted.delete(name);
        settled = false;
        continue;
      }
      // A field carries its body verbatim, so only an *aliasable* props local can
      // be reached from it; a getter has a statement slot for the full replay.
      const reachable =
        candidate.kind === "field" ? aliasedLocals : replayableLocals;
      for (const local of headNames) {
        if (
          local === name ||
          reachable.has(local) ||
          !referencesLocal(candidate.initializer, local)
        ) {
          continue;
        }
        if (candidates.has(local) && !rejected.has(local)) {
          if (!promoted.has(local)) {
            promoted.add(local);
            settled = false;
          }
          continue;
        }
        rejected.add(name);
        promoted.delete(name);
        settled = false;
        break;
      }
    }
  }

  // Emitted in head order, so a promoted member reads like the source it replaces.
  return [...candidates.values()].filter((candidate) =>
    promoted.has(candidate.name),
  );
}

/** A planned render-head statement and the names it declares. */
interface HeadStatement {
  readonly text: string;
  readonly declares: readonly string[];
}

/**
 * Whether a head statement can be **replayed** in another scope.
 *
 * Only a `const` (or a `function`) declaration qualifies. A `let`/`var` may be
 * reassigned further down the head, so replaying its declaration alone would
 * bind a value the head itself goes on to change; and a bare expression
 * statement is there for its effect, which must not be duplicated.
 */
function isReplayableHeadStatement(text: string): boolean {
  return /^(?:const|function)\s/.test(text.trim());
}

/** Pair each planned head statement with the names it declares. */
function plannedHeadStatements(head: readonly string[]): HeadStatement[] {
  return head.map((text) => ({ text, declares: declaredNamesOfText(text) }));
}

/**
 * The head statements a scope outside `render()` must replay to evaluate `texts`.
 *
 * The dependency set is closed transitively — a seed reading `initialView` pulls
 * in `const initialBase = …` behind it — and returned in **head order**, so the
 * replay evaluates exactly as the render body does. Only the needed statements
 * are taken; an untouched head statement is never copied.
 *
 * A name a props pattern binds is left to {@link replayedPropsBindings}, which
 * restores it with its default from the pattern itself; copying the whole
 * pattern here would declare it twice. Those names are therefore passed in as
 * `restored`.
 *
 * `undefined` means the replay cannot be built soundly — a needed statement is
 * not replayable (see {@link isReplayableHeadStatement}), or a needed name has
 * no head declaration at all. The caller then keeps its current behaviour rather
 * than emitting a replay that is subtly wrong.
 */
function headReplay(
  head: readonly HeadStatement[],
  texts: readonly string[],
  restored: ReadonlySet<string>,
): readonly string[] | undefined {
  const declared = new Set(
    head.flatMap((statement) => [...statement.declares]),
  );
  const wanted = new Set<string>();
  const chosen = new Set<number>();
  const pending = [...texts];
  while (pending.length > 0) {
    const text = pending.pop() ?? "";
    for (const name of declared) {
      if (wanted.has(name) || !referencesLocal(text, name)) {
        continue;
      }
      wanted.add(name);
      if (restored.has(name)) {
        continue;
      }
      const index = head.findIndex((statement) =>
        statement.declares.includes(name),
      );
      const statement = head[index];
      if (
        statement === undefined ||
        !isReplayableHeadStatement(statement.text)
      ) {
        return undefined;
      }
      if (!chosen.has(index)) {
        chosen.add(index);
        pending.push(statement.text);
      }
    }
  }
  return [...chosen]
    .sort((first, second) => first - second)
    .map((index) => head[index]?.text ?? "");
}

/** The scopes and the deferral test a member seed is planned against. */
interface SeedScopes {
  /** Rewriting scope for a constructor-position seed (props patterns inlined). */
  readonly field: ElementScope;
  /** Rewriting scope for a `setup()`-position seed (props patterns replayed). */
  readonly setup: ElementScope;
  /**
   * Whether the named member's constructor-position seed reads something only
   * `render()` holds. The implementation records a deferred member, so a seed
   * planned after it that reads it is deferred with it rather than reading a
   * cell nothing has filled yet.
   */
  readonly defer: (name: string, text: string) => boolean;
}

/** A member's seed: the text to emit, and the site it is emitted at. */
interface SeedPlan {
  readonly text: string | undefined;
  readonly deferred: boolean;
}

/**
 * Resolve where a member's seed runs, and rewrite it for that site.
 *
 * The constructor form is the default; a seed that would read a render-head local
 * (or an already-deferred member) is rewritten for `setup()` instead, where a
 * statement slot exists and the props patterns can be replayed rather than
 * inlined as `this['name']` reads.
 */
function planSeed(
  name: string,
  source: string | undefined,
  scopes: SeedScopes,
): SeedPlan {
  const trimmed = source?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return { text: undefined, deferred: false };
  }
  const constructed = rewriteExpressionText(trimmed, scopes.field);
  return scopes.defer(name, constructed)
    ? { text: rewriteExpressionText(trimmed, scopes.setup), deferred: true }
    : { text: constructed, deferred: false };
}

/**
 * Widen a declared type with `undefined`, the way an optional prop reads on the
 * element class.
 *
 * A function type binds looser than a union, so `() => void` must be
 * parenthesised — `() => void | undefined` would widen the *return* type instead
 * of the field. A type that already admits `undefined` is left alone.
 */
export function widenOptionalType(text: string): string {
  const members = splitTopLevelUnion(text);
  if (members.includes(UNDEFINED_TYPE)) {
    return text;
  }
  return `${members.length === 1 && hasTopLevelArrow(text) ? `(${text})` : text} | ${UNDEFINED_TYPE}`;
}

/** The nesting depth of every character of a type, so top-level tokens can be found. */
function typeDepths(text: string): number[] {
  const depths: number[] = [];
  let depth = 0;
  for (const [index, char] of [...text].entries()) {
    if ("([{<".includes(char)) {
      depth += 1;
      depths.push(depth - 1);
      continue;
    }
    // The `>` of an arrow closes nothing — it is part of `=>`.
    if (")]}".includes(char) || (char === ">" && text[index - 1] !== "=")) {
      depth -= 1;
      depths.push(depth);
      continue;
    }
    depths.push(depth);
  }
  return depths;
}

/** The members of a top-level type union, ignoring nested/bracketed unions. */
function splitTopLevelUnion(text: string): string[] {
  const depths = typeDepths(text);
  const members: string[] = [];
  let last = 0;
  for (const [index, char] of [...text].entries()) {
    if (char === "|" && depths[index] === 0) {
      members.push(text.slice(last, index).trim());
      last = index + 1;
    }
  }
  members.push(text.slice(last).trim());
  return members;
}

/** Whether a type's outermost form is a function type (`(…) => …`). */
function hasTopLevelArrow(text: string): boolean {
  const depths = typeDepths(text);
  return [...text].some(
    (char, index) =>
      char === "=" && text[index + 1] === ">" && depths[index] === 0,
  );
}

/**
 * The type of a reactive property.
 *
 * The component's own props type wins when it declares the member: an indexed
 * access (`ButtonProperties['variant']`) is exact, already admits `undefined`
 * for an optional member, and never drifts from the interface. Otherwise the
 * declared {@link PropIntention.type} is used, widened for an optional prop,
 * and `unknown` is the last resort.
 */
function propertyTypeOf(
  name: string,
  declared: PropIntention | undefined,
  propsType: PropsTypeReference | undefined,
): { type: string; declared: boolean } {
  if (propsType !== undefined && propsType.members.has(name)) {
    return { type: indexedAccessType(propsType, name), declared: true };
  }
  const text = declared?.type?.text.trim();
  if (text === undefined || text.length === 0) {
    return { type: UNKNOWN_TYPE, declared: false };
  }
  return {
    type: declared?.optional === true ? widenOptionalType(text) : text,
    declared: true,
  };
}

/** The declared, else literal-inferred, else `unknown` type of a state field. */
function stateTypeOf(field: StateIntention): {
  type: string;
  declared: boolean;
} {
  const declared = field.type?.text.trim();
  if (declared !== undefined && declared.length > 0) {
    return { type: declared, declared: true };
  }
  const inferred = field.inferredType?.trim();
  if (inferred !== undefined && inferred.length > 0) {
    return { type: inferred, declared: true };
  }
  return { type: UNKNOWN_TYPE, declared: false };
}

/**
 * Split a block body into the dedented lines the emitter re-indents into the
 * getter, so a factory's original indentation does not leak into the class.
 */
function blockBodyLines(text: string): string[] {
  const lines = text.split("\n");
  while (lines.length > 0 && (lines[0] ?? "").trim().length === 0) {
    lines.shift();
  }
  while (lines.length > 0 && (lines.at(-1) ?? "").trim().length === 0) {
    lines.pop();
  }
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.length - line.trimStart().length);
  const shift = indents.length === 0 ? 0 : Math.min(...indents);
  return lines.map((line) =>
    line.trim().length === 0 ? "" : line.slice(shift),
  );
}

/**
 * The getter body a memo factory lowers to.
 *
 * A concise factory (`() => items.length`) becomes the expression the getter
 * returns; a block-bodied one (`() => { const … ; return … ; }`) contributes its
 * statements verbatim, because wrapping a block in `return` would parse its `{`
 * as an object literal. Anything that is not a zero-argument arrow is invoked.
 */
function derivedBody(
  factoryText: string,
  scope: ElementScope,
  bindings: readonly PropsBindingSite[],
): WebComponentsDerivedBody {
  const factory = factoryText.trim();
  const split = splitArrowFactoryBody(factory);
  const lowered =
    split === undefined
      ? {
          kind: "expression" as const,
          text: rewriteExpressionText(`(${factory})()`, scope),
        }
      : { kind: split.kind, text: rewriteExpressionText(split.text, scope) };

  // The getter is lifted out of `render()`, so any props pattern it reads has to
  // be re-stated against the element before its statements run.
  const replay = replayedPropsBindings(bindings, [lowered.text]);
  if (lowered.kind === "block") {
    return {
      kind: "block",
      statements: [...replay, ...blockBodyLines(lowered.text)],
    };
  }
  if (replay.length === 0) {
    return { kind: "expression", expression: lowered.text };
  }
  return { kind: "block", statements: [...replay, `return ${lowered.text};`] };
}

/** Lower the component's memos into recomputed getters. */
function loweredDerived(
  module: SemanticModule,
  scope: ElementScope,
  bindings: readonly PropsBindingSite[],
): WebComponentsDerivedValue[] {
  return module.intentions.memos.map((memo) => ({
    name: memo.name,
    body: derivedBody(memo.factory.text, scope, bindings),
    dependencies: (memo.dependencies ?? []).map((dependency) =>
      rewriteExpressionText(dependency.text, scope),
    ),
  }));
}

/** Lower the component's refs into `{ current }` cells owned by the element. */
function loweredElementRefs(
  module: SemanticModule,
  scopes: SeedScopes,
): WebComponentsElementRef[] {
  return module.intentions.refs.map((reference) => {
    const declared = reference.elementType?.text.trim();
    const elementType =
      declared === undefined || declared.length === 0 ? UNKNOWN_TYPE : declared;
    const seed = planSeed(reference.name, reference.initializer?.text, scopes);
    return {
      name: reference.name,
      elementType,
      initializer: seed.text ?? "undefined",
      deferred: seed.deferred,
    };
  });
}

/** The lifecycle callbacks and cleanup fields the component's effects lower to. */
function loweredLifecycle(
  module: SemanticModule,
  scope: ElementScope,
  bindings: readonly PropsBindingSite[],
  head: readonly HeadStatement[],
): {
  lifecycle: WebComponentsLifecycleHook[];
  cleanupFields: WebComponentsCleanupField[];
} {
  const connected: string[] = [];
  const disconnected: string[] = [];
  const cleanupFields: WebComponentsCleanupField[] = [];
  const bodies: string[] = [];

  for (const [index, effect] of module.intentions.effects.entries()) {
    const body = rewriteExpressionText(effect.body.text.trim(), scope);
    bodies.push(body);
    // An effect that returns a teardown keeps it in a field so the element can
    // run it when it leaves the document; one that returns nothing is simply
    // invoked, so no field (and no `disconnectedCallback`) is generated.
    if (effect.cleanup === undefined) {
      connected.push(`(${body})();`);
      continue;
    }
    const field = `${CLEANUP_FIELD_PREFIX}${index}`;
    cleanupFields.push({ name: field, type: CLEANUP_FIELD_TYPE });
    connected.push(`this.${field} = (${body})();`);
    disconnected.push(`this.${field}?.();`, `this.${field} = undefined;`);
  }

  // Every effect body is an arrow declared *inside* the callback, so it closes
  // over the callback's own scope: replaying what it reads at the top of the
  // callback is enough to restore the locals it saw in the render body — the
  // props patterns, and any render-head constant that could not be promoted to a
  // member (see {@link headReplay}).
  const replayedHead =
    headReplay(
      head,
      bodies,
      new Set(bindings.flatMap((site) => [...site.binding.locals])),
    ) ?? [];
  const replay = replayedPropsBindings(bindings, [...bodies, ...replayedHead]);

  const lifecycle: WebComponentsLifecycleHook[] = [];
  if (connected.length > 0) {
    // `ForgeElement.connectedCallback` adopts attributes and renders, so the
    // generated override must chain to it before running any effect. The props
    // patterns come first, since a replayed head statement may read them.
    lifecycle.push({
      callback: "connectedCallback",
      callsSuper: true,
      statements: [...replay, ...replayedHead, ...connected],
    });
  }
  if (disconnected.length > 0) {
    // `HTMLElement` declares no `disconnectedCallback`, so this one stands alone.
    lifecycle.push({
      callback: "disconnectedCallback",
      callsSuper: false,
      statements: disconnected,
    });
  }
  return { lifecycle, cleanupFields };
}

/** Diagnostics for the neutral constructs the native target cannot express. */
function loweredDiagnostics(module: SemanticModule): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  for (const dynamicNode of module.intentions.dynamicNodes) {
    diagnostics.push(
      createCompilerDiagnostic({
        phase: "generation",
        severity: "warning",
        code: DYNAMIC_TAG_DIAGNOSTIC,
        message: `Dynamic tag "${dynamicNode.expression.text}" cannot be expressed as a custom-element tag; it is emitted verbatim.`,
        fileName: module.fileName,
        span: dynamicNode.span,
      }),
    );
  }
  walkRenderNodes(module.ast.renderNodes, (node) => {
    for (const attribute of node.attributes) {
      if (attribute.kind !== "jsx-spread-attribute") {
        continue;
      }
      diagnostics.push(
        createCompilerDiagnostic({
          phase: "generation",
          severity: "warning",
          code: SPREAD_ATTRIBUTE_DIAGNOSTIC,
          message: `Spread binding "{...${attribute.expression.text}}" has no lit-html equivalent and is dropped.`,
          fileName: module.fileName,
          span: attribute.span,
        }),
      );
    }
  });
  return diagnostics;
}

/** The runtime and local-type imports the plan's emitted text needs. */
export function resolveRuntimeImports(plan: {
  readonly template: WebComponentsTemplatePlan;
  readonly derived: readonly WebComponentsDerivedValue[];
  readonly promotedLocals: readonly WebComponentsPromotedLocal[];
  readonly generatedIds: readonly WebComponentsGeneratedId[];
  readonly lifecycle: readonly WebComponentsLifecycleHook[];
  readonly reactiveProperties: readonly WebComponentsReactiveProperty[];
  readonly stateFields: readonly WebComponentsStateField[];
  readonly elementRefs: readonly WebComponentsElementRef[];
  readonly setup: WebComponentsSetupPhase;
  readonly retainedDeclarations: readonly string[];
}): WebComponentsRuntimeImports {
  const text = [
    plan.template.template,
    ...plan.template.head,
    ...plan.template.hoisted.map((part) => part.template),
    ...plan.derived.flatMap((derived) =>
      derived.body.kind === "block"
        ? derived.body.statements
        : [derived.body.expression],
    ),
    ...plan.promotedLocals.flatMap((local) => [
      ...local.statements,
      local.expression,
    ]),
    // A lifted `useId()` field is printed by the emitter, not by the plan's
    // text, so its call is contributed explicitly.
    ...plan.generatedIds.map(() => "useId()"),
    ...plan.lifecycle.flatMap((hook) => hook.statements),
    ...plan.reactiveProperties.map((property) => property.type),
    ...plan.stateFields.map(
      (field) => `${field.type} ${field.initializer ?? ""}`,
    ),
    ...plan.elementRefs.map(
      (reference) => `${reference.elementType} ${reference.initializer}`,
    ),
    ...plan.setup.replay,
    ...plan.retainedDeclarations,
  ].join("\n");
  // The class annotates its `static properties` map with the runtime's own
  // contract, so the type is imported exactly when the map is emitted.
  const hasReactiveMembers =
    plan.reactiveProperties.length + plan.stateFields.length > 0;
  return {
    values: RUNTIME_VALUES.filter(
      (value) =>
        STRUCTURAL_RUNTIME_VALUES.has(value) ||
        referencesIdentifier(text, value),
    ),
    types: hasReactiveMembers ? [RUNTIME_PROPERTY_DECLARATION_TYPE] : [],
    localTypes: LOCAL_ELEMENT_TYPES.filter((name) =>
      referencesIdentifier(text, name),
    ),
  };
}

/** The empty plan of a module with no recognisable component function. */
function emptyPlan(
  module: SemanticModule,
  className: string,
  tagName: string,
  retainedDeclarations: readonly string[],
): WebComponentsLoweredModule {
  const template: WebComponentsTemplatePlan = {
    template: "<slot></slot>",
    head: [],
    staticRoot: false,
    hoisted: [],
  };
  const base = {
    template,
    derived: [],
    promotedLocals: [],
    generatedIds: [],
    lifecycle: [],
    reactiveProperties: [],
    stateFields: [],
    elementRefs: [],
    setup: { replay: [] },
    retainedDeclarations,
  } as const;
  return {
    framework: WEB_COMPONENTS_FRAMEWORK,
    tagName,
    className,
    ...base,
    cleanupFields: [],
    listKeys: listKeysOf(module),
    runtimeImports: resolveRuntimeImports(base),
    appliedOptimizations: [],
  };
}

/** The plan's retained list-key candidates. */
function listKeysOf(module: SemanticModule): WebComponentsListKey[] {
  return module.intentions.listKeys.map((listKey) => ({
    source: listKey.source.text,
    key: listKey.key?.text,
    stable: listKey.stable,
  }));
}

/** Build the Web-Components target plan for a neutral module. */
export function lowerWebComponentsPlan(
  module: SemanticModule,
  context: TargetContext,
): WebComponentsLoweredModule {
  const componentName =
    context.componentName ?? module.componentName ?? "CustomElement";
  const componentFolders = context.componentFolders ?? new Set<string>();
  const className = `${componentName}Element`;
  const tagName = kebabCase(componentName);
  const moduleContext: TemplateContext = {
    scope: MODULE_SCOPE,
    componentFolders,
  };
  const retainedDeclarations = module.ast.declarations.map((declaration) =>
    lowerStatementText(
      declaration.text.text,
      declaration.renderNodes,
      moduleContext,
    ),
  );

  const component = module.ast.component;
  if (component === undefined) {
    return emptyPlan(module, className, tagName, retainedDeclarations);
  }

  const { intentions } = module;
  const propsParameterName =
    intentions.propsParameterName ??
    (component.parameter?.binding === "identifier"
      ? component.parameter.text
      : undefined) ??
    DEFAULT_PROPS_PARAMETER;

  // The component's own props interface, when its parameter names one this
  // module retains — every member it declares is annotated straight against it.
  const propsType = resolvePropsTypeReference(
    intentions.propsType?.text ?? component.parameter?.type?.text,
    module.ast.declarations,
  );

  // Every props object pattern the component destructures. Their members are
  // reactive properties; their locals shadow those fields, so the patterns are
  // replayed per scope rather than rewritten read by read.
  const propsBindings = propsBindingSites(component, propsParameterName);
  const boundLocals = new Set(
    propsBindings.flatMap((site) => [...site.binding.locals]),
  );

  const propertyNames = reactivePropertyNames(
    component,
    intentions.props,
    propsParameterName,
    propsBindings,
  );
  const reactiveProperties: WebComponentsReactiveProperty[] = propertyNames.map(
    (name) => {
      const declaredProperty = intentions.props.find(
        (candidate) => candidate.name === name,
      );
      const resolved = propertyTypeOf(name, declaredProperty, propsType);
      return {
        name,
        // The runtime observes the lower-cased name of every non-state property.
        attribute: name.toLowerCase(),
        type: resolved.type,
        optional: declaredProperty?.optional ?? true,
        declared: resolved.declared,
        inherited: INHERITED_ELEMENT_MEMBERS.has(name),
        defaultValue:
          declaredProperty?.defaultValue?.text ??
          bindingDefaultOf(propsBindings, name),
        declaration: {},
      };
    },
  );

  const setters = new Map<string, string>();
  for (const field of intentions.state) {
    if (field.setterName !== undefined) {
      setters.set(field.setterName, field.name);
    }
  }

  // Names that resolve to `this.` inside the class: properties, state cells,
  // memo getters and ref cells are all element members once lowered.
  const generatedIds = loweredGeneratedIds(component);
  const members = new Set<string>(
    [
      ...propertyNames,
      ...intentions.state.map((field) => field.name),
      ...intentions.memos.map((memo) => memo.name),
      ...intentions.refs.map((reference) => reference.name),
      ...generatedIds.map((generated) => generated.name),
    ]
      // A name a props pattern binds is a *local*: the pattern applies its
      // default and may rename the member, so a bare read means the local, not
      // the field. Rewriting it to `this.<name>` would silently drop the default.
      .filter((name) => !boundLocals.has(name)),
  );

  // A field initializer runs before any statement of the class body, so a props
  // pattern is inlined there rather than replayed (see {@link fieldInitializerAliases}).
  const aliases = fieldInitializerAliases(propsBindings);

  // Render-head statements, before any promotion: the hooks lifted into members,
  // the pure no-ops and the final return are not part of the head.
  const headStatements = component.body.filter(
    (statement) =>
      statement.statementKind !== "return" &&
      !isHookStatement(statement) &&
      !isNoOpStatement(statement),
  );

  // Everything emitted outside `render()`, and therefore unable to read its
  // locals: an effect's lifecycle callback, a memo getter, a field initializer.
  const liftedTexts = [
    ...intentions.memos.map((memo) => memo.factory.text),
    ...intentions.effects.map((effect) => effect.body.text),
    ...intentions.state.map((field) => field.initializer?.text ?? ""),
    ...intentions.refs.map((reference) => reference.initializer?.text ?? ""),
  ];
  const promoted = promotedHeadLocals(
    headStatements,
    liftedTexts,
    members,
    boundLocals,
    new Set(aliases.keys()),
  );
  const promotedNames = new Set(promoted.map((candidate) => candidate.name));

  const scope: ElementScope = {
    propsParameterName,
    // A promoted constant is a member now, so every read of it — in `render()`
    // just as much as in a lifted scope — goes through `this`.
    scoped: new Set<string>([...members, ...promotedNames]),
    setters,
  };
  const templateContext: TemplateContext = { scope, componentFolders };
  const fieldScope: ElementScope = { ...scope, aliases };

  const promotedLocals: WebComponentsPromotedLocal[] = promoted.map(
    (candidate) => {
      if (candidate.kind === "field") {
        return {
          name: candidate.name,
          kind: "field",
          expression: rewriteExpressionText(candidate.initializer, fieldScope),
          statements: [],
        };
      }
      const expression = rewriteExpressionText(candidate.initializer, scope);
      return {
        name: candidate.name,
        kind: "getter",
        expression,
        statements: replayedPropsBindings(propsBindings, [expression]),
      };
    },
  );

  // The render head: every retained statement except the constants promoted to
  // members, which the head would otherwise re-declare and shadow.
  const bodyHead = headStatements
    .filter((statement) => {
      const name = headConstant(statement)?.name;
      return name === undefined || !promotedNames.has(name);
    })
    .map((statement) =>
      lowerStatementText(
        statement.text.text,
        statement.renderNodes,
        templateContext,
      ),
    );

  const returnNode = component.returnNode;
  const templateText =
    returnNode === undefined
      ? "<slot></slot>"
      : renderNodeToTemplate(returnNode, templateContext);

  // A body pattern is already a head statement (lowered to `= this`); a parameter
  // pattern has no statement, so the head is given one for the names it reads.
  const head = [
    ...replayedPropsBindings(
      propsBindings.filter((site) => site.fromParameter),
      [...bodyHead, templateText],
    ),
    ...bodyHead,
  ];
  const plannedHead = plannedHeadStatements(head);
  // Every name the render head keeps for itself. A seed reading one of them
  // cannot run in the constructor, so it is deferred to `setup()` instead.
  const headLocals = new Set(
    plannedHead.flatMap((statement) => [...statement.declares]),
  );

  // Seeds are planned in declaration order — the order the class seeds them in —
  // so a seed that reads an already-deferred member is deferred with it rather
  // than reading a cell nothing has filled yet.
  const plannedSeeds = (
    allowDeferral: boolean,
  ): { state: WebComponentsStateField[]; refs: WebComponentsElementRef[] } => {
    const deferredMembers = new Set<string>();
    const scopes: SeedScopes = {
      field: fieldScope,
      setup: scope,
      defer: (name, text) => {
        const deferred =
          allowDeferral &&
          ([...headLocals].some((local) => referencesLocal(text, local)) ||
            [...deferredMembers].some((member) =>
              referencesIdentifier(text, member),
            ));
        if (deferred) {
          deferredMembers.add(name);
        }
        return deferred;
      },
    };
    const state = intentions.state.map((field): WebComponentsStateField => {
      const resolved = stateTypeOf(field);
      const seed = planSeed(field.name, field.initializer?.text, scopes);
      return {
        name: field.name,
        setterName: field.setterName,
        type: resolved.type,
        declared: resolved.declared,
        initializer: seed.text,
        deferred: seed.deferred,
        declaration: { state: true },
      };
    });
    return { state, refs: loweredElementRefs(module, scopes) };
  };

  let seeds = plannedSeeds(true);
  const deferredTexts = [
    ...seeds.state
      .filter((field) => field.deferred)
      .map((field) => field.initializer ?? ""),
    ...seeds.refs
      .filter((reference) => reference.deferred)
      .map((reference) => reference.initializer),
  ];
  const replayedHead =
    deferredTexts.length === 0
      ? []
      : headReplay(plannedHead, deferredTexts, boundLocals);
  let setupReplay: readonly string[];
  if (replayedHead === undefined) {
    // The head statements a deferred seed needs cannot be replayed soundly, so
    // every seed keeps its constructor position: the documented limitation,
    // rather than a silent change of what the element evaluates.
    seeds = plannedSeeds(false);
    setupReplay = [];
  } else {
    // `headReplay` leaves every name a props pattern binds to the pattern itself,
    // so the patterns are restored in front of it — with their defaults and
    // renames intact — for the names the replay and the seeds actually read.
    setupReplay = [
      ...replayedPropsBindings(propsBindings, [
        ...replayedHead,
        ...deferredTexts,
      ]),
      ...replayedHead,
    ];
  }
  const stateFields = seeds.state;
  const elementRefs = seeds.refs;

  const template: WebComponentsTemplatePlan = {
    template: templateText,
    head,
    // Stage-1 marks a fully static subtree with `__mpStatic`; a marked root that
    // needs no render head can be built once at module scope (see `./optimize`).
    staticRoot:
      returnNode !== undefined &&
      returnNode.tagKind !== "fragment" &&
      returnNode.attributes.some(
        (attribute) =>
          attribute.kind === "jsx-attribute" &&
          attribute.name === MP_STATIC_ATTR,
      ),
    hoisted: [],
  };

  const derived = loweredDerived(module, scope, propsBindings);
  const { lifecycle, cleanupFields } = loweredLifecycle(
    module,
    scope,
    propsBindings,
    plannedHead,
  );
  const base = {
    template,
    derived,
    promotedLocals,
    generatedIds,
    lifecycle,
    reactiveProperties,
    stateFields,
    elementRefs,
    setup: { replay: setupReplay },
    retainedDeclarations,
  } as const;

  return {
    framework: WEB_COMPONENTS_FRAMEWORK,
    tagName,
    className,
    ...base,
    cleanupFields,
    listKeys: listKeysOf(module),
    runtimeImports: resolveRuntimeImports(base),
    appliedOptimizations: [],
  };
}

/** The module-level constant name of the nth hoisted static template. */
export function staticTemplateName(index: number): string {
  return `${STATIC_TEMPLATE_PREFIX}_${index}`;
}

/** Lower neutral IR into the Web-Components target intentions. */
export function lowerWebComponentsModule(
  module: SemanticModule,
  context: TargetContext,
): TargetIntentions {
  const lowered = lowerWebComponentsPlan(module, context);
  return {
    framework: WEB_COMPONENTS_FRAMEWORK,
    module,
    context,
    diagnostics: [...(module.diagnostics ?? []), ...loweredDiagnostics(module)],
    lowered,
  };
}
