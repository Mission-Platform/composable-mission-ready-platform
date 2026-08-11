/**
 * @vitest-environment jsdom
 *
 * One case per renderer for the neutral story slot helper: the whole point of
 * the helper is that the *same* story body fills a named slot on every
 * workbench, so each branch must produce the shape that framework actually
 * consumes.
 */
import { describe, expect, it } from 'vitest';

import * as reactSlots from './slots.react.js';
import * as solidSlots from './slots.solid.js';
import * as svelteSlots from './slots.svelte.js';
import * as vueSlots from './slots.vue.js';
import * as webComponentSlots from './slots.web-component.js';

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

  it('gives Svelte a snippet per named slot in the { Component, props } story shape', () => {
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

  it('adapts a JSX root to the Svelte component contract', () => {
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

  it('gives a web component a light-DOM child carrying the slot name', () => {
    class MpSlotProbeElement extends HTMLElement {}
    customElements.define('mp-slot-probe', MpSlotProbeElement);

    const element = webComponentSlots.renderWithSlots(
      MpSlotProbeElement,
      { maxHeight: '240px', items: [1, 2] },
      { trigger: webComponentSlots.node('button', { type: 'button' }, 'Open') },
      webComponentSlots.node('span', undefined, 'BODY'),
    ) as HTMLElement;

    expect(element.tagName.toLowerCase()).toBe('mp-slot-probe');
    // Object values must be set as properties, never stringified attributes.
    expect((element as unknown as { items: number[] }).items).toEqual([1, 2]);
    const trigger = element.querySelector('button');
    expect(trigger?.getAttribute('slot')).toBe('trigger');
    expect(trigger?.textContent).toBe('Open');
    expect(element.querySelector('span')?.hasAttribute('slot')).toBe(false);
  });
});
