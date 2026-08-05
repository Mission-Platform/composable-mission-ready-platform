import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/forge';
import { ForgeIconClose } from '@mission-platform/icons';

import { ForgeTypography } from '../forge-typography';

import styles from './forge-tag.module.scss';

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
 * `ForgeTag` — a compact, rounded label authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders its `label` (via the composed neutral {@link ForgeTypography}) with
 * a tone/size, and — when `removable` and not `disabled` — a remove button that
 * fires the `onRemove` callback. It owns its styling through the co-located CSS
 * Module `forge-tag.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The remove button renders the write-once `@mission-platform/icons`
 * `ForgeIconClose` (itself compiled to React/Vue) and fires the cross-framework
 * callback-prop `onRemove` (the Vue `remove` emit substitute).
 */
export function ForgeTag(properties: Readonly<TagProperties>): MpElement {
  const { label, size = 'md', variant = 'neutral', disabled = false, removable = false } = properties;

  const className = classNames(styles['forge-tag'], styles[`forge-tag--${size}`], styles[`forge-tag--${variant}`], {
    [styles['forge-tag--disabled']]: disabled,
  });

  const handleRemove = (): void => {
    properties.onRemove?.();
  };

  return (
    <span className={className}>
      <span className={styles['forge-tag__label']}>
        <ForgeTypography
          as="span"
          color="inherit"
          variant="caption"
          weight="medium"
        >
          {label}
        </ForgeTypography>
      </span>
      {removable && !disabled ? (
        <button
          className={styles['forge-tag__remove']}
          type="button"
          aria-label={`Remove ${label}`}
          onClick={handleRemove}
        >
          <ForgeIconClose size="2xs" />
        </button>
      ) : undefined}
    </span>
  );
}
