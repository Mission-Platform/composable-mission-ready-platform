import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-breadcrumb.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type BreadcrumbSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single breadcrumb trail entry. */
export interface BreadcrumbItem {
  /** Display label. */
  label: string;
  /** Destination URL. Intermediate entries with an `href` render as links. */
  href?: string;
}

export interface BreadcrumbProperties extends MpProperties {
  /** The breadcrumb trail, root-first. The last entry is the current page. */
  items: BreadcrumbItem[];
  /** Visual separator rendered between entries. Defaults to `'/'`. */
  separator?: string;
  /** Size token controlling the trail's scale. Defaults to `'md'`. */
  size?: BreadcrumbSize;
}

/**
 * `BaseBreadcrumb` — breadcrumb trail authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders an ordered list inside a labelled `<nav>`: every entry except the
 * last with an `href` is a link, the last entry is the current page
 * (`aria-current="page"`), and a configurable `separator` is drawn between
 * entries. Item text composes the already-migrated {@link BaseTypography}. It
 * owns its styling through the co-located CSS Module `base-breadcrumb.module.scss`.
 *
 * The original Vue SFC supported `vue-router` `to` targets via `RouterLink`; the
 * neutral version renders a plain `<a href>` (the established router
 * substitution), so only the `href` link form is carried over.
 */
export function BaseBreadcrumb(properties: Readonly<BreadcrumbProperties>): MpElement {
  const { items, separator = '/', size = 'md' } = properties;

  return (
    <nav
      aria-label="Breadcrumb"
      className={[styles['base-breadcrumb'], sizeStyles[`base-size--${size}`]]}
    >
      <ol className={styles['base-breadcrumb__list']}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={index}
              className={styles['base-breadcrumb__item']}
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={styles['base-breadcrumb__separator']}
                >
                  {separator}
                </span>
              ) : undefined}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className={styles['base-breadcrumb__link']}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={styles['base-breadcrumb__current']}
                  aria-current={isLast ? 'page' : undefined}
                >
                  <BaseTypography
                    as="span"
                    color="secondary"
                    variant="body-sm"
                    weight="medium"
                  >
                    {item.label}
                  </BaseTypography>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
