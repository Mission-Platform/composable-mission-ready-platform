import { type ClassValue, classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';

import spacingStyles from '../../../styles/spacing.module.scss';

import styles from './forge-button.module.scss';

/** Visual treatment of the button. Mirrors the `@mission-platform/components` `ForgeButton`. */
export type ButtonVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical' | 'ghost';
/** Size token applied to padding and font-size — canonical 2xs → 2xl scale. */
export type ButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

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
