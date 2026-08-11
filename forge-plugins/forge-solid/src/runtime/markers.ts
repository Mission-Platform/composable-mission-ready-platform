/**
 * Neutral marker vocabulary the SolidJS target lowers away.
 *
 * The neutral dialect expresses framework concepts the compiled output must not
 * contain: `<Slot>` / `h(Slot, …)` slot reads, the `hasSlot(…)` presence check,
 * `<Dynamic is={…}>` tag indirection, `<Fragment>` grouping, the `slot="…"`
 * routing attribute a child uses to reach a parent's named slot, and the
 * Stage-1 `__mpStatic` optimisation marker. Every name below is resolved by
 * `../transformers/` and never reaches the emitted source.
 */

/** The neutral named-slot element (`<Slot name="x" />`) and `h(Slot, …)` callee. */
export const SLOT_TAG = "Slot";

/** The neutral dynamic-tag element (`<Dynamic is={tag} />`). */
export const DYNAMIC_TAG = "Dynamic";

/** The neutral grouping element (`<Fragment>…</Fragment>`). */
export const FRAGMENT_TAG = "Fragment";

/** The neutral slot-presence check (`hasSlot('x')`). */
export const HAS_SLOT_CALLEE = "hasSlot";

/** The attribute routing a child into a parent component's named slot. */
export const SLOT_ATTRIBUTE = "slot";

/** The attribute naming a `<Slot>`'s slot (absent → the default slot). */
export const SLOT_NAME_ATTRIBUTE = "name";

/** The attribute carrying a `<Dynamic>`'s tag expression. */
export const DYNAMIC_IS_ATTRIBUTE = "is";

/** The neutral class attribute, collapsed to Solid's `class`. */
export const CLASS_NAME_ATTRIBUTE = "className";

/** The runtime helper an array-valued `className` collapses to. */
export const CLASS_NAMES_HELPER = "classNames";

/** The DOM-reference attribute (`ref={…}`). */
export const REF_ATTRIBUTE = "ref";

/** The default slot's name in the neutral dialect. */
export const DEFAULT_SLOT_NAME = "default";

/** The props member the default slot is read from. */
export const DEFAULT_SLOT_PROPERTY = "children";

/**
 * Stage-1's hoistable-subtree marker. Emitters must lift the marked subtree to a
 * module constant and strip the attribute, so it never appears in the output.
 */
export const MP_STATIC_ATTRIBUTE = "__mpStatic";

/** Prefix for the module constants static subtrees are hoisted into. */
export const MP_HOIST_PREFIX = "__mpHoist_";
