import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { toReactComponent } from './adapters/react';
import { toVueComponent } from './adapters/vue';
import { Fragment, h, isMpElement, Slot, type MpComponent } from './runtime';

const HostTree: MpComponent = () => h('div', { class: 'x', id: 'y' }, 'hi');
// A component whose `classNames` array/object forms collapse to a `class` string.
const Chip: MpComponent = () => h('span', { classNames: ['chip', { 'chip--active': true, 'chip--off': false }] }, 'x');
const Inner: MpComponent = (properties) => h('em', undefined, properties.children);
const Outer: MpComponent = () => h(Fragment, undefined, h('b', undefined, 'a'), h(Inner, undefined, 'b'));

// A child exposing a named `trigger` slot plus a default slot.
const SlotHost: MpComponent = () =>
  h(
    'div',
    { class: 'host' },
    h('div', { class: 'host__trigger' }, h(Slot, { name: 'trigger' })),
    h('div', { class: 'host__panel' }, h(Slot)),
  );
// A parent passing content into the child's named slot via `slot="trigger"`.
const SlotPasser: MpComponent = () =>
  h(
    SlotHost,
    undefined,
    h('button', { slot: 'trigger', type: 'button' }, 'Open'),
    h('ul', { class: 'list' }, h('li', undefined, 'One')),
  );

describe('@mission-platform/jsx runtime', () => {
  it('builds a framework-neutral element tree', () => {
    const element = h('div', { class: 'x', id: 'y' }, 'hi');

    expect(isMpElement(element)).toBe(true);
    expect(element.type).toBe('div');
    expect(element.properties).toEqual({ class: 'x', id: 'y' });
    expect(element.children).toEqual(['hi']);
  });

  it('drops null/undefined/boolean children and flattens nested arrays', () => {
    const element = h('ul', undefined, [h('li', undefined, 'a'), h('li', undefined, 'b')], undefined, false);

    expect(element.children).toHaveLength(2);
  });
});

describe('@mission-platform/jsx adapters render the same tree on React and Vue', () => {
  it('renders a host element identically (mapping `class`) on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(HostTree), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(HostTree)));

    expect(react).toBe('<div class="x" id="y">hi</div>');
    expect(vue).toBe('<div class="x" id="y">hi</div>');
  });

  it('collapses the `classNames` attribute (array/object forms) to an identical `class` string on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(Chip), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(Chip)));

    // React collapses to a string `className`; Vue maps to native `class` — both
    // render the same `class="chip chip--active"` (the falsy entry dropped) and
    // never leak a literal `classnames` attribute.
    expect(react).toBe('<span class="chip chip--active">x</span>');
    expect(vue).toBe('<span class="chip chip--active">x</span>');
  });

  it('inlines nested neutral components and supports fragments on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(Outer), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(Outer)));

    for (const html of [react, vue]) {
      expect(html).toContain('<b>a</b>');
      expect(html).toContain('<em>b</em>');
    }
  });

  it('routes a `slot="name"` child into the matching named slot on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(SlotPasser), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(SlotPasser)));

    for (const html of [react, vue]) {
      // The `slot="trigger"` child fills the host's `trigger` slot…
      expect(html).toMatch(/host__trigger[^>]*>(<!--[^>]*-->)?<button/);
      // …while the unmarked children stay in the default slot…
      expect(html).toMatch(/host__panel[^>]*>(<!--[^>]*-->)?<ul/);
      // …and the `slot` marker is stripped (never emitted as a real attribute).
      expect(html).not.toContain('slot="trigger"');
    }
  });
});
