/**
 * Shared contracts for the neutral story slot helper.
 *
 * A write-once `*.stories.tsx` is rendered by whichever framework
 * `STORYBOOK_FRAMEWORK` selects, and every framework consumes a component's
 * **named slots** differently:
 *
 * | framework        | how a named slot arrives                                  |
 * | ---------------- | --------------------------------------------------------- |
 * | `vue`            | `renderSlot($slots, 'trigger')` — a slot *function*         |
 * | `react`          | `properties.trigger` — a plain prop                         |
 * | `solid`          | `properties.trigger` — a plain prop                         |
 * | `svelte`         | `$.snippet(() => $$props.trigger)` — a *snippet* function    |
 * | `web-component`  | `<slot name="trigger">` — a light-DOM child with `slot="…"`  |
 *
 * Passing a node as a prop (the React shape) therefore renders nothing on three
 * of the five workbenches. {@link RenderWithSlots} is the one supported way to
 * fill a named slot from a neutral story: the active framework's implementation
 * is selected by the `mp:<framework>` export condition the unified Storybook
 * already sets through `resolve.conditions`.
 */

/** Content for a component's named slots, keyed by slot name. */
export type StorySlots = Record<string, unknown>;

/**
 * Build one element for the active renderer. Also serves as the classic JSX
 * factory for the workbenches whose Storybook preset installs no JSX transform
 * of its own (Svelte and Web Components).
 */
export type StoryNodeFactory = (
  type: unknown,
  properties?: Record<string, unknown> | null,
  ...children: unknown[]
) => unknown;

/**
 * Render `component` with `properties`, the given named `slots` and optional
 * default-slot `children`, using the mechanism the active framework actually
 * consumes.
 */
export type RenderWithSlots = (
  component: unknown,
  properties: Record<string, unknown>,
  slots: StorySlots,
  children?: unknown,
) => unknown;
