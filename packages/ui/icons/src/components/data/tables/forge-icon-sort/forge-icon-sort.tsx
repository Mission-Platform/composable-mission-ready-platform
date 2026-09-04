import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-sort.module.scss';

import type { MpElement } from '@mission-platform/forge-jsx';

/** The active sort direction, or `undefined` when unsorted. */
export type SortDirection = 'asc' | 'desc' | undefined;

export interface IconSortProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Whether the column is the active sort column. */
  active?: boolean;
  /** The active sort direction; fills the matching chevron. */
  direction?: SortDirection;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `ForgeIconSort` — a two-chevron sort indicator authored once in the neutral JSX
 * dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `forge-icon-sort.module.scss`.
 */
export function ForgeIconSort(properties: Readonly<IconSortProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';
  const active = properties.active ?? false;
  const direction = properties.direction;

  return (
    <div className={styles['forge-icon-sort']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        width={sizeValue}
        fill="none"
        role="img"
        stroke={color}
        data-active={active}
        data-direction={direction}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref('icon-sort')} />
      </svg>
    </div>
  );
}

/** Map named size tokens to pixel values. */
function mapTokenToPixels(token: string): number {
  const sizes: Record<string, number> = {
    '2xs': 12,
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    '2xl': 48,
  };
  return sizes[token] ?? 24;
}
