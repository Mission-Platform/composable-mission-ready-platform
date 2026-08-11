import { h, type MpElement } from '@mission-platform/forge';

import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-arrow.module.scss';

/** The direction the arrow points. */
export type IconArrowDirection = 'up' | 'right' | 'down' | 'left';

export interface IconArrowProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** The direction the arrow points. Defaults to `up`. */
  direction?: IconArrowDirection;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

const ROTATION: Record<IconArrowDirection, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

/**
 * `ForgeIconArrow` — a directional arrow authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `forge-icon-arrow.module.scss`.
 */
export function ForgeIconArrow(properties: Readonly<IconArrowProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';
  const direction = properties.direction ?? 'up';

  return (
    <div className={styles['forge-icon-arrow']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel ?? `Arrow ${direction}`}
        height={sizeValue}
        stroke={color}
        width={sizeValue}
        style={{
          transform: `rotate(${ROTATION[direction]}deg)`,
          transition: 'transform 200ms ease',
        }}
        fill="none"
        role="img"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={2}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref('icon-arrow')} />
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
