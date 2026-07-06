import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './icon-palette.module.scss';

export interface IconPaletteProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconPalette` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-jsx
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-palette.module.scss`.
 */
export function IconPalette(properties: IconPaletteProperties): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div classNames={styles['base-icon-palette']}>
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
        <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 10 10c0 2-2 3-4 3h-2a2 2 0 0 0-2 2 2 2 0 0 1-2 2Z" />
        <circle
          fill={color}
          cx="7.5"
          cy="10.5"
          r={1}
        />
        <circle
          fill={color}
          cx={12}
          cy="7.5"
          r={1}
        />
        <circle
          fill={color}
          cx="16.5"
          cy="10.5"
          r={1}
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
