import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseTable, type TableColumn } from './base-table';

/**
 * Exercises the **neutral** `BaseTable` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the column headers, data rows (via the composed `BaseTypography`), the
 * caption, and the empty state.
 */
const ReactTable = toReactComponent(BaseTable, 'Table');
const VueTable = toVueComponent(BaseTable, 'Table');

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role', align: 'right' },
];
const ROWS = [
  { name: 'Ada', role: 'Author' },
  { name: 'Grace', role: 'Admiral' },
];

describe('BaseTable authors the same component for React and Vue', () => {
  it('renders headers, rows, and caption on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactTable, { columns: COLUMNS, rows: ROWS, caption: 'Pioneers', striped: true }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueTable, { columns: COLUMNS, rows: ROWS, caption: 'Pioneers', striped: true }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<table');
      expect(html).toContain('base-table--striped');
      expect(html).toContain('<caption');
      expect(html).toContain('Pioneers');
      expect(html).toContain('<th');
      expect(html).toContain('Name');
      expect(html).toContain('base-table__th--sortable');
      expect(html).toContain('base-table__th--align-right');
      expect(html).toContain('Ada');
      expect(html).toContain('Admiral');
    }
  });

  it('renders the empty state when there are no rows on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactTable, { columns: COLUMNS, rows: [], emptyText: 'Nothing here' }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTable, { columns: COLUMNS, rows: [], emptyText: 'Nothing here' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-table__empty');
      expect(html).toContain('Nothing here');
    }
  });
});
