import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeNavbarItem, type NavbarItemChild } from './forge-navbar-item';

/**
 * Exercises the **neutral** `ForgeNavbarItem` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the link / button split for childless items and the dropdown-trigger
 * affordances when `children` are present.
 */
const ReactNavbarItem = toReactComponent(ForgeNavbarItem, 'NavbarItem');
const VueNavbarItem = toVueComponent(ForgeNavbarItem, 'NavbarItem');

describe('ForgeNavbarItem authors the same component for React and Vue', () => {
  it('renders a link item when href is set on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactNavbarItem, { label: 'Home', href: '/', active: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueNavbarItem, { label: 'Home', href: '/', active: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<a');
      expect(html).toContain('href="/"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('Home');
    }
  });

  it('renders a dropdown trigger when dropdown items are present on both frameworks', async () => {
    const dropdownItems: NavbarItemChild[] = [{ label: 'Profile', href: '/profile' }, { label: 'Sign out' }];
    const react = renderToStaticMarkup(createElement(ReactNavbarItem, { label: 'Account', dropdownItems }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueNavbarItem, { label: 'Account', dropdownItems }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('aria-haspopup="true"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('Account');
    }
  });

  it('renders an activatable button when there is no href or dropdown items on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactNavbarItem, { label: 'Action' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueNavbarItem, { label: 'Action' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<button');
      expect(html).toContain('Action');
    }
  });
});
