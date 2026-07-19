import { h, Slot, type MpElement, type MpProperties, type MpRenderProperty } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-timeline.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TimelineSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Orientation of the timeline's connecting line. */
export type TimelineOrientation = 'vertical' | 'horizontal';

/** How vertical timeline items are positioned relative to the line. */
export type TimelineAlign = 'start' | 'alternate';

/** Colour family applied to a marker dot. */
export type TimelineItemVariant =
  'default' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'information' | 'error' | 'critical';

/** A single event descriptor within a {@link BaseTimeline}. */
export interface TimelineItem {
  /** Stable unique identifier (used as the list key). */
  id: string;
  /** Heading rendered above the body. Replaceable via the scoped `title` slot. */
  title?: string;
  /** Muted timestamp / label rendered above the title. Replaceable via the scoped `time` slot. */
  time?: string;
  /** Body text. Replaceable via the scoped `content` slot. */
  body?: string;
  /** Colour family applied to the marker dot. Defaults to `primary`. */
  variant?: TimelineItemVariant;
  /** Render the marker as a hollow ring rather than a filled dot. */
  outlined?: boolean;
}

/** The scope passed to the scoped item slots. */
export interface TimelineItemScope {
  /** The item being rendered. */
  item: TimelineItem;
  /** The item's index within the list. */
  index: number;
}

export interface TimelineProperties extends MpProperties {
  /** Ordered list of events. */
  items: TimelineItem[];
  /** Lay the timeline out vertically (default) or horizontally. */
  orientation?: TimelineOrientation;
  /** Vertical-only: keep items on one side (`start`) or zig-zag (`alternate`). */
  align?: TimelineAlign;
  /** Size token controlling the timeline's scale. Defaults to `'md'`. */
  size?: TimelineSize;
  /** Replaces an item's coloured dot; receives `{ item, index }`. */
  marker?: MpRenderProperty<TimelineItemScope>;
  /** Replaces an item's time label; receives `{ item, index }`. Falls back to `item.time`. */
  time?: MpRenderProperty<TimelineItemScope>;
  /** Replaces an item's title heading; receives `{ item, index }`. Falls back to `item.title`. */
  title?: MpRenderProperty<TimelineItemScope>;
  /** Replaces an item's body; receives `{ item, index }`. Falls back to `item.body`. */
  content?: MpRenderProperty<TimelineItemScope>;
}

/**
 * `BaseTimeline` — an ordered, chronological list of events authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The original Vue pair (`BaseTimeline` + `BaseTimelineItem`) shared the
 * orientation/alternating rhythm through a `provide`/`inject` context. The
 * neutral version **flattens** that composition into a single component driven
 * by an `items` array — the same approach the migrated {@link BaseTabs} took —
 * so the layout state simply flows from props onto each `<li>` (no context
 * needed). It owns its styling through the co-located CSS Module
 * `base-timeline.module.scss`, which merges the original container and item
 * styles.
 *
 * The per-item `marker`/`time`/`title`/default slots become four scoped slots
 * (`marker`/`time`/`title`/`content`) that fall back to the item's fields.
 */
export function BaseTimeline(properties: Readonly<TimelineProperties>): MpElement {
  const { items, orientation = 'vertical', align = 'start', size = 'md' } = properties;

  const isAlternate = orientation === 'vertical' && align === 'alternate';

  return (
    <ol
      classNames={[
        styles['base-timeline'],
        styles[`base-timeline--${orientation}`],
        sizeStyles[`base-size--${size}`],
        {
          [styles['base-timeline--alternate']]: isAlternate,
        },
      ]}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          classNames={[
            styles['base-timeline-item'],
            styles[`base-timeline-item--${orientation}`],
            styles[`base-timeline-item--${item.variant ?? 'primary'}`],
            {
              [styles['base-timeline-item--alternate']]: isAlternate,
              [styles['base-timeline-item--outlined']]: item.outlined,
            },
          ]}
        >
          <div classNames={styles['base-timeline-item__marker']}>
            <Slot
              name="marker"
              index={index}
              item={item}
            >
              <span classNames={styles['base-timeline-item__dot']} />
            </Slot>
          </div>
          <div classNames={styles['base-timeline-item__content']}>
            {item.time ? (
              <BaseTypography
                as="span"
                classNames={styles['base-timeline-item__time']}
                color="tertiary"
                variant="caption"
              >
                <Slot
                  name="time"
                  index={index}
                  item={item}
                >
                  {item.time}
                </Slot>
              </BaseTypography>
            ) : undefined}
            {item.title ? (
              <BaseTypography
                as="h3"
                classNames={styles['base-timeline-item__title']}
                color="primary"
                variant="h6"
                weight="semibold"
              >
                <Slot
                  name="title"
                  index={index}
                  item={item}
                >
                  {item.title}
                </Slot>
              </BaseTypography>
            ) : undefined}
            {item.body ? (
              <div classNames={styles['base-timeline-item__body']}>
                <Slot
                  name="content"
                  index={index}
                  item={item}
                >
                  {item.body}
                </Slot>
              </div>
            ) : undefined}
          </div>
        </li>
      ))}
    </ol>
  );
}
