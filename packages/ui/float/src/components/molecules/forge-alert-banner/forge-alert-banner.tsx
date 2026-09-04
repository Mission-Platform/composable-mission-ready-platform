import {
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import {
  ForgeIconCheck,
  ForgeIconClose,
  ForgeIconError,
  ForgeIconInfo,
  ForgeIconWarning,
} from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-alert-banner.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type AlertBannerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Intent / colour treatment of the banner — the canonical colour set. */
export type AlertBannerVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface AlertBannerStyleProperties {
  readonly 'feedback-critical-background'?: string;
  readonly 'feedback-critical-border'?: string;
  readonly 'feedback-critical-text'?: string;
  readonly 'feedback-error-background'?: string;
  readonly 'feedback-error-border'?: string;
  readonly 'feedback-error-text'?: string;
  readonly 'feedback-info-background'?: string;
  readonly 'feedback-info-border'?: string;
  readonly 'feedback-info-text'?: string;
  readonly 'feedback-neutral-background'?: string;
  readonly 'feedback-neutral-border'?: string;
  readonly 'feedback-neutral-text'?: string;
  readonly 'feedback-success-background'?: string;
  readonly 'feedback-success-border'?: string;
  readonly 'feedback-success-text'?: string;
  readonly 'feedback-warning-background'?: string;
  readonly 'feedback-warning-border'?: string;
  readonly 'feedback-warning-text'?: string;
  readonly 'overlay-alert-banner-actions-gap'?: string;
  readonly 'overlay-alert-banner-actions-margin-top'?: string;
  readonly 'overlay-alert-banner-content-gap'?: string;
  readonly 'overlay-alert-banner-dismiss-opacity'?: string;
  readonly 'overlay-alert-banner-dismiss-transition-duration'?: string;
  readonly 'overlay-alert-banner-dismiss-transition-easing'?: string;
  readonly 'overlay-alert-banner-gap'?: string;
  readonly 'overlay-alert-banner-padding-block'?: string;
  readonly 'overlay-alert-banner-padding-inline'?: string;
  readonly 'overlay-alert-banner-radius'?: string;
  readonly 'overlay-border-width'?: string;
  readonly 'overlay-dismiss-focus-width'?: string;
  readonly 'overlay-dismiss-padding'?: string;
  readonly 'overlay-dismiss-radius'?: string;
  readonly 'overlay-font-family'?: string;
  readonly 'overlay-icon-size'?: string;
}

export type AlertBannerStyle = CSSStyleProperties & {
  readonly '--forge-alert-banner-feedback-critical-background'?: string | undefined;
  readonly '--forge-alert-banner-feedback-critical-border'?: string | undefined;
  readonly '--forge-alert-banner-feedback-critical-text'?: string | undefined;
  readonly '--forge-alert-banner-feedback-error-background'?: string | undefined;
  readonly '--forge-alert-banner-feedback-error-border'?: string | undefined;
  readonly '--forge-alert-banner-feedback-error-text'?: string | undefined;
  readonly '--forge-alert-banner-feedback-info-background'?: string | undefined;
  readonly '--forge-alert-banner-feedback-info-border'?: string | undefined;
  readonly '--forge-alert-banner-feedback-info-text'?: string | undefined;
  readonly '--forge-alert-banner-feedback-neutral-background'?: string | undefined;
  readonly '--forge-alert-banner-feedback-neutral-border'?: string | undefined;
  readonly '--forge-alert-banner-feedback-neutral-text'?: string | undefined;
  readonly '--forge-alert-banner-feedback-success-background'?: string | undefined;
  readonly '--forge-alert-banner-feedback-success-border'?: string | undefined;
  readonly '--forge-alert-banner-feedback-success-text'?: string | undefined;
  readonly '--forge-alert-banner-feedback-warning-background'?: string | undefined;
  readonly '--forge-alert-banner-feedback-warning-border'?: string | undefined;
  readonly '--forge-alert-banner-feedback-warning-text'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-actions-gap'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-actions-margin-top'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-content-gap'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-dismiss-opacity'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-dismiss-transition-duration'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-dismiss-transition-easing'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-gap'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-padding-block'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-padding-inline'?: string | undefined;
  readonly '--forge-alert-banner-overlay-alert-banner-radius'?: string | undefined;
  readonly '--forge-alert-banner-overlay-border-width'?: string | undefined;
  readonly '--forge-alert-banner-overlay-dismiss-focus-width'?: string | undefined;
  readonly '--forge-alert-banner-overlay-dismiss-padding'?: string | undefined;
  readonly '--forge-alert-banner-overlay-dismiss-radius'?: string | undefined;
  readonly '--forge-alert-banner-overlay-font-family'?: string | undefined;
  readonly '--forge-alert-banner-overlay-icon-size'?: string | undefined;
};

function createAlertBannerStyle(
  properties: Readonly<AlertBannerStyleProperties> | undefined,
): AlertBannerStyle | undefined {
  return createForgeStyle({
    '--forge-alert-banner-feedback-critical-background': properties?.['feedback-critical-background'],
    '--forge-alert-banner-feedback-critical-border': properties?.['feedback-critical-border'],
    '--forge-alert-banner-feedback-critical-text': properties?.['feedback-critical-text'],
    '--forge-alert-banner-feedback-error-background': properties?.['feedback-error-background'],
    '--forge-alert-banner-feedback-error-border': properties?.['feedback-error-border'],
    '--forge-alert-banner-feedback-error-text': properties?.['feedback-error-text'],
    '--forge-alert-banner-feedback-info-background': properties?.['feedback-info-background'],
    '--forge-alert-banner-feedback-info-border': properties?.['feedback-info-border'],
    '--forge-alert-banner-feedback-info-text': properties?.['feedback-info-text'],
    '--forge-alert-banner-feedback-neutral-background': properties?.['feedback-neutral-background'],
    '--forge-alert-banner-feedback-neutral-border': properties?.['feedback-neutral-border'],
    '--forge-alert-banner-feedback-neutral-text': properties?.['feedback-neutral-text'],
    '--forge-alert-banner-feedback-success-background': properties?.['feedback-success-background'],
    '--forge-alert-banner-feedback-success-border': properties?.['feedback-success-border'],
    '--forge-alert-banner-feedback-success-text': properties?.['feedback-success-text'],
    '--forge-alert-banner-feedback-warning-background': properties?.['feedback-warning-background'],
    '--forge-alert-banner-feedback-warning-border': properties?.['feedback-warning-border'],
    '--forge-alert-banner-feedback-warning-text': properties?.['feedback-warning-text'],
    '--forge-alert-banner-overlay-alert-banner-actions-gap': properties?.['overlay-alert-banner-actions-gap'],
    '--forge-alert-banner-overlay-alert-banner-actions-margin-top':
      properties?.['overlay-alert-banner-actions-margin-top'],
    '--forge-alert-banner-overlay-alert-banner-content-gap': properties?.['overlay-alert-banner-content-gap'],
    '--forge-alert-banner-overlay-alert-banner-dismiss-opacity': properties?.['overlay-alert-banner-dismiss-opacity'],
    '--forge-alert-banner-overlay-alert-banner-dismiss-transition-duration':
      properties?.['overlay-alert-banner-dismiss-transition-duration'],
    '--forge-alert-banner-overlay-alert-banner-dismiss-transition-easing':
      properties?.['overlay-alert-banner-dismiss-transition-easing'],
    '--forge-alert-banner-overlay-alert-banner-gap': properties?.['overlay-alert-banner-gap'],
    '--forge-alert-banner-overlay-alert-banner-padding-block': properties?.['overlay-alert-banner-padding-block'],
    '--forge-alert-banner-overlay-alert-banner-padding-inline': properties?.['overlay-alert-banner-padding-inline'],
    '--forge-alert-banner-overlay-alert-banner-radius': properties?.['overlay-alert-banner-radius'],
    '--forge-alert-banner-overlay-border-width': properties?.['overlay-border-width'],
    '--forge-alert-banner-overlay-dismiss-focus-width': properties?.['overlay-dismiss-focus-width'],
    '--forge-alert-banner-overlay-dismiss-padding': properties?.['overlay-dismiss-padding'],
    '--forge-alert-banner-overlay-dismiss-radius': properties?.['overlay-dismiss-radius'],
    '--forge-alert-banner-overlay-font-family': properties?.['overlay-font-family'],
    '--forge-alert-banner-overlay-icon-size': properties?.['overlay-icon-size'],
  }) as AlertBannerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface AlertBannerProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /**
   * Controls visibility (the controlled `v-model` substitute). Defaults to `true`.
   * @model onUpdateModelValue
   */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<AlertBannerStyleProperties>;
}

/** Renders the `@mission-platform/icons` status icon for a given {@link AlertBannerVariant}. */
function variantIcon(variant: AlertBannerVariant): MpElement {
  switch (variant) {
    case 'success': {
      return <ForgeIconCheck size="sm" />;
    }
    case 'warning': {
      return <ForgeIconWarning size="sm" />;
    }
    case 'error':
    case 'critical': {
      return <ForgeIconError size="sm" />;
    }
    default: {
      return <ForgeIconInfo size="sm" />;
    }
  }
}

/**
 * `ForgeAlertBanner` — an inline alert / notification banner authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It communicates contextual feedback with an optional title, status icon,
 * dismiss button, and actions, rendering `role="alert"` (assertive) for
 * `warning`/`error` and `role="status"` (polite) otherwise. It owns its styling
 * through the co-located CSS Module `forge-alert-banner.module.scss`, assembled
 * with the framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC used `v-model` + a `dismiss` emit and `icon`/`actions`
 * named slots with `$slots` presence detection; the neutral version is a
 * **controlled** component (`modelValue` + `onUpdateModelValue`), uses the
 * cross-framework callback-prop `onDismiss`, exposes the `iconContent`/`actions`
 * named slots (presence detected with the framework-neutral {@link hasSlot}
 * helper), and draws the status icon with the write-once
 * `@mission-platform/icons` set (`ForgeIconCheck`/`ForgeIconError`/`ForgeIconWarning`/
 * `ForgeIconInfo`). It is wrapped in a `display: contents`
 * host so visibility can toggle without an extra layout box (the neutral dialect
 * has no conditional-root return).
 */
export function ForgeAlertBanner(properties: Readonly<AlertBannerProperties>): MpElement {
  const style = createAlertBannerStyle(properties.properties);

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

  return (
    <div
      className={styles['forge-alert-banner-host']}
      style={style}
    >
      {modelValue ? (
        <div
          aria-live={ariaLive}
          className={[
            styles['forge-alert-banner'],
            styles[`forge-alert-banner--${variant}`],
            size ? `forge-size--${size}` : undefined,
          ]}
          role={role}
          style={style}
        >
          {icon ? (
            <span
              aria-hidden="true"
              className={styles['forge-alert-banner__icon']}
            >
              <Slot name="iconContent">{variantIcon(variant)}</Slot>
            </span>
          ) : undefined}
          <div className={styles['forge-alert-banner__content']}>
            {title ? (
              <ForgeTypography
                as="p"
                color="inherit"
                variant="body-sm"
                weight="semibold"
              >
                {title}
              </ForgeTypography>
            ) : undefined}
            {message === undefined ? undefined : (
              <ForgeTypography
                as="div"
                color="inherit"
                variant="body-sm"
              >
                {message}
              </ForgeTypography>
            )}
            {hasSlot('actions') ? (
              <div className={styles['forge-alert-banner__actions']}>
                <Slot name="actions" />
              </div>
            ) : undefined}
          </div>
          {dismissible ? (
            <button
              aria-label={dismissLabel}
              className={styles['forge-alert-banner__dismiss']}
              type="button"
              onClick={dismiss}
            >
              <ForgeIconClose size="sm" />
            </button>
          ) : undefined}
        </div>
      ) : undefined}
    </div>
  );
}
