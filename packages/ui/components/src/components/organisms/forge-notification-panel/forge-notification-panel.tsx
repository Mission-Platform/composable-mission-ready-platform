import { useState, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

import { ForgeBadge } from '../../atoms/forge-badge/forge-badge';

import styles from './forge-notification-panel.module.scss';

export type NotificationType = 'neutral' | 'info' | 'success' | 'warning' | 'error';
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: NotificationType;
  timestamp: string;
  action?: { label: string; url?: string; handler?: () => void };
  date?: string;
  time?: string;
  read?: boolean;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface NotificationPanelStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-error-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'font-size-lg'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-size-xl'?: string;
  readonly 'opacity-muted'?: string;
  readonly 'radius-lg'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-height-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
}

export type NotificationPanelStyle = CSSStyleProperties & {
  readonly '--forge-notification-panel-border-width-thick'?: string | undefined;
  readonly '--forge-notification-panel-border-width-thin'?: string | undefined;
  readonly '--forge-notification-panel-color-bg-muted'?: string | undefined;
  readonly '--forge-notification-panel-color-bg-surface'?: string | undefined;
  readonly '--forge-notification-panel-color-border-default'?: string | undefined;
  readonly '--forge-notification-panel-color-error-default'?: string | undefined;
  readonly '--forge-notification-panel-color-primary-default'?: string | undefined;
  readonly '--forge-notification-panel-color-success-default'?: string | undefined;
  readonly '--forge-notification-panel-color-text-tertiary'?: string | undefined;
  readonly '--forge-notification-panel-color-warning-default'?: string | undefined;
  readonly '--forge-notification-panel-font-size-lg'?: string | undefined;
  readonly '--forge-notification-panel-font-size-sm'?: string | undefined;
  readonly '--forge-notification-panel-font-size-xl'?: string | undefined;
  readonly '--forge-notification-panel-opacity-muted'?: string | undefined;
  readonly '--forge-notification-panel-radius-lg'?: string | undefined;
  readonly '--forge-notification-panel-radius-md'?: string | undefined;
  readonly '--forge-notification-panel-size-height-md'?: string | undefined;
  readonly '--forge-notification-panel-spacing-1'?: string | undefined;
  readonly '--forge-notification-panel-spacing-2'?: string | undefined;
  readonly '--forge-notification-panel-spacing-3'?: string | undefined;
  readonly '--forge-notification-panel-spacing-4'?: string | undefined;
  readonly '--forge-notification-panel-spacing-5'?: string | undefined;
};

