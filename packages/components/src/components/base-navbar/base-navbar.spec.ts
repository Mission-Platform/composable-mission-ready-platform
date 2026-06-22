import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseNavbar } from './base-navbar';

/**
 * Exercises the **neutral** `BaseNavbar` (which composes `BaseDrawer` +
 * `BaseTypography`) on both frameworks through the `@mission-platform/jsx`
 * runtime adapters.
 *
 * The mobile drawer is left **closed** (the default): the runtime adapters
 * resolve `<Slot/>` through a dynamic scope stack, so a `<Slot/>` forwarded into
 * the child drawer would mis-resolve there — but the compiled Vue/React output
 * scopes slots lexically (correct, exercised by the Storybook story tests), and
 * a closed drawer never renders its body, so these adapter-based parity checks
 * stay faithful as long as the drawer is not opened.
 */
const ReactNavbar = toReactComponent(BaseNavbar, 'Navbar');
const VueNavbar = toVueComponent(BaseNavbar, 'Navbar');

describe('BaseNavbar authors the same component for React and Vue', () => {
  it('renders the brand, centre items, and the hamburger on both frameworks', async () => {
    const properties = { brand: 'Mission', align: 'center' as const };
    const react = renderToStaticMarkup(createElement(ReactNavbar, properties, 'Home'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueNavbar, properties, () => 'Home') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-navbar');
      expect(html).toContain('base-navbar__container');
      expect(html).toContain('base-navbar__center--center');
      expect(html).toContain('base-navbar__hamburger');
      expect(html).toContain('Mission');
      expect(html).toContain('Home');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('Main navigation');
    }
  });

  it('applies the sticky modifier on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactNavbar, { sticky: true }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueNavbar, { sticky: true }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-navbar--sticky');
    }
  });
});
