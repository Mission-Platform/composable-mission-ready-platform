import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseVirtualTreeView, type TreeNode } from './base-virtual-tree-view';

/**
 * Exercises the **neutral** `BaseVirtualTreeView` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` runtime
 * adapters. Covers the flattened visible rows (built-in label fallback) and the
 * collapsed-by-default behaviour.
 */
const ReactTree = toReactComponent(BaseVirtualTreeView, 'VirtualTreeView');
const VueTree = toVueComponent(BaseVirtualTreeView, 'VirtualTreeView');

const NODES: TreeNode[] = [
  {
    id: 'root',
    label: 'Root',
    children: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Bravo' },
    ],
  },
];

describe('BaseVirtualTreeView authors the same component for React and Vue', () => {
  it('renders the root row and hides collapsed children on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTree, { nodes: NODES, height: 200 }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTree, { nodes: NODES, height: 200 }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Root');
      // Collapsed by default — children are not in the flattened output.
      expect(html).not.toContain('Alpha');
    }
  });

  it('expands every node when defaultOpen is set, on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTree, { nodes: NODES, height: 200, defaultOpen: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTree, { nodes: NODES, height: 200, defaultOpen: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Alpha');
      expect(html).toContain('Bravo');
    }
  });
});
