import { classNames, type MpElement } from '@mission-platform/forge';
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

export interface StatusIconProperties {
  /** Status conveyed. Defaults to `'neutral'`. */
  status?: StatusIconLevel;
  /** Size token. Defaults to `'md'`. */
  size?: StatusIconSize;
  /** Accessible label. When omitted the icon is decorative (`aria-hidden`). */
  label?: string;
}

export function ForgeStatusIcon(properties: Readonly<StatusIconProperties>): MpElement {
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
    >
      {iconNode}
    </span>
  );
}
