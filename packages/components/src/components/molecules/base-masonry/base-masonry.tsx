import { classNames, Dynamic, h, type MpElement, type MpProperties } from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';
import spacingStyles from '../../../styles/spacing.module.scss';

import styles from './base-masonry.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type MasonrySize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named gap scale; each step resolves to a `--mp-spacing-*` design token. */
export type MasonryGap = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Maps each {@link MasonryGap} step onto a `--mp-spacing-*` token. */
const GAP_SPACING: Record<MasonryGap, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

export interface MasonryProperties extends MpProperties {
  /** Size token controlling the masonry's font scale. Defaults to `'md'`. */
  size?: MasonrySize;
  /** Fixed number of columns. Ignored when `minColumnWidth` is set. */
  columns?: number;
  /** Minimum column width (any CSS length). Enables responsive auto-fit columns. */
  minColumnWidth?: string;
  /** Gap between items / columns (named `2xs … 2xl` scale). */
  gap?: MasonryGap;
  /** The HTML tag the masonry container renders as. */
  tag?: string;
  /** Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  margin?: SpacingScale;
  /** Inner padding (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  padding?: SpacingScale;
}

/**
 * `BaseMasonry` — a CSS multi-column masonry layout primitive authored once in
 * the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It flows its default-slot children into balanced columns where each item
 * keeps its natural height and packs tightly top-to-bottom. Provide a fixed
 * number of `columns`, or set `minColumnWidth` to fit as many columns of at
 * least that width as will fit (`minColumnWidth` wins). The container exposes
 * the gap as the `--mp-masonry-gap` custom property and, like the Vue original,
 * keeps every default-slot child break-safe automatically. Unlike the Vue
 * original it does not expose the `items` prop / scoped `item` slot, which maps
 * onto Vue's scoped slots.
 *
 * It owns the container box and per-child break-safety through the co-located
 * CSS Module `base-masonry.module.scss` (carried onto every framework by the
 * two-stage compiler, so the component ships its own `@layer mp.components`
 * CSS); the dynamic multi-column properties are applied inline.
 */
export function BaseMasonry(properties: Readonly<MasonryProperties>): MpElement {
  const { columns = 3, minColumnWidth, gap = 'md', tag = 'div', padding, margin, size = 'md' } = properties;

  const columnCount = Math.max(1, Math.floor(columns));
  const gapValue = GAP_SPACING[gap];
  const style: Record<string, string> = {
    columnGap: gapValue,
    '--mp-masonry-gap': gapValue,
    ...(minColumnWidth === undefined ? { columnCount: String(columnCount) } : { columnWidth: minColumnWidth }),
  };

  // Optional `padding`/`margin` (named `2xs … 2xl` scale) resolve to the shared
  // token-driven spacing classes rather than inline styles.
  const className = classNames(
    styles['base-masonry'],
    sizeStyles[`base-size--${size}`],
    padding ? spacingStyles[`base-spacing--padding-${padding}`] : undefined,
    margin ? spacingStyles[`base-spacing--margin-${margin}`] : undefined,
  );

  return (
    <Dynamic
      is={tag}
      className={className}
      style={style}
    >
      {properties.children}
    </Dynamic>
  );
}
