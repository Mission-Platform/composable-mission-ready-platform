import { type MpChild, type MpElement, type MpRenderProperty, Slot } from '@mission-platform/forge-jsx';
import { ForgeIconChevron } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-tree-view.module.scss';

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

/** Whether a node is expandable (has at least one child). */
function hasChildren(node: TreeViewNode): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

export interface TreeViewItemProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** The node this item renders. */
  node: TreeViewNode;
  /** Depth in the tree (0 = root), driving the row's indentation. */
  depth: number;
  /** Resolve whether a node is currently expanded (shared root state). */
  resolveOpen: (node: TreeViewNode) => boolean;
  /** Select a node (forwarded from the root's `onSelect`). */
  selectNode: (node: TreeViewNode) => void;
  /** Expand/collapse a node (forwarded from the root's `onToggle`). */
  toggleNode: (node: TreeViewNode) => void;
  /** Keyboard handler for a node row (Enter/Space select, Arrow expand/collapse). */
  keyDownNode: (event: KeyboardEvent, node: TreeViewNode) => void;
  /** The scoped `label` slot forwarded from the root, rendered per node. */
  label?: MpRenderProperty<TreeViewLabelScope>;
}

/**
 * `ForgeTreeViewItem` — a single, self-recursive tree row extracted from
 * {@link ForgeTreeView}'s former `renderNode` closure into its own focused
 * neutral component (in the same folder). It renders one node's row (chevron
 * toggle or spacer, the scoped `label` slot falling back to the node's text) and,
 * when the node is expanded, a nested `<ul role="group">` of child
 * `ForgeTreeViewItem`s — so the recursion compiles to a native recursive
 * child-component tag on every target rather than a local render helper.
 *
 * All behavioural state lives on the root {@link ForgeTreeView}: this component is
 * driven purely through props (`resolveOpen`/`selectNode`/`toggleNode`/
 * `keyDownNode`), which it forwards unchanged to its own children so a single
 * root `openMap` still governs the whole tree.
 */
export function ForgeTreeViewItem(properties: Readonly<TreeViewItemProperties>): MpElement {
  const { node, depth, resolveOpen, selectNode, toggleNode, keyDownNode } = properties;
  const open = resolveOpen(node);

  return (
    <li
      key={node.id}
      className={[styles['tree-node']]}
      role="none"
    >
      <span
        role="treeitem"
        aria-expanded={hasChildren(node) ? open : undefined}
        aria-selected={false}
        tabindex={0}
        className={[styles['tree-node__label']]}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => selectNode(node)}
        onKeyDown={(event: KeyboardEvent) => keyDownNode(event, node)}
      >
        {hasChildren(node) ? (
          <button
            type="button"
            className={[
              styles['tree-node__toggle'],
              {
                [styles['tree-node__toggle--open']]: open,
              },
            ]}
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              toggleNode(node);
            }}
          >
            <ForgeIconChevron
              direction={open ? 'down' : 'right'}
              size="2xs"
            />
          </button>
        ) : (
          <span
            className={[styles['tree-node__spacer']]}
            aria-hidden="true"
          />
        )}
        <Slot
          name="label"
          node={node}
          depth={depth}
        >
          <ForgeTypography
            as="span"
            color="inherit"
            variant="body-sm"
          >
            {node.label}
          </ForgeTypography>
        </Slot>
      </span>
      {hasChildren(node) && open ? (
        <ul
          className={[styles['tree-node__children']]}
          role="group"
        >
          {(node.children as TreeViewNode[]).map((child) => (
            <ForgeTreeViewItem
              key={child.id}
              node={child}
              depth={depth + 1}
              resolveOpen={resolveOpen}
              selectNode={selectNode}
              toggleNode={toggleNode}
              keyDownNode={keyDownNode}
              label={properties.label}
            />
          ))}
        </ul>
      ) : undefined}
    </li>
  );
}
