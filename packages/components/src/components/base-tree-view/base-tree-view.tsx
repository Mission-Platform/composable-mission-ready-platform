import { IconChevron } from '@mission-platform/icons';
import { h, Slot, useState, type MpElement, type MpProperties, type MpRenderProperty } from '@mission-platform/forge';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-tree-view.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TreeViewSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A node in the tree rendered by {@link BaseTreeView}. */
export interface TreeViewNode {
  /** Stable identity. */
  id: string | number;
  /** Display label. */
  label: string;
  /** Child nodes (a node with children is expandable). */
  children?: TreeViewNode[];
}

/** The scope passed to {@link BaseTreeView}'s `label` (scoped) slot per node. */
export interface TreeViewLabelScope {
  /** The node being rendered. */
  node: TreeViewNode;
  /** Depth in the tree (0 = root). */
  depth: number;
}

export interface TreeViewProperties extends MpProperties {
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
 * `BaseTreeView` — a recursive, accessible tree authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`. Each node may be expanded/collapsed and
 * clicked; the open state is held with the neutral {@link useState} hook, and
 * each label may be customised through the scoped `label` slot
 * (`{ node, depth }`) which falls back to the node's text. Keyboard support
 * mirrors the original (Enter/Space select, Arrow Right/Left expand/collapse).
 * It owns its styling through the co-located CSS Module `base-tree-view.module.scss`.
 *
 * Mirroring the original Vue SFC (which composed recursive
 * `BaseTreeNode`/`BaseTreeNodeLabel` sub-components), the JSX version renders
 * **true nested markup** — each expandable, open node renders a recursive
 * `renderNode` walk into a child `<ul role="group">` rather than flattening the
 * visible tree into one list. A single root-level `openMap` (keyed by
 * `node.id`, exactly like the Vue root state) drives every node's expanded
 * state. The chevron is the write-once `@mission-platform/icons` `IconChevron`
 * (rotated via its `direction` prop); the scoped `label` slot, the
 * `aria-selected`/`aria-expanded` semantics, and the `onSelect`/`onToggle`
 * callback props otherwise match.
 */
export function BaseTreeView(properties: Readonly<TreeViewProperties>): MpElement {
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

  const renderNode = (node: TreeViewNode, depth: number): MpElement => (
    <li
      key={node.id}
      className={[styles['tree-node']]}
      role="none"
    >
      <span
        role="treeitem"
        aria-expanded={hasChildren(node) ? isOpen(node) : undefined}
        aria-selected={false}
        tabindex={0}
        className={[styles['tree-node__label']]}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => select(node)}
        onKeyDown={(event: KeyboardEvent) => onKeyDown(event, node)}
      >
        {hasChildren(node) ? (
          <button
            type="button"
            className={[
              styles['tree-node__toggle'],
              {
                [styles['tree-node__toggle--open']]: isOpen(node),
              },
            ]}
            aria-label={isOpen(node) ? 'Collapse' : 'Expand'}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              toggle(node);
            }}
          >
            <IconChevron
              direction={isOpen(node) ? 'down' : 'right'}
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
          <BaseTypography
            as="span"
            color="inherit"
            variant="body-sm"
          >
            {node.label}
          </BaseTypography>
        </Slot>
      </span>
      {hasChildren(node) && isOpen(node) ? (
        <ul
          className={[styles['tree-node__children']]}
          role="group"
        >
          {(node.children as TreeViewNode[]).map((child) => renderNode(child, depth + 1))}
        </ul>
      ) : undefined}
    </li>
  );

  return (
    <ul
      className={[styles['tree-view'], sizeStyles[`base-size--${size}`]]}
      role="tree"
    >
      {nodes.map((node) => renderNode(node, 0))}
    </ul>
  );
}
