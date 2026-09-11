import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTable, type TableColumn } from './forge-table';

/**
 * Exercises the **neutral** `ForgeTable` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the column headers, data rows (via the composed `ForgeTypography`), the
 * caption, and the empty state.
 */
const ReactTable = toReactComponent(ForgeTable, 'Table');
const VueTable = toVueComponent(ForgeTable, 'Table');

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role', align: 'right' },
];
const ROWS = [
  { name: 'Ada', role: 'Author' },
  { name: 'Grace', role: 'Admiral' },
];

describe('ForgeTable authors the same component for React and Vue', () => {
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
      expect(html).toContain('forge-table--striped');
      expect(html).toContain('<caption');
      expect(html).toContain('Pioneers');
      expect(html).toContain('<th');
      expect(html).toContain('Name');
      expect(html).toContain('forge-table__th--sortable');
      expect(html).toContain('forge-table__th--align-right');
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
      expect(html).toContain('forge-table__empty');
      expect(html).toContain('Nothing here');
    }
  });

  it('renders sortable headers with tabindex="0" and supports keyboard sorting with Enter and Space', async () => {
    const onSort = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () => vueH(VueTable, { columns: COLUMNS, rows: ROWS, onSort }),
    });
    app.mount(host);

    const sortableTh = host.querySelector('.forge-table__th--sortable') as HTMLElement;
    expect(sortableTh).not.toBeNull();
    expect(sortableTh.getAttribute('tabindex')).toBe('0');

    // Press Enter to cycle to 'asc'
    sortableTh.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await nextTick();
    expect(onSort).toHaveBeenNthCalledWith(1, 'name', 'asc');

    // Press Space to trigger sorting
    sortableTh.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await nextTick();
    expect(onSort).toHaveBeenNthCalledWith(2, 'name', 'asc');

    app.unmount();
    host.remove();
  });
});
