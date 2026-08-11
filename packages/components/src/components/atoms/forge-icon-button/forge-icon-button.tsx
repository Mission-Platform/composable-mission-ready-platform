import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';

import styles from './forge-icon-button.module.scss';

/** Visual treatment of the icon button — the canonical colour set plus a transparent `ghost`. */
export type IconButtonVariant =
  'ghost' | 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token controlling the square padding — canonical 2xs → 2xl scale. */
export type IconButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface IconButtonProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Accessible name, applied as `aria-label`. Required because the button is icon-only. */
  label: string;
  /** Visual treatment. Defaults to `'ghost'`. */
  variant?: IconButtonVariant;
  /** Size token controlling the square padding. Defaults to `'md'`. */
  size?: IconButtonSize;
  /** Whether the button is non-interactive. */
  disabled?: boolean;
  /** Native `type` attribute. Defaults to `'button'`. */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler forwarded to the underlying `<button>`. Suppressed while `disabled`. */
  onClick?: (event: unknown) => void;
}

/**
 * `ForgeIconButton` — a compact, square, icon-only button authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a native `<button>` whose icon is supplied through the default
 * slot. Because it has no visible text, an accessible name is **required** via
 * `label` (applied as `aria-label`). The `click` callback is suppressed while
 * `disabled`. It owns its styling through the co-located CSS Module
 * `forge-icon-button.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeIconButton(properties: Readonly<IconButtonProperties>): MpElement {
  const { label, variant = 'ghost', size = 'md', disabled = false, type = 'button' } = properties;

  const className = classNames(
    styles['forge-icon-button'],
    styles[`forge-icon-button--${variant}`],
    styles[`forge-icon-button--${size}`],
  );

  const handleClick = (event: unknown): void => {
    if (!disabled) {
      properties.onClick?.(event);
    }
  };

  return (
    <button
      aria-label={label}
      className={className}
      disabled={disabled}
      type={type}
      onClick={handleClick}
    >
      {properties.children}
    </button>
  );
}
