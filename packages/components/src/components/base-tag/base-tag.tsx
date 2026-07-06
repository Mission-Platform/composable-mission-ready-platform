import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';

import styles from './base-tag.module.scss';

/** Canonical 2xs → 2xl size scale. */
export type TagSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Tone of the tag. */
export type TagVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface TagProperties extends MpProperties {
  /** The tag's text. */
  label: string;
  /** Size token. Defaults to `'md'`. */
  size?: TagSize;
  /** Tone. Defaults to `'neutral'`. */
  variant?: TagVariant;
  /** Whether the tag is non-interactive/dimmed. */
  disabled?: boolean;
  /** When `true`, renders a remove (×) button that fires `onRemove`. */
  removable?: boolean;
  /** Fired when the remove button is activated. */
  onRemove?: () => void;
}

/**
 * `BaseTag` — a compact, rounded label authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * It renders its `label` (via the composed neutral {@link BaseTypography}) with
 * a tone/size, and — when `removable` and not `disabled` — a remove button that
 * fires the `onRemove` callback. It owns its styling through the co-located CSS
 * Module `base-tag.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC used the `@mission-platform/icons` `IconClose` in the
 * remove button and a Vue `remove` emit; the neutral version substitutes a
 * plain `×` glyph (the icons package is not part of this library) and the
 * cross-framework callback-prop convention (`onRemove`).
 */
export function BaseTag(properties: TagProperties): MpElement {
  const { label, size = 'md', variant = 'neutral', disabled = false, removable = false } = properties;

  const className = classNames(styles['base-tag'], styles[`base-tag--${size}`], styles[`base-tag--${variant}`], {
    [styles['base-tag--disabled']]: disabled,
  });

  const handleRemove = (): void => {
    properties.onRemove?.();
  };

  return (
    <span classNames={className}>
      <span classNames={styles['base-tag__label']}>
        <BaseTypography
          as="span"
          color="inherit"
          variant="caption"
          weight="medium"
        >
          {label}
        </BaseTypography>
      </span>
      {removable && !disabled ? (
        <button
          classNames={styles['base-tag__remove']}
          type="button"
          aria-label={`Remove ${label}`}
          onClick={handleRemove}
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : undefined}
    </span>
  );
}
