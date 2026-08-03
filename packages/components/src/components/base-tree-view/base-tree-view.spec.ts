import { h } from '@mission-platform/forge';
import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseTreeView, type TreeViewNode } from './base-tree-view';

/**
 * Exercises the **neutral** `BaseTreeView` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the built-in label fallback and the collapsed/expanded behaviour.
 */
const ReactTree = toReactComponent(BaseTreeView, 'TreeView');
const VueTree = toVueComponent(BaseTreeView, 'TreeView');

const NODES: TreeViewNode[] = [
  {
    id: 'root',
    label: 'Root',
    children: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Bravo' },
    ],
  },
];

describe('BaseTreeView authors the same component for React and Vue', () => {
  it('renders the root row and hides collapsed children on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTree, { nodes: NODES }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTree, { nodes: NODES }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Root');
      // Collapsed by default — children are not in the output.
      expect(html).not.toContain('Alpha');
    }
  });

  it('expands every node when defaultOpen is set, on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTree, { nodes: NODES, defaultOpen: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTree, { nodes: NODES, defaultOpen: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Alpha');
      expect(html).toContain('Bravo');
    }
  });

  it('renders children as a genuinely nested role="group" list (not a flattened tree)', async () => {
    const react = renderToStaticMarkup(createElement(ReactTree, { nodes: NODES, defaultOpen: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTree, { nodes: NODES, defaultOpen: true }) }),
    );

    for (const html of [react, vue]) {
      // The root is a `role="tree"` and the expanded children sit inside a
      // recursive `role="group"` sub-list — the marker of true nesting.
      expect(html).toContain('role="tree"');
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-selected="false"');
      // The group `<ul>` is nested *inside* a node's `<li>` (recursion), so the
      // group opening tag appears after the first treeitem, before its close.
      const groupIndex = html.indexOf('role="group"');
      const firstItemIndex = html.indexOf('role="treeitem"');
      expect(firstItemIndex).toBeGreaterThanOrEqual(0);
      expect(groupIndex).toBeGreaterThan(firstItemIndex);
    }
  });

  it('renders the scoped `label` slot for nested nodes on both frameworks', async () => {
    const properties = {
      nodes: NODES,
      defaultOpen: true,
      label: ({ node, depth }: { node: TreeViewNode; depth: number }) =>
        h('span', { 'data-depth': depth }, `[${node.label}]`),
    };
    const react = renderToStaticMarkup(createElement(ReactTree, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTree, properties) }));

    for (const html of [react, vue]) {
      // The custom renderer is used at the root (depth 0) and the nested
      // children (depth 1), proving the scoped slot survives recursion.
      expect(html).toContain('[Root]');
      expect(html).toContain('[Alpha]');
      expect(html).toContain('data-depth="1"');
    }
  });
});
