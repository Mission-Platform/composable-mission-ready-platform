import { classNames, Dynamic, h, type MpElement, type MpProperties } from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';
import spacingStyles from '../../../styles/spacing.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type GridSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named gap scale; each step resolves to a `--mp-spacing-*` design token. */
export type GridGap = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Item-placement keywords for both the inline (`justify`) and block (`align`) axes. */
export type GridAlignment = 'start' | 'center' | 'end' | 'stretch';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Maps each {@link GridGap} step onto a `--mp-spacing-*` token. */
const GAP_SPACING: Record<GridGap, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

export interface GridProperties extends MpProperties {
  /** Number of rows (m) in the grid. */
  rows?: number;
  /** Number of columns (n) in the grid. */
  cols?: number;
  /**
   * Minimum column width (any CSS length). When set, the grid switches to a
   * responsive `auto-fit` track list (`repeat(auto-fit, minmax(<minColumnWidth>, 1fr))`)
   * and `cols` is ignored — columns wrap to fit the available inline space.
   */
  minColumnWidth?: string;
  /** Gap between cells (named `2xs … 2xl` scale). Sets both the row and column gaps. */
  gap?: GridGap;
  /** Row gap (named `2xs … 2xl` scale). Overrides `gap` on the block axis. */
  rowGap?: GridGap;
  /** Column gap (named `2xs … 2xl` scale). Overrides `gap` on the inline axis. */
  columnGap?: GridGap;
  /** Inline-axis placement of each cell's content (`justify-items`). */
  justify?: GridAlignment;
  /** Block-axis placement of each cell's content (`align-items`). */
  align?: GridAlignment;
  /** The HTML tag the grid container renders as. */
  tag?: string;
  /** Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  margin?: SpacingScale;
  /** Inner padding (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  padding?: SpacingScale;
  /** Size token controlling the grid's font scale. Defaults to `'md'`. */
  size?: GridSize;
}

/**
 * `ForgeGrid` — a CSS Grid layout primitive that arranges its content into a
 * grid of `rows` (m) by `cols` (n) with a configurable `gap` (overridable per
 * axis via `rowGap` / `columnGap`). Authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Children supplied through the default slot flow into the grid cells in source
 * order and may span multiple tracks with the standard `grid-column` /
 * `grid-row` `span` CSS. Unlike the Vue original it does not expose the scoped
 * `cell` slot — that fully-populated mode maps onto Vue's scoped slots, which
 * the neutral dialect does not model.
 *
 * It emits a BEM class plus the computed grid inline style; the demo styling
 * lives in the co-located `forge-grid.module.scss` (imported by
 * `forge-grid.stories.tsx`).
 */
export function ForgeGrid(properties: Readonly<GridProperties>): MpElement {
  const {
    rows = 1,
    cols = 1,
    minColumnWidth,
    gap = 'md',
    rowGap,
    columnGap,
    justify = 'stretch',
    align = 'stretch',
    tag = 'div',
    padding,
    margin,
    size = 'md',
  } = properties;

  const rowCount = Math.max(1, Math.floor(rows));
  const columnCount = Math.max(1, Math.floor(cols));

  // When `minColumnWidth` is supplied, fit as many equal-width columns of at
  // least that width as the inline space allows (responsive `auto-fit`);
  // otherwise lay out a fixed `cols`-wide track list.
  const gridTemplateColumns =
    minColumnWidth === undefined
      ? `repeat(${columnCount}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))`;

  const style: Record<string, string> = {
    display: 'grid',
    width: '100%',
    minWidth: '0',
    gridTemplateColumns,
    gridTemplateRows: `repeat(${rowCount}, minmax(0, auto))`,
    rowGap: GAP_SPACING[rowGap ?? gap],
    columnGap: GAP_SPACING[columnGap ?? gap],
    justifyItems: justify,
    alignItems: align,
  };

  // Optional `padding`/`margin` (named `2xs … 2xl` scale) resolve to the shared
  // token-driven spacing classes rather than inline styles.
  const className = classNames(
    'forge-grid',
    padding ? spacingStyles[`forge-spacing--padding-${padding}`] : undefined,
    margin ? spacingStyles[`forge-spacing--margin-${margin}`] : undefined,
    sizeStyles[`forge-size--${size}`],
  );

  return (
    <Dynamic
      className={className}
      is={tag}
      style={style}
    >
      {properties.children}
    </Dynamic>
  );
}
