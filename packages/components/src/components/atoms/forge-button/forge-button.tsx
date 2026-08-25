import {
  classNames,
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import spacingStyles from '../../../styles/spacing.module.scss';

import styles from './forge-button.module.scss';

/** Visual treatment of the button. Mirrors the `@mission-platform/components` `ForgeButton`. */
export type ButtonVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical' | 'ghost';
/** Size token applied to padding and font-size — canonical 2xs → 2xl scale. */
export type ButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ButtonStyleProperties {
  readonly 'border-width-default'?: string;
  readonly 'critical-background-active'?: string;
  readonly 'critical-background-default'?: string;
  readonly 'critical-background-hover'?: string;
  readonly 'critical-focus-ring'?: string;
  readonly 'critical-text-default'?: string;
  readonly 'error-background-active'?: string;
  readonly 'error-background-default'?: string;
  readonly 'error-background-hover'?: string;
  readonly 'error-focus-ring'?: string;
  readonly 'error-text-default'?: string;
  readonly 'font-family'?: string;
  readonly 'font-weight'?: string;
  readonly 'ghost-background-active'?: string;
  readonly 'ghost-background-default'?: string;
  readonly 'ghost-background-hover'?: string;
  readonly 'ghost-text-default'?: string;
  readonly 'info-background-active'?: string;
  readonly 'info-background-default'?: string;
  readonly 'info-background-hover'?: string;
  readonly 'info-text-default'?: string;
  readonly 'line-height'?: string;
  readonly 'neutral-background-active'?: string;
  readonly 'neutral-background-default'?: string;
  readonly 'neutral-background-hover'?: string;
  readonly 'neutral-text-default'?: string;
  readonly 'primary-background-active'?: string;
  readonly 'primary-background-default'?: string;
  readonly 'primary-background-hover'?: string;
  readonly 'primary-focus-ring'?: string;
  readonly 'primary-gap'?: string;
  readonly 'primary-opacity-disabled'?: string;
  readonly 'primary-radius'?: string;
  readonly 'primary-text-default'?: string;
  readonly 'primary-transition-duration'?: string;
  readonly 'primary-transition-easing'?: string;
  readonly 'secondary-background-active'?: string;
  readonly 'secondary-background-default'?: string;
  readonly 'secondary-background-hover'?: string;
  readonly 'secondary-border-default'?: string;
  readonly 'secondary-border-hover'?: string;
  readonly 'secondary-text-default'?: string;
  readonly 'size-2xl-font-size'?: string;
  readonly 'size-2xl-padding-block'?: string;
  readonly 'size-2xl-padding-inline'?: string;
  readonly 'size-2xs-font-size'?: string;
  readonly 'size-2xs-padding-block'?: string;
  readonly 'size-2xs-padding-inline'?: string;
  readonly 'size-lg-font-size'?: string;
  readonly 'size-lg-padding-block'?: string;
  readonly 'size-lg-padding-inline'?: string;
  readonly 'size-md-font-size'?: string;
  readonly 'size-md-padding-block'?: string;
  readonly 'size-md-padding-inline'?: string;
  readonly 'size-sm-font-size'?: string;
  readonly 'size-sm-padding-block'?: string;
  readonly 'size-sm-padding-inline'?: string;
  readonly 'size-xl-font-size'?: string;
  readonly 'size-xl-padding-block'?: string;
  readonly 'size-xl-padding-inline'?: string;
  readonly 'size-xs-font-size'?: string;
  readonly 'size-xs-padding-block'?: string;
  readonly 'size-xs-padding-inline'?: string;
  readonly 'spinner-animation-duration'?: string;
  readonly 'spinner-animation-easing'?: string;
  readonly 'spinner-border-width'?: string;
  readonly 'spinner-radius'?: string;
  readonly 'success-background-active'?: string;
  readonly 'success-background-default'?: string;
  readonly 'success-background-hover'?: string;
  readonly 'success-text-default'?: string;
  readonly 'tertiary-background-active'?: string;
  readonly 'tertiary-background-default'?: string;
  readonly 'tertiary-background-hover'?: string;
  readonly 'tertiary-text-default'?: string;
  readonly 'warning-background-active'?: string;
  readonly 'warning-background-default'?: string;
  readonly 'warning-background-hover'?: string;
  readonly 'warning-text-default'?: string;
}

export type ButtonStyle = CSSStyleProperties & {
  readonly '--forge-button-border-width-default'?: string | undefined;
  readonly '--forge-button-critical-background-active'?: string | undefined;
  readonly '--forge-button-critical-background-default'?: string | undefined;
  readonly '--forge-button-critical-background-hover'?: string | undefined;
  readonly '--forge-button-critical-focus-ring'?: string | undefined;
  readonly '--forge-button-critical-text-default'?: string | undefined;
  readonly '--forge-button-error-background-active'?: string | undefined;
  readonly '--forge-button-error-background-default'?: string | undefined;
  readonly '--forge-button-error-background-hover'?: string | undefined;
  readonly '--forge-button-error-focus-ring'?: string | undefined;
  readonly '--forge-button-error-text-default'?: string | undefined;
  readonly '--forge-button-font-family'?: string | undefined;
  readonly '--forge-button-font-weight'?: string | undefined;
  readonly '--forge-button-ghost-background-active'?: string | undefined;
  readonly '--forge-button-ghost-background-default'?: string | undefined;
  readonly '--forge-button-ghost-background-hover'?: string | undefined;
  readonly '--forge-button-ghost-text-default'?: string | undefined;
  readonly '--forge-button-info-background-active'?: string | undefined;
  readonly '--forge-button-info-background-default'?: string | undefined;
  readonly '--forge-button-info-background-hover'?: string | undefined;
  readonly '--forge-button-info-text-default'?: string | undefined;
  readonly '--forge-button-line-height'?: string | undefined;
  readonly '--forge-button-neutral-background-active'?: string | undefined;
  readonly '--forge-button-neutral-background-default'?: string | undefined;
  readonly '--forge-button-neutral-background-hover'?: string | undefined;
  readonly '--forge-button-neutral-text-default'?: string | undefined;
  readonly '--forge-button-primary-background-active'?: string | undefined;
  readonly '--forge-button-primary-background-default'?: string | undefined;
  readonly '--forge-button-primary-background-hover'?: string | undefined;
  readonly '--forge-button-primary-focus-ring'?: string | undefined;
  readonly '--forge-button-primary-gap'?: string | undefined;
  readonly '--forge-button-primary-opacity-disabled'?: string | undefined;
  readonly '--forge-button-primary-radius'?: string | undefined;
  readonly '--forge-button-primary-text-default'?: string | undefined;
  readonly '--forge-button-primary-transition-duration'?: string | undefined;
  readonly '--forge-button-primary-transition-easing'?: string | undefined;
  readonly '--forge-button-secondary-background-active'?: string | undefined;
  readonly '--forge-button-secondary-background-default'?: string | undefined;
  readonly '--forge-button-secondary-background-hover'?: string | undefined;
  readonly '--forge-button-secondary-border-default'?: string | undefined;
  readonly '--forge-button-secondary-border-hover'?: string | undefined;
  readonly '--forge-button-secondary-text-default'?: string | undefined;
  readonly '--forge-button-size-2xl-font-size'?: string | undefined;
  readonly '--forge-button-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-button-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-button-size-2xs-font-size'?: string | undefined;
  readonly '--forge-button-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-button-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-button-size-lg-font-size'?: string | undefined;
  readonly '--forge-button-size-lg-padding-block'?: string | undefined;
  readonly '--forge-button-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-button-size-md-font-size'?: string | undefined;
  readonly '--forge-button-size-md-padding-block'?: string | undefined;
  readonly '--forge-button-size-md-padding-inline'?: string | undefined;
  readonly '--forge-button-size-sm-font-size'?: string | undefined;
  readonly '--forge-button-size-sm-padding-block'?: string | undefined;
  readonly '--forge-button-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-button-size-xl-font-size'?: string | undefined;
  readonly '--forge-button-size-xl-padding-block'?: string | undefined;
  readonly '--forge-button-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-button-size-xs-font-size'?: string | undefined;
  readonly '--forge-button-size-xs-padding-block'?: string | undefined;
  readonly '--forge-button-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-button-spinner-animation-duration'?: string | undefined;
  readonly '--forge-button-spinner-animation-easing'?: string | undefined;
  readonly '--forge-button-spinner-border-width'?: string | undefined;
  readonly '--forge-button-spinner-radius'?: string | undefined;
  readonly '--forge-button-success-background-active'?: string | undefined;
  readonly '--forge-button-success-background-default'?: string | undefined;
  readonly '--forge-button-success-background-hover'?: string | undefined;
  readonly '--forge-button-success-text-default'?: string | undefined;
  readonly '--forge-button-tertiary-background-active'?: string | undefined;
  readonly '--forge-button-tertiary-background-default'?: string | undefined;
  readonly '--forge-button-tertiary-background-hover'?: string | undefined;
  readonly '--forge-button-tertiary-text-default'?: string | undefined;
  readonly '--forge-button-warning-background-active'?: string | undefined;
  readonly '--forge-button-warning-background-default'?: string | undefined;
  readonly '--forge-button-warning-background-hover'?: string | undefined;
  readonly '--forge-button-warning-text-default'?: string | undefined;
};

function createButtonStyle(properties: Readonly<ButtonStyleProperties> | undefined): ButtonStyle | undefined {
  return createForgeStyle({
    '--forge-button-border-width-default': properties?.['border-width-default'],
    '--forge-button-critical-background-active': properties?.['critical-background-active'],
    '--forge-button-critical-background-default': properties?.['critical-background-default'],
    '--forge-button-critical-background-hover': properties?.['critical-background-hover'],
    '--forge-button-critical-focus-ring': properties?.['critical-focus-ring'],
    '--forge-button-critical-text-default': properties?.['critical-text-default'],
    '--forge-button-error-background-active': properties?.['error-background-active'],
    '--forge-button-error-background-default': properties?.['error-background-default'],
    '--forge-button-error-background-hover': properties?.['error-background-hover'],
    '--forge-button-error-focus-ring': properties?.['error-focus-ring'],
    '--forge-button-error-text-default': properties?.['error-text-default'],
    '--forge-button-font-family': properties?.['font-family'],
    '--forge-button-font-weight': properties?.['font-weight'],
    '--forge-button-ghost-background-active': properties?.['ghost-background-active'],
    '--forge-button-ghost-background-default': properties?.['ghost-background-default'],
    '--forge-button-ghost-background-hover': properties?.['ghost-background-hover'],
    '--forge-button-ghost-text-default': properties?.['ghost-text-default'],
    '--forge-button-info-background-active': properties?.['info-background-active'],
    '--forge-button-info-background-default': properties?.['info-background-default'],
    '--forge-button-info-background-hover': properties?.['info-background-hover'],
    '--forge-button-info-text-default': properties?.['info-text-default'],
    '--forge-button-line-height': properties?.['line-height'],
    '--forge-button-neutral-background-active': properties?.['neutral-background-active'],
    '--forge-button-neutral-background-default': properties?.['neutral-background-default'],
    '--forge-button-neutral-background-hover': properties?.['neutral-background-hover'],
    '--forge-button-neutral-text-default': properties?.['neutral-text-default'],
    '--forge-button-primary-background-active': properties?.['primary-background-active'],
    '--forge-button-primary-background-default': properties?.['primary-background-default'],
    '--forge-button-primary-background-hover': properties?.['primary-background-hover'],
    '--forge-button-primary-focus-ring': properties?.['primary-focus-ring'],
    '--forge-button-primary-gap': properties?.['primary-gap'],
    '--forge-button-primary-opacity-disabled': properties?.['primary-opacity-disabled'],
    '--forge-button-primary-radius': properties?.['primary-radius'],
    '--forge-button-primary-text-default': properties?.['primary-text-default'],
    '--forge-button-primary-transition-duration': properties?.['primary-transition-duration'],
    '--forge-button-primary-transition-easing': properties?.['primary-transition-easing'],
    '--forge-button-secondary-background-active': properties?.['secondary-background-active'],
    '--forge-button-secondary-background-default': properties?.['secondary-background-default'],
    '--forge-button-secondary-background-hover': properties?.['secondary-background-hover'],
    '--forge-button-secondary-border-default': properties?.['secondary-border-default'],
    '--forge-button-secondary-border-hover': properties?.['secondary-border-hover'],
    '--forge-button-secondary-text-default': properties?.['secondary-text-default'],
    '--forge-button-size-2xl-font-size': properties?.['size-2xl-font-size'],
    '--forge-button-size-2xl-padding-block': properties?.['size-2xl-padding-block'],
    '--forge-button-size-2xl-padding-inline': properties?.['size-2xl-padding-inline'],
    '--forge-button-size-2xs-font-size': properties?.['size-2xs-font-size'],
    '--forge-button-size-2xs-padding-block': properties?.['size-2xs-padding-block'],
    '--forge-button-size-2xs-padding-inline': properties?.['size-2xs-padding-inline'],
    '--forge-button-size-lg-font-size': properties?.['size-lg-font-size'],
    '--forge-button-size-lg-padding-block': properties?.['size-lg-padding-block'],
    '--forge-button-size-lg-padding-inline': properties?.['size-lg-padding-inline'],
    '--forge-button-size-md-font-size': properties?.['size-md-font-size'],
    '--forge-button-size-md-padding-block': properties?.['size-md-padding-block'],
    '--forge-button-size-md-padding-inline': properties?.['size-md-padding-inline'],
    '--forge-button-size-sm-font-size': properties?.['size-sm-font-size'],
    '--forge-button-size-sm-padding-block': properties?.['size-sm-padding-block'],
    '--forge-button-size-sm-padding-inline': properties?.['size-sm-padding-inline'],
    '--forge-button-size-xl-font-size': properties?.['size-xl-font-size'],
    '--forge-button-size-xl-padding-block': properties?.['size-xl-padding-block'],
    '--forge-button-size-xl-padding-inline': properties?.['size-xl-padding-inline'],
    '--forge-button-size-xs-font-size': properties?.['size-xs-font-size'],
    '--forge-button-size-xs-padding-block': properties?.['size-xs-padding-block'],
    '--forge-button-size-xs-padding-inline': properties?.['size-xs-padding-inline'],
    '--forge-button-spinner-animation-duration': properties?.['spinner-animation-duration'],
    '--forge-button-spinner-animation-easing': properties?.['spinner-animation-easing'],
    '--forge-button-spinner-border-width': properties?.['spinner-border-width'],
    '--forge-button-spinner-radius': properties?.['spinner-radius'],
    '--forge-button-success-background-active': properties?.['success-background-active'],
    '--forge-button-success-background-default': properties?.['success-background-default'],
    '--forge-button-success-background-hover': properties?.['success-background-hover'],
    '--forge-button-success-text-default': properties?.['success-text-default'],
    '--forge-button-tertiary-background-active': properties?.['tertiary-background-active'],
    '--forge-button-tertiary-background-default': properties?.['tertiary-background-default'],
    '--forge-button-tertiary-background-hover': properties?.['tertiary-background-hover'],
    '--forge-button-tertiary-text-default': properties?.['tertiary-text-default'],
    '--forge-button-warning-background-active': properties?.['warning-background-active'],
    '--forge-button-warning-background-default': properties?.['warning-background-default'],
    '--forge-button-warning-background-hover': properties?.['warning-background-hover'],
    '--forge-button-warning-text-default': properties?.['warning-text-default'],
  }) as ButtonStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ButtonProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Extra class(es) merged onto the rendered `<button>`. */
  className?: ClassValue;
  /** Visual treatment. Defaults to `'primary'`. */
  variant?: ButtonVariant;
  /** Size token controlling padding and font-size. Defaults to `'md'`. */
  size?: ButtonSize;
  /** Native button `type`. Defaults to `'button'`. */
  type?: 'button' | 'submit' | 'reset';
  /** Whether the button is non-interactive. Suppresses `click` and applies the native `disabled` attribute. */
  disabled?: boolean;
  /** Shows the spinner, sets `aria-busy`, and suppresses `click`. */
  loading?: boolean;
  /** Accessible label for the loading spinner. Defaults to `'Loading…'`. */
  loadingLabel?: string;
  /** Accessible label forwarded to the button's `aria-label`. */
  ariaLabel?: string;
  /** Accessible pressed state for toggle buttons, forwarded to `aria-pressed`. */
  ariaPressed?: boolean | 'true' | 'false' | 'mixed';
  /** Click handler forwarded to the underlying `<button>`. Suppressed while `disabled` or `loading`. */
  onClick?: (event: unknown) => void;
  /** Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. Overrides the size's intrinsic margin. */
  margin?: SpacingScale;
  /** Inner padding (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. Overrides the size's intrinsic padding. */
  padding?: SpacingScale;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ButtonStyleProperties>;
}

/**
 * `ForgeButton` — a button authored once in the neutral JSX dialect and compiled
 * straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It mirrors the `@mission-platform/components` `ForgeButton`: the canonical
 * colour variants plus a transparent `ghost` treatment, the canonical
 * `2xs → 2xl` size scale, focus-visible outlines, and a
 * built-in accessible loading spinner that sets `aria-busy` and suppresses the
 * click while active. The original Vue SFC sourced the spinner's label from
 * `@mission-platform/i18n`; the neutral version (i18n is not part of this
 * library) defaults `loadingLabel` to `'Loading…'`.
 *
 * It owns its styling through the co-located CSS Module `forge-button.module.scss`
 * (carried onto every framework by the two-stage compiler, so the component
 * ships its own `@layer mp.components` CSS). The hashed module class names are
 * assembled with the framework-neutral {@link classNames} helper, including its
 * `{ className: boolean }` object form for the conditional loading modifier.
 */
export function ForgeButton(properties: Readonly<ButtonProperties>): MpElement {
  const style = createButtonStyle(properties.properties);

  const variant = properties.variant ?? 'primary';
  const size = properties.size ?? 'md';
  const disabled = properties.disabled ?? false;
  const loading = properties.loading ?? false;

  // Optional `padding`/`margin` (named `2xs … 2xl` scale) resolve to the shared
  // token-driven spacing classes (overriding the size's intrinsic box) rather
  // than inline styles.
  const className = classNames(
    styles['forge-button'],
    styles[`forge-button--${variant}`],
    styles[`forge-button--${size}`],
    { [styles['forge-button--loading']]: loading },
    properties.padding ? spacingStyles[`forge-spacing--padding-${properties.padding}`] : undefined,
    properties.margin ? spacingStyles[`forge-spacing--margin-${properties.margin}`] : undefined,
    // The caller's own class(es) come last so they win the cascade.
    properties.className,
  );

  const handleClick = (event: unknown): void => {
    if (!disabled && !loading) {
      properties.onClick?.(event);
    }
  };

  return (
    <button
      className={className}
      type={properties.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={properties.ariaLabel}
      aria-pressed={properties.ariaPressed}
      onClick={handleClick}
      style={style}
    >
      {loading ? (
        <span
          className={styles['forge-button__spinner']}
          role="status"
          aria-label={properties.loadingLabel ?? 'Loading…'}
          aria-live="off"
          aria-atomic="false"
        />
      ) : undefined}
      {properties.children}
    </button>
  );
}
