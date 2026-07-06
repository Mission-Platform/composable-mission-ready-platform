import {
  h,
  Slot,
  useEffect,
  useRef,
  useState,
  type MpElement,
  type MpProperties,
  type MpRenderProperty,
} from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-virtual-tree-view.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualTreeViewSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A node in the tree rendered by {@link BaseVirtualTreeView}. */
export interface TreeNode {
  /** Stable identity. */
  id: string | number;
  /** Display label. */
  label: string;
  /** Child nodes (a node with children is expandable). */
  children?: TreeNode[];
}

/** The scope passed to {@link BaseVirtualTreeView}'s `row` (scoped) slot per visible node. */
export interface TreeRowScope {
  /** The node for this row. */
  node: TreeNode;
  /** Depth in the tree (0 = root). */
  depth: number;
  /** Whether the node is currently expanded. */
  isOpen: boolean;
  /** Toggle this node's expanded state. */
  toggle: () => void;
  /** Select this node (fires `onSelect`). */
  select: () => void;
}

export interface VirtualTreeViewProperties extends MpProperties {
  /** Root-level nodes. */
  nodes: TreeNode[];
  /** Size token controlling the tree's font scale. Defaults to `'md'`. */
  size?: VirtualTreeViewSize;
  /** Fixed row height (px). Defaults to `32`. */
  itemHeight?: number;
  /** Extra rows rendered above/below the viewport. Defaults to `3`. */
  overscan?: number;
  /** Viewport height (px). Defaults to `400`. */
  height?: number;
  /** Expand every node initially. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Custom row renderer (a scoped slot); falls back to the built-in node label. */
  row?: MpRenderProperty<TreeRowScope>;
  /** Fired when a node is clicked. */
  onSelect?: (node: TreeNode) => void;
  /** Fired when a node is expanded/collapsed. */
  onToggle?: (node: TreeNode) => void;
}

/** A node paired with its tree depth, produced by flattening the visible tree. */
interface FlatNode {
  node: TreeNode;
  depth: number;
}

/**
 * `BaseVirtualTreeView` — a virtual-scrolling tree that flattens its visible
 * nodes into a single list and renders only the rows within the viewport, so
 * trees with tens of thousands of nodes stay smooth. Authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`; the open state and scroll position use
 * the neutral hooks. Each row may be customised through the scoped `row` slot
 * (`{ node, depth, isOpen, toggle, select }`) and falls back to a built-in label
 * with an expand/collapse chevron. Owns its styling through `base-virtual-tree-view.module.scss`.
 *
 * The original Vue SFC composed `BaseTreeNodeLabel`, used a scoped **default**
 * slot, and `select`/`toggle` emits. The neutral version inlines the label,
 * substitutes a `▸`/`▾` glyph for the icons-package chevron, uses a named `row`
 * scoped slot (the runtime adapters forward named — not default — slots with
 * scope), and the `onSelect`/`onToggle` callback props.
 */
export function BaseVirtualTreeView(properties: VirtualTreeViewProperties): MpElement {
  const { nodes, itemHeight = 32, overscan = 3, height = 400, defaultOpen = false, size = 'md' } = properties;

  const [scrollTop, setScrollTop] = useState(0);
  const [openMap, setOpenMap] = useState<Record<string | number, boolean>>({});
  const containerReference = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = containerReference.current;
    if (element === null) {
      return;
    }
    const handleScroll = (event: Event): void => {
      setScrollTop((event.target as HTMLElement).scrollTop);
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  const isOpen = (node: TreeNode): boolean => (node.id in openMap ? openMap[node.id] : defaultOpen);

  const toggle = (node: TreeNode): void => {
    setOpenMap({ ...openMap, [node.id]: !isOpen(node) });
    properties.onToggle?.(node);
  };

  const select = (node: TreeNode): void => {
    properties.onSelect?.(node);
  };

  const flatten = (input: TreeNode[], depth: number): FlatNode[] => {
    const result: FlatNode[] = [];
    for (const node of input) {
      result.push({ node, depth });
      if (isOpen(node) && Array.isArray(node.children) && node.children.length > 0) {
        result.push(...flatten(node.children, depth + 1));
      }
    }
    return result;
  };

  const flatNodes = flatten(nodes, 0);
  const totalHeight = flatNodes.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight);
  const endIndex = Math.min(flatNodes.length - 1, Math.floor(scrollTop / itemHeight) + visibleCount + overscan);
  const offsetY = startIndex * itemHeight;
  const visibleRows = flatNodes
    .slice(startIndex, endIndex + 1)
    .map((flat, offset) => ({ node: flat.node, depth: flat.depth, index: startIndex + offset }));

  return (
    <div
      ref={containerReference}
      classNames={[styles['virtual-tree'], sizeStyles[`base-size--${size}`]]}
      role="tree"
      tabindex={0}
      style={{ height: `${height}px`, overflowY: 'auto', position: 'relative' }}
    >
      <div
        aria-hidden="true"
        style={{ height: `${totalHeight}px`, position: 'relative', pointerEvents: 'none' }}
      />
      <div style={{ position: 'absolute', top: `${offsetY}px`, left: '0', right: '0' }}>
        {visibleRows.map(({ node, depth }) => (
          <div
            key={node.id}
            role="none"
            classNames={[styles['virtual-tree__row']]}
            style={{ height: `${itemHeight}px`, boxSizing: 'border-box' }}
          >
            <Slot
              name="row"
              node={node}
              depth={depth}
              isOpen={isOpen(node)}
              toggle={() => toggle(node)}
              select={() => select(node)}
            >
              <div
                role="treeitem"
                aria-expanded={Boolean(node.children?.length) ? isOpen(node) : undefined}
                tabindex={0}
                classNames={[styles['virtual-tree__label']]}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => select(node)}
              >
                {node.children?.length ? (
                  <button
                    type="button"
                    classNames={[styles['virtual-tree__toggle']]}
                    aria-label={isOpen(node) ? 'Collapse' : 'Expand'}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      toggle(node);
                    }}
                  >
                    {isOpen(node) ? '▾' : '▸'}
                  </button>
                ) : (
                  <span
                    classNames={[styles['virtual-tree__spacer']]}
                    aria-hidden="true"
                  />
                )}
                {node.label}
              </div>
            </Slot>
          </div>
        ))}
      </div>
    </div>
  );
}
