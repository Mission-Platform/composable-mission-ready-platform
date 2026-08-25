import {
  classNames,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-icon-button.module.scss';

/** Visual treatment of the icon button — the canonical colour set plus a transparent `ghost`. */
export type IconButtonVariant =
  'ghost' | 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token controlling the square padding — canonical 2xs → 2xl scale. */
export type IconButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface IconButtonStyleProperties {
  readonly 'button-critical-background-active'?: string;
  readonly 'button-critical-background-default'?: string;
  readonly 'button-critical-background-hover'?: string;
  readonly 'button-critical-text-default'?: string;
  readonly 'button-critical-text-hover'?: string;
  readonly 'button-error-background-active'?: string;
  readonly 'button-error-background-default'?: string;
  readonly 'button-error-background-hover'?: string;
  readonly 'button-error-focus-ring'?: string;
  readonly 'button-error-text-default'?: string;
  readonly 'button-error-text-hover'?: string;
  readonly 'button-ghost-background-active'?: string;
  readonly 'button-ghost-background-default'?: string;
  readonly 'button-ghost-background-hover'?: string;
  readonly 'button-ghost-text-default'?: string;
  readonly 'button-ghost-text-hover'?: string;
  readonly 'button-icon-button-border-width'?: string;
  readonly 'button-icon-button-color'?: string;
  readonly 'button-icon-button-focus-ring'?: string;
  readonly 'button-icon-button-opacity-disabled'?: string;
  readonly 'button-icon-button-radius'?: string;
  readonly 'button-icon-button-size-2xl-font-size'?: string;
  readonly 'button-icon-button-size-2xl-padding'?: string;
  readonly 'button-icon-button-size-2xs-font-size'?: string;
  readonly 'button-icon-button-size-2xs-padding'?: string;
  readonly 'button-icon-button-size-lg-font-size'?: string;
  readonly 'button-icon-button-size-lg-padding'?: string;
  readonly 'button-icon-button-size-md-font-size'?: string;
  readonly 'button-icon-button-size-md-padding'?: string;
  readonly 'button-icon-button-size-sm-font-size'?: string;
  readonly 'button-icon-button-size-sm-padding'?: string;
  readonly 'button-icon-button-size-xl-font-size'?: string;
  readonly 'button-icon-button-size-xl-padding'?: string;
  readonly 'button-icon-button-size-xs-font-size'?: string;
  readonly 'button-icon-button-size-xs-padding'?: string;
  readonly 'button-icon-button-transition-duration'?: string;
  readonly 'button-icon-button-transition-easing'?: string;
  readonly 'button-info-background-active'?: string;
  readonly 'button-info-background-default'?: string;
  readonly 'button-info-background-hover'?: string;
  readonly 'button-info-text-default'?: string;
  readonly 'button-info-text-hover'?: string;
  readonly 'button-neutral-background-active'?: string;
  readonly 'button-neutral-background-default'?: string;
  readonly 'button-neutral-background-hover'?: string;
  readonly 'button-neutral-text-default'?: string;
  readonly 'button-neutral-text-hover'?: string;
  readonly 'button-primary-background-active'?: string;
  readonly 'button-primary-background-default'?: string;
  readonly 'button-primary-background-hover'?: string;
  readonly 'button-primary-text-default'?: string;
  readonly 'button-primary-text-hover'?: string;
  readonly 'button-secondary-background-active'?: string;
  readonly 'button-secondary-background-default'?: string;
  readonly 'button-secondary-background-hover'?: string;
  readonly 'button-secondary-border-default'?: string;
  readonly 'button-secondary-border-hover'?: string;
  readonly 'button-secondary-text-default'?: string;
  readonly 'button-success-background-active'?: string;
  readonly 'button-success-background-default'?: string;
  readonly 'button-success-background-hover'?: string;
  readonly 'button-success-text-default'?: string;
  readonly 'button-success-text-hover'?: string;
  readonly 'button-tertiary-background-active'?: string;
  readonly 'button-tertiary-background-default'?: string;
  readonly 'button-tertiary-background-hover'?: string;
  readonly 'button-tertiary-text-default'?: string;
  readonly 'button-tertiary-text-hover'?: string;
  readonly 'button-warning-background-active'?: string;
  readonly 'button-warning-background-default'?: string;
  readonly 'button-warning-background-hover'?: string;
  readonly 'button-warning-text-default'?: string;
  readonly 'button-warning-text-hover'?: string;
}

export type IconButtonStyle = CSSStyleProperties & {
  readonly '--forge-icon-button-button-critical-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-critical-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-critical-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-critical-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-critical-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-error-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-error-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-error-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-error-focus-ring'?: string | undefined;
  readonly '--forge-icon-button-button-error-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-error-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-ghost-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-ghost-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-ghost-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-ghost-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-ghost-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-border-width'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-color'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-focus-ring'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-opacity-disabled'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-radius'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-2xl-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-2xl-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-2xs-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-2xs-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-lg-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-lg-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-md-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-md-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-sm-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-sm-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-xl-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-xl-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-xs-font-size'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-size-xs-padding'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-transition-duration'?: string | undefined;
  readonly '--forge-icon-button-button-icon-button-transition-easing'?: string | undefined;
  readonly '--forge-icon-button-button-info-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-info-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-info-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-info-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-info-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-neutral-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-neutral-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-neutral-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-neutral-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-neutral-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-primary-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-primary-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-primary-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-primary-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-primary-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-secondary-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-secondary-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-secondary-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-secondary-border-default'?: string | undefined;
  readonly '--forge-icon-button-button-secondary-border-hover'?: string | undefined;
  readonly '--forge-icon-button-button-secondary-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-success-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-success-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-success-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-success-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-success-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-tertiary-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-tertiary-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-tertiary-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-tertiary-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-tertiary-text-hover'?: string | undefined;
  readonly '--forge-icon-button-button-warning-background-active'?: string | undefined;
  readonly '--forge-icon-button-button-warning-background-default'?: string | undefined;
  readonly '--forge-icon-button-button-warning-background-hover'?: string | undefined;
  readonly '--forge-icon-button-button-warning-text-default'?: string | undefined;
  readonly '--forge-icon-button-button-warning-text-hover'?: string | undefined;
};

function createIconButtonStyle(
  properties: Readonly<IconButtonStyleProperties> | undefined,
): IconButtonStyle | undefined {
  return createForgeStyle({
    '--forge-icon-button-button-critical-background-active': properties?.['button-critical-background-active'],
    '--forge-icon-button-button-critical-background-default': properties?.['button-critical-background-default'],
    '--forge-icon-button-button-critical-background-hover': properties?.['button-critical-background-hover'],
    '--forge-icon-button-button-critical-text-default': properties?.['button-critical-text-default'],
    '--forge-icon-button-button-critical-text-hover': properties?.['button-critical-text-hover'],
    '--forge-icon-button-button-error-background-active': properties?.['button-error-background-active'],
    '--forge-icon-button-button-error-background-default': properties?.['button-error-background-default'],
    '--forge-icon-button-button-error-background-hover': properties?.['button-error-background-hover'],
    '--forge-icon-button-button-error-focus-ring': properties?.['button-error-focus-ring'],
    '--forge-icon-button-button-error-text-default': properties?.['button-error-text-default'],
    '--forge-icon-button-button-error-text-hover': properties?.['button-error-text-hover'],
    '--forge-icon-button-button-ghost-background-active': properties?.['button-ghost-background-active'],
    '--forge-icon-button-button-ghost-background-default': properties?.['button-ghost-background-default'],
    '--forge-icon-button-button-ghost-background-hover': properties?.['button-ghost-background-hover'],
    '--forge-icon-button-button-ghost-text-default': properties?.['button-ghost-text-default'],
    '--forge-icon-button-button-ghost-text-hover': properties?.['button-ghost-text-hover'],
    '--forge-icon-button-button-icon-button-border-width': properties?.['button-icon-button-border-width'],
    '--forge-icon-button-button-icon-button-color': properties?.['button-icon-button-color'],
    '--forge-icon-button-button-icon-button-focus-ring': properties?.['button-icon-button-focus-ring'],
    '--forge-icon-button-button-icon-button-opacity-disabled': properties?.['button-icon-button-opacity-disabled'],
    '--forge-icon-button-button-icon-button-radius': properties?.['button-icon-button-radius'],
    '--forge-icon-button-button-icon-button-size-2xl-font-size': properties?.['button-icon-button-size-2xl-font-size'],
    '--forge-icon-button-button-icon-button-size-2xl-padding': properties?.['button-icon-button-size-2xl-padding'],
    '--forge-icon-button-button-icon-button-size-2xs-font-size': properties?.['button-icon-button-size-2xs-font-size'],
    '--forge-icon-button-button-icon-button-size-2xs-padding': properties?.['button-icon-button-size-2xs-padding'],
    '--forge-icon-button-button-icon-button-size-lg-font-size': properties?.['button-icon-button-size-lg-font-size'],
    '--forge-icon-button-button-icon-button-size-lg-padding': properties?.['button-icon-button-size-lg-padding'],
    '--forge-icon-button-button-icon-button-size-md-font-size': properties?.['button-icon-button-size-md-font-size'],
    '--forge-icon-button-button-icon-button-size-md-padding': properties?.['button-icon-button-size-md-padding'],
    '--forge-icon-button-button-icon-button-size-sm-font-size': properties?.['button-icon-button-size-sm-font-size'],
    '--forge-icon-button-button-icon-button-size-sm-padding': properties?.['button-icon-button-size-sm-padding'],
    '--forge-icon-button-button-icon-button-size-xl-font-size': properties?.['button-icon-button-size-xl-font-size'],
    '--forge-icon-button-button-icon-button-size-xl-padding': properties?.['button-icon-button-size-xl-padding'],
    '--forge-icon-button-button-icon-button-size-xs-font-size': properties?.['button-icon-button-size-xs-font-size'],
    '--forge-icon-button-button-icon-button-size-xs-padding': properties?.['button-icon-button-size-xs-padding'],
    '--forge-icon-button-button-icon-button-transition-duration':
      properties?.['button-icon-button-transition-duration'],
    '--forge-icon-button-button-icon-button-transition-easing': properties?.['button-icon-button-transition-easing'],
    '--forge-icon-button-button-info-background-active': properties?.['button-info-background-active'],
    '--forge-icon-button-button-info-background-default': properties?.['button-info-background-default'],
    '--forge-icon-button-button-info-background-hover': properties?.['button-info-background-hover'],
    '--forge-icon-button-button-info-text-default': properties?.['button-info-text-default'],
    '--forge-icon-button-button-info-text-hover': properties?.['button-info-text-hover'],
    '--forge-icon-button-button-neutral-background-active': properties?.['button-neutral-background-active'],
    '--forge-icon-button-button-neutral-background-default': properties?.['button-neutral-background-default'],
    '--forge-icon-button-button-neutral-background-hover': properties?.['button-neutral-background-hover'],
    '--forge-icon-button-button-neutral-text-default': properties?.['button-neutral-text-default'],
    '--forge-icon-button-button-neutral-text-hover': properties?.['button-neutral-text-hover'],
    '--forge-icon-button-button-primary-background-active': properties?.['button-primary-background-active'],
    '--forge-icon-button-button-primary-background-default': properties?.['button-primary-background-default'],
    '--forge-icon-button-button-primary-background-hover': properties?.['button-primary-background-hover'],
    '--forge-icon-button-button-primary-text-default': properties?.['button-primary-text-default'],
    '--forge-icon-button-button-primary-text-hover': properties?.['button-primary-text-hover'],
    '--forge-icon-button-button-secondary-background-active': properties?.['button-secondary-background-active'],
    '--forge-icon-button-button-secondary-background-default': properties?.['button-secondary-background-default'],
    '--forge-icon-button-button-secondary-background-hover': properties?.['button-secondary-background-hover'],
    '--forge-icon-button-button-secondary-border-default': properties?.['button-secondary-border-default'],
    '--forge-icon-button-button-secondary-border-hover': properties?.['button-secondary-border-hover'],
    '--forge-icon-button-button-secondary-text-default': properties?.['button-secondary-text-default'],
    '--forge-icon-button-button-success-background-active': properties?.['button-success-background-active'],
    '--forge-icon-button-button-success-background-default': properties?.['button-success-background-default'],
    '--forge-icon-button-button-success-background-hover': properties?.['button-success-background-hover'],
    '--forge-icon-button-button-success-text-default': properties?.['button-success-text-default'],
    '--forge-icon-button-button-success-text-hover': properties?.['button-success-text-hover'],
    '--forge-icon-button-button-tertiary-background-active': properties?.['button-tertiary-background-active'],
    '--forge-icon-button-button-tertiary-background-default': properties?.['button-tertiary-background-default'],
    '--forge-icon-button-button-tertiary-background-hover': properties?.['button-tertiary-background-hover'],
    '--forge-icon-button-button-tertiary-text-default': properties?.['button-tertiary-text-default'],
    '--forge-icon-button-button-tertiary-text-hover': properties?.['button-tertiary-text-hover'],
    '--forge-icon-button-button-warning-background-active': properties?.['button-warning-background-active'],
    '--forge-icon-button-button-warning-background-default': properties?.['button-warning-background-default'],
    '--forge-icon-button-button-warning-background-hover': properties?.['button-warning-background-hover'],
    '--forge-icon-button-button-warning-text-default': properties?.['button-warning-text-default'],
    '--forge-icon-button-button-warning-text-hover': properties?.['button-warning-text-hover'],
  }) as IconButtonStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<IconButtonStyleProperties>;
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
  const style = createIconButtonStyle(properties.properties);

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
      style={style}
    >
      {properties.children}
    </button>
  );
}
