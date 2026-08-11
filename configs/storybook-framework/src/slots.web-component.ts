/**
 * Web-Component implementation of the neutral story slot helper — selected by
 * the `mp:web-component` export condition.
 *
 * The forge web-component emitter renders a named slot as a real
 * `<slot name="trigger">` inside the shadow root, which only a **light-DOM
 * child carrying `slot="trigger"`** can fill; a property of the same name is
 * ignored. Everything is therefore built as real DOM, which is also what
 * `@storybook/web-components` renders (it hands the story result to lit's
 * `render`, and lit accepts a DOM node).
 */
import { appendChild, applyProperties, asSlotElement, createDomElement, customElementTag } from './slots.dom.js';

import type { RenderWithSlots, StoryNodeFactory, StorySlots } from './slots.types.js';

export type { StorySlots } from './slots.types.js';

/** Marker component for JSX fragments — rendered as a `DocumentFragment`. */
export const Fragment = (properties: { children?: unknown }): unknown => properties.children;

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = (type, properties, ...children) => {
  if (type === Fragment) {
    const fragment = document.createDocumentFragment();
    appendChild(fragment, children);
    return fragment;
  }
  const tag = typeof type === 'string' ? type : customElementTag(type);
  return createDomElement(tag, properties, children);
};

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = (component, properties, slots, children) => {
  const element = document.createElement(typeof component === 'string' ? component : customElementTag(component));
  applyProperties(element, properties);
  for (const [name, content] of Object.entries(slots as StorySlots)) {
    const slotted = asSlotElement(content, name);
    if (slotted) {
      element.append(slotted);
    }
  }
  appendChild(element, children);
  return element;
};
