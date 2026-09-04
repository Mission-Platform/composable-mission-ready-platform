import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-layer.module.scss';

import type { MpElement } from '@mission-platform/forge-jsx';

export interface IconLayerProperties {
  size?: number | string;
  color?: string;
  ariaLabel?: string;
}

/** A map-layer stack symbol for toggling visible geographic data. */
export function ForgeIconLayer(properties: Readonly<IconLayerProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  return (
    <div className={styles['forge-icon-layer']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        width={sizeValue}
        fill="none"
        role="img"
        stroke={properties.color ?? 'currentColor'}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref('icon-layer')} />
      </svg>
    </div>
  );
}

function mapTokenToPixels(token: string): number {
  return { '2xs': 12, xs: 16, sm: 20, md: 24, lg: 32, xl: 40, '2xl': 48 }[token] ?? 24;
}
