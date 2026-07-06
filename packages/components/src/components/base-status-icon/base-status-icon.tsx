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

/** Maps each {@link StatusIconLevel} onto its glyph (substituted for the original icons). */
const STATUS_GLYPH: Record<StatusIconLevel, string> = {
  neutral: '–',
  primary: 'ℹ',
  secondary: 'ℹ',
  tertiary: 'ℹ',
  success: '✓',
  warning: '⚠',
  info: 'ℹ',
  error: '✕',
  critical: '⛔',
};

/**
 * `BaseStatusIcon` — a small status indicator authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a toned glyph for the chosen `status` at a given `size`, exposing
 * `role="img"` with an `aria-label` when a `label` is supplied (otherwise it is
 * `aria-hidden`/decorative). It owns its styling through the co-located CSS
 * Module `base-status-icon.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC rendered `@mission-platform/icons` SVGs
 * (`IconCheck`/`IconWarning`/`IconError`/`IconInfo`/`IconMinus`); the neutral
 * version (the icons package is not part of this library) substitutes the text
 * glyphs `✓`/`⚠`/`✕`/`ℹ`/`–`.
 */
export function BaseStatusIcon(properties: StatusIconProperties): MpElement {
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
      <span aria-hidden="true">{STATUS_GLYPH[status]}</span>
    </span>
  );
}
