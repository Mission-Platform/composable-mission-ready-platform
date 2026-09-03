/**
 * Vue implementation of the neutral story slot helper — selected by the
 * `mp:vue` export condition. Vue components render a named slot with
 * `renderSlot($slots, 'trigger')`, so slot content must be handed over as a
 * **slot function**; a same-named prop lands in `$attrs` and is dropped.
 */
import { h } from 'vue';

import type { RenderWithSlots, StoryNodeFactory, StorySlots } from './slots.types.js';

/** Vue's fragment, so the classic JSX pragma has a fragment factory. */
export { Fragment } from 'vue';
export type { StorySlots } from './slots.types.js';

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = (type, properties, ...children) => {
  const resolved = properties ?? undefined;
  if (children.length === 0) {
    return h(type as never, resolved as never);
  }
  // A component's JSX children are its default slot; a plain element's are its
  // child nodes. Passing an array to a component triggers Vue's
  // "Non-function value encountered for default slot" warning.
  return typeof type === 'string'
    ? h(type as never, resolved as never, children as never)
    : h(type as never, resolved as never, { default: () => children } as never);
};

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = (component, properties, slots, children) => {
  const slotFunctions: Record<string, () => unknown> = {};
  for (const [name, content] of Object.entries(slots as StorySlots)) {
    if (content !== undefined) {
      slotFunctions[name] = () => content;
    }
  }
  if (children !== undefined) {
    slotFunctions.default = () => children;
  }
  return h(component as never, properties as never, slotFunctions as never);
};
