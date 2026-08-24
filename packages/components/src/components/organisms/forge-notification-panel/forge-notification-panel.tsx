import { type MpElement, useState } from '@mission-platform/forge';

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
}

export function ForgeNotificationPanel(properties: Readonly<NotificationPanelProperties>): MpElement {
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
