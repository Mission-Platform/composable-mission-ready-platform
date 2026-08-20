import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import styles from './forge-collapse.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type CollapseSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Colour tone of the disclosure — the canonical colour set (`neutral` is the plain treatment). */
export type CollapseVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface CollapseProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Summary (disclosure trigger) text. Defaults to `'Details'`. */
  summary?: string;
  /** Colour tone of the disclosure. Defaults to `'neutral'`. */
  variant?: CollapseVariant;
  /** Size token controlling the disclosure's scale. Defaults to `'md'`. */
  size?: CollapseSize;
  /** Whether the disclosure starts open. */
  open?: boolean;
  /** Whether the disclosure is non-interactive. */
  disabled?: boolean;
  /** Fired when the disclosure is toggled; receives the new open state. */
  onToggle?: (open: boolean) => void;
}

/**
 * `ForgeCollapse` — a native `<details>`-based disclosure authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The clickable summary text comes from the `summary` prop; the body is the
 * default slot. Toggling fires the `onToggle` callback with the new open state.
 * It owns its styling through the co-located CSS Module
 * `forge-collapse.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC used the `@mission-platform/icons` `ForgeIconChevron`, a
 * `toggle` emit, and a `summary` slot override; the neutral version renders the
 * write-once `@mission-platform/icons` `ForgeIconChevron` rotated purely by the
 * native `[open]` attribute (no JS open-state needed), the cross-framework
 * `onToggle` callback, and a plain `summary` text prop (the slot override is
 * dropped, consistent with how the other migrated components dropped slots that
 * collide with same-named props).
 */
export function ForgeCollapse(properties: Readonly<CollapseProperties>): MpElement {
  const { summary = 'Details', open = false, disabled = false, variant = 'neutral', size = 'md' } = properties;

  const className = classNames(
    styles['forge-collapse'],
    styles[`forge-collapse--${variant}`],
    size ? `forge-size--${size}` : undefined,
    {
      [styles['forge-collapse--disabled']]: disabled,
    },
  );

  const handleToggle = (event: Event): void => {
    const target = event.target as HTMLDetailsElement;
    properties.onToggle?.(target.open);
  };

  return (
    <details
      className={className}
      open={open}
      onToggle={handleToggle}
    >
      <summary className={styles['forge-collapse__summary']}>
        <span className={styles['forge-collapse__label']}>{summary}</span>
        <span
          className={styles['forge-collapse__chevron']}
          aria-hidden="true"
        >
          <ForgeIconChevron
            direction="down"
            size="sm"
          />
        </span>
      </summary>
      <div className={styles['forge-collapse__content']}>{properties.children}</div>
    </details>
  );
}
