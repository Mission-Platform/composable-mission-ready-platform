import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMenu, type MenuNode } from './forge-menu';

/**
 * Exercises the **neutral** `ForgeMenu` authored in this package, rendering it on
 * both frameworks through the `@mission-platform/forge-jsx` runtime adapters. Covers
 * the `menubar`/`menuitem` roles, leaf links, and the expandable submenu
 * affordances (`aria-haspopup`).
 */
const ReactMenu = toReactComponent(ForgeMenu, 'Menu');
const VueMenu = toVueComponent(ForgeMenu, 'Menu');

const items: MenuNode[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Products',
    children: [
      { label: 'Hardware', href: '/products/hardware' },
      { label: 'Software', href: '/products/software' },
    ],
  },
  { label: 'Action', icon: '★' },
];

describe('ForgeMenu authors the same component for React and Vue', () => {
  it('renders a menubar with links and submenu affordances on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactMenu, { items, ariaLabel: 'Main' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMenu, { items, ariaLabel: 'Main' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="menubar"');
      expect(html).toContain('aria-label="Main"');
      expect(html).toContain('role="menuitem"');
      expect(html).toContain('href="/"');
      expect(html).toContain('Products');
      expect(html).toContain('aria-haspopup="menu"');
      expect(html).toContain('★');
    }
  });
});
