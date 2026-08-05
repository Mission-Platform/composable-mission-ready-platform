import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseDrawer } from './base-drawer';

/**
 * Exercises the **neutral** `BaseDrawer` on both frameworks through the
 * `@mission-platform/forge` runtime adapters. During SSR the reactive breakpoint
 * is `false`, so the overlay behaviour is exercised: an open drawer renders the
 * panel + backdrop, a closed one renders neither.
 */
const ReactDrawer = toReactComponent(BaseDrawer, 'Drawer');
const VueDrawer = toVueComponent(BaseDrawer, 'Drawer');

describe('BaseDrawer authors the same component for React and Vue', () => {
  it('renders the panel, header, body, and backdrop when open on both frameworks', async () => {
    const properties = { open: true, title: 'Settings', placement: 'end' as const, size: 'sm' as const };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties, 'Drawer body'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, properties, () => 'Drawer body') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-drawer-backdrop');
      expect(html).toContain('base-drawer');
      expect(html).toContain('base-drawer--end');
      expect(html).toContain('base-drawer--sm');
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Settings');
      expect(html).toContain('Drawer body');
      // The close button carries the accessible label.
      expect(html).toContain('aria-label="Close"');
    }
  });

  it('renders nothing visible when closed on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactDrawer, { open: false, title: 'Hidden' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, { open: false, title: 'Hidden' }) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('base-drawer-backdrop');
      expect(html).not.toContain('role="dialog"');
      expect(html).not.toContain('Hidden');
    }
  });

  it('renders the footer content when provided on both frameworks', async () => {
    const properties = { open: true, title: 'With footer', footer: 'Footer actions' };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-drawer__footer');
      expect(html).toContain('Footer actions');
    }
  });

  it('renders a resize handle when draggable on both frameworks', async () => {
    // A `top` overlay is resizable at every breakpoint (only horizontal overlays
    // need the `sm` breakpoint), so the handle renders during SSR.
    const properties = { open: true, title: 'Resizable', placement: 'top' as const, draggable: true };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-drawer--draggable');
      expect(html).toContain('base-drawer__resize-handle');
      expect(html).toContain('role="separator"');
    }
  });
});
