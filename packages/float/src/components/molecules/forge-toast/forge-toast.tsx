import { type MpChild, type MpElement, Slot } from '@mission-platform/forge';
import {
  ForgeIconCheck,
  ForgeIconClose,
  ForgeIconError,
  ForgeIconInfo,
  ForgeIconWarning,
} from '@mission-platform/icons';

import styles from './forge-toast.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ToastSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Intent / colour treatment of the toast — the canonical colour set. */
export type ToastVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface ToastProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Intent / colour treatment. Defaults to `'info'`. */
  variant?: ToastVariant;
  /** Size token controlling the toast's scale. Defaults to `'md'`. */
  size?: ToastSize;
  /** Bold title rendered above the message. */
  title?: string;
  /** The message text (overridden by the default slot). */
  message?: string;
  /** Whether to render a dismiss button. Defaults to `true`. */
  dismissible?: boolean;
  /** Replacement content for the built-in status icon (the `iconContent` named slot). */
  iconContent?: MpChild;
  /** Accessible label for the dismiss button. Defaults to `'Dismiss'`. */
  dismissLabel?: string;
  /** Fired when the dismiss button is pressed. */
  onDismiss?: () => void;
}

/** Renders the `@mission-platform/icons` status icon for a given {@link ToastVariant}. */
function variantIcon(variant: ToastVariant): MpElement {
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
 * `ForgeToast` — a single toast notification card authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It shows an intent glyph, an optional title, the message (the default slot
 * overrides the `message` prop), and an optional dismiss button, rendering
 * `role="alert"` (assertive) for `error`/`warning` and `role="status"` (polite)
 * otherwise. It owns its styling through the co-located CSS Module
 * `forge-toast.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC used a `dismiss` emit and `icon` named slot, and rendered
 * the intent icon as an inline SVG; the neutral version uses the cross-framework
 * callback-prop `onDismiss`, the `iconContent` named slot (`<Slot>`, with the
 * intent icon as its fallback), and the write-once `@mission-platform/icons`
 * set (`ForgeIconCheck`/`ForgeIconError`/`ForgeIconWarning`/`ForgeIconInfo`).
 */
export function ForgeToast(properties: Readonly<ToastProperties>): MpElement {
  const {
    variant = 'info',
    title,
    message,
    dismissible = true,
    size = 'md',
    dismissLabel = 'Dismiss',
    onDismiss,
  } = properties;

  const role = variant === 'error' || variant === 'warning' || variant === 'critical' ? 'alert' : 'status';
  const ariaLive = role === 'alert' ? 'assertive' : 'polite';

  // Treat an empty children array (a children-less nested usage, e.g. from
  // `ForgeToastContainer`) as "no default slot" so the `message` prop is used.
  const slot = Array.isArray(properties.children) && properties.children.length === 0 ? undefined : properties.children;
  const body = slot ?? message;

  return (
    <div
      aria-live={ariaLive}
      className={[styles['forge-toast'], styles[`forge-toast--${variant}`], size ? `forge-size--${size}` : undefined]}
      role={role}
    >
      <span
        aria-hidden="true"
        className={styles['forge-toast__icon']}
      >
        <Slot name="iconContent">{variantIcon(variant)}</Slot>
      </span>
      <div className={styles['forge-toast__content']}>
        {title ? <p className={styles['forge-toast__title']}>{title}</p> : undefined}
        <div className={styles['forge-toast__message']}>{body}</div>
      </div>
      {dismissible ? (
        <button
          aria-label={dismissLabel}
          className={styles['forge-toast__dismiss']}
          type="button"
          onClick={() => onDismiss?.()}
        >
          <ForgeIconClose size="sm" />
        </button>
      ) : undefined}
    </div>
  );
}
