import { classNames, hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import { ForgeStatusIcon } from '../../atoms/forge-status-icon/forge-status-icon';

import styles from './forge-alert.module.scss';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
export type AlertSize = 'sm' | 'md' | 'lg';

export interface AlertProperties {
  children?: MpChild | readonly MpChild[];
  title?: string;
  type?: AlertVariant;
  dismissible?: boolean;
  icon?: boolean;
  onDismiss?: () => void;
}

/** An accessible, dismissible status message with a composable message and action slot. */
export function ForgeAlert(properties: Readonly<AlertProperties>): MpElement {
  const { title, type = 'info', dismissible = false, icon = true } = properties;
  const className = classNames(styles['forge-alert'], styles[`forge-alert--${type}`]);
  const status = type === 'danger' ? 'error' : type;

  return (
    <div
      aria-live={type === 'danger' || type === 'warning' ? 'assertive' : 'polite'}
      className={className}
      role={type === 'danger' || type === 'warning' ? 'alert' : 'status'}
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
