import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseVirtualTable, type VirtualTableColumn } from './base-virtual-table';

/**
 * Exercises the **neutral** `BaseVirtualTable` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the windowed rows, the full-height spacer, the empty state,
 * and the default `footer` slot fallback.
 */
const ReactTable = toReactComponent(BaseVirtualTable, 'VirtualTable');
const VueTable = toVueComponent(BaseVirtualTable, 'VirtualTable');

const COLUMNS: VirtualTableColumn[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name' },
];

const ROWS = Array.from({ length: 50 }, (_, index) => ({ id: index, name: `Row ${index}` }));

describe('BaseVirtualTable authors the same component for React and Vue', () => {
  it('renders only the windowed rows beneath the header on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTable, { columns: COLUMNS, rows: ROWS, height: 200 }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTable, { columns: COLUMNS, rows: ROWS, height: 200 }) }),
    );

    for (const html of [react, vue]) {
      // Header labels and the first row render…
      expect(html).toContain('ID');
      expect(html).toContain('Row 0');
      // …but far-off rows are virtualised away.
      expect(html).not.toContain('Row 49');
    }
  });

  it('sizes the inner spacer to the full content height on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactTable, { columns: COLUMNS, rows: ROWS, rowHeight: 40, height: 200 }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTable, { columns: COLUMNS, rows: ROWS, rowHeight: 40, height: 200 }) }),
    );

    // 50 rows × 40px = 2000px total scroll height.
    for (const html of [react, vue]) {
      expect(html).toContain('2000px');
    }
  });

  it('shows the empty state and a row-count footer on both frameworks', async () => {
    const reactEmpty = renderToStaticMarkup(
      createElement(ReactTable, { columns: COLUMNS, rows: [], emptyText: 'Nothing here' }),
    );
    const vueEmpty = await renderToString(
      createSSRApp({ render: () => vueH(VueTable, { columns: COLUMNS, rows: [], emptyText: 'Nothing here' }) }),
    );

    for (const html of [reactEmpty, vueEmpty]) {
      expect(html).toContain('Nothing here');
      expect(html).toContain('0 rows');
    }
  });
});
