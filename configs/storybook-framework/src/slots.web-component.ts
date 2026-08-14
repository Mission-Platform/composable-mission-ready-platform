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
export { customElementTag } from './slots.dom.js';

/** Marker component for JSX fragments — rendered as a `DocumentFragment`. */
export const Fragment = (properties: { children?: unknown }): unknown => properties.children;

/**
 * Forge web-component builds expose their JSX children through a `children`
 * property. That name collides with the platform `Element.children` collection,
 * so preserve the neutral child value on the instance before it is connected.
 */
function setComponentChildren(element: Element, children: readonly unknown[]): void {
  if (children.length === 0) {
    return;
  }
  Object.defineProperty(element, 'children', {
    configurable: true,
    value: children.length === 1 ? children[0] : children,
  });
}

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = (type, properties, ...children) => {
  if (type === Fragment) {
    const fragment = document.createDocumentFragment();
    appendChild(fragment, children);
    return fragment;
  }
  const tag = typeof type === 'string' ? type : customElementTag(type);
  const element = createDomElement(tag, properties, []);
  if (typeof type !== 'string') {
    setComponentChildren(element, children);
  }
  for (const child of children) {
    appendChild(element, child);
  }
  return element;
};

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = (component, properties, slots, children) => {
  const element = document.createElement(typeof component === 'string' ? component : customElementTag(component));
  applyProperties(element, properties);
  if (typeof component !== 'string' || component.includes('-')) {
    setComponentChildren(element, children === undefined ? [] : [children]);
  }
  for (const [name, content] of Object.entries(slots as StorySlots)) {
    const slotted = asSlotElement(content, name);
    if (slotted) {
      element.append(slotted);
    }
  }
  appendChild(element, children);
  return element;
};
