import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-progress-bar.module.scss';

/** Tone of the progress fill. */
export type ProgressVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale (track thickness). */
export type ProgressSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ProgressBarStyleProperties {
  readonly 'feedback-progress-fill-critical'?: string;
  readonly 'feedback-progress-fill-error'?: string;
  readonly 'feedback-progress-fill-info'?: string;
  readonly 'feedback-progress-fill-neutral'?: string;
  readonly 'feedback-progress-fill-primary'?: string;
  readonly 'feedback-progress-fill-secondary'?: string;
  readonly 'feedback-progress-fill-success'?: string;
  readonly 'feedback-progress-fill-tertiary'?: string;
  readonly 'feedback-progress-fill-warning'?: string;
  readonly 'feedback-progress-gap'?: string;
  readonly 'feedback-progress-indeterminate-duration'?: string;
  readonly 'feedback-progress-indeterminate-easing'?: string;
  readonly 'feedback-progress-size-2xl'?: string;
  readonly 'feedback-progress-size-2xs'?: string;
  readonly 'feedback-progress-size-lg'?: string;
  readonly 'feedback-progress-size-md'?: string;
  readonly 'feedback-progress-size-sm'?: string;
  readonly 'feedback-progress-size-xl'?: string;
  readonly 'feedback-progress-size-xs'?: string;
  readonly 'feedback-progress-track-background'?: string;
  readonly 'feedback-progress-track-radius'?: string;
}

export type ProgressBarStyle = CSSStyleProperties & {
  readonly '--forge-progress-bar-feedback-progress-fill-critical'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-error'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-info'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-neutral'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-primary'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-secondary'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-success'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-tertiary'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-fill-warning'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-gap'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-indeterminate-duration'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-indeterminate-easing'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-2xl'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-2xs'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-lg'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-md'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-sm'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-xl'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-size-xs'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-track-background'?: string | undefined;
  readonly '--forge-progress-bar-feedback-progress-track-radius'?: string | undefined;
};

function createProgressBarStyle(
  properties: Readonly<ProgressBarStyleProperties> | undefined,
): ProgressBarStyle | undefined {
  return createForgeStyle({
    '--forge-progress-bar-feedback-progress-fill-critical': properties?.['feedback-progress-fill-critical'],
    '--forge-progress-bar-feedback-progress-fill-error': properties?.['feedback-progress-fill-error'],
    '--forge-progress-bar-feedback-progress-fill-info': properties?.['feedback-progress-fill-info'],
    '--forge-progress-bar-feedback-progress-fill-neutral': properties?.['feedback-progress-fill-neutral'],
    '--forge-progress-bar-feedback-progress-fill-primary': properties?.['feedback-progress-fill-primary'],
    '--forge-progress-bar-feedback-progress-fill-secondary': properties?.['feedback-progress-fill-secondary'],
    '--forge-progress-bar-feedback-progress-fill-success': properties?.['feedback-progress-fill-success'],
    '--forge-progress-bar-feedback-progress-fill-tertiary': properties?.['feedback-progress-fill-tertiary'],
    '--forge-progress-bar-feedback-progress-fill-warning': properties?.['feedback-progress-fill-warning'],
    '--forge-progress-bar-feedback-progress-gap': properties?.['feedback-progress-gap'],
    '--forge-progress-bar-feedback-progress-indeterminate-duration':
      properties?.['feedback-progress-indeterminate-duration'],
    '--forge-progress-bar-feedback-progress-indeterminate-easing':
      properties?.['feedback-progress-indeterminate-easing'],
    '--forge-progress-bar-feedback-progress-size-2xl': properties?.['feedback-progress-size-2xl'],
    '--forge-progress-bar-feedback-progress-size-2xs': properties?.['feedback-progress-size-2xs'],
    '--forge-progress-bar-feedback-progress-size-lg': properties?.['feedback-progress-size-lg'],
    '--forge-progress-bar-feedback-progress-size-md': properties?.['feedback-progress-size-md'],
    '--forge-progress-bar-feedback-progress-size-sm': properties?.['feedback-progress-size-sm'],
    '--forge-progress-bar-feedback-progress-size-xl': properties?.['feedback-progress-size-xl'],
    '--forge-progress-bar-feedback-progress-size-xs': properties?.['feedback-progress-size-xs'],
    '--forge-progress-bar-feedback-progress-track-background': properties?.['feedback-progress-track-background'],
    '--forge-progress-bar-feedback-progress-track-radius': properties?.['feedback-progress-track-radius'],
  }) as ProgressBarStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ProgressBarStyleProperties>;
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
  const style = createProgressBarStyle(properties.properties);

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
    <div
      className={[styles['forge-progress-bar'], styles[`forge-progress-bar--${size}`]]}
      style={style}
    >
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
      {indeterminate ? (
        <progress
          aria-label={label}
          className={trackClassName}
          max={max}
          style={style}
        />
      ) : (
        <progress
          aria-label={label}
          className={trackClassName}
          max={max}
          value={value}
          style={style}
        />
      )}
    </div>
  );
}
