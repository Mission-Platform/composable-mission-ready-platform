import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-spinner.module.scss';

/** Canonical 2xs → 2xl size scale. */
export type SpinnerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Tone of the spinner ring. */
export type SpinnerVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SpinnerStyleProperties {
  readonly 'feedback-spinner-animation-duration'?: string;
  readonly 'feedback-spinner-animation-easing'?: string;
  readonly 'feedback-spinner-border-width-2xl'?: string;
  readonly 'feedback-spinner-border-width-2xs'?: string;
  readonly 'feedback-spinner-border-width-lg'?: string;
  readonly 'feedback-spinner-border-width-md'?: string;
  readonly 'feedback-spinner-border-width-sm'?: string;
  readonly 'feedback-spinner-border-width-xl'?: string;
  readonly 'feedback-spinner-border-width-xs'?: string;
  readonly 'feedback-spinner-color-critical'?: string;
  readonly 'feedback-spinner-color-error'?: string;
  readonly 'feedback-spinner-color-info'?: string;
  readonly 'feedback-spinner-color-neutral'?: string;
  readonly 'feedback-spinner-color-primary'?: string;
  readonly 'feedback-spinner-color-secondary'?: string;
  readonly 'feedback-spinner-color-success'?: string;
  readonly 'feedback-spinner-color-tertiary'?: string;
  readonly 'feedback-spinner-color-warning'?: string;
  readonly 'feedback-spinner-radius'?: string;
  readonly 'feedback-spinner-size-2xs'?: string;
}

export type SpinnerStyle = CSSStyleProperties & {
  readonly '--forge-spinner-feedback-spinner-animation-duration'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-animation-easing'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-2xl'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-2xs'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-lg'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-md'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-sm'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-xl'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-border-width-xs'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-critical'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-error'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-info'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-neutral'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-primary'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-secondary'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-success'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-tertiary'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-color-warning'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-radius'?: string | undefined;
  readonly '--forge-spinner-feedback-spinner-size-2xs'?: string | undefined;
};

function createSpinnerStyle(properties: Readonly<SpinnerStyleProperties> | undefined): SpinnerStyle | undefined {
  return createForgeStyle({
    '--forge-spinner-feedback-spinner-animation-duration': properties?.['feedback-spinner-animation-duration'],
    '--forge-spinner-feedback-spinner-animation-easing': properties?.['feedback-spinner-animation-easing'],
    '--forge-spinner-feedback-spinner-border-width-2xl': properties?.['feedback-spinner-border-width-2xl'],
    '--forge-spinner-feedback-spinner-border-width-2xs': properties?.['feedback-spinner-border-width-2xs'],
    '--forge-spinner-feedback-spinner-border-width-lg': properties?.['feedback-spinner-border-width-lg'],
    '--forge-spinner-feedback-spinner-border-width-md': properties?.['feedback-spinner-border-width-md'],
    '--forge-spinner-feedback-spinner-border-width-sm': properties?.['feedback-spinner-border-width-sm'],
    '--forge-spinner-feedback-spinner-border-width-xl': properties?.['feedback-spinner-border-width-xl'],
    '--forge-spinner-feedback-spinner-border-width-xs': properties?.['feedback-spinner-border-width-xs'],
    '--forge-spinner-feedback-spinner-color-critical': properties?.['feedback-spinner-color-critical'],
    '--forge-spinner-feedback-spinner-color-error': properties?.['feedback-spinner-color-error'],
    '--forge-spinner-feedback-spinner-color-info': properties?.['feedback-spinner-color-info'],
    '--forge-spinner-feedback-spinner-color-neutral': properties?.['feedback-spinner-color-neutral'],
    '--forge-spinner-feedback-spinner-color-primary': properties?.['feedback-spinner-color-primary'],
    '--forge-spinner-feedback-spinner-color-secondary': properties?.['feedback-spinner-color-secondary'],
    '--forge-spinner-feedback-spinner-color-success': properties?.['feedback-spinner-color-success'],
    '--forge-spinner-feedback-spinner-color-tertiary': properties?.['feedback-spinner-color-tertiary'],
    '--forge-spinner-feedback-spinner-color-warning': properties?.['feedback-spinner-color-warning'],
    '--forge-spinner-feedback-spinner-radius': properties?.['feedback-spinner-radius'],
    '--forge-spinner-feedback-spinner-size-2xs': properties?.['feedback-spinner-size-2xs'],
  }) as SpinnerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SpinnerProperties {
  /** Size token. Defaults to `'md'`. */
  size?: SpinnerSize;
  /** Tone. Defaults to `'primary'`. */
  variant?: SpinnerVariant;
  /** Accessible label announced to assistive tech. Defaults to `'Loading…'`. */
  label?: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SpinnerStyleProperties>;
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
  const style = createSpinnerStyle(properties.properties);

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
      style={style}
    />
  );
}
