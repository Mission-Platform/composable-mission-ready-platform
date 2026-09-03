import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgePagination } from './forge-pagination';

/**
 * Exercises the **neutral** `ForgePagination` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the derived page list (boundary + ellipsis truncation), the active
 * page, and the edge/prev-next controls.
 */
const ReactPagination = toReactComponent(ForgePagination, 'Pagination');
const VuePagination = toVueComponent(ForgePagination, 'Pagination');

describe('ForgePagination authors the same component for React and Vue', () => {
  it('marks the current page on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactPagination, { modelValue: 3, pageCount: 5 }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VuePagination, { modelValue: 3, pageCount: 5 }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Pagination"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('Go to page 3');
      expect(html).toContain('Go to previous page');
      expect(html).toContain('Go to next page');
    }
  });

  it('renders truncation ellipses for large page counts on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactPagination, { modelValue: 5, pageCount: 20 }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VuePagination, { modelValue: 5, pageCount: 20 }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('…');
      expect(html).toContain('Go to page 1');
      expect(html).toContain('Go to page 20');
    }
  });

  it('renders the edge buttons when showEdges is set on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactPagination, { pageCount: 5, showEdges: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VuePagination, { pageCount: 5, showEdges: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Go to first page');
      expect(html).toContain('Go to last page');
    }
  });
});
