import { type MpElement } from '@mission-platform/forge';

import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-redo.module.scss';

export interface IconRedoProperties {
  size?: number | string;
  color?: string;
  ariaLabel?: string;
}

/** Reapplies the most recently undone content edit. */
export function ForgeIconRedo(properties: Readonly<IconRedoProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  return (
    <div className={styles['forge-icon-redo']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel}
        height={sizeValue}
        width={sizeValue}
        role="img"
        stroke={properties.color ?? 'currentColor'}
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref('icon-redo')} />
      </svg>
    </div>
  );
}

function mapTokenToPixels(token: string): number {
  return { '2xs': 12, xs: 16, sm: 20, md: 24, lg: 32, xl: 40, '2xl': 48 }[token] ?? 24;
}
