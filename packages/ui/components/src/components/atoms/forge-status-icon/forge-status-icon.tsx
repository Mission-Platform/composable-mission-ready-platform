import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';
import {
  ForgeIconCheck,
  ForgeIconError,
  ForgeIconInfo,
  ForgeIconMinus,
  ForgeIconWarning,
} from '@mission-platform/icons';

import styles from './forge-status-icon.module.scss';

/** Status / tone conveyed by the icon — the canonical colour set. */
export type StatusIconLevel =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale. */
export type StatusIconSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface StatusIconStyleProperties {
  readonly 'feedback-status-color-critical'?: string;
  readonly 'feedback-status-color-error'?: string;
  readonly 'feedback-status-color-info'?: string;
  readonly 'feedback-status-color-neutral'?: string;
  readonly 'feedback-status-color-primary'?: string;
  readonly 'feedback-status-color-secondary'?: string;
  readonly 'feedback-status-color-success'?: string;
  readonly 'feedback-status-color-tertiary'?: string;
  readonly 'feedback-status-color-warning'?: string;
  readonly 'feedback-status-size-2xl'?: string;
  readonly 'feedback-status-size-2xs'?: string;
  readonly 'feedback-status-size-lg'?: string;
  readonly 'feedback-status-size-md'?: string;
  readonly 'feedback-status-size-sm'?: string;
  readonly 'feedback-status-size-xl'?: string;
  readonly 'feedback-status-size-xs'?: string;
}

export type StatusIconStyle = CSSStyleProperties & {
  readonly '--forge-status-icon-feedback-status-color-critical'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-error'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-info'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-neutral'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-primary'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-secondary'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-success'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-tertiary'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-color-warning'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-2xl'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-2xs'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-lg'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-md'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-sm'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-xl'?: string | undefined;
  readonly '--forge-status-icon-feedback-status-size-xs'?: string | undefined;
};

function createStatusIconStyle(
  properties: Readonly<StatusIconStyleProperties> | undefined,
): StatusIconStyle | undefined {
  return createForgeStyle({
    '--forge-status-icon-feedback-status-color-critical': properties?.['feedback-status-color-critical'],
    '--forge-status-icon-feedback-status-color-error': properties?.['feedback-status-color-error'],
    '--forge-status-icon-feedback-status-color-info': properties?.['feedback-status-color-info'],
    '--forge-status-icon-feedback-status-color-neutral': properties?.['feedback-status-color-neutral'],
    '--forge-status-icon-feedback-status-color-primary': properties?.['feedback-status-color-primary'],
    '--forge-status-icon-feedback-status-color-secondary': properties?.['feedback-status-color-secondary'],
    '--forge-status-icon-feedback-status-color-success': properties?.['feedback-status-color-success'],
    '--forge-status-icon-feedback-status-color-tertiary': properties?.['feedback-status-color-tertiary'],
    '--forge-status-icon-feedback-status-color-warning': properties?.['feedback-status-color-warning'],
    '--forge-status-icon-feedback-status-size-2xl': properties?.['feedback-status-size-2xl'],
    '--forge-status-icon-feedback-status-size-2xs': properties?.['feedback-status-size-2xs'],
    '--forge-status-icon-feedback-status-size-lg': properties?.['feedback-status-size-lg'],
    '--forge-status-icon-feedback-status-size-md': properties?.['feedback-status-size-md'],
    '--forge-status-icon-feedback-status-size-sm': properties?.['feedback-status-size-sm'],
    '--forge-status-icon-feedback-status-size-xl': properties?.['feedback-status-size-xl'],
    '--forge-status-icon-feedback-status-size-xs': properties?.['feedback-status-size-xs'],
  }) as StatusIconStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface StatusIconProperties {
  /** Status conveyed. Defaults to `'neutral'`. */
  status?: StatusIconLevel;
  /** Size token. Defaults to `'md'`. */
  size?: StatusIconSize;
  /** Accessible label. When omitted the icon is decorative (`aria-hidden`). */
  label?: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<StatusIconStyleProperties>;
}

export function ForgeStatusIcon(properties: Readonly<StatusIconProperties>): MpElement {
  const style = createStatusIconStyle(properties.properties);

  const { status = 'neutral', size = 'md', label } = properties;

  const className = classNames(
    styles['forge-status-icon'],
    styles[`forge-status-icon--${status}`],
    styles[`forge-status-icon--${size}`],
  );

  const iconNode =
    status === 'success' ? (
      <ForgeIconCheck size={size} />
    ) : status === 'warning' ? (
      <ForgeIconWarning size={size} />
    ) : status === 'error' || status === 'critical' ? (
      <ForgeIconError size={size} />
    ) : status === 'neutral' ? (
      <ForgeIconMinus size={size} />
    ) : (
      <ForgeIconInfo size={size} />
    );

  return (
    <span
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      className={className}
      role="img"
      style={style}
    >
      {iconNode}
    </span>
  );
}
