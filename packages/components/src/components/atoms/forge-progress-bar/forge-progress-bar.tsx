import { classNames, h, type MpElement } from '@mission-platform/forge';

import { ForgeTypography } from '../forge-typography';

import styles from './forge-progress-bar.module.scss';

/** Tone of the progress fill. */
export type ProgressVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale (track thickness). */
export type ProgressSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ProgressBarProperties {
  /** Current value. Defaults to `0`. */
  value?: number;
  /** Maximum value. Defaults to `100`. */
  max?: number;
  /** Tone. Defaults to `'primary'`. */
  variant?: ProgressVariant;
  /** Track thickness. Defaults to `'md'`. */
  size?: ProgressSize;
  /** Optional bold label rendered above the track. */
  label?: string;
  /** Show the rounded percentage next to the label. Defaults to `false`. */
  showLabel?: boolean;
  /** Render an indeterminate (animated, valueless) track. Defaults to `false`. */
  indeterminate?: boolean;
}

/**
 * `ForgeProgressBar` — a determinate or indeterminate progress indicator authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a native `<progress>` track with a tone/size, an optional label
 * row (label + percentage via the composed neutral {@link ForgeTypography}), and
 * an indeterminate mode. It owns its styling through the co-located CSS Module
 * `forge-progress-bar.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeProgressBar(properties: Readonly<ProgressBarProperties>): MpElement {
  const {
    value = 0,
    max = 100,
    variant = 'primary',
    size = 'md',
    label,
    showLabel = false,
    indeterminate = false,
  } = properties;

  const percent = indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  const trackClassName = classNames(
    styles['forge-progress-bar__track'],
    styles[`forge-progress-bar__track--${variant}`],
    {
      [styles['forge-progress-bar__track--indeterminate']]: indeterminate,
    },
  );

  return (
    <div className={[styles['forge-progress-bar'], styles[`forge-progress-bar--${size}`]]}>
      {label || showLabel ? (
        <div className={styles['forge-progress-bar__header']}>
          {label ? (
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-sm"
              weight="medium"
            >
              {label}
            </ForgeTypography>
          ) : undefined}
          {showLabel && !indeterminate ? (
            <ForgeTypography
              as="span"
              color="secondary"
              variant="body-sm"
            >
              {`${Math.round(percent)}%`}
            </ForgeTypography>
          ) : undefined}
        </div>
      ) : undefined}
      <progress
        aria-label={label}
        className={trackClassName}
        max={max}
        value={indeterminate ? undefined : value}
      />
    </div>
  );
}
