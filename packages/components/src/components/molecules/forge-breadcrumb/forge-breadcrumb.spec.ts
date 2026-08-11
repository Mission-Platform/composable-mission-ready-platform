import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { type BreadcrumbItem, ForgeBreadcrumb } from './forge-breadcrumb';

/**
 * Exercises the **neutral** `ForgeBreadcrumb` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the labelled landmark, the link/current split, the separators, and the
 * `aria-current` on the final entry.
 */
const ReactBreadcrumb = toReactComponent(ForgeBreadcrumb, 'Breadcrumb');
const VueBreadcrumb = toVueComponent(ForgeBreadcrumb, 'Breadcrumb');

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Data' },
];

describe('ForgeBreadcrumb authors the same component for React and Vue', () => {
  it('renders links, separators, and the current page on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactBreadcrumb, { items }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBreadcrumb, { items }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Breadcrumb"');
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/library"');
      expect(html).toContain('Home');
      expect(html).toContain('Library');
      expect(html).toContain('Data');
      expect(html).toContain('aria-current="page"');
    }
  });

  it('honours a custom separator on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactBreadcrumb, { items, separator: '›' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBreadcrumb, { items, separator: '›' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('›');
    }
  });

  it('renders the current crumb as plain inline text, in line with the link crumbs', async () => {
    const react = renderToStaticMarkup(createElement(ReactBreadcrumb, { items }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBreadcrumb, { items }) }));

    for (const html of [react, vue]) {
      // The label is the *direct* text of the current crumb: nesting it in a
      // smaller typography variant is what made the last crumb read as
      // supertext, out of line with its sibling links.
      expect(html).toMatch(/aria-current="page"[^>]*>\s*Data\s*<\/span>/);
      expect(html).not.toContain('forge-typography');
    }
  });
});
