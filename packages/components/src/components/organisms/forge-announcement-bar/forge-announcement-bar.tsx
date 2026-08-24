import { classNames, type MpElement, useState } from '@mission-platform/forge';

import styles from './forge-announcement-bar.module.scss';

export type AnnouncementBarVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface AnnouncementBarLink {
  label: string;
  href: string;
}

export interface AnnouncementBarProperties {
  message: string;
  link?: AnnouncementBarLink;
  dismissible?: boolean;
  variant?: AnnouncementBarVariant;
  storageKey?: string;
  closeLabel?: string;
  ariaLabel?: string;
  onLinkClick?: (link: AnnouncementBarLink) => void;
  onDismiss?: () => void;
}

function wasDismissed(storageKey: string | undefined): boolean {
  if (storageKey === undefined || globalThis.window === undefined) return false;
  try {
    return globalThis.localStorage.getItem(storageKey) === 'dismissed';
  } catch {
    return false;
  }
}

export function ForgeAnnouncementBar(properties: Readonly<AnnouncementBarProperties>): MpElement {
  const {
    message,
    link,
    variant = 'info',
    dismissible = true,
    closeLabel = 'Dismiss announcement',
    ariaLabel = 'Announcement',
  } = properties;
  const [visible, setVisible] = useState(() => !wasDismissed(properties.storageKey));

  const dismiss = (): void => {
    setVisible(false);
    if (properties.storageKey !== undefined && globalThis.window !== undefined) {
      try {
        globalThis.localStorage.setItem(properties.storageKey, 'dismissed');
      } catch {
        // Storage can be unavailable; dismissal still applies for this render.
      }
    }
    properties.onDismiss?.();
  };

  if (!visible) {
    return <></>;
  }

  return (
    <aside
      aria-label={ariaLabel}
      className={classNames(styles['forge-announcement-bar'], styles[`forge-announcement-bar--${variant}`])}
      role="status"
    >
      <span
        aria-hidden="true"
        className={styles['forge-announcement-bar__indicator']}
      />
      <div className={styles['forge-announcement-bar__content']}>
        <span>{message}</span>
      </div>
      {link ? (
        <a
          className={styles['forge-announcement-bar__action']}
          href={link.href}
          onClick={() => properties.onLinkClick?.(link)}
        >
          {link.label}
        </a>
      ) : undefined}
      {dismissible ? (
        <button
          aria-label={closeLabel}
          className={styles['forge-announcement-bar__close']}
          type="button"
          onClick={dismiss}
        >
          ×
        </button>
      ) : undefined}
    </aside>
  );
}
