import {
  classNames,
  createForgeStyle,
  type ClassValue,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import { ForgeKbd } from '../../atoms/forge-kbd/forge-kbd';

import styles from './forge-shortcut-hint.module.scss';

/** Size token controlling the shortcut hint scale. */
export type ShortcutHintSize = 'sm' | 'md';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ShortcutHintStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-raised'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-lg'?: string;
  readonly 'font-size-md'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'radius-sm'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
}

export type ShortcutHintStyle = CSSStyleProperties & {
  readonly '--forge-shortcut-hint-border-width-thick'?: string | undefined;
  readonly '--forge-shortcut-hint-border-width-thin'?: string | undefined;
  readonly '--forge-shortcut-hint-color-bg-raised'?: string | undefined;
  readonly '--forge-shortcut-hint-color-border-default'?: string | undefined;
  readonly '--forge-shortcut-hint-color-text-primary'?: string | undefined;
  readonly '--forge-shortcut-hint-color-text-secondary'?: string | undefined;
  readonly '--forge-shortcut-hint-font-size-lg'?: string | undefined;
  readonly '--forge-shortcut-hint-font-size-md'?: string | undefined;
  readonly '--forge-shortcut-hint-font-size-sm'?: string | undefined;
  readonly '--forge-shortcut-hint-radius-sm'?: string | undefined;
  readonly '--forge-shortcut-hint-spacing-1'?: string | undefined;
  readonly '--forge-shortcut-hint-spacing-2'?: string | undefined;
};

function createShortcutHintStyle(
  properties: Readonly<ShortcutHintStyleProperties> | undefined,
): ShortcutHintStyle | undefined {
  return createForgeStyle({
    '--forge-shortcut-hint-border-width-thick': properties?.['border-width-thick'],
    '--forge-shortcut-hint-border-width-thin': properties?.['border-width-thin'],
    '--forge-shortcut-hint-color-bg-raised': properties?.['color-bg-raised'],
    '--forge-shortcut-hint-color-border-default': properties?.['color-border-default'],
    '--forge-shortcut-hint-color-text-primary': properties?.['color-text-primary'],
    '--forge-shortcut-hint-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-shortcut-hint-font-size-lg': properties?.['font-size-lg'],
    '--forge-shortcut-hint-font-size-md': properties?.['font-size-md'],
    '--forge-shortcut-hint-font-size-sm': properties?.['font-size-sm'],
    '--forge-shortcut-hint-radius-sm': properties?.['radius-sm'],
    '--forge-shortcut-hint-spacing-1': properties?.['spacing-1'],
    '--forge-shortcut-hint-spacing-2': properties?.['spacing-2'],
  }) as ShortcutHintStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ShortcutHintStyleProperties>;
}

/**
 * `ForgeShortcutHint` — a framework-neutral action label paired with
 * `ForgeKbd` elements.
 */
export function ForgeShortcutHint(properties: Readonly<ShortcutHintProperties>): MpElement {
  const style = createShortcutHintStyle(properties.properties);

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
      style={style}
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
