import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './forge-icon-draw-polygon.module.scss';

export interface IconDrawPolygonProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `ForgeIconDrawPolygon` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `forge-icon-draw-polygon.module.scss`.
 */
export function ForgeIconDrawPolygon(properties: Readonly<IconDrawPolygonProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['forge-icon-draw-polygon']}>
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
        <polygon points="12,3 21,9 18,20 6,20 3,9" />
        <circle
          fill={color}
          cx={12}
          cy={3}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={21}
          cy={9}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={18}
          cy={20}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={6}
          cy={20}
          r="1.5"
          stroke="none"
        />
        <circle
          fill={color}
          cx={3}
          cy={9}
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
