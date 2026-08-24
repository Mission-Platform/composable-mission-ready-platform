import { classNames, type MpElement } from '@mission-platform/forge';

import styles from './forge-sync-status-indicator.module.scss';

/** Synchronization state represented by the indicator. */
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';
export interface SyncStatusIndicatorProperties {
  /** Current synchronization state. Defaults to `'synced'`. */
  status?: SyncStatus;
  /** Accessible and, by default, visible status text. */
  label?: string;
  /** Hide the visible label while retaining the accessible name. Defaults to `false`. */
  showLabel?: boolean;
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
    >
      <span
        aria-hidden="true"
        className={styles['forge-sync-status-indicator__dot']}
      />
      {showLabel ? <span className={styles['forge-sync-status-indicator__label']}>{label}</span> : undefined}
    </span>
  );
}
