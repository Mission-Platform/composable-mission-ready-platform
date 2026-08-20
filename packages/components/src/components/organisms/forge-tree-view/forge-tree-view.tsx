import { h, type MpElement, type MpRenderProperty, useState } from '@mission-platform/forge';

import { ForgeTreeViewItem } from './forge-tree-view-item';
import styles from './forge-tree-view.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TreeViewSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A node in the tree rendered by {@link ForgeTreeView}. */
export interface TreeViewNode {
  /** Stable identity. */
  id: string | number;
  /** Display label. */
  label: string;
  /** Child nodes (a node with children is expandable). */
  children?: TreeViewNode[];
}

/** The scope passed to {@link ForgeTreeView}'s `label` (scoped) slot per node. */
export interface TreeViewLabelScope {
  /** The node being rendered. */
  node: TreeViewNode;
  /** Depth in the tree (0 = root). */
  depth: number;
}

export interface TreeViewProperties {
  /** Root-level nodes. */
  nodes: TreeViewNode[];
  /** Expand every node initially. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Size token controlling the tree's scale. Defaults to `'md'`. */
  size?: TreeViewSize;
  /** Custom label renderer (a scoped slot); falls back to the node's text label. */
  label?: MpRenderProperty<TreeViewLabelScope>;
  /** Fired when a node label is clicked. */
  onSelect?: (node: TreeViewNode) => void;
  /** Fired when a node is expanded/collapsed. */
  onToggle?: (node: TreeViewNode) => void;
}

/** Whether a node is expandable (has at least one child). */
function hasChildren(node: TreeViewNode): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

/**
 * `ForgeTreeView` — a recursive, accessible tree authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`. Each node may be expanded/collapsed and
 * clicked; the open state is held with the neutral {@link useState} hook, and
 * each label may be customised through the scoped `label` slot
 * (`{ node, depth }`) which falls back to the node's text. Keyboard support
 * mirrors the original (Enter/Space select, Arrow Right/Left expand/collapse).
 * It owns its styling through the co-located CSS Module `forge-tree-view.module.scss`.
 *
 * Mirroring the original Vue SFC (which composed recursive
 * `ForgeTreeNode`/`ForgeTreeNodeLabel` sub-components), the JSX version renders
 * **true nested markup**: each root node is a recursive {@link ForgeTreeViewItem}
 * (extracted into its own sibling component) that renders its children into a
 * nested `<ul role="group">` rather than flattening the visible tree into one
 * list. A single root-level `openMap` (keyed by `node.id`, exactly like the Vue
 * root state) drives every node's expanded state and is shared with every item
 * through the `resolveOpen`/`selectNode`/`toggleNode`/`keyDownNode` props; the
 * scoped `label` slot is forwarded down unchanged, and the
 * `aria-selected`/`aria-expanded` semantics and the `onSelect`/`onToggle`
 * callback props otherwise match.
 */
export function ForgeTreeView(properties: Readonly<TreeViewProperties>): MpElement {
  const { nodes, defaultOpen = false, size = 'md' } = properties;

  const [openMap, setOpenMap] = useState<Record<string | number, boolean>>({});

  const isOpen = (node: TreeViewNode): boolean => (node.id in openMap ? openMap[node.id] : defaultOpen);

  const toggle = (node: TreeViewNode): void => {
    setOpenMap({ ...openMap, [node.id]: !isOpen(node) });
    properties.onToggle?.(node);
  };

  const select = (node: TreeViewNode): void => {
    properties.onSelect?.(node);
  };

  const onKeyDown = (event: KeyboardEvent, node: TreeViewNode): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(node);
    }
    if (event.key === 'ArrowRight' && hasChildren(node) && !isOpen(node)) {
      toggle(node);
    }
    if (event.key === 'ArrowLeft' && hasChildren(node) && isOpen(node)) {
      toggle(node);
    }
  };

  return (
    <ul
      className={[styles['tree-view'], size ? `forge-size--${size}` : undefined]}
      role="tree"
    >
      {nodes.map((node) => (
        <ForgeTreeViewItem
          key={node.id}
          node={node}
          depth={0}
          resolveOpen={isOpen}
          selectNode={select}
          toggleNode={toggle}
          keyDownNode={onKeyDown}
          label={properties.label}
        />
      ))}
    </ul>
  );
}
