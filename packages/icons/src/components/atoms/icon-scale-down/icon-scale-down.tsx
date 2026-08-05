import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './icon-scale-down.module.scss';

export interface IconScaleDownProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconScaleDown` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-scale-down.module.scss`.
 */
export function IconScaleDown(properties: Readonly<IconScaleDownProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['base-icon-scale-down']}>
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
        <polyline points="3,9 3,3 9,3" />
        <polyline points="15,21 21,21 21,15" />
        <polyline points="9,3 3,3 3,9" />
        <polyline points="21,9 21,3 15,3" />
        <line
          x1={3}
          x2={10}
          y1={21}
          y2={14}
        />
        <line
          x1={21}
          x2={14}
          y1={3}
          y2={10}
        />
        <line
          x1={3}
          x2={10}
          y1={3}
          y2={10}
        />
        <line
          x1={21}
          x2={14}
          y1={21}
          y2={14}
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
