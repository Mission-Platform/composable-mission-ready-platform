import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-map-marker-cluster.module.scss';

import type { MpElement } from '@mission-platform/forge';

export interface IconMapMarkerClusterProperties {
  size?: number | string;
  color?: string;
  ariaLabel?: string;
}

/** A grouped map marker for dense points of interest. */
export function ForgeIconMapMarkerCluster(properties: Readonly<IconMapMarkerClusterProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  return (
    <div className={styles['forge-icon-map-marker-cluster']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        width={sizeValue}
        role="img"
        fill="none"
        stroke={properties.color ?? 'currentColor'}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref('icon-map-marker-cluster')} />
      </svg>
    </div>
  );
}

function mapTokenToPixels(token: string): number {
  return { '2xs': 12, xs: 16, sm: 20, md: 24, lg: 32, xl: 40, '2xl': 48 }[token] ?? 24;
}
