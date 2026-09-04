import {
  useState,
  createForgeStyle,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import { ForgeTreeViewItem } from './forge-tree-view-item';
import styles from './forge-tree-view.module.scss';

import type { TreeViewLabelScope, TreeViewNode } from './forge-tree-view-item';

/** Size token — canonical 2xs → 2xl scale. */
export type TreeViewSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type { TreeViewLabelScope, TreeViewNode } from './forge-tree-view-item';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TreeViewStyleProperties {
  readonly 'data-tree-font-family'?: string;
  readonly 'data-tree-font-size'?: string;
  readonly 'data-tree-label-focus-ring'?: string;
  readonly 'data-tree-label-gap'?: string;
  readonly 'data-tree-label-height'?: string;
  readonly 'data-tree-label-hover-surface'?: string;
  readonly 'data-tree-label-padding-inline-end'?: string;
  readonly 'data-tree-label-radius'?: string;
  readonly 'data-tree-label-transition-duration'?: string;
  readonly 'data-tree-label-transition-easing'?: string;
  readonly 'data-tree-text-default'?: string;
  readonly 'data-tree-text-toggle'?: string;
  readonly 'data-tree-text-toggle-hover'?: string;
  readonly 'data-tree-text-toggle-open'?: string;
  readonly 'data-tree-toggle-radius'?: string;
  readonly 'data-tree-toggle-size'?: string;
  readonly 'data-tree-toggle-transition-duration'?: string;
  readonly 'data-tree-toggle-transition-easing'?: string;
}

export type TreeViewStyle = CSSStyleProperties & {
  readonly '--forge-tree-view-data-tree-font-family'?: string | undefined;
  readonly '--forge-tree-view-data-tree-font-size'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-focus-ring'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-gap'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-height'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-hover-surface'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-padding-inline-end'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-radius'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-transition-duration'?: string | undefined;
  readonly '--forge-tree-view-data-tree-label-transition-easing'?: string | undefined;
  readonly '--forge-tree-view-data-tree-text-default'?: string | undefined;
  readonly '--forge-tree-view-data-tree-text-toggle'?: string | undefined;
  readonly '--forge-tree-view-data-tree-text-toggle-hover'?: string | undefined;
  readonly '--forge-tree-view-data-tree-text-toggle-open'?: string | undefined;
  readonly '--forge-tree-view-data-tree-toggle-radius'?: string | undefined;
  readonly '--forge-tree-view-data-tree-toggle-size'?: string | undefined;
  readonly '--forge-tree-view-data-tree-toggle-transition-duration'?: string | undefined;
  readonly '--forge-tree-view-data-tree-toggle-transition-easing'?: string | undefined;
};

function createTreeViewStyle(properties: Readonly<TreeViewStyleProperties> | undefined): TreeViewStyle | undefined {
  return createForgeStyle({
    '--forge-tree-view-data-tree-font-family': properties?.['data-tree-font-family'],
    '--forge-tree-view-data-tree-font-size': properties?.['data-tree-font-size'],
    '--forge-tree-view-data-tree-label-focus-ring': properties?.['data-tree-label-focus-ring'],
    '--forge-tree-view-data-tree-label-gap': properties?.['data-tree-label-gap'],
    '--forge-tree-view-data-tree-label-height': properties?.['data-tree-label-height'],
    '--forge-tree-view-data-tree-label-hover-surface': properties?.['data-tree-label-hover-surface'],
    '--forge-tree-view-data-tree-label-padding-inline-end': properties?.['data-tree-label-padding-inline-end'],
    '--forge-tree-view-data-tree-label-radius': properties?.['data-tree-label-radius'],
    '--forge-tree-view-data-tree-label-transition-duration': properties?.['data-tree-label-transition-duration'],
    '--forge-tree-view-data-tree-label-transition-easing': properties?.['data-tree-label-transition-easing'],
    '--forge-tree-view-data-tree-text-default': properties?.['data-tree-text-default'],
    '--forge-tree-view-data-tree-text-toggle': properties?.['data-tree-text-toggle'],
    '--forge-tree-view-data-tree-text-toggle-hover': properties?.['data-tree-text-toggle-hover'],
    '--forge-tree-view-data-tree-text-toggle-open': properties?.['data-tree-text-toggle-open'],
    '--forge-tree-view-data-tree-toggle-radius': properties?.['data-tree-toggle-radius'],
    '--forge-tree-view-data-tree-toggle-size': properties?.['data-tree-toggle-size'],
    '--forge-tree-view-data-tree-toggle-transition-duration': properties?.['data-tree-toggle-transition-duration'],
    '--forge-tree-view-data-tree-toggle-transition-easing': properties?.['data-tree-toggle-transition-easing'],
  }) as TreeViewStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TreeViewStyleProperties>;
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
  const style = createTreeViewStyle(properties.properties);

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
      style={style}
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
