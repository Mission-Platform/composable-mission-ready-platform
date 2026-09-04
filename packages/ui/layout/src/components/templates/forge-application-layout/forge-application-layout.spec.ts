import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeApplicationLayout } from './forge-application-layout';

/**
 * Exercises the **neutral** `ForgeApplicationLayout` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the named slots (`status` / `navbar` / `content` / `footer`),
 * the status-banner role/colour derivation, and the sticky-header modifier.
 */
const ReactApplicationLayout = toReactComponent(ForgeApplicationLayout, 'ApplicationLayout');
const VueApplicationLayout = toVueComponent(ForgeApplicationLayout, 'ApplicationLayout');

describe('ForgeApplicationLayout authors the same component for React and Vue', () => {
  it('renders the four named-slot regions on both frameworks', async () => {
    const slots = { status: 'Status', navbar: 'Navbar', content: 'Content', footer: 'Footer' };
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, slots));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, slots) }));

    for (const html of [react, vue]) {
      expect(html).toContain('application-layout');
      expect(html).toContain('application-layout__status');
      expect(html).toContain('application-layout__header');
      expect(html).toContain('application-layout__content');
      expect(html).toContain('application-layout__footer');
      expect(html).toContain('Status');
      expect(html).toContain('Navbar');
      expect(html).toContain('Content');
      expect(html).toContain('Footer');
    }
  });

  it('derives the alert role for an error status on both frameworks', async () => {
    const properties = { statusLevel: 'error' as const, status: 'Something went wrong' };
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="alert"');
      expect(html).toContain('Something went wrong');
    }
  });

  it('marks the empty status banner as hidden by default on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, {}));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, {}) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('role="alert"');
      expect(html).not.toContain('role="status"');
    }
  });

  it('renders the start and end sidebar regions only when their slots are filled on both frameworks', async () => {
    const withSidebars = { startSidebar: 'Nav', content: 'Body', endSidebar: 'Aside' };
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, withSidebars));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, withSidebars) }));

    for (const html of [react, vue]) {
      expect(html).toContain('application-layout__body');
      expect(html).toContain('application-layout__sidebar--start');
      expect(html).toContain('application-layout__sidebar--end');
      expect(html).toContain('Nav');
      expect(html).toContain('Aside');
    }

    const withoutSidebars = { content: 'Body' };
    const reactBare = renderToStaticMarkup(createElement(ReactApplicationLayout, withoutSidebars));
    const vueBare = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, withoutSidebars) }));

    for (const html of [reactBare, vueBare]) {
      expect(html).toContain('application-layout__body');
      expect(html).not.toContain('application-layout__sidebar--start');
      expect(html).not.toContain('application-layout__sidebar--end');
    }
  });

  it('forces a breakpoint-collapsed start sidebar to render when `startSidebarOpen` is set on both frameworks', async () => {
    // With a `sidebarBreakpoint` and no `window` (SSR) the breakpoint query is
    // unmatched, so the sidebar would normally collapse. `startSidebarOpen`
    // overrides that and reveals it — mirroring a host's navbar toggle button.
    const collapsed = { sidebarBreakpoint: 'md' as const, startSidebar: 'Nav', content: 'Body' };
    const reactCollapsed = renderToStaticMarkup(createElement(ReactApplicationLayout, collapsed));
    const vueCollapsed = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, collapsed) }));

    for (const html of [reactCollapsed, vueCollapsed]) {
      expect(html).not.toContain('application-layout__sidebar--start');
    }

    const opened = { ...collapsed, startSidebarOpen: true };
    const reactOpened = renderToStaticMarkup(createElement(ReactApplicationLayout, opened));
    const vueOpened = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, opened) }));

    for (const html of [reactOpened, vueOpened]) {
      expect(html).toContain('application-layout__sidebar--start');
      expect(html).toContain('Nav');
      // Revealed while collapsed, it floats as an overlay backed by a dismiss scrim.
      expect(html).toContain('application-layout__sidebar--overlay');
      expect(html).toContain('application-layout__backdrop');
    }
  });

  it('renders a forced-open sidebar inline (not as an overlay) when no `sidebarBreakpoint` gates it on both frameworks', async () => {
    // Without a `sidebarBreakpoint` the sidebar is always inline, so
    // `startSidebarOpen` is a no-op: no overlay modifier and no dismiss backdrop.
    const properties = { startSidebar: 'Nav', content: 'Body', startSidebarOpen: true };
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('application-layout__sidebar--start');
      expect(html).not.toContain('application-layout__sidebar--overlay');
      expect(html).not.toContain('application-layout__backdrop');
    }
  });

  it('pins the header when `stickyHeader` is set on both frameworks', async () => {
    const properties = { stickyHeader: true, navbar: 'Nav' };
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('application-layout__header--sticky');
    }
  });
});
