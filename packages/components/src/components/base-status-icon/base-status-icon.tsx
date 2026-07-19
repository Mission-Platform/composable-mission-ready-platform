import { IconCheck, IconError, IconInfo, IconMinus, IconWarning } from '@mission-platform/icons';
import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

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

/** Renders the `@mission-platform/icons` glyph for a given {@link StatusIconLevel}. */
function statusIcon(status: StatusIconLevel, size: StatusIconSize): MpElement {
  switch (status) {
    case 'success': {
      return <IconCheck size={size} />;
    }
    case 'warning': {
      return <IconWarning size={size} />;
    }
    case 'error':
    case 'critical': {
      return <IconError size={size} />;
    }
    case 'neutral': {
      return <IconMinus size={size} />;
    }
    default: {
      return <IconInfo size={size} />;
    }
  }
}

/**
 * `BaseStatusIcon` — a small status indicator authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a toned icon for the chosen `status` at a given `size`, exposing
 * `role="img"` with an `aria-label` when a `label` is supplied (otherwise it is
 * `aria-hidden`/decorative). It owns its styling through the co-located CSS
 * Module `base-status-icon.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The status icon is drawn with the write-once `@mission-platform/icons` set
 * (`IconCheck`/`IconWarning`/`IconError`/`IconInfo`/`IconMinus`), itself
 * compiled to React/Vue.
 */
export function BaseStatusIcon(properties: Readonly<StatusIconProperties>): MpElement {
  const { status = 'neutral', size = 'md', label } = properties;

  const className = classNames(
    styles['base-status-icon'],
    styles[`base-status-icon--${status}`],
    styles[`base-status-icon--${size}`],
  );

  return (
    <span
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      classNames={className}
      role="img"
    >
      {statusIcon(status, size)}
    </span>
  );
}
