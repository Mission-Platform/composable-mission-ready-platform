import { IconClose } from '@mission-platform/icons';
import { h, hasSlot, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-alert-banner.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type AlertBannerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Intent / colour treatment of the banner — the canonical colour set. */
export type AlertBannerVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'
  | 'critical';

export interface AlertBannerProperties extends MpProperties {
  /** Controls visibility (the controlled `v-model` substitute). Defaults to `true`. */
  modelValue?: boolean;
  /** Intent / colour treatment. Defaults to `'info'`. */
  variant?: AlertBannerVariant;
  /** Size token controlling the banner's scale. Defaults to `'md'`. */
  size?: AlertBannerSize;
  /** Bold title rendered above the message. */
  title?: string;
  /** Whether to render a dismiss (close) button. Defaults to `false`. */
  dismissible?: boolean;
  /** Whether to render the built-in status icon. Defaults to `true`. */
  icon?: boolean;
  /** Replacement content for the built-in status icon (the `iconContent` named slot). */
  iconContent?: MpChild;
  /** A row of actions rendered after the message (the `actions` named slot). */
  actions?: MpChild;
  /** Accessible label for the dismiss button. Defaults to `'Dismiss'`. */
  dismissLabel?: string;
  /** Fired with the next visibility whenever it changes (the controlled-value callback). */
  onUpdateModelValue?: (value: boolean) => void;
  /** Fired when the dismiss button is pressed. */
  onDismiss?: () => void;
}

/** Maps each {@link AlertBannerVariant} onto its status glyph (substituted for the original inline SVG). */
const VARIANT_GLYPH: Record<AlertBannerVariant, string> = {
  neutral: 'ℹ',
  primary: 'ℹ',
  secondary: 'ℹ',
  tertiary: 'ℹ',
  success: '✓',
  warning: '⚠',
  info: 'ℹ',
  error: '✕',
  critical: '⛔',
};

/**
 * `BaseAlertBanner` — an inline alert / notification banner authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It communicates contextual feedback with an optional title, status icon,
 * dismiss button, and actions, rendering `role="alert"` (assertive) for
 * `warning`/`error` and `role="status"` (polite) otherwise. It owns its styling
 * through the co-located CSS Module `base-alert-banner.module.scss`, assembled
 * with the framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC used `v-model` + a `dismiss` emit and `icon`/`actions`
 * named slots with `$slots` presence detection; the neutral version is a
 * **controlled** component (`modelValue` + `onUpdateModelValue`), uses the
 * cross-framework callback-prop `onDismiss`, exposes the `iconContent`/`actions`
 * named slots (presence detected with the framework-neutral {@link hasSlot}
 * helper), and substitutes the inline status SVGs with text glyphs
 * (`✓`/`✕`/`⚠`/`ℹ`). It is wrapped in a `display: contents`
 * host so visibility can toggle without an extra layout box (the neutral dialect
 * has no conditional-root return).
 */
export function BaseAlertBanner(properties: AlertBannerProperties): MpElement {
  const {
    modelValue = true,
    variant = 'info',
    title,
    dismissible = false,
    icon = true,
    size = 'md',
    dismissLabel = 'Dismiss',
    onUpdateModelValue,
    onDismiss,
  } = properties;

  const role = variant === 'error' || variant === 'warning' || variant === 'critical' ? 'alert' : 'status';
  const ariaLive = role === 'alert' ? 'assertive' : 'polite';

  const dismiss = (): void => {
    onUpdateModelValue?.(false);
    onDismiss?.();
  };

  const message = properties.children;

  const banner = modelValue ? (
    <div
      aria-live={ariaLive}
      classNames={[
        styles['base-alert-banner'],
        styles[`base-alert-banner--${variant}`],
        sizeStyles[`base-size--${size}`],
      ]}
      role={role}
    >
      {icon ? (
        <span
          aria-hidden="true"
          classNames={styles['base-alert-banner__icon']}
        >
          <Slot name="iconContent">{VARIANT_GLYPH[variant]}</Slot>
        </span>
      ) : undefined}
      <div classNames={styles['base-alert-banner__content']}>
        {title ? (
          <BaseTypography
            as="p"
            color="inherit"
            variant="body-sm"
            weight="semibold"
          >
            {title}
          </BaseTypography>
        ) : undefined}
        {message === undefined ? undefined : (
          <BaseTypography
            as="div"
            color="inherit"
            variant="body-sm"
          >
            {message}
          </BaseTypography>
        )}
        {hasSlot('actions') ? (
          <div classNames={styles['base-alert-banner__actions']}>
            <Slot name="actions" />
          </div>
        ) : undefined}
      </div>
      {dismissible ? (
        <button
          aria-label={dismissLabel}
          classNames={styles['base-alert-banner__dismiss']}
          type="button"
          onClick={dismiss}
        >
          <IconClose size="sm" />
        </button>
      ) : undefined}
    </div>
  ) : undefined;

  return h('div', { class: styles['base-alert-banner-host'] }, banner);
}
