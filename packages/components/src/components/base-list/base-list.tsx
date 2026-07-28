import { classNames, Dynamic, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';

import styles from './base-list.module.scss';

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

export interface ListProperties extends MpProperties {
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
}

/**
 * `BaseList` — an ordered/unordered/description/plain list authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders the supplied `items` as the appropriate semantic element (`ul` /
 * `ol` / `dl`), each row's text rendered through the composed neutral
 * {@link BaseTypography}; any default-slot children are appended after the
 * generated rows. It owns its styling through the co-located CSS Module
 * `base-list.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC also exposed a per-row scoped `item` slot (with
 * `item`/`index` bindings) overriding the generated row; the neutral version
 * drops that scoped slot — rows are driven by `items` — consistent with how the
 * other migrated components dropped scoped slots.
 */
export function BaseList(properties: Readonly<ListProperties>): MpElement {
  const { items = [], variant = 'unordered', tone = 'neutral', size = 'md', divided = false } = properties;

  const tag = variant === 'description' ? 'dl' : variant === 'ordered' ? 'ol' : 'ul';
  const className = classNames(
    styles['base-list'],
    styles[`base-list--${variant}`],
    styles[`base-list--tone-${tone}`],
    styles[`base-list--${size}`],
    {
      [styles['base-list--divided']]: divided,
    },
  );

  const itemNodes =
    variant === 'description'
      ? items.flatMap((item) => [
          <dt classNames={styles['base-list__term']}>
            <BaseTypography
              as="span"
              color="primary"
              variant="body-md"
              weight="semibold"
            >
              {item.term ?? item.label}
            </BaseTypography>
          </dt>,
          <dd classNames={styles['base-list__detail']}>
            <BaseTypography
              as="span"
              color="secondary"
              variant="body-md"
            >
              {item.content ?? item.description}
            </BaseTypography>
          </dd>,
        ])
      : items.map((item) => (
          <li classNames={styles['base-list__item']}>
            <BaseTypography
              as="span"
              color="primary"
              variant="body-md"
            >
              {item.label}
            </BaseTypography>
          </li>
        ));

  const children = properties.children;
  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  return (
    <Dynamic
      classNames={className}
      is={tag}
    >
      {[...itemNodes, ...childList]}
    </Dynamic>
  );
}