function createNotificationPanelStyle(
  properties: Readonly<NotificationPanelStyleProperties> | undefined,
): NotificationPanelStyle | undefined {
  return createForgeStyle({
    '--forge-notification-panel-border-width-thick': properties?.['border-width-thick'],
    '--forge-notification-panel-border-width-thin': properties?.['border-width-thin'],
    '--forge-notification-panel-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-notification-panel-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-notification-panel-color-border-default': properties?.['color-border-default'],
    '--forge-notification-panel-color-error-default': properties?.['color-error-default'],
    '--forge-notification-panel-color-primary-default': properties?.['color-primary-default'],
    '--forge-notification-panel-color-success-default': properties?.['color-success-default'],
    '--forge-notification-panel-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-notification-panel-color-warning-default': properties?.['color-warning-default'],
    '--forge-notification-panel-font-size-lg': properties?.['font-size-lg'],
    '--forge-notification-panel-font-size-sm': properties?.['font-size-sm'],
    '--forge-notification-panel-font-size-xl': properties?.['font-size-xl'],
    '--forge-notification-panel-opacity-muted': properties?.['opacity-muted'],
    '--forge-notification-panel-radius-lg': properties?.['radius-lg'],
    '--forge-notification-panel-radius-md': properties?.['radius-md'],
    '--forge-notification-panel-size-height-md': properties?.['size-height-md'],
    '--forge-notification-panel-spacing-1': properties?.['spacing-1'],
    '--forge-notification-panel-spacing-2': properties?.['spacing-2'],
    '--forge-notification-panel-spacing-3': properties?.['spacing-3'],
    '--forge-notification-panel-spacing-4': properties?.['spacing-4'],
    '--forge-notification-panel-spacing-5': properties?.['spacing-5'],
  }) as NotificationPanelStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface NotificationPanelProperties {
  notifications: NotificationItem[];
  unreadCount?: number;
  loading?: boolean;
  emptyMessage?: string;
  heading?: string;
  ariaLabel?: string;
  onDismiss?: (id: string) => void;
  onRead?: (id: string) => void;
  onReadAll?: () => void;
  onActionClick?: (notification: NotificationItem) => void;
  onLoadMore?: () => void;
  onClick?: (notification: NotificationItem) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<NotificationPanelStyleProperties>;
}

export function ForgeNotificationPanel(properties: Readonly<NotificationPanelProperties>): MpElement {
  const style = createNotificationPanelStyle(properties.properties);

  const {
    heading = 'Notifications',
    ariaLabel = 'Notifications',
    emptyMessage = 'You have no notifications',
    loading = false,
  } = properties;
  const [items, setItems] = useState(properties.notifications);
  const dismiss = (item: NotificationItem): void => {
    setItems(items.filter((entry) => entry.id !== item.id));
    properties.onDismiss?.(item.id);
  };
  const read = (item: NotificationItem): void => {
    if (!item.read) {
      properties.onRead?.(item.id);
    }
    setItems(items.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
  };
  const unreadCount = properties.unreadCount ?? items.filter((item) => !item.read).length;
  const groups: Record<string, NotificationItem[]> = {};
  for (const item of items) {
    const date = item.timestamp ?? item.date ?? item.time ?? 'Earlier';
    (groups[date] ??= []).push(item);
  }
  return (
    <section
      className={styles['forge-notification-panel']}
      aria-label={ariaLabel}
      style={style}
    >
      <header className={styles['forge-notification-panel__header']}>
        <h2>{heading}</h2>
        <span aria-label={`${unreadCount} unread notifications`}>
          <ForgeBadge
            pill
            size="sm"
            variant="primary"
          >
            {unreadCount}
          </ForgeBadge>
        </span>
        <button
          type="button"
          onClick={() => properties.onReadAll?.()}
        >
          Mark all read
        </button>
      </header>
      {loading ? (
        <p
          className={styles['forge-notification-panel__status']}
          role="status"
        >
          Loading notifications…
        </p>
      ) : items.length === 0 ? (
        <p className={styles['forge-notification-panel__empty']}>{emptyMessage}</p>
      ) : (
        Object.entries(groups).map(([date, group]) => (
          <section
            className={styles['forge-notification-panel__group']}
            key={date}
          >
            <h3>{date}</h3>
            <ul className={styles['forge-notification-panel__list']}>
              {group.map((item) => (
                <li
                  className={[
                    styles['forge-notification-panel__item'],
                    item.read ? styles['forge-notification-panel__item--read'] : undefined,
                    styles[`forge-notification-panel__item--${item.type ?? 'neutral'}`],
                  ]}
                  key={item.id}
                >
                  <button
                    type="button"
                    className={styles['forge-notification-panel__content']}
                    onClick={() => {
                      read(item);
                      properties.onClick?.(item);
                    }}
                    aria-label={`Read ${item.title}`}
                  >
                    <strong>{item.title}</strong>
                    {item.message ? <span>{item.message}</span> : undefined}
                    <small>{item.timestamp ?? item.date ?? item.time}</small>
                  </button>
                  {item.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        item.action?.handler?.();
                        properties.onActionClick?.(item);
                      }}
                    >
                      {item.action.label}
                    </button>
                  ) : undefined}
                  <button
                    type="button"
                    className={styles['forge-notification-panel__dismiss']}
                    aria-label={`Dismiss ${item.title}`}
                    onClick={() => dismiss(item)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
