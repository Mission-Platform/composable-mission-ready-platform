import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './icon-puzzle.module.scss';

export interface IconPuzzleProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconPuzzle` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-jsx
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-puzzle.module.scss`.
 */
export function IconPuzzle(properties: Readonly<IconPuzzleProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['base-icon-puzzle']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        stroke={color}
        width={sizeValue}
        fill="none"
        role="img"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={2}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M10 3h4a1 1 0 0 1 1 1v2a2 2 0 1 0 4 0V6a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2a2 2 0 1 0 0 4h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2a2 2 0 1 0-4 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a2 2 0 1 0 0-4H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v0" />
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
