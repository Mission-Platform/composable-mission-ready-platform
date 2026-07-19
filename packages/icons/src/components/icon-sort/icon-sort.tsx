import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './icon-sort.module.scss';

/** The active sort direction, or `undefined` when unsorted. */
export type SortDirection = 'asc' | 'desc' | undefined;

export interface IconSortProperties extends MpProperties {
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
 * `IconSort` — a two-chevron sort indicator authored once in the neutral JSX
 * dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-jsx
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-sort.module.scss`.
 */
export function IconSort(properties: Readonly<IconSortProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';
  const active = properties.active ?? false;
  const direction = properties.direction;

  return (
    <div classNames={styles['base-icon-sort']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        width={sizeValue}
        fill="none"
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill={active && direction === 'asc' ? color : 'none'}
          stroke={color}
          d="M12 3l5 7H7l5-7z"
          stroke-width="1.5"
        />
        <path
          fill={active && direction === 'desc' ? color : 'none'}
          stroke={color}
          d="M12 21l-5-7h10l-5 7z"
          stroke-width="1.5"
        />
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
