import {
  classNames,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import { initialsForName } from '../../../utils';
import { ForgeAvatar } from '../../atoms/forge-avatar/forge-avatar';

import styles from './forge-activity-feed.module.scss';

export type ActivityFeedSize = 'sm' | 'md' | 'lg';
export type ActivityFeedVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

export interface ActivityItem {
  user: { name: string; avatar?: string };
  action: string;
  target?: string;
  timestamp: string;
  icon?: MpChild;
  type?: string;
}

/** @deprecated Use `ActivityItem`. */
export type ActivityFeedItem = ActivityItem;

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ActivityFeedStyleProperties {
  readonly 'border-width-heavy'?: string;
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'radius-full'?: string;
  readonly 'radius-sm'?: string;
  readonly 'size-height-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
}

export type ActivityFeedStyle = CSSStyleProperties & {
  readonly '--forge-activity-feed-border-width-heavy'?: string | undefined;
  readonly '--forge-activity-feed-border-width-thick'?: string | undefined;
  readonly '--forge-activity-feed-border-width-thin'?: string | undefined;
  readonly '--forge-activity-feed-color-bg-muted'?: string | undefined;
  readonly '--forge-activity-feed-color-border-default'?: string | undefined;
  readonly '--forge-activity-feed-color-border-focus'?: string | undefined;
  readonly '--forge-activity-feed-color-primary-default'?: string | undefined;
  readonly '--forge-activity-feed-color-primary-subtle'?: string | undefined;
  readonly '--forge-activity-feed-color-text-primary'?: string | undefined;
  readonly '--forge-activity-feed-color-text-secondary'?: string | undefined;
  readonly '--forge-activity-feed-font-size-sm'?: string | undefined;
  readonly '--forge-activity-feed-radius-full'?: string | undefined;
  readonly '--forge-activity-feed-radius-sm'?: string | undefined;
  readonly '--forge-activity-feed-size-height-md'?: string | undefined;
  readonly '--forge-activity-feed-spacing-1'?: string | undefined;
  readonly '--forge-activity-feed-spacing-2'?: string | undefined;
  readonly '--forge-activity-feed-spacing-3'?: string | undefined;
  readonly '--forge-activity-feed-spacing-4'?: string | undefined;
  readonly '--forge-activity-feed-spacing-6'?: string | undefined;
};

function createActivityFeedStyle(
  properties: Readonly<ActivityFeedStyleProperties> | undefined,
): ActivityFeedStyle | undefined {
  return createForgeStyle({
    '--forge-activity-feed-border-width-heavy': properties?.['border-width-heavy'],
    '--forge-activity-feed-border-width-thick': properties?.['border-width-thick'],
    '--forge-activity-feed-border-width-thin': properties?.['border-width-thin'],
    '--forge-activity-feed-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-activity-feed-color-border-default': properties?.['color-border-default'],
    '--forge-activity-feed-color-border-focus': properties?.['color-border-focus'],
    '--forge-activity-feed-color-primary-default': properties?.['color-primary-default'],
    '--forge-activity-feed-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-activity-feed-color-text-primary': properties?.['color-text-primary'],
    '--forge-activity-feed-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-activity-feed-font-size-sm': properties?.['font-size-sm'],
    '--forge-activity-feed-radius-full': properties?.['radius-full'],
    '--forge-activity-feed-radius-sm': properties?.['radius-sm'],
    '--forge-activity-feed-size-height-md': properties?.['size-height-md'],
    '--forge-activity-feed-spacing-1': properties?.['spacing-1'],
    '--forge-activity-feed-spacing-2': properties?.['spacing-2'],
    '--forge-activity-feed-spacing-3': properties?.['spacing-3'],
    '--forge-activity-feed-spacing-4': properties?.['spacing-4'],
    '--forge-activity-feed-spacing-6': properties?.['spacing-6'],
  }) as ActivityFeedStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ActivityFeedProperties {
  items: ActivityItem[];
  ariaLabel?: string;
  emptyText?: string;
  loading?: boolean;
  loadMore?: boolean;
  maxItems?: number;
  loadMoreLabel?: string;
  item?: MpRenderProperty<ActivityItemScope>;
  empty?: MpChild;
  onItemClick?: (item: ActivityItem) => void;
  onLoadMore?: () => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ActivityFeedStyleProperties>;
}

export interface ActivityItemScope {
  item: ActivityItem;
  index: number;
}

export function ForgeActivityFeed(properties: Readonly<ActivityFeedProperties>): MpElement {
  const style = createActivityFeedStyle(properties.properties);

  const {
    items,
    ariaLabel = 'Activity feed',
    emptyText = 'No activity yet',
    loading = false,
    loadMore = false,
    maxItems,
    loadMoreLabel = 'Load more activity',
  } = properties;
  const isLoading = loading === true;
  const visibleItems = maxItems === undefined ? items : items.slice(0, Math.max(0, maxItems));

  return (
    <section
      aria-label={ariaLabel}
      className={classNames(styles['forge-activity-feed'])}
      style={style}
    >
      {isLoading ? (
        <div
          className={styles['forge-activity-feed__status']}
          role="status"
        >
          <Slot name="loading" />
        </div>
      ) : undefined}
      {!isLoading && visibleItems.length === 0 ? (
        <p className={styles['forge-activity-feed__empty']}>
          <Slot name="empty">{properties.empty ?? emptyText}</Slot>
        </p>
      ) : undefined}
      {visibleItems.length > 0 ? (
        <ol className={styles['forge-activity-feed__list']}>
          {visibleItems.map((item, index) => {
            const content = (
              <>
                <span className={styles['forge-activity-feed__avatar']}>
                  <ForgeAvatar
                    alt=""
                    initials={initialsForName(item.user.name)}
                    size="sm"
                    src={item.user.avatar}
                  />
                </span>
                <span className={styles['forge-activity-feed__body']}>
                  <span className={styles['forge-activity-feed__summary']}>
                    <strong>{item.user.name}</strong> {item.action} {item.target ?? ''}
                  </span>
                  {item.icon === undefined ? undefined : (
                    <span
                      aria-hidden="true"
                      className={styles['forge-activity-feed__icon']}
                    >
                      {item.icon}
                    </span>
                  )}
                  <time
                    className={styles['forge-activity-feed__time']}
                    dateTime={item.timestamp}
                  >
                    {item.timestamp}
                  </time>
                </span>
              </>
            );
            return (
              <li
                className={styles['forge-activity-feed__item']}
                key={`${item.timestamp}-${index}`}
              >
                <button
                  className={styles['forge-activity-feed__link']}
                  type="button"
                  onClick={() => properties.onItemClick?.(item)}
                >
                  <Slot
                    name="item"
                    item={item}
                    index={index}
                  >
                    {content}
                  </Slot>
                </button>
              </li>
            );
          })}
        </ol>
      ) : undefined}
      {loadMore ? (
        <button
          className={styles['forge-activity-feed__load-more']}
          type="button"
          disabled={isLoading}
          onClick={() => properties.onLoadMore?.()}
        >
          {loadMoreLabel}
        </button>
      ) : undefined}
    </section>
  );
}
