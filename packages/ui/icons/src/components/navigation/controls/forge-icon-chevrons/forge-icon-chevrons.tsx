import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-chevrons.module.scss';

import type { MpElement } from '@mission-platform/forge-jsx';

/** The direction the double chevron points. */
export type IconChevronsDirection = 'up' | 'right' | 'down' | 'left';

export interface IconChevronsProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** The direction the double chevron points. Defaults to `right`. */
  direction?: IconChevronsDirection;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

const ROTATION: Record<IconChevronsDirection, number> = {
  up: 90,
  right: 0,
  down: 270,
  left: 180,
};

/**
 * `ForgeIconChevrons` — a directional double chevron (« ») authored once in the
 * neutral JSX dialect, typically used for jump-to-first / jump-to-last controls.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `forge-icon-chevrons.module.scss`.
 */
export function ForgeIconChevrons(properties: Readonly<IconChevronsProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';
  const direction = properties.direction ?? 'right';

  return (
    <div className={styles['forge-icon-chevrons']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel ?? `Chevrons ${direction}`}
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
        <use href={useIconHref('icon-chevrons')} />
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
