import {
  classNames,
  Dynamic,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-list.module.scss';

/** Semantic/visual list style. */
export type ListVariant = 'unordered' | 'ordered' | 'description' | 'none';
/** Colour tone of the list — the canonical colour set (`neutral` is the plain treatment). */
export type ListTone =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale. */
export type ListSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single list entry. `label` drives ordered/unordered/none rows; `term`/`content` drive description rows. */
export interface ListItem {
  label?: string;
  description?: string;
  term?: string;
  content?: string;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ListStyleProperties {
  readonly 'navigation-list-border-default'?: string;
  readonly 'navigation-list-border-width'?: string;
  readonly 'navigation-list-description-gap-wide'?: string;
  readonly 'navigation-list-description-gap-wider'?: string;
  readonly 'navigation-list-line-height'?: string;
  readonly 'navigation-list-marker-padding-inline-start'?: string;
  readonly 'navigation-list-size-2xl-font'?: string;
  readonly 'navigation-list-size-2xl-padding-block'?: string;
  readonly 'navigation-list-size-2xs-font'?: string;
  readonly 'navigation-list-size-2xs-padding-block'?: string;
  readonly 'navigation-list-size-lg-font'?: string;
  readonly 'navigation-list-size-lg-padding-block'?: string;
  readonly 'navigation-list-size-md-font'?: string;
  readonly 'navigation-list-size-md-padding-block'?: string;
  readonly 'navigation-list-size-sm-font'?: string;
  readonly 'navigation-list-size-sm-padding-block'?: string;
  readonly 'navigation-list-size-xl-font'?: string;
  readonly 'navigation-list-size-xl-padding-block'?: string;
  readonly 'navigation-list-size-xs-font'?: string;
  readonly 'navigation-list-size-xs-padding-block'?: string;
  readonly 'navigation-list-term-padding-inline-end'?: string;
  readonly 'navigation-list-tone-description-border'?: string;
  readonly 'navigation-list-tone-description-marker'?: string;
  readonly 'navigation-list-tone-divided-border'?: string;
  readonly 'navigation-list-tone-divided-marker'?: string;
  readonly 'navigation-list-tone-none-border'?: string;
  readonly 'navigation-list-tone-none-marker'?: string;
  readonly 'navigation-list-tone-ordered-border'?: string;
  readonly 'navigation-list-tone-ordered-marker'?: string;
  readonly 'navigation-list-tone-tone--border'?: string;
  readonly 'navigation-list-tone-tone--marker'?: string;
  readonly 'navigation-list-tone-unordered-border'?: string;
  readonly 'navigation-list-tone-unordered-marker'?: string;
}

export type ListStyle = CSSStyleProperties & {
  readonly '--forge-list-navigation-list-border-default'?: string | undefined;
  readonly '--forge-list-navigation-list-border-width'?: string | undefined;
  readonly '--forge-list-navigation-list-description-gap-wide'?: string | undefined;
  readonly '--forge-list-navigation-list-description-gap-wider'?: string | undefined;
  readonly '--forge-list-navigation-list-line-height'?: string | undefined;
  readonly '--forge-list-navigation-list-marker-padding-inline-start'?: string | undefined;
  readonly '--forge-list-navigation-list-size-2xl-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-size-2xs-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-size-lg-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-lg-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-size-md-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-md-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-size-sm-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-sm-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-size-xl-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-xl-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-size-xs-font'?: string | undefined;
  readonly '--forge-list-navigation-list-size-xs-padding-block'?: string | undefined;
  readonly '--forge-list-navigation-list-term-padding-inline-end'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-description-border'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-description-marker'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-divided-border'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-divided-marker'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-none-border'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-none-marker'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-ordered-border'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-ordered-marker'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-tone--border'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-tone--marker'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-unordered-border'?: string | undefined;
  readonly '--forge-list-navigation-list-tone-unordered-marker'?: string | undefined;
};

function createListStyle(properties: Readonly<ListStyleProperties> | undefined): ListStyle | undefined {
  return createForgeStyle({
    '--forge-list-navigation-list-border-default': properties?.['navigation-list-border-default'],
    '--forge-list-navigation-list-border-width': properties?.['navigation-list-border-width'],
    '--forge-list-navigation-list-description-gap-wide': properties?.['navigation-list-description-gap-wide'],
    '--forge-list-navigation-list-description-gap-wider': properties?.['navigation-list-description-gap-wider'],
    '--forge-list-navigation-list-line-height': properties?.['navigation-list-line-height'],
    '--forge-list-navigation-list-marker-padding-inline-start':
      properties?.['navigation-list-marker-padding-inline-start'],
    '--forge-list-navigation-list-size-2xl-font': properties?.['navigation-list-size-2xl-font'],
    '--forge-list-navigation-list-size-2xl-padding-block': properties?.['navigation-list-size-2xl-padding-block'],
    '--forge-list-navigation-list-size-2xs-font': properties?.['navigation-list-size-2xs-font'],
    '--forge-list-navigation-list-size-2xs-padding-block': properties?.['navigation-list-size-2xs-padding-block'],
    '--forge-list-navigation-list-size-lg-font': properties?.['navigation-list-size-lg-font'],
    '--forge-list-navigation-list-size-lg-padding-block': properties?.['navigation-list-size-lg-padding-block'],
    '--forge-list-navigation-list-size-md-font': properties?.['navigation-list-size-md-font'],
    '--forge-list-navigation-list-size-md-padding-block': properties?.['navigation-list-size-md-padding-block'],
    '--forge-list-navigation-list-size-sm-font': properties?.['navigation-list-size-sm-font'],
    '--forge-list-navigation-list-size-sm-padding-block': properties?.['navigation-list-size-sm-padding-block'],
    '--forge-list-navigation-list-size-xl-font': properties?.['navigation-list-size-xl-font'],
    '--forge-list-navigation-list-size-xl-padding-block': properties?.['navigation-list-size-xl-padding-block'],
    '--forge-list-navigation-list-size-xs-font': properties?.['navigation-list-size-xs-font'],
    '--forge-list-navigation-list-size-xs-padding-block': properties?.['navigation-list-size-xs-padding-block'],
    '--forge-list-navigation-list-term-padding-inline-end': properties?.['navigation-list-term-padding-inline-end'],
    '--forge-list-navigation-list-tone-description-border': properties?.['navigation-list-tone-description-border'],
    '--forge-list-navigation-list-tone-description-marker': properties?.['navigation-list-tone-description-marker'],
    '--forge-list-navigation-list-tone-divided-border': properties?.['navigation-list-tone-divided-border'],
    '--forge-list-navigation-list-tone-divided-marker': properties?.['navigation-list-tone-divided-marker'],
    '--forge-list-navigation-list-tone-none-border': properties?.['navigation-list-tone-none-border'],
    '--forge-list-navigation-list-tone-none-marker': properties?.['navigation-list-tone-none-marker'],
    '--forge-list-navigation-list-tone-ordered-border': properties?.['navigation-list-tone-ordered-border'],
    '--forge-list-navigation-list-tone-ordered-marker': properties?.['navigation-list-tone-ordered-marker'],
    '--forge-list-navigation-list-tone-tone--border': properties?.['navigation-list-tone-tone--border'],
    '--forge-list-navigation-list-tone-tone--marker': properties?.['navigation-list-tone-tone--marker'],
    '--forge-list-navigation-list-tone-unordered-border': properties?.['navigation-list-tone-unordered-border'],
    '--forge-list-navigation-list-tone-unordered-marker': properties?.['navigation-list-tone-unordered-marker'],
  }) as ListStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ListProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** The rows to render. Defaults to `[]`. */
  items?: ListItem[];
  /** Semantic/visual list style. Defaults to `'unordered'`. */
  variant?: ListVariant;
  /** Colour tone (markers/dividers/text). Defaults to `'neutral'`. */
  tone?: ListTone;
  /** Size token. Defaults to `'md'`. */
  size?: ListSize;
  /** Draw separators between rows. */
  divided?: boolean;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ListStyleProperties>;
}

/**
 * `ForgeList` — an ordered/unordered/description/plain list authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders the supplied `items` as the appropriate semantic element (`ul` /
 * `ol` / `dl`), each row's text rendered through the composed neutral
 * {@link ForgeTypography}; any default-slot children are appended after the
 * generated rows. It owns its styling through the co-located CSS Module
 * `forge-list.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC also exposed a per-row scoped `item` slot (with
 * `item`/`index` bindings) overriding the generated row; the neutral version
 * drops that scoped slot — rows are driven by `items` — consistent with how the
 * other migrated components dropped scoped slots.
 */
export function ForgeList(properties: Readonly<ListProperties>): MpElement {
  const style = createListStyle(properties.properties);

  const { items = [], variant = 'unordered', tone = 'neutral', size = 'md', divided = false } = properties;

  const tag = variant === 'description' ? 'dl' : variant === 'ordered' ? 'ol' : 'ul';
  const className = classNames(
    styles['forge-list'],
    styles[`forge-list--${variant}`],
    styles[`forge-list--tone-${tone}`],
    styles[`forge-list--${size}`],
    {
      [styles['forge-list--divided']]: divided,
    },
  );

  const itemNodes =
    variant === 'description'
      ? items.flatMap((item, index) => [
          <dt
            key={`term-${index}`}
            className={styles['forge-list__term']}
          >
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-md"
              weight="semibold"
            >
              {item.term ?? item.label}
            </ForgeTypography>
          </dt>,
          <dd
            key={`detail-${index}`}
            className={styles['forge-list__detail']}
          >
            <ForgeTypography
              as="span"
              color="secondary"
              variant="body-md"
            >
              {item.content ?? item.description}
            </ForgeTypography>
          </dd>,
        ])
      : items.map((item, index) => (
          <li
            key={index}
            className={styles['forge-list__item']}
          >
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-md"
            >
              {item.label}
            </ForgeTypography>
          </li>
        ));

  const children = properties.children;
  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  return (
    <Dynamic
      className={className}
      is={tag}
      style={style}
    >
      {[...itemNodes, ...childList]}
    </Dynamic>
  );
}
