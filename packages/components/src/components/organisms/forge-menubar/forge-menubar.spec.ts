import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMenubar } from './forge-menubar';

import type { MenuNode } from '../../molecules/forge-menu';

/**
 * Exercises the **neutral** `ForgeMenubar` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the labelled `menubar`, the link/button items, and the dropdown
 * submenu affordances.
 */
const ReactMenubar = toReactComponent(ForgeMenubar, 'Menubar');
const VueMenubar = toVueComponent(ForgeMenubar, 'Menubar');

const items: MenuNode[] = [
  {
    label: 'File',
    children: [
      { label: 'New', href: '/new' },
      { label: 'Open', href: '/open' },
    ],
  },
  { label: 'Edit', children: [{ label: 'Undo' }] },
  { label: 'Help', href: '/help' },
];

describe('ForgeMenubar authors the same component for React and Vue', () => {
  it('renders a labelled menubar with items and submenu affordances on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactMenubar, { items, label: 'App', bordered: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueMenubar, { items, label: 'App', bordered: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="menubar"');
      expect(html).toContain('aria-label="App"');
      expect(html).toContain('File');
      expect(html).toContain('Edit');
      expect(html).toContain('href="/help"');
      expect(html).toContain('aria-haspopup="menu"');
    }
  });

  it('renders the default slot when no items are provided on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactMenubar, { children: createElement('span', undefined, 'Custom bar') }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueMenubar, undefined, { default: () => vueH('span', 'Custom bar') }),
      }),
    );

    for (const html of [react, vue]) {
      // With no `items` the bar exposes only its default slot; it deliberately
      // drops `role="menubar"` (and its `aria-label`) so it doesn't assert an
      // empty menubar with no `menuitem` children (`aria-required-children`).
      expect(html).not.toContain('role="menubar"');
      expect(html).toContain('Custom bar');
    }
  });
});
