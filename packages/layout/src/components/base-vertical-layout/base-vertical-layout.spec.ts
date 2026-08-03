import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseVerticalLayout } from './base-vertical-layout';

/**
 * Exercises the **neutral** `BaseVerticalLayout` (which composes inline
 * `BaseDrawer`s) on both frameworks through the `@mission-platform/forge` runtime
 * adapters. During SSR the reactive breakpoint is `false`, so the columns behave
 * as overlay drawers (the single-column grid template) — an open column renders
 * its drawer, a closed/absent one renders nothing.
 */
const ReactVerticalLayout = toReactComponent(BaseVerticalLayout, 'VerticalLayout');
const VueVerticalLayout = toVueComponent(BaseVerticalLayout, 'VerticalLayout');

describe('BaseVerticalLayout authors the same component for React and Vue', () => {
  it('renders the grid shell and main content on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactVerticalLayout, {}, 'Main content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueVerticalLayout, {}, () => 'Main content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('vertical-layout');
      expect(html).toContain('vertical-layout__content');
      expect(html).toContain('minmax(0, 1fr)');
      expect(html).toContain('Main content');
    }
  });

  it('renders an open start column as an overlay drawer on both frameworks', async () => {
    const properties = { start: 'Sidebar', startOpen: true, startTitle: 'Navigation' };
    const react = renderToStaticMarkup(createElement(ReactVerticalLayout, properties, 'Body'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueVerticalLayout, properties, () => 'Body') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-drawer');
      expect(html).toContain('Sidebar');
      expect(html).toContain('Navigation');
      expect(html).toContain('Body');
    }
  });

  it('omits a side column when its content is not provided on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactVerticalLayout, { start: 'Only start', startOpen: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueVerticalLayout, { start: 'Only start', startOpen: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Only start');
      // No end column was provided, so its content never appears.
      expect(html).not.toContain('end-column-content');
    }
  });
});
