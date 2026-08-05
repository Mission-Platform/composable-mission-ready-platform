import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMasonry } from './forge-masonry';

/**
 * Exercises the **neutral** `ForgeMasonry` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * The assertions confirm cross-framework parity of the BEM class and the
 * multi-column inline style (fixed `column-count` vs. responsive `column-width`).
 */
const ReactMasonry = toReactComponent(ForgeMasonry, 'Masonry');
const VueMasonry = toVueComponent(ForgeMasonry, 'Masonry');

describe('ForgeMasonry authors the same component for React and Vue', () => {
  it('renders a fixed column count on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactMasonry, { columns: 4, gap: 'lg' }, 'Item'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueMasonry, { columns: 4, gap: 'lg' }, () => 'Item') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-masonry');
      expect(html).toContain('column-count:4');
      expect(html).toContain('Item');
    }
  });

  it('prefers a responsive column width when `minColumnWidth` is set', async () => {
    const react = renderToStaticMarkup(createElement(ReactMasonry, { columns: 4, minColumnWidth: '12rem' }, 'Item'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueMasonry, { columns: 4, minColumnWidth: '12rem' }, () => 'Item') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('column-width:12rem');
      expect(html).not.toContain('column-count');
    }
  });
});
