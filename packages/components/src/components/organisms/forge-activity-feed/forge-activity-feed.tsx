import { classNames, type MpChild, type MpElement, type MpRenderProperty, Slot } from '@mission-platform/forge';

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
}

export interface ActivityItemScope {
  item: ActivityItem;
  index: number;
}

export function ForgeActivityFeed(properties: Readonly<ActivityFeedProperties>): MpElement {
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
