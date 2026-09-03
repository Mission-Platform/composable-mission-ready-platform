/**
 * @vitest-environment jsdom
 *
 * One case per renderer for the neutral story slot helper: the whole point of
 * the helper is that the *same* story body fills a named slot on every
 * workbench, so each branch must produce the shape that framework actually
 * consumes.
 */
import { describe, expect, it, vi } from 'vitest';

import * as reactSlots from './slots.react.js';
import * as solidSlots from './slots.solid.js';
import * as vueSlots from './slots.vue.js';
import * as webComponentSlots from './slots.web-component.js';

import type { RenderWithSlots, StoryNodeFactory } from './slots.types.js';

const svelteMock = vi.hoisted(() => {
  return {
    createRawSnippet: vi.fn(() => vi.fn()),
    mount: vi.fn((_component: unknown, _options: unknown) => ({ mockedInstance: true })),
    unmount: vi.fn((_instance: unknown) => void 0),
  };
});

vi.mock('svelte', () => {
  return {
    createRawSnippet: svelteMock.createRawSnippet,
    mount: svelteMock.mount,
    unmount: svelteMock.unmount,
  };
});

let svelteSlots: { node: StoryNodeFactory; renderWithSlots: RenderWithSlots } | undefined;

/** A stand-in for a compiled component; only its identity/props matter here. */
const probe = (): void => {};

describe('slot helper', () => {
  it('gives Vue slot functions in the vnode children', () => {
    const vnode = vueSlots.renderWithSlots(probe, { open: true }, { trigger: 'TRIGGER' }, 'BODY') as {
      props: Record<string, unknown>;
      children: Record<string, () => unknown>;
    };

    expect(vnode.props.open).toBe(true);
    expect(typeof vnode.children.trigger).toBe('function');
    expect(vnode.children.trigger()).toBe('TRIGGER');
    expect(vnode.children.default()).toBe('BODY');
  });

  it('gives React a plain prop per named slot', () => {
    const element = reactSlots.renderWithSlots(probe, { open: true }, { trigger: 'TRIGGER' }, 'BODY') as {
      props: Record<string, unknown>;
    };

    expect(element.props.open).toBe(true);
    expect(element.props.trigger).toBe('TRIGGER');
    expect(element.props.children).toBe('BODY');
  });

  it('gives Solid a plain prop per named slot', () => {
    let received: Record<string, unknown> | undefined;
    const capture = (properties: Record<string, unknown>): void => {
      received = { open: properties.open, trigger: properties.trigger, children: properties.children };
    };

    solidSlots.renderWithSlots(capture, { open: true }, { trigger: 'TRIGGER' }, 'BODY');

    expect(received).toEqual({ open: true, trigger: 'TRIGGER', children: 'BODY' });
  });

  it('gives Svelte a snippet per named slot in the { Component, props } story shape', async () => {
    svelteSlots ??= await import('./slots.svelte.js');

    const result = svelteSlots.renderWithSlots(probe, { open: true }, { trigger: 'TRIGGER' }, 'BODY') as {
      Component: unknown;
      props: Record<string, unknown>;
    };

    expect(result.Component).toBe(probe);
    expect(result.props.open).toBe(true);
    // A Svelte slot is `$.snippet(() => $$props.trigger)` — it must be callable.
    expect(typeof result.props.trigger).toBe('function');
    expect(typeof result.props.children).toBe('function');
  });

  it('adapts a JSX root to the Svelte component contract', async () => {
    svelteSlots ??= await import('./slots.svelte.js');
    const result = svelteSlots.node('button', { type: 'button' }, 'Save') as {
      Component: (anchor: Node, properties: Record<string, unknown>) => void | (() => void);
      props: Record<string, unknown>;
    };
    const host = document.createElement('div');
    const anchor = document.createComment('storybook-anchor');
    host.append(anchor);

    const cleanup = result.Component(anchor, result.props);
    expect(host.querySelector('button')?.textContent).toBe('Save');
    cleanup?.();
  });

  it('accepts a module-shaped Svelte component export', async () => {
    svelteSlots ??= await import('./slots.svelte.js');

    const defaultComponent = vi.fn((_options: unknown) => ({ $$destroy: () => void 0 }));
    const result = svelteSlots.node({ default: defaultComponent }, {}) as {
      Component: (anchor: Node, properties: Record<string, unknown>) => void | (() => void);
      props: Record<string, unknown>;
    };

    expect(result.props).toEqual({});
    expect(typeof result.Component).toBe('function');

    const host = document.createElement('div');
    const anchor = document.createComment('storybook-anchor');
    host.append(anchor);

    const cleanup = result.Component(anchor, result.props) as undefined | (() => void);

    expect(svelteMock.mount).toHaveBeenCalledTimes(1);
    expect(svelteMock.mount.mock.calls[0]![0]).toBe(defaultComponent);

    const options = svelteMock.mount.mock.calls[0]![1] as { props?: Record<string, unknown>; target?: Element };
    expect(options.props).toEqual({});
    expect(host.querySelector('mp-story-root')).toBeTruthy();

    cleanup?.();
    expect(svelteMock.unmount).toHaveBeenCalledTimes(1);
    expect(host.querySelector('mp-story-root')).toBeNull();
  });

  it('gives a web component a light-DOM child carrying the slot name', () => {
    class MpSlotProbeElement extends HTMLElement {}
    customElements.define('mp-slot-probe', MpSlotProbeElement);

    const neutralChild = webComponentSlots.node('span', undefined, 'BODY') as HTMLElement;

    const element = webComponentSlots.renderWithSlots(
      MpSlotProbeElement,
      { maxHeight: '240px', items: [1, 2] },
      { trigger: webComponentSlots.node('button', { type: 'button' }, 'Open') },
      neutralChild,
    ) as HTMLElement;

    expect(element.tagName.toLowerCase()).toBe('mp-slot-probe');
    // Object values must be set as properties, never stringified attributes.
    expect((element as unknown as { items: number[] }).items).toEqual([1, 2]);
    const trigger = element.querySelector('button');
    expect(trigger?.getAttribute('slot')).toBe('trigger');
    expect(trigger?.textContent).toBe('Open');
    expect(element.querySelector('span')?.hasAttribute('slot')).toBe(false);

    // The web-component renderer must preserve the neutral child value on the
    // element instance before it is connected. If `setComponentChildren()`
    // is removed, `element.children` falls back to the native HTMLCollection.
    expect((element as unknown as { children: unknown }).children).toBe(neutralChild);
  });
});
