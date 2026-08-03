import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { toReactComponent } from './adapters/react';
import { toVueComponent } from './adapters/vue';
import { Dynamic, h, type MpComponent, type MpProperties } from './runtime';

interface LinkProperties extends MpProperties {
  href?: string;
}

/** A neutral component whose tag is resolved at runtime: an `<a>` or a `<button>`. */
const Link: MpComponent<LinkProperties> = (properties) =>
  h(Dynamic, { is: properties.href === undefined ? 'button' : 'a', class: 'link', href: properties.href }, 'go');

describe('the neutral `Dynamic` marker', () => {
  it('throws if rendered directly (it is a compile-time / adapter marker)', () => {
    expect(() => (Dynamic as () => unknown)()).toThrow(/must not be rendered directly/);
  });

  it('resolves `is` to an `<a>` and forwards the remaining properties on both adapters', async () => {
    const properties = { href: '/home' };
    const react = renderToStaticMarkup(createElement(toReactComponent(Link), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(Link), properties));

    for (const html of [react, vue]) {
      expect(html).toContain('<a');
      expect(html).toContain('class="link"');
      expect(html).toContain('href="/home"');
      expect(html).toContain('go');
    }
  });

  it('resolves `is` to a `<button>` when the prop changes on both adapters', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(Link), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(Link), {}));

    for (const html of [react, vue]) {
      expect(html).toContain('<button');
      expect(html).not.toContain('<a');
    }
  });
});
