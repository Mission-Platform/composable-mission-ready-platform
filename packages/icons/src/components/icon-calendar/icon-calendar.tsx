import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './icon-calendar.module.scss';

export interface IconCalendarProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconCalendar` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-calendar.module.scss`.
 */
export function IconCalendar(properties: Readonly<IconCalendarProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['base-icon-calendar']}>
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
          rx={2}
          ry={2}
          width={18}
          x={3}
          y={4}
        />
        <line
          x1={16}
          x2={16}
          y1={2}
          y2={6}
        />
        <line
          x1={8}
          x2={8}
          y1={2}
          y2={6}
        />
        <line
          x1={3}
          x2={21}
          y1={10}
          y2={10}
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
