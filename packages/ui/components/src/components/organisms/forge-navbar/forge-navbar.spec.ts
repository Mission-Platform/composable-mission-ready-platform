import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeNavbar } from './forge-navbar';

/**
 * Exercises the **neutral** `ForgeNavbar` (which composes `ForgeDrawer` +
 * `ForgeTypography`) on both frameworks through the `@mission-platform/forge-jsx`
 * runtime adapters.
 *
 * The Web Components open-drawer regression lives in the docs application
 * integration fixture, where the compiled `ForgeNavbar` → `ForgeDrawer`
 * composition and shadow-root projection are exercised together.
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

  it('preserves the global size modifier on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactNavbar, { size: 'lg' as const }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueNavbar, { size: 'lg' as const }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-size--lg');
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

  it('keeps default and named content in the real navbar-drawer composition', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactNavbar,
        { brand: 'Mission' },
        'Documentation',
        createElement('span', { slot: 'end' }, 'mission-platform.dev'),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueNavbar,
            { brand: 'Mission' },
            { default: () => 'Documentation', end: () => vueH('span', { slot: 'end' }, 'mission-platform.dev') },
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Documentation');
      expect(html).toContain('mission-platform.dev');
      expect(html).toContain('forge-drawer');
    }
  });
});
