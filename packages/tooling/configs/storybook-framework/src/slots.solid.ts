/**
 * SolidJS implementation of the neutral story slot helper — selected by the
 * `mp:solid` export condition. Like React, the forge Solid emitter reads a
 * named slot as `properties.<name>`, so slot content is passed as a prop; Solid
 * renders to real DOM, so a plain tag is built with `document.createElement`.
 */
import { createComponent } from 'solid-js/web';

import { createDomElement } from './slots.dom.js';

import type { RenderWithSlots, StoryNodeFactory } from './slots.types.js';

export type { StorySlots } from './slots.types.js';

/** Solid has no fragment component: an array of children is a fragment. */
export const Fragment = (properties: { children?: unknown }): unknown => properties.children;

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = (type, properties, ...children) => {
  if (typeof type === 'string') {
    return createDomElement(type, properties, children);
  }
  const resolved: Record<string, unknown> = { ...properties };
  if (children.length > 0) {
    resolved.children = children.length === 1 ? children[0] : children;
  }
  return createComponent(type as never, resolved as never);
};

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = (component, properties, slots, children) =>
  createComponent(component as never, { ...properties, ...slots, children } as never);
