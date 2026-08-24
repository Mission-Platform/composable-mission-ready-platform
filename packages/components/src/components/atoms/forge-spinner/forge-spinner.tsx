import { classNames, type MpElement } from '@mission-platform/forge';

import styles from './forge-spinner.module.scss';

/** Canonical 2xs → 2xl size scale. */
export type SpinnerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Tone of the spinner ring. */
export type SpinnerVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface SpinnerProperties {
  /** Size token. Defaults to `'md'`. */
  size?: SpinnerSize;
  /** Tone. Defaults to `'primary'`. */
  variant?: SpinnerVariant;
  /** Accessible label announced to assistive tech. Defaults to `'Loading…'`. */
  label?: string;
}

/**
 * `ForgeSpinner` — an indeterminate loading spinner authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a `role="status"` ring with a tone/size and an accessible label.
 * It owns its styling through the co-located CSS Module `forge-spinner.module.scss`,
 * assembled with the framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC sourced its default label from `@mission-platform/i18n`;
 * the neutral version (i18n is not part of this library) defaults the `label` to
 * `'Loading…'`.
 */
export function ForgeSpinner(properties: Readonly<SpinnerProperties>): MpElement {
  const { size = 'md', variant = 'primary', label } = properties;

  const className = classNames(
    styles['forge-spinner'],
    styles[`forge-spinner--${size}`],
    styles[`forge-spinner--${variant}`],
  );

  return (
    <span
      aria-label={label ?? 'Loading…'}
      className={className}
      role="status"
    />
  );
}
