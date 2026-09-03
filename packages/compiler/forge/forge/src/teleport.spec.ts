import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { Teleport as ReactTeleport, toReactComponent } from './adapters/react';
import { toVueComponent } from './adapters/vue';
import { h, type MpComponent, Teleport } from './runtime';

/** A neutral component that teleports a panel when "open". */
const Overlay: MpComponent = (properties) =>
  h(
    'div',
    { class: 'overlay' },
    properties.open ? h(Teleport, { to: 'body' }, h('span', { class: 'panel' }, 'content')) : undefined,
  );

describe('the neutral `Teleport` marker', () => {
  it('throws if rendered directly (it is a compile-time / adapter marker)', () => {
    expect(() => (Teleport as () => unknown)()).toThrow(/must not be rendered directly/);
  });

  it('renders its children in place on both adapters (SSR parity)', async () => {
    const properties = { open: true };
    const react = renderToStaticMarkup(createElement(toReactComponent(Overlay), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(Overlay), properties));

    for (const html of [react, vue]) {
      expect(html).toContain('<span class="panel">content</span>');
      expect(html).toContain('<div class="overlay">');
    }
  });

  it('omits the teleported content when closed on both adapters', async () => {
    const properties = { open: false };
    const react = renderToStaticMarkup(createElement(toReactComponent(Overlay), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(Overlay), properties));

    for (const html of [react, vue]) {
      expect(html).not.toContain('panel');
    }
  });
});

describe('the React `Teleport` portal component', () => {
  it('renders nothing during SSR (no DOM target resolved yet)', () => {
    const html = renderToStaticMarkup(
      createElement(ReactTeleport, { to: 'body' }, createElement('span', undefined, 'portaled')),
    );

    expect(html).toBe('');
  });

  it('renders its children in place when `disabled` (no portal)', () => {
    const html = renderToStaticMarkup(
      createElement(ReactTeleport, { disabled: true }, createElement('span', undefined, 'inline')),
    );

    expect(html).toBe('<span>inline</span>');
  });
});
