import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseMenuItem } from './base-menu-item';

/**
 * Exercises the **neutral** `BaseMenuItem` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the link vs. activatable-span split, the `role="menuitem"` semantics,
 * and the default-slot label fallback.
 */
const ReactMenuItem = toReactComponent(BaseMenuItem, 'MenuItem');
const VueMenuItem = toVueComponent(BaseMenuItem, 'MenuItem');

describe('BaseMenuItem authors the same component for React and Vue', () => {
  it('renders a link menuitem when href is set on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactMenuItem, { label: 'Profile', href: '/profile' }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueMenuItem, { label: 'Profile', href: '/profile' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="none"');
      expect(html).toContain('role="menuitem"');
      expect(html).toContain('href="/profile"');
      expect(html).toContain('Profile');
    }
  });

  it('renders an activatable span when there is no href on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactMenuItem, { label: 'Sign out' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMenuItem, { label: 'Sign out' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<span');
      expect(html).toContain('role="menuitem"');
      expect(html).toContain('Sign out');
      expect(html).not.toContain('<a');
    }
  });

  it('marks a disabled item on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactMenuItem, { label: 'Locked', disabled: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueMenuItem, { label: 'Locked', disabled: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('aria-disabled="true"');
    }
  });
});
