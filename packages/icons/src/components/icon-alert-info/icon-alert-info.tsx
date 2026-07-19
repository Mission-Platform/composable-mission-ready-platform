import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './icon-alert-info.module.scss';

export interface IconAlertInfoProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconAlertInfo` — the informational alert glyph (an "i" inside a circle)
 * authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-jsx
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-alert-info.module.scss`.
 */
export function IconAlertInfo(properties: Readonly<IconAlertInfoProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div classNames={styles['base-icon-alert-info']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel ?? 'Info'}
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
        <circle
          cx={12}
          cy={12}
          r={10}
        />
        <line
          x1={12}
          x2={12}
          y1={11}
          y2={16}
        />
        <line
          x1={12}
          x2="12.01"
          y1={8}
          y2={8}
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
