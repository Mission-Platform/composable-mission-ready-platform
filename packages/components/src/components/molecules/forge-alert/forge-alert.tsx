import {
  classNames,
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import { ForgeStatusIcon } from '../../atoms/forge-status-icon/forge-status-icon';

import styles from './forge-alert.module.scss';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
export type AlertSize = 'sm' | 'md' | 'lg';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface AlertStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-danger-default'?: string;
  readonly 'color-danger-subtle'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-success-subtle'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'color-warning-subtle'?: string;
  readonly 'font-size-xl'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'line-height-tight'?: string;
  readonly marker?: string;
  readonly 'radius-md'?: string;
  readonly 'radius-sm'?: string;
  readonly 'size-icon-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type AlertStyle = CSSStyleProperties & {
  readonly '--forge-alert-border-width-thick'?: string | undefined;
  readonly '--forge-alert-border-width-thin'?: string | undefined;
  readonly '--forge-alert-color-bg-muted'?: string | undefined;
  readonly '--forge-alert-color-border-default'?: string | undefined;
  readonly '--forge-alert-color-border-focus'?: string | undefined;
  readonly '--forge-alert-color-danger-default'?: string | undefined;
  readonly '--forge-alert-color-danger-subtle'?: string | undefined;
  readonly '--forge-alert-color-success-default'?: string | undefined;
  readonly '--forge-alert-color-success-subtle'?: string | undefined;
  readonly '--forge-alert-color-text-primary'?: string | undefined;
  readonly '--forge-alert-color-warning-default'?: string | undefined;
  readonly '--forge-alert-color-warning-subtle'?: string | undefined;
  readonly '--forge-alert-font-size-xl'?: string | undefined;
  readonly '--forge-alert-font-weight-bold'?: string | undefined;
  readonly '--forge-alert-line-height-tight'?: string | undefined;
  readonly '--forge-alert-marker'?: string | undefined;
  readonly '--forge-alert-radius-md'?: string | undefined;
  readonly '--forge-alert-radius-sm'?: string | undefined;
  readonly '--forge-alert-size-icon-lg'?: string | undefined;
  readonly '--forge-alert-spacing-1'?: string | undefined;
  readonly '--forge-alert-spacing-2'?: string | undefined;
  readonly '--forge-alert-spacing-3'?: string | undefined;
  readonly '--forge-alert-spacing-4'?: string | undefined;
};

function createAlertStyle(properties: Readonly<AlertStyleProperties> | undefined): AlertStyle | undefined {
  return createForgeStyle({
    '--forge-alert-border-width-thick': properties?.['border-width-thick'],
    '--forge-alert-border-width-thin': properties?.['border-width-thin'],
    '--forge-alert-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-alert-color-border-default': properties?.['color-border-default'],
    '--forge-alert-color-border-focus': properties?.['color-border-focus'],
    '--forge-alert-color-danger-default': properties?.['color-danger-default'],
    '--forge-alert-color-danger-subtle': properties?.['color-danger-subtle'],
    '--forge-alert-color-success-default': properties?.['color-success-default'],
    '--forge-alert-color-success-subtle': properties?.['color-success-subtle'],
    '--forge-alert-color-text-primary': properties?.['color-text-primary'],
    '--forge-alert-color-warning-default': properties?.['color-warning-default'],
    '--forge-alert-color-warning-subtle': properties?.['color-warning-subtle'],
    '--forge-alert-font-size-xl': properties?.['font-size-xl'],
    '--forge-alert-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-alert-line-height-tight': properties?.['line-height-tight'],
    '--forge-alert-marker': properties?.['marker'],
    '--forge-alert-radius-md': properties?.['radius-md'],
    '--forge-alert-radius-sm': properties?.['radius-sm'],
    '--forge-alert-size-icon-lg': properties?.['size-icon-lg'],
    '--forge-alert-spacing-1': properties?.['spacing-1'],
    '--forge-alert-spacing-2': properties?.['spacing-2'],
    '--forge-alert-spacing-3': properties?.['spacing-3'],
    '--forge-alert-spacing-4': properties?.['spacing-4'],
  }) as AlertStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface AlertProperties {
  children?: MpChild | readonly MpChild[];
  title?: string;
  type?: AlertVariant;
  dismissible?: boolean;
  icon?: boolean;
  onDismiss?: () => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<AlertStyleProperties>;
}

/** An accessible, dismissible status message with a composable message and action slot. */
export function ForgeAlert(properties: Readonly<AlertProperties>): MpElement {
  const style = createAlertStyle(properties.properties);

  const { title, type = 'info', dismissible = false, icon = true } = properties;
  const className = classNames(styles['forge-alert'], styles[`forge-alert--${type}`]);
  const status = type === 'danger' ? 'error' : type;

  return (
    <div
      aria-live={type === 'danger' || type === 'warning' ? 'assertive' : 'polite'}
      className={className}
      role={type === 'danger' || type === 'warning' ? 'alert' : 'status'}
      style={style}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={styles['forge-alert__icon']}
        >
          {hasSlot('icon') ? (
            <Slot name="icon" />
          ) : (
            <ForgeStatusIcon
              status={status}
              size="sm"
            />
          )}
        </span>
      ) : undefined}
      <div className={styles['forge-alert__body']}>
        {title ? <strong className={styles['forge-alert__title']}>{title}</strong> : undefined}
        <div className={styles['forge-alert__message']}>
          <Slot>{properties.children}</Slot>
        </div>
        {hasSlot('actions') ? (
          <div className={styles['forge-alert__action']}>
            <Slot name="actions" />
          </div>
        ) : undefined}
      </div>
      {dismissible ? (
        <button
          aria-label="Dismiss"
          className={styles['forge-alert__close']}
          type="button"
          onClick={() => properties.onDismiss?.()}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : undefined}
    </div>
  );
}
