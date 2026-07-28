import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './icon-settings.module.scss';

export interface IconSettingsProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconSettings` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-jsx
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-settings.module.scss`.
 */
export function IconSettings(properties: Readonly<IconSettingsProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['base-icon-settings']}>
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
        <circle
          cx={12}
          cy={12}
          r={3}
        />
        <path d="M19.4 15A1.65 1.65 0 0 0 19 16.35L19.08 16.6A2 2 0 1 1 16.08 19.6L15.83 19.52A1.65 1.65 0 0 0 14.35 20.06L14.2 20.39A2 2 0 1 1 9.8 20.39L9.65 20.06A1.65 1.65 0 0 0 8.17 19.52L7.92 19.6A2 2 0 1 1 4.92 16.6L5 16.35A1.65 1.65 0 0 0 4.6 15L4.34 14.8A2 2 0 1 1 4.34 9.2L4.6 9A1.65 1.65 0 0 0 5 7.65L4.92 7.4A2 2 0 1 1 7.92 4.4L8.17 4.48A1.65 1.65 0 0 0 9.65 3.94L9.8 3.61A2 2 0 1 1 14.2 3.61L14.35 3.94A1.65 1.65 0 0 0 15.83 4.48L16.08 4.4A2 2 0 1 1 19.08 7.4L19 7.65A1.65 1.65 0 0 0 19.4 9L19.66 9.2A2 2 0 1 1 19.66 14.8Z" />
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
