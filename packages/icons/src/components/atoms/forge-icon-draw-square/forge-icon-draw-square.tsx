import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './forge-icon-draw-square.module.scss';

export interface IconDrawSquareProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `ForgeIconDrawSquare` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `forge-icon-draw-square.module.scss`.
 */
export function ForgeIconDrawSquare(properties: Readonly<IconDrawSquareProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['forge-icon-draw-square']}>
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
        <rect
          height={18}
          rx={1}
          width={18}
          x={3}
          y={3}
        />
        <circle
          fill={color}
          cx={3}
          cy={3}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={21}
          cy={3}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={21}
          cy={21}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={3}
          cy={21}
          r="1.5"
          stroke="none"
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
