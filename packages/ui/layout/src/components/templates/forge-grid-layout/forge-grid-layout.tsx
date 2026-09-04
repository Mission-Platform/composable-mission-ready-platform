import { h, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge-jsx';

import styles from './forge-grid-layout.module.scss';

/** Named spacing tokens used by `ForgeGridLayout`. */
export type GridLayoutSpacing = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Viewport breakpoint used by the grid's narrow-layout fallback. */
export type GridLayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/** Semantic container elements supported by `ForgeGridLayout`. */
export type GridLayoutTag = 'div' | 'section' | 'article' | 'main' | 'aside';
/** Supported ordered named cell slots (`cell1` through `cell12`). */
export type GridLayoutCell =
  | 'cell1'
  | 'cell2'
  | 'cell3'
  | 'cell4'
  | 'cell5'
  | 'cell6'
  | 'cell7'
  | 'cell8'
  | 'cell9'
  | 'cell10'
  | 'cell11'
  | 'cell12';

export interface GridLayoutProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** Number of grid rows. Values below one are clamped to one. Defaults to `1`. */
  rows?: number;
  /** Number of grid columns. Values below one are clamped to one. Defaults to `1`. */
  columns?: number;
  /** The gap between named cells, mapped to a Mission Platform spacing token. */
  gap?: GridLayoutSpacing;
  /** The semantic HTML element used for the layout root. Defaults to `div`. */
  tag?: GridLayoutTag;
  /** Optional outer margin, mapped to a Mission Platform spacing token. */
  margin?: GridLayoutSpacing;
  /** Optional inner padding, mapped to a Mission Platform spacing token. */
  padding?: GridLayoutSpacing;
  /** Breakpoint at which the grid uses its narrow-layout fallback. Defaults to `md`. */
  breakpoint?: GridLayoutBreakpoint;
}

const SPACING: Record<GridLayoutSpacing, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

const GRID_CELLS: readonly GridLayoutCell[] = [
  'cell1',
  'cell2',
  'cell3',
  'cell4',
  'cell5',
  'cell6',
  'cell7',
  'cell8',
  'cell9',
  'cell10',
  'cell11',
  'cell12',
];

/**
 * `ForgeGridLayout` renders the supplied `cell1` … `cell12` named slots in
 * source order. The grid is one column on narrow screens and uses its requested
 * tracks only after the configured responsive breakpoint.
 */
export function ForgeGridLayout(properties: Readonly<GridLayoutProperties>): MpElement {
  const { breakpoint = 'md', columns = 1, gap = 'md', margin, padding, rows = 1, tag = 'div' } = properties;
  const rowCount = Math.max(1, Math.floor(rows));
  const columnCount = Math.max(1, Math.floor(columns));
  const cellCount = Math.min(GRID_CELLS.length, rowCount * columnCount);
  const style: Record<string, string> = {
    '--forge-grid-columns': `repeat(${columnCount}, minmax(0, 1fr))`,
    '--forge-grid-rows': `repeat(${rowCount}, minmax(0, auto))`,
    gap: SPACING[gap],
  };
  if (margin) style.margin = SPACING[margin];
  if (padding) style.padding = SPACING[padding];

  const cells: MpElement[] = [];
  for (const name of GRID_CELLS.slice(0, cellCount)) {
    if (hasSlot(name)) {
      cells.push(h('div', { className: styles['grid-layout__cell'], 'data-cell': name }, h(Slot, { name })));
    }
  }

  return h(
    tag,
    {
      className: [styles['grid-layout'], styles[`grid-layout--${breakpoint}`]],
      style,
    },
    ...cells,
  );
}
