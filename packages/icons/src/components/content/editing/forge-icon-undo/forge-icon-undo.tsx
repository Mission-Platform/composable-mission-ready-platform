import { h, type MpElement } from '@mission-platform/forge';

import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-undo.module.scss';

export interface IconUndoProperties {
  size?: number | string;
  color?: string;
  ariaLabel?: string;
}

/** Reverses the most recent content edit. */
export function ForgeIconUndo(properties: Readonly<IconUndoProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  return (
    <div className={styles['forge-icon-undo']}>
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
        <use href={useIconHref('icon-undo')} />
      </svg>
    </div>
  );
}

function mapTokenToPixels(token: string): number {
  return { '2xs': 12, xs: 16, sm: 20, md: 24, lg: 32, xl: 40, '2xl': 48 }[token] ?? 24;
}
