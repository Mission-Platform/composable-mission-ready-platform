/**
 * Neutral fallback for the story slot helper. It is what TypeScript resolves
 * (no `mp:<framework>` condition is set for a package's own type-check) and what
 * a consumer would get if they forgot to configure `resolve.conditions`, so it
 * carries the real signatures but fails loudly at runtime rather than rendering
 * nothing.
 */
import type { RenderWithSlots, StoryNodeFactory } from './slots.types.js';

export type { RenderWithSlots, StoryNodeFactory, StorySlots } from './slots.types.js';

function unresolved(): never {
  throw new Error(
    '[storybook-framework] The slot helper resolved to its neutral fallback. ' +
      "Set Vite's `resolve.conditions` to include the active `mp:<framework>` condition " +
      '(`createStorybookConfig` does this for you).',
  );
}

/** Placeholder fragment factory; never invoked (see {@link node}). */
export const Fragment = (properties: { children?: unknown }): unknown => properties.children;

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = () => unresolved();

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = () => unresolved();
