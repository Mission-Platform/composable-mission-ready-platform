import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-route.module.scss';

import type { MpElement } from '@mission-platform/forge';

export interface IconRouteProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/** A route line with distinct start and destination markers. */
export function ForgeIconRoute(properties: Readonly<IconRouteProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['forge-icon-route']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        width={sizeValue}
        fill="none"
        role="img"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={2}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref('icon-route')} />
      </svg>
    </div>
  );
}

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
