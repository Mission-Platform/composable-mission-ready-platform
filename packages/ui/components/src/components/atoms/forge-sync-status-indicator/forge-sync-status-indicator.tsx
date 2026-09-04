import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

import styles from './forge-sync-status-indicator.module.scss';

/** Synchronization state represented by the indicator. */
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SyncStatusIndicatorStyleProperties {
  readonly 'color-danger-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'feedback-sync-color'?: string;
  readonly 'feedback-sync-gap'?: string;
  readonly 'feedback-sync-text'?: string;
  readonly 'font-family-sans'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-medium'?: string;
  readonly 'opacity-muted'?: string;
  readonly 'radius-full'?: string;
  readonly 'size-checkable-indicator'?: string;
}

export type SyncStatusIndicatorStyle = CSSStyleProperties & {
  readonly '--forge-sync-status-indicator-color-danger-default'?: string | undefined;
  readonly '--forge-sync-status-indicator-color-primary-default'?: string | undefined;
  readonly '--forge-sync-status-indicator-color-success-default'?: string | undefined;
  readonly '--forge-sync-status-indicator-color-text-tertiary'?: string | undefined;
  readonly '--forge-sync-status-indicator-color-warning-default'?: string | undefined;
  readonly '--forge-sync-status-indicator-feedback-sync-color'?: string | undefined;
  readonly '--forge-sync-status-indicator-feedback-sync-gap'?: string | undefined;
  readonly '--forge-sync-status-indicator-feedback-sync-text'?: string | undefined;
  readonly '--forge-sync-status-indicator-font-family-sans'?: string | undefined;
  readonly '--forge-sync-status-indicator-font-size-sm'?: string | undefined;
  readonly '--forge-sync-status-indicator-font-weight-medium'?: string | undefined;
  readonly '--forge-sync-status-indicator-opacity-muted'?: string | undefined;
  readonly '--forge-sync-status-indicator-radius-full'?: string | undefined;
  readonly '--forge-sync-status-indicator-size-checkable-indicator'?: string | undefined;
};

function createSyncStatusIndicatorStyle(
  properties: Readonly<SyncStatusIndicatorStyleProperties> | undefined,
): SyncStatusIndicatorStyle | undefined {
  return createForgeStyle({
    '--forge-sync-status-indicator-color-danger-default': properties?.['color-danger-default'],
    '--forge-sync-status-indicator-color-primary-default': properties?.['color-primary-default'],
    '--forge-sync-status-indicator-color-success-default': properties?.['color-success-default'],
    '--forge-sync-status-indicator-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-sync-status-indicator-color-warning-default': properties?.['color-warning-default'],
    '--forge-sync-status-indicator-feedback-sync-color': properties?.['feedback-sync-color'],
    '--forge-sync-status-indicator-feedback-sync-gap': properties?.['feedback-sync-gap'],
    '--forge-sync-status-indicator-feedback-sync-text': properties?.['feedback-sync-text'],
    '--forge-sync-status-indicator-font-family-sans': properties?.['font-family-sans'],
    '--forge-sync-status-indicator-font-size-sm': properties?.['font-size-sm'],
    '--forge-sync-status-indicator-font-weight-medium': properties?.['font-weight-medium'],
    '--forge-sync-status-indicator-opacity-muted': properties?.['opacity-muted'],
    '--forge-sync-status-indicator-radius-full': properties?.['radius-full'],
    '--forge-sync-status-indicator-size-checkable-indicator': properties?.['size-checkable-indicator'],
  }) as SyncStatusIndicatorStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SyncStatusIndicatorProperties {
  /** Current synchronization state. Defaults to `'synced'`. */
  status?: SyncStatus;
  /** Accessible and, by default, visible status text. */
  label?: string;
  /** Hide the visible label while retaining the accessible name. Defaults to `false`. */
  showLabel?: boolean;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SyncStatusIndicatorStyleProperties>;
}

const DEFAULT_LABELS: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing…',
  pending: 'Waiting to sync',
  error: 'Sync failed',
  offline: 'Offline',
};

/** A compact, accessible synchronization state indicator. */
export function ForgeSyncStatusIndicator(properties: Readonly<SyncStatusIndicatorProperties>): MpElement {
  const style = createSyncStatusIndicatorStyle(properties.properties);

  const { status = 'synced', showLabel = true } = properties;
  const label = properties.label ?? DEFAULT_LABELS[status];
  const className = classNames(styles['forge-sync-status-indicator'], styles[`forge-sync-status-indicator--${status}`]);

  return (
    <span
      aria-atomic="true"
      aria-label={label}
      aria-live="polite"
      className={className}
      role="status"
      style={style}
    >
      <span
        aria-hidden="true"
        className={styles['forge-sync-status-indicator__dot']}
      />
      {showLabel ? <span className={styles['forge-sync-status-indicator__label']}>{label}</span> : undefined}
    </span>
  );
}
