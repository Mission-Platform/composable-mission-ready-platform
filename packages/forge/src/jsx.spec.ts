import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { toReactComponent } from './adapters/react';
import { toVueComponent } from './adapters/vue';
import { Fragment, h, HtmlContent, isMpElement, type MpComponent, Slot } from './runtime';

const HostTree: MpComponent = () => h('div', { class: 'x', id: 'y' }, 'hi');
// A component whose `className` array/object forms collapse to a `class` string.
const Chip: MpComponent = () => h('span', { className: ['chip', { 'chip--active': true, 'chip--off': false }] }, 'x');
const RawContent: MpComponent = () =>
  h(HtmlContent, {
    html: '<svg viewBox="0 0 1 1"><title>trusted</title></svg>',
    className: 'diagram',
    id: 'diagram-host',
    role: 'img',
    'aria-label': 'Diagram',
  });
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

// A side-effect-only component that renders nothing. The neutral render-nothing
// form is `null` (the same value the compiler emits for an empty render, e.g.
// `<MapLayer>`): React renders `null` as nothing and a Vue functional component
// returning `null` renders nothing. Typed `MpElement | null`, so it is cast to
// the `MpComponent` shape the adapters accept.
// eslint-disable-next-line unicorn/no-null
const Blank = (() => null) as MpComponent;
// The equivalent authored as an empty fragment (`<></>` → `h(Fragment)`): a
// fragment with no children renders nothing on both frameworks.
const BlankFragment: MpComponent = () => h(Fragment);

// Vue SSR represents an empty render with comment anchors (`<!---->` for a null
// render, `<!--[--><!--]-->` for an empty fragment) rather than real markup;
// stripping the comments leaves the empty string, matching React's `''`.
const withoutComments = (html: string): string => html.replaceAll(/<!--.*?-->/g, '');

describe('@mission-platform/forge runtime', () => {
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

describe('@mission-platform/forge adapters render the same tree on React and Vue', () => {
  it('renders a host element identically (mapping `class`) on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(HostTree), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(HostTree)));

    expect(react).toBe('<div class="x" id="y">hi</div>');
    expect(vue).toBe('<div class="x" id="y">hi</div>');
  });

  it('collapses the `className` attribute (array/object forms) to an identical `class` string on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(Chip), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(Chip)));

    // React collapses to a string `className`; Vue maps to native `class` — both
    // render the same `class="chip chip--active"` (the falsy entry dropped) and
    // never leak a literal `classnames` attribute.
    expect(react).toBe('<span class="chip chip--active">x</span>');
    expect(vue).toBe('<span class="chip chip--active">x</span>');
  });

  it('renders trusted HtmlContent as raw child markup and forwards host properties', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(RawContent), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(RawContent)));

    for (const html of [react, vue]) {
      expect(html).toContain('<svg viewBox="0 0 1 1"><title>trusted</title></svg>');
      expect(html).toContain('class="diagram"');
      expect(html).toContain('id="diagram-host"');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Diagram"');
      expect(html).not.toContain('&lt;svg');
    }
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

describe('@mission-platform/forge adapters render nothing for an empty (null) render on both frameworks', () => {
  it('renders no markup for a `null`-returning component (React `null` / Vue nothing)', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(Blank), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(Blank)));

    expect(react).toBe('');
    // Only Vue's comment anchor remains — no real element markup is emitted.
    expect(withoutComments(vue)).toBe('');
  });

  it('renders no markup for an empty `<Fragment>` (h(Fragment)) on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(BlankFragment), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(BlankFragment)));

    expect(react).toBe('');
    // Only Vue's empty-fragment comment anchors remain — no real element markup.
    expect(withoutComments(vue)).toBe('');
  });
});
