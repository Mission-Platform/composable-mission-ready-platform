/**
 * React implementation of the neutral story slot helper — selected by the
 * `mp:react` export condition. The forge React emitter reads a named slot as
 * `properties.<name>`, so slot content is passed straight through as a prop.
 */
import { createElement } from 'react';

import type { RenderWithSlots, StoryNodeFactory } from './slots.types.js';

/** React's fragment, so the classic JSX pragma has a fragment factory. */
export { Fragment } from 'react';
export type { StorySlots } from './slots.types.js';

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = (type, properties, ...children) =>
  createElement(type as never, properties as never, ...(children as never[]));

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = (component, properties, slots, children) =>
  createElement(component as never, { ...properties, ...slots } as never, children as never);
