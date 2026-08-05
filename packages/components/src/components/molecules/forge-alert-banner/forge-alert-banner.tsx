import { h, hasSlot, type MpChild, type MpElement, type MpProperties, Slot } from '@mission-platform/forge';
import {
  ForgeIconCheck,
  ForgeIconClose,
  ForgeIconError,
  ForgeIconInfo,
  ForgeIconWarning,
} from '@mission-platform/icons';

import sizeStyles from '../../../styles/size.module.scss';
import { ForgeTypography } from '../../atoms/forge-typography';

import styles from './forge-alert-banner.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type AlertBannerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Intent / colour treatment of the banner — the canonical colour set. */
export type AlertBannerVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface AlertBannerProperties extends MpProperties {
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
    <div className={styles['forge-alert-banner-host']}>
      {modelValue ? (
        <div
          aria-live={ariaLive}
          className={[
            styles['forge-alert-banner'],
            styles[`forge-alert-banner--${variant}`],
            sizeStyles[`forge-size--${size}`],
          ]}
          role={role}
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
