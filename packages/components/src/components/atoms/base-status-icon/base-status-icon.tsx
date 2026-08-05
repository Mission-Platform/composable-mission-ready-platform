import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/forge';
import { IconCheck, IconError, IconInfo, IconMinus, IconWarning } from '@mission-platform/icons';

import styles from './base-status-icon.module.scss';

/** Status / tone conveyed by the icon — the canonical colour set. */
export type StatusIconLevel =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale. */
export type StatusIconSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface StatusIconProperties extends MpProperties {
  /** Status conveyed. Defaults to `'neutral'`. */
  status?: StatusIconLevel;
  /** Size token. Defaults to `'md'`. */
  size?: StatusIconSize;
  /** Accessible label. When omitted the icon is decorative (`aria-hidden`). */
  label?: string;
}

export function BaseStatusIcon(properties: Readonly<StatusIconProperties>): MpElement {
  const { status = 'neutral', size = 'md', label } = properties;

  const className = classNames(
    styles['base-status-icon'],
    styles[`base-status-icon--${status}`],
    styles[`base-status-icon--${size}`],
  );

  const iconNode =
    status === 'success' ? (
      <IconCheck size={size} />
    ) : status === 'warning' ? (
      <IconWarning size={size} />
    ) : status === 'error' || status === 'critical' ? (
      <IconError size={size} />
    ) : status === 'neutral' ? (
      <IconMinus size={size} />
    ) : (
      <IconInfo size={size} />
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
