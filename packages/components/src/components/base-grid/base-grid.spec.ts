import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseGrid } from './base-grid';

/**
 * Exercises the **neutral** `BaseGrid` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters. The
 * assertions confirm cross-framework parity of the BEM class and the computed
 * CSS Grid inline style (track template derived from `rows` / `cols`).
 */
const ReactGrid = toReactComponent(BaseGrid, 'Grid');
const VueGrid = toVueComponent(BaseGrid, 'Grid');

describe('BaseGrid authors the same component for React and Vue', () => {
  it('renders matching markup and grid track template on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactGrid, { rows: 2, cols: 3, gap: 'lg' }, 'Cell'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueGrid, { rows: 2, cols: 3, gap: 'lg' }, () => 'Cell') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-grid');
      expect(html).toContain('display:grid');
      expect(html).toContain('repeat(3, minmax(0, 1fr))');
      expect(html).toContain('repeat(2, minmax(0, auto))');
      expect(html).toContain('Cell');
    }
  });

  it('switches to a responsive auto-fit track list when `minColumnWidth` is set on both frameworks', async () => {
    const properties = { minColumnWidth: '12rem', cols: 5 } as const;
    const react = renderToStaticMarkup(createElement(ReactGrid, properties, 'Cell'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueGrid, properties, () => 'Cell') }));

    for (const html of [react, vue]) {
      expect(html).toContain('repeat(auto-fit, minmax(min(12rem, 100%), 1fr))');
      // `cols` is ignored in the responsive mode.
      expect(html).not.toContain('repeat(5, minmax(0, 1fr))');
    }
  });

  it('applies the shared padding/margin spacing classes on both frameworks', async () => {
    const properties = { padding: 'lg', margin: 'md' } as const;
    const react = renderToStaticMarkup(createElement(ReactGrid, properties, 'Cell'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueGrid, properties, () => 'Cell') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-spacing--padding-lg');
      expect(html).toContain('base-spacing--margin-md');
    }
  });
});
