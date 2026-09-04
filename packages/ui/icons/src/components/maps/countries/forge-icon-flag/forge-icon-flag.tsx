import { SUPPORTED_COUNTRY_CODES } from '../../../../sprite/country-flags';
import { useIconHref } from '../../../../sprite/provider';

import styles from './forge-icon-flag.module.scss';

import type { MpElement } from '@mission-platform/forge-jsx';

/** Supported country codes for the data-driven flag component. */
export type IconCountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

export interface IconFlagProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Country flag colour is determined by the country code. */
  countryCode?: IconCountryCode;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/** A bounded, data-driven country flag icon. */
export function ForgeIconFlag(properties: Readonly<IconFlagProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const countryCode = properties.countryCode ?? 'US';
  if (!SUPPORTED_COUNTRY_CODES.includes(countryCode)) {
    throw new Error(`[icons] Unsupported country code: ${countryCode}`);
  }

  return (
    <div className={styles['forge-icon-flag']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel ?? `Flag ${countryCode}`}
        height={sizeValue}
        width={sizeValue}
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use href={useIconHref(`icon-flag-${countryCode}`)} />
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
