import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeVirtualList, type VirtualListItemScope } from './forge-virtual-list';

/**
 * Exercises the **neutral** `ForgeVirtualList` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * The key behaviour is the **scoped `row` slot** (`<Slot name="row" item index/>`),
 * which compiles to a Vue scoped slot and a React render-prop and is exercised
 * here through the adapters' named-slot forwarding.
 */
const ReactVirtualList = toReactComponent(ForgeVirtualList, 'VirtualList');
const VueVirtualList = toVueComponent(ForgeVirtualList, 'VirtualList');

const ITEMS = Array.from({ length: 40 }, (_, index) => `Item ${index}`);
// The row renderer returns a plain string so it flows identically through both
// runtime adapters (Vue normalises a scoped-slot's string return to a text node).
const renderRow = (scope: VirtualListItemScope) => String(scope.item);

describe('ForgeVirtualList authors the same component for React and Vue', () => {
  it('renders only the windowed rows through the scoped `row` slot on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactVirtualList, { items: ITEMS, itemHeight: 20, height: 80, row: renderRow }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueVirtualList, { items: ITEMS, itemHeight: 20, height: 80 }, { row: renderRow }),
      }),
    );

    for (const html of [react, vue]) {
      // The list container and at least the first row are rendered…
      expect(html).toContain('forge-virtual-list');
      expect(html).toContain('Item 0');
      // …but the far-off rows are virtualised away (window ≈ 4 rows + overscan).
      expect(html).not.toContain('Item 39');
    }
  });

  it('sizes the inner spacer to the full content height on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactVirtualList, { items: ITEMS, itemHeight: 20, height: 80, row: renderRow }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueVirtualList, { items: ITEMS, itemHeight: 20, height: 80 }, { row: renderRow }),
      }),
    );

    // 40 items × 20px = 800px total scroll height.
    for (const html of [react, vue]) {
      expect(html).toContain('800px');
    }
  });
});
