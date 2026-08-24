import { classNames, type ClassValue, type MpElement } from '@mission-platform/forge';

import { ForgeKbd } from '../../atoms/forge-kbd/forge-kbd';

import styles from './forge-shortcut-hint.module.scss';

/** Size token controlling the shortcut hint scale. */
export type ShortcutHintSize = 'sm' | 'md';

export interface ShortcutHintProperties {
  /** Human-readable action associated with the shortcut. */
  label?: string;
  /** Ordered keys displayed as individual keyboard hints. */
  keys: readonly string[];
  /** Text between keys in the accessible label and visual presentation. */
  separator?: string;
  /** Intrinsic size. Defaults to `'md'`. */
  size?: ShortcutHintSize;
  /** Explicit accessible label override. */
  ariaLabel?: string;
  /** Extra class(es) merged onto the root element. */
  className?: ClassValue;
}

/**
 * `ForgeShortcutHint` — a framework-neutral action label paired with
 * `ForgeKbd` elements.
 */
export function ForgeShortcutHint(properties: Readonly<ShortcutHintProperties>): MpElement {
  const keys = properties.keys.filter((key) => key.trim().length > 0);
  const separator = properties.separator ?? '+';
  const accessibleKeys = keys.join(` ${separator} `);
  const ariaLabel =
    properties.ariaLabel ?? (properties.label ? `${properties.label}: ${accessibleKeys}` : accessibleKeys);

  return (
    <span
      aria-label={ariaLabel}
      className={classNames(
        styles['forge-shortcut-hint'],
        styles[`forge-shortcut-hint--${properties.size ?? 'sm'}`],
        properties.className,
      )}
      role="group"
    >
      {properties.label ? <span className={styles['forge-shortcut-hint__label']}>{properties.label}</span> : undefined}
      {keys.length > 0 ? (
        <span className={styles['forge-shortcut-hint__keys']}>
          {keys.map((key, index) => (
            <span
              key={`${key}-${index}`}
              className={styles['forge-shortcut-hint__key-group']}
            >
              {index > 0 ? <span aria-hidden="true">{separator}</span> : undefined}
              <ForgeKbd size={properties.size ?? 'sm'}>{key}</ForgeKbd>
            </span>
          ))}
        </span>
      ) : undefined}
    </span>
  );
}
