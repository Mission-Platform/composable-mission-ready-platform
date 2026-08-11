/**
 * Svelte implementation of the neutral story slot helper — selected by the
 * `mp:svelte` export condition.
 *
 * The forge Svelte emitter renders a named slot with
 * `$.snippet(node, () => $$props.trigger)`, so slot content must be a **snippet
 * function**, not a node. Everything a neutral story's JSX produces is therefore
 * modelled as a *mounter* — `(target) => cleanup` — which is wrapped in a raw
 * snippet when it is handed to a component, and mounted directly when it is a
 * plain element. Only Svelte's public API is used (`mount`, `unmount`,
 * `createRawSnippet`).
 *
 * `@storybook/svelte` renders a story result of the shape `{ Component, props }`.
 * A plain JSX root is therefore exposed through a small Svelte component-shaped
 * wrapper, while component slots continue to use raw snippets.
 */
import { createRawSnippet, mount, unmount } from 'svelte';

import { applyProperties } from './slots.dom.js';

import type { RenderWithSlots, StoryNodeFactory, StorySlots } from './slots.types.js';

export type { StorySlots } from './slots.types.js';

const MOUNTER = Symbol.for('@mission-platform/storybook-framework.mounter');

/** Mounts its content into `target` and returns a teardown. */
interface Mounter {
  (target: Element): () => void;
  [MOUNTER]: true;
  /** `@storybook/svelte` destructures this from the story result. */
  Component: SvelteStoryComponent;
  props: Record<string, unknown>;
}

/** The callable component shape used by Svelte's compiled dynamic components. */
type SvelteStoryComponent = (anchor: Node, properties: Record<string, unknown>) => void | (() => void);

/** Marker component for JSX fragments — its children mount straight into the parent. */
export const Fragment = (properties: { children?: unknown }): unknown => properties.children;

function isMounter(value: unknown): value is Mounter {
  return typeof value === 'function' && (value as Partial<Mounter>)[MOUNTER] === true;
}

function createMounter(mountInto: (target: Element) => () => void): Mounter {
  const mounter = ((target: Element) => mountInto(target)) as Mounter;
  mounter[MOUNTER] = true;
  mounter.props = {};
  mounter.Component = toComponent(mounter);
  return mounter;
}

/** Mount any JSX child value into `target`, returning its teardown. */
function mountValue(target: Element, value: unknown): () => void {
  if (value === undefined || value === null || typeof value === 'boolean') {
    return () => {};
  }
  if (isMounter(value)) {
    return value(target);
  }
  if (Array.isArray(value)) {
    const teardowns = value.map((item) => mountValue(target, item));
    return () => {
      for (const teardown of teardowns) {
        teardown();
      }
    };
  }
  const text = document.createTextNode(String(value));
  target.append(text);
  return () => text.remove();
}

/** Wrap content in a raw snippet, the only shape a Svelte slot accepts. */
function toSnippet(value: unknown): unknown {
  return createRawSnippet(() => ({
    render: () => '<mp-slot style="display:contents"></mp-slot>',
    setup: (element: Element) => mountValue(element, value),
  }));
}

/** Adapt a Forge mounter to the component function Svelte invokes at an anchor. */
function toComponent(value: Mounter): SvelteStoryComponent {
  return (anchor) => {
    const target = document.createElement('mp-story-root');
    target.style.display = 'contents';
    anchor.parentNode?.insertBefore(target, anchor);
    const teardown = value(target);
    return () => {
      teardown();
      target.remove();
    };
  };
}

/**
 * Convert a JSX property bag for a Svelte component: any mounter-valued
 * property is a slot, so it becomes a snippet; `children` becomes the default
 * slot's snippet.
 */
function toSvelteProperties(
  properties: Record<string, unknown> | null | undefined,
  children: readonly unknown[],
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    resolved[key] = isMounter(value) ? toSnippet(value) : value;
  }
  if (children.length > 0) {
    resolved.children = toSnippet(children.length === 1 ? children[0] : children);
  }
  return resolved;
}

/** @see {@link StoryNodeFactory} */
export const node: StoryNodeFactory = (type, properties, ...children) => {
  if (type === Fragment) {
    return createMounter((target) => mountValue(target, children));
  }
  if (typeof type === 'string') {
    return createMounter((target) => {
      const element = document.createElement(type);
      applyProperties(element, properties);
      const teardown = mountValue(element, children);
      target.append(element);
      return () => {
        teardown();
        element.remove();
      };
    });
  }
  return createMounter((target) => {
    const instance = mount(type as never, { target, props: toSvelteProperties(properties, children) as never });
    return () => void unmount(instance);
  });
};

/** @see {@link RenderWithSlots} */
export const renderWithSlots: RenderWithSlots = (component, properties, slots, children) => {
  const resolved = toSvelteProperties(properties, children === undefined ? [] : [children]);
  for (const [name, content] of Object.entries(slots as StorySlots)) {
    if (content !== undefined) {
      resolved[name] = toSnippet(content);
    }
  }
  return { Component: component, props: resolved };
};
