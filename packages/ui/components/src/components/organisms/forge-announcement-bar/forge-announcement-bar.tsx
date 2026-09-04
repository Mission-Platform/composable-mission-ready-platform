import {
  classNames,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-announcement-bar.module.scss';

export type AnnouncementBarVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface AnnouncementBarLink {
  label: string;
  href: string;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface AnnouncementBarStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-error-subtle'?: string;
  readonly 'color-info-subtle'?: string;
  readonly 'color-success-subtle'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-warning-subtle'?: string;
  readonly 'font-size-xl'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'radius-full'?: string;
  readonly 'size-checkable-indicator'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'size-height-sm'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type AnnouncementBarStyle = CSSStyleProperties & {
  readonly '--forge-announcement-bar-border-width-thick'?: string | undefined;
  readonly '--forge-announcement-bar-color-bg-muted'?: string | undefined;
  readonly '--forge-announcement-bar-color-error-subtle'?: string | undefined;
  readonly '--forge-announcement-bar-color-info-subtle'?: string | undefined;
  readonly '--forge-announcement-bar-color-success-subtle'?: string | undefined;
  readonly '--forge-announcement-bar-color-text-primary'?: string | undefined;
  readonly '--forge-announcement-bar-color-warning-subtle'?: string | undefined;
  readonly '--forge-announcement-bar-font-size-xl'?: string | undefined;
  readonly '--forge-announcement-bar-font-weight-semibold'?: string | undefined;
  readonly '--forge-announcement-bar-radius-full'?: string | undefined;
  readonly '--forge-announcement-bar-size-checkable-indicator'?: string | undefined;
  readonly '--forge-announcement-bar-size-height-lg'?: string | undefined;
  readonly '--forge-announcement-bar-size-height-sm'?: string | undefined;
  readonly '--forge-announcement-bar-spacing-1'?: string | undefined;
  readonly '--forge-announcement-bar-spacing-2'?: string | undefined;
  readonly '--forge-announcement-bar-spacing-3'?: string | undefined;
  readonly '--forge-announcement-bar-spacing-4'?: string | undefined;
};

function createAnnouncementBarStyle(
  properties: Readonly<AnnouncementBarStyleProperties> | undefined,
): AnnouncementBarStyle | undefined {
  return createForgeStyle({
    '--forge-announcement-bar-border-width-thick': properties?.['border-width-thick'],
    '--forge-announcement-bar-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-announcement-bar-color-error-subtle': properties?.['color-error-subtle'],
    '--forge-announcement-bar-color-info-subtle': properties?.['color-info-subtle'],
    '--forge-announcement-bar-color-success-subtle': properties?.['color-success-subtle'],
    '--forge-announcement-bar-color-text-primary': properties?.['color-text-primary'],
    '--forge-announcement-bar-color-warning-subtle': properties?.['color-warning-subtle'],
    '--forge-announcement-bar-font-size-xl': properties?.['font-size-xl'],
    '--forge-announcement-bar-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-announcement-bar-radius-full': properties?.['radius-full'],
    '--forge-announcement-bar-size-checkable-indicator': properties?.['size-checkable-indicator'],
    '--forge-announcement-bar-size-height-lg': properties?.['size-height-lg'],
    '--forge-announcement-bar-size-height-sm': properties?.['size-height-sm'],
    '--forge-announcement-bar-spacing-1': properties?.['spacing-1'],
    '--forge-announcement-bar-spacing-2': properties?.['spacing-2'],
    '--forge-announcement-bar-spacing-3': properties?.['spacing-3'],
    '--forge-announcement-bar-spacing-4': properties?.['spacing-4'],
  }) as AnnouncementBarStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<AnnouncementBarStyleProperties>;
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
  const style = createAnnouncementBarStyle(properties.properties);

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
      style={style}
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
