import { Slot, createForgeStyle, type MpChild, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';
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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ToastStyleProperties {
  readonly 'feedback-critical-border'?: string;
  readonly 'feedback-error-border'?: string;
  readonly 'feedback-info-border'?: string;
  readonly 'feedback-neutral-border'?: string;
  readonly 'feedback-success-border'?: string;
  readonly 'feedback-warning-border'?: string;
  readonly 'icon-color-muted'?: string;
  readonly 'overlay-border-default'?: string;
  readonly 'overlay-border-focus-visible'?: string;
  readonly 'overlay-border-width'?: string;
  readonly 'overlay-dismiss-focus-width'?: string;
  readonly 'overlay-dismiss-padding'?: string;
  readonly 'overlay-dismiss-radius'?: string;
  readonly 'overlay-font-family'?: string;
  readonly 'overlay-icon-size'?: string;
  readonly 'overlay-toast-font-size'?: string;
  readonly 'overlay-toast-font-weight'?: string;
  readonly 'overlay-toast-gap'?: string;
  readonly 'overlay-toast-padding-block'?: string;
  readonly 'overlay-toast-padding-inline'?: string;
  readonly 'overlay-toast-radius'?: string;
  readonly 'overlay-toast-shadow'?: string;
  readonly 'overlay-toast-surface'?: string;
  readonly 'overlay-toast-text-default'?: string;
  readonly 'overlay-toast-text-message'?: string;
  readonly 'overlay-toast-title-gap'?: string;
  readonly 'overlay-toast-transition-duration'?: string;
  readonly 'overlay-toast-transition-easing'?: string;
}

export type ToastStyle = CSSStyleProperties & {
  readonly '--forge-toast-feedback-critical-border'?: string | undefined;
  readonly '--forge-toast-feedback-error-border'?: string | undefined;
  readonly '--forge-toast-feedback-info-border'?: string | undefined;
  readonly '--forge-toast-feedback-neutral-border'?: string | undefined;
  readonly '--forge-toast-feedback-success-border'?: string | undefined;
  readonly '--forge-toast-feedback-warning-border'?: string | undefined;
  readonly '--forge-toast-icon-color-muted'?: string | undefined;
  readonly '--forge-toast-overlay-border-default'?: string | undefined;
  readonly '--forge-toast-overlay-border-focus-visible'?: string | undefined;
  readonly '--forge-toast-overlay-border-width'?: string | undefined;
  readonly '--forge-toast-overlay-dismiss-focus-width'?: string | undefined;
  readonly '--forge-toast-overlay-dismiss-padding'?: string | undefined;
  readonly '--forge-toast-overlay-dismiss-radius'?: string | undefined;
  readonly '--forge-toast-overlay-font-family'?: string | undefined;
  readonly '--forge-toast-overlay-icon-size'?: string | undefined;
  readonly '--forge-toast-overlay-toast-font-size'?: string | undefined;
  readonly '--forge-toast-overlay-toast-font-weight'?: string | undefined;
  readonly '--forge-toast-overlay-toast-gap'?: string | undefined;
  readonly '--forge-toast-overlay-toast-padding-block'?: string | undefined;
  readonly '--forge-toast-overlay-toast-padding-inline'?: string | undefined;
  readonly '--forge-toast-overlay-toast-radius'?: string | undefined;
  readonly '--forge-toast-overlay-toast-shadow'?: string | undefined;
  readonly '--forge-toast-overlay-toast-surface'?: string | undefined;
  readonly '--forge-toast-overlay-toast-text-default'?: string | undefined;
  readonly '--forge-toast-overlay-toast-text-message'?: string | undefined;
  readonly '--forge-toast-overlay-toast-title-gap'?: string | undefined;
  readonly '--forge-toast-overlay-toast-transition-duration'?: string | undefined;
  readonly '--forge-toast-overlay-toast-transition-easing'?: string | undefined;
};

function createToastStyle(properties: Readonly<ToastStyleProperties> | undefined): ToastStyle | undefined {
  return createForgeStyle({
    '--forge-toast-feedback-critical-border': properties?.['feedback-critical-border'],
    '--forge-toast-feedback-error-border': properties?.['feedback-error-border'],
    '--forge-toast-feedback-info-border': properties?.['feedback-info-border'],
    '--forge-toast-feedback-neutral-border': properties?.['feedback-neutral-border'],
    '--forge-toast-feedback-success-border': properties?.['feedback-success-border'],
    '--forge-toast-feedback-warning-border': properties?.['feedback-warning-border'],
    '--forge-toast-icon-color-muted': properties?.['icon-color-muted'],
    '--forge-toast-overlay-border-default': properties?.['overlay-border-default'],
    '--forge-toast-overlay-border-focus-visible': properties?.['overlay-border-focus-visible'],
    '--forge-toast-overlay-border-width': properties?.['overlay-border-width'],
    '--forge-toast-overlay-dismiss-focus-width': properties?.['overlay-dismiss-focus-width'],
    '--forge-toast-overlay-dismiss-padding': properties?.['overlay-dismiss-padding'],
    '--forge-toast-overlay-dismiss-radius': properties?.['overlay-dismiss-radius'],
    '--forge-toast-overlay-font-family': properties?.['overlay-font-family'],
    '--forge-toast-overlay-icon-size': properties?.['overlay-icon-size'],
    '--forge-toast-overlay-toast-font-size': properties?.['overlay-toast-font-size'],
    '--forge-toast-overlay-toast-font-weight': properties?.['overlay-toast-font-weight'],
    '--forge-toast-overlay-toast-gap': properties?.['overlay-toast-gap'],
    '--forge-toast-overlay-toast-padding-block': properties?.['overlay-toast-padding-block'],
    '--forge-toast-overlay-toast-padding-inline': properties?.['overlay-toast-padding-inline'],
    '--forge-toast-overlay-toast-radius': properties?.['overlay-toast-radius'],
    '--forge-toast-overlay-toast-shadow': properties?.['overlay-toast-shadow'],
    '--forge-toast-overlay-toast-surface': properties?.['overlay-toast-surface'],
    '--forge-toast-overlay-toast-text-default': properties?.['overlay-toast-text-default'],
    '--forge-toast-overlay-toast-text-message': properties?.['overlay-toast-text-message'],
    '--forge-toast-overlay-toast-title-gap': properties?.['overlay-toast-title-gap'],
    '--forge-toast-overlay-toast-transition-duration': properties?.['overlay-toast-transition-duration'],
    '--forge-toast-overlay-toast-transition-easing': properties?.['overlay-toast-transition-easing'],
  }) as ToastStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ToastStyleProperties>;
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
  const style = createToastStyle(properties.properties);

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
      style={style}
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
