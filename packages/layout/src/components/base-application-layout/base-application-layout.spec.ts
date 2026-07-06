import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseApplicationLayout } from './base-application-layout';

/**
 * Exercises the **neutral** `BaseApplicationLayout` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the named slots (`status` / `navbar` / `content` / `footer`),
 * the status-banner role/colour derivation, and the sticky-header modifier.
 */
const ReactApplicationLayout = toReactComponent(BaseApplicationLayout, 'ApplicationLayout');
const VueApplicationLayout = toVueComponent(BaseApplicationLayout, 'ApplicationLayout');

describe('BaseApplicationLayout authors the same component for React and Vue', () => {
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

  it('pins the header when `stickyHeader` is set on both frameworks', async () => {
    const properties = { stickyHeader: true, navbar: 'Nav' };
    const react = renderToStaticMarkup(createElement(ReactApplicationLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueApplicationLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('application-layout__header--sticky');
    }
  });
});
