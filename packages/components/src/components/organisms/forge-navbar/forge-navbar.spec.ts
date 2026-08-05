import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeNavbar } from './forge-navbar';

/**
 * Exercises the **neutral** `ForgeNavbar` (which composes `ForgeDrawer` +
 * `ForgeTypography`) on both frameworks through the `@mission-platform/forge`
 * runtime adapters.
 *
 * The mobile drawer is left **closed** (the default): the runtime adapters
 * resolve `<Slot/>` through a dynamic scope stack, so a `<Slot/>` forwarded into
 * the child drawer would mis-resolve there — but the compiled Vue/React output
 * scopes slots lexically (correct, exercised by the Storybook story tests), and
 * a closed drawer never renders its body, so these adapter-based parity checks
 * stay faithful as long as the drawer is not opened.
 */
const ReactNavbar = toReactComponent(ForgeNavbar, 'Navbar');
const VueNavbar = toVueComponent(ForgeNavbar, 'Navbar');

describe('ForgeNavbar authors the same component for React and Vue', () => {
  it('renders the brand, centre items, and the hamburger on both frameworks', async () => {
    const properties = { brand: 'Mission', align: 'center' as const };
    const react = renderToStaticMarkup(createElement(ReactNavbar, properties, 'Home'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueNavbar, properties, () => 'Home') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-navbar');
      expect(html).toContain('forge-navbar__container');
      expect(html).toContain('forge-navbar__center--center');
      expect(html).toContain('forge-navbar__hamburger');
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
      expect(html).toContain('forge-navbar--sticky');
    }
  });

  it('accepts a custom `mobileBreakpoint` and renders the inline desktop layout during SSR on both frameworks', async () => {
    // The collapse is driven by a reactive `matchMedia` query that only runs in
    // the browser, so server markup always renders the full inline navbar (the
    // `--mobile` modifier is applied client-side after hydration). The custom
    // breakpoint must not break that SSR output.
    const properties = { brand: 'Mission', mobileBreakpoint: 'md' as const };
    const react = renderToStaticMarkup(createElement(ReactNavbar, properties, 'Home'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueNavbar, properties, () => 'Home') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-navbar__container');
      expect(html).toContain('forge-navbar__hamburger');
      expect(html).toContain('Home');
      expect(html).not.toContain('forge-navbar--mobile');
    }
  });
});
