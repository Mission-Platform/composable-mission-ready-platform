import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './icon-bullet-list.module.scss';

export interface IconBulletListProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `IconBulletList` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-jsx
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `icon-bullet-list.module.scss`.
 */
export function IconBulletList(properties: Readonly<IconBulletListProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['base-icon-bullet-list']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel ?? 'Bullet List'}
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
        <line
          x1={9}
          x2={20}
          y1={6}
          y2={6}
        />
        <line
          x1={9}
          x2={20}
          y1={12}
          y2={12}
        />
        <line
          x1={9}
          x2={20}
          y1={18}
          y2={18}
        />
        <circle
          cx={4}
          cy={6}
          fill="currentColor"
          r={1}
          stroke="none"
        />
        <circle
          cx={4}
          cy={12}
          fill="currentColor"
          r={1}
          stroke="none"
        />
        <circle
          cx={4}
          cy={18}
          fill="currentColor"
          r={1}
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
