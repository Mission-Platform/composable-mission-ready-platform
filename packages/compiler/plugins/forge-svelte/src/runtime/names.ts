/**
 * The Svelte target's naming vocabulary: the neutral tag/attribute names the
 * emitters recognise, and the pure name transforms they apply (attribute
 * aliases, event-handler casing, snippet names, sibling-import flattening).
 *
 * Nothing here touches the generic AST — these are string-level facts about the
 * neutral vocabulary and its Svelte equivalents, kept apart from the
 * transformers so both emitters and their specs can use them directly.
 */

/** The neutral marker element rendered as a Svelte snippet (`{@render …}`). */
export const SLOT_TAG = "Slot";

/** The neutral marker element carrying a computed tag/component. */
export const DYNAMIC_TAG = "Dynamic";

/** The neutral element rendering trusted markup (`{@html …}`). */
export const HTML_CONTENT_TAG = "HtmlContent";

/**
 * The neutral enter/leave marker for a single (conditionally-rendered) child.
 *
 * React and Vue resolve `Transition` to a real component (a CSS-class driver
 * for React, Vue's own built-in for Vue) so the enter/leave animation is
 * framework-native. Svelte has no equivalent wrapper component — its own
 * hand-written adapter primitive (`packages/compiler/forge/forge/src/adapters/svelte.ts`)
 * already renders `properties.children` in place and expects any animation to
 * come from a native `transition:`/`in:`/`out:` directive applied directly to
 * the child element by the author. The compiler mirrors that: `Transition` is
 * a compile-time marker that unwraps to its children, dropping the
 * enter/leave class props (which have no Svelte-native equivalent yet).
 */
export const TRANSITION_TAG = "Transition";

/** The neutral enter/leave/move marker for a list of children — unwraps the same way as {@link TRANSITION_TAG}. */
export const TRANSITION_GROUP_TAG = "TransitionGroup";

/**
 * The neutral portal marker. Svelte has no built-in DOM-portal primitive, so —
 * matching the hand-written adapter's own `Teleport` (`packages/compiler/forge/forge/src/adapters/svelte.ts`,
 * which renders children in place) — this is a compile-time marker that
 * unwraps to its children rather than moving them to another DOM location.
 */
export const TELEPORT_TAG = "Teleport";

/** Native Svelte 5 async boundary with a `pending` snippet. */
export const SUSPENSE_TAG = "Suspense";

/** The neutral class-composition helper unwrapped into a Svelte class value. */
export const CLASS_NAMES_HELPER = "classNames";

/** The neutral hyperscript render call (`h(tag, props, ...children)`). */
export const HYPERSCRIPT_CALL = "h";

/** The default snippet a component's `children` renders through. */
export const CHILDREN_SNIPPET = "children";

/** Generated helper that normalizes a slot value to a Svelte snippet. */
const SLOT_VALUE_SNIPPET = "__mpSlotValueSnippet";

/** Attribute-name aliases (neutral React vocabulary → Svelte/DOM). */
export const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: "class",
  htmlFor: "for",
};

/** Whether an attribute name is a neutral `onX` event handler. */
export function isEventAttribute(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

/** `onClick` → `onclick` — the Svelte 5 lowercase event-attribute form. */
export function svelteEventName(name: string): string {
  return `on${name.slice(2).toLowerCase()}`;
}

/** The Svelte attribute name a neutral JSX attribute maps to. */
export function svelteAttributeName(name: string): string {
  return ATTRIBUTE_ALIASES[name] ?? name;
}

/** The prop key a slot arrives under; the default slot is `children`. */
export function slotPropName(name: string | undefined): string {
  return name === undefined || name === "" || name === "default"
    ? CHILDREN_SNIPPET
    : name;
}

/**
 * The local binding a slot's snippet renders through.
 *
 * A slot name belongs to the *markup* vocabulary, so it may be hyphenated
 * (`start-header`) — which is not a legal binding name. Such a slot keeps its
 * hyphenated prop key and is destructured into a camel-cased local
 * (`'start-header': startHeader`), so the presence check and the `{@render}`
 * both have a name they can spell.
 */
export function snippetName(name: string | undefined): string {
  const key = slotPropName(name);
  if (/^[A-Za-z_$][\w$]*$/.test(key)) {
    return key;
  }
  const segments = key.split(/[^\w$]+/).filter((segment) => segment.length > 0);
  const identifier = segments
    .map((segment, index) =>
      index === 0
        ? segment
        : segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join("");
  return /^[A-Za-z_$]/.test(identifier) ? identifier : `slot${identifier}`;
}

/**
 * Render a slot binding that may hold either a Svelte snippet *or* a plain
 * `MpChild` value supplied by a non-Svelte caller such as the Storybook slot
 * adapter.
 *
 * The neutral slot contract (`MpChild = MpElement | string | number | …`)
 * allows a slot to be filled with primitive text, which React/Vue render
 * directly; a bare `{@render name?.()}` would instead *call* that text and
 * throw `… is not a function`. The generated script normalizes both forms to a
 * snippet so markup never emits a bare text hole, which Svelte rejects inside
 * structural elements such as `<tr>`. When the binding is absent, the optional
 * `fallback` markup renders instead.
 */
export function renderSnippet(name: string | undefined, fallback = ""): string {
  const binding = snippetName(name);
  return fallback === ""
    ? `{@render ${SLOT_VALUE_SNIPPET}(${binding})}`
    : `{#if ${binding} != null}{@render ${SLOT_VALUE_SNIPPET}(${binding})}{:else}${fallback}{/if}`;
}

/** The last path segment of a relative import specifier. */
export function importBase(specifier: string): string {
  const segments = specifier
    .split("/")
    .filter(
      (segment) => segment !== "." && segment !== ".." && segment.length > 0,
    );
  return segments.at(-1) ?? specifier;
}

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`). */
export function flattenSpecifier(
  specifier: string,
  componentFolders?: ReadonlySet<string>,
): string {
  if (!specifier.startsWith(".")) {
    return specifier;
  }
  const base = importBase(specifier);
  return componentFolders !== undefined && !componentFolders.has(base)
    ? specifier
    : `./${base}`;
}

/** `forge-icon-button` → `ForgeIconButton` — the PascalCase fallback for a sibling import with no usable binding. */
export function toPascalCase(base: string): string {
  return base
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

/**
 * Whether a computed tag expression names a **component** rather than an
 * element. Svelte splits the dynamic-tag vocabulary in two: `<svelte:component
 * this={…}>` instantiates a component value, `<svelte:element this={…}>`
 * renders a string tag name. A capitalised identifier (`Icon`,
 * `variants[kind]`, `Icons.Check`) can only be the former; anything else
 * (`tag`, `as`, `properties.as`) resolves to a tag-name string.
 */
export function isComponentTagExpression(expression: string): boolean {
  return /^[A-Z][\w$]*(?:\s*[.[]|$)/.test(expression.trim());
}
