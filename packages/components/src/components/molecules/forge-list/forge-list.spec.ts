import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeList, type ListItem } from './forge-list';

/**
 * Exercises the **neutral** `ForgeList` authored in this package, rendering it on
 * both frameworks through the `@mission-platform/forge` runtime adapters. Covers
 * the unordered/ordered rows and the description (`dl`) variant, each rendered
 * through the composed `ForgeTypography`.
 */
const ReactList = toReactComponent(ForgeList, 'List');
const VueList = toVueComponent(ForgeList, 'List');

const ROWS: ListItem[] = [{ label: 'First' }, { label: 'Second' }];
const TERMS: ListItem[] = [
  { term: 'Term A', content: 'Detail A' },
  { term: 'Term B', content: 'Detail B' },
];

describe('ForgeList authors the same component for React and Vue', () => {
  it('renders an ordered list of items on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactList, { items: ROWS, variant: 'ordered', divided: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueList, { items: ROWS, variant: 'ordered', divided: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<ol');
      expect(html).toContain('forge-list--ordered');
      expect(html).toContain('forge-list--divided');
      expect(html).toContain('First');
      expect(html).toContain('Second');
    }
  });

  it('renders a description list with term/detail pairs on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactList, { items: TERMS, variant: 'description' }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueList, { items: TERMS, variant: 'description' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<dl');
      expect(html).toContain('<dt');
      expect(html).toContain('<dd');
      expect(html).toContain('Term A');
      expect(html).toContain('Detail B');
    }
  });
});
