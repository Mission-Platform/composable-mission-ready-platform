import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeGridLayout } from './forge-grid-layout';

const ReactGridLayout = toReactComponent(ForgeGridLayout, 'GridLayout');
const VueGridLayout = toVueComponent(ForgeGridLayout, 'GridLayout');

describe('ForgeGridLayout authors the same component for React and Vue', () => {
  it('renders ordered named cells and requested tracks on both frameworks', async () => {
    const properties = {
      rows: 2,
      columns: 2,
      gap: 'lg' as const,
      cell1: 'One',
      cell2: 'Two',
      cell3: 'Three',
      cell4: 'Four',
    };
    const react = renderToStaticMarkup(createElement(ReactGridLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueGridLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('grid-layout');
      expect(html).toContain('grid-layout__cell');
      expect(html).toContain('--forge-grid-columns:repeat(2, minmax(0, 1fr))');
      expect(html).toContain('--forge-grid-rows:repeat(2, minmax(0, auto))');
      expect(html).toContain('var(--mp-spacing-6)');
      expect(html.indexOf('One')).toBeLessThan(html.indexOf('Two'));
      expect(html.indexOf('Two')).toBeLessThan(html.indexOf('Three'));
      expect(html.indexOf('Three')).toBeLessThan(html.indexOf('Four'));
    }
  });

  it('clamps invalid dimensions and omits cells beyond the configured area', async () => {
    const properties = { rows: 0, columns: -2, cell1: 'Only cell', cell2: 'Not rendered' };
    const react = renderToStaticMarkup(createElement(ReactGridLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueGridLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('--forge-grid-columns:repeat(1, minmax(0, 1fr))');
      expect(html).toContain('--forge-grid-rows:repeat(1, minmax(0, auto))');
      expect(html).toContain('Only cell');
      expect(html).not.toContain('Not rendered');
    }
  });
});
