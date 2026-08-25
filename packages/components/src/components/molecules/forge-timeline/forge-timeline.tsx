import {
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-timeline.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TimelineSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Orientation of the timeline's connecting line. */
export type TimelineOrientation = 'vertical' | 'horizontal';

/** How vertical timeline items are positioned relative to the line. */
export type TimelineAlign = 'start' | 'alternate';

/** Colour family applied to a marker dot. */
export type TimelineItemVariant =
  'default' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'information' | 'error' | 'critical';

/** A single event descriptor within a {@link ForgeTimeline}. */
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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TimelineStyleProperties {
  readonly 'content-body-margin-top'?: string;
  readonly 'content-gap'?: string;
  readonly gutter?: string;
  readonly 'horizontal-gap'?: string;
  readonly 'item-color'?: string;
  readonly 'line-surface'?: string;
  readonly 'line-thickness'?: string;
  readonly 'line-width'?: string;
  readonly 'marker-default'?: string;
  readonly 'marker-outline-surface'?: string;
  readonly 'marker-outline-width'?: string;
  readonly 'marker-outlined-surface'?: string;
  readonly 'marker-radius'?: string;
  readonly 'marker-size'?: string;
  readonly 'variant-default'?: string;
  readonly 'variant-error'?: string;
  readonly 'variant-information'?: string;
  readonly 'variant-primary'?: string;
  readonly 'variant-secondary'?: string;
  readonly 'variant-success'?: string;
  readonly 'variant-tertiary'?: string;
  readonly 'variant-warning'?: string;
  readonly 'vertical-gap'?: string;
}

export type TimelineStyle = CSSStyleProperties & {
  readonly '--forge-timeline-content-body-margin-top'?: string | undefined;
  readonly '--forge-timeline-content-gap'?: string | undefined;
  readonly '--forge-timeline-gutter'?: string | undefined;
  readonly '--forge-timeline-horizontal-gap'?: string | undefined;
  readonly '--forge-timeline-item-color'?: string | undefined;
  readonly '--forge-timeline-line-surface'?: string | undefined;
  readonly '--forge-timeline-line-thickness'?: string | undefined;
  readonly '--forge-timeline-line-width'?: string | undefined;
  readonly '--forge-timeline-marker-default'?: string | undefined;
  readonly '--forge-timeline-marker-outline-surface'?: string | undefined;
  readonly '--forge-timeline-marker-outline-width'?: string | undefined;
  readonly '--forge-timeline-marker-outlined-surface'?: string | undefined;
  readonly '--forge-timeline-marker-radius'?: string | undefined;
  readonly '--forge-timeline-marker-size'?: string | undefined;
  readonly '--forge-timeline-variant-default'?: string | undefined;
  readonly '--forge-timeline-variant-error'?: string | undefined;
  readonly '--forge-timeline-variant-information'?: string | undefined;
  readonly '--forge-timeline-variant-primary'?: string | undefined;
  readonly '--forge-timeline-variant-secondary'?: string | undefined;
  readonly '--forge-timeline-variant-success'?: string | undefined;
  readonly '--forge-timeline-variant-tertiary'?: string | undefined;
  readonly '--forge-timeline-variant-warning'?: string | undefined;
  readonly '--forge-timeline-vertical-gap'?: string | undefined;
};

function createTimelineStyle(properties: Readonly<TimelineStyleProperties> | undefined): TimelineStyle | undefined {
  return createForgeStyle({
    '--forge-timeline-content-body-margin-top': properties?.['content-body-margin-top'],
    '--forge-timeline-content-gap': properties?.['content-gap'],
    '--forge-timeline-gutter': properties?.['gutter'],
    '--forge-timeline-horizontal-gap': properties?.['horizontal-gap'],
    '--forge-timeline-item-color': properties?.['item-color'],
    '--forge-timeline-line-surface': properties?.['line-surface'],
    '--forge-timeline-line-thickness': properties?.['line-thickness'],
    '--forge-timeline-line-width': properties?.['line-width'],
    '--forge-timeline-marker-default': properties?.['marker-default'],
    '--forge-timeline-marker-outline-surface': properties?.['marker-outline-surface'],
    '--forge-timeline-marker-outline-width': properties?.['marker-outline-width'],
    '--forge-timeline-marker-outlined-surface': properties?.['marker-outlined-surface'],
    '--forge-timeline-marker-radius': properties?.['marker-radius'],
    '--forge-timeline-marker-size': properties?.['marker-size'],
    '--forge-timeline-variant-default': properties?.['variant-default'],
    '--forge-timeline-variant-error': properties?.['variant-error'],
    '--forge-timeline-variant-information': properties?.['variant-information'],
    '--forge-timeline-variant-primary': properties?.['variant-primary'],
    '--forge-timeline-variant-secondary': properties?.['variant-secondary'],
    '--forge-timeline-variant-success': properties?.['variant-success'],
    '--forge-timeline-variant-tertiary': properties?.['variant-tertiary'],
    '--forge-timeline-variant-warning': properties?.['variant-warning'],
    '--forge-timeline-vertical-gap': properties?.['vertical-gap'],
  }) as TimelineStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface TimelineProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TimelineStyleProperties>;
}

/**
 * `ForgeTimeline` — an ordered, chronological list of events authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The original Vue pair (`ForgeTimeline` + `ForgeTimelineItem`) shared the
 * orientation/alternating rhythm through a `provide`/`inject` context. The
 * neutral version **flattens** that composition into a single component driven
 * by an `items` array — the same approach the migrated {@link ForgeTabs} took —
 * so the layout state simply flows from props onto each `<li>` (no context
 * needed). It owns its styling through the co-located CSS Module
 * `forge-timeline.module.scss`, which merges the original container and item
 * styles.
 *
 * The per-item `marker`/`time`/`title`/default slots become four scoped slots
 * (`marker`/`time`/`title`/`content`) that fall back to the item's fields.
 */
export function ForgeTimeline(properties: Readonly<TimelineProperties>): MpElement {
  const style = createTimelineStyle(properties.properties);

  const { items, orientation = 'vertical', align = 'start', size = 'md' } = properties;

  const isAlternate = orientation === 'vertical' && align === 'alternate';

  return (
    <ol
      className={[
        styles['forge-timeline'],
        styles[`forge-timeline--${orientation}`],
        size ? `forge-size--${size}` : undefined,
        {
          [styles['forge-timeline--alternate']]: isAlternate,
        },
      ]}
      style={style}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className={[
            styles['forge-timeline-item'],
            styles[`forge-timeline-item--${orientation}`],
            styles[`forge-timeline-item--${item.variant ?? 'primary'}`],
            {
              [styles['forge-timeline-item--alternate']]: isAlternate,
              [styles['forge-timeline-item--outlined']]: item.outlined,
            },
          ]}
          style={style}
        >
          <div className={styles['forge-timeline-item__marker']}>
            <Slot
              name="marker"
              index={index}
              item={item}
            >
              <span className={styles['forge-timeline-item__dot']} />
            </Slot>
          </div>
          <div className={styles['forge-timeline-item__content']}>
            {item.time ? (
              <ForgeTypography
                as="span"
                className={styles['forge-timeline-item__time']}
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
              </ForgeTypography>
            ) : undefined}
            {item.title ? (
              <ForgeTypography
                as="h3"
                className={styles['forge-timeline-item__title']}
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
              </ForgeTypography>
            ) : undefined}
            {item.body ? (
              <div className={styles['forge-timeline-item__body']}>
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
