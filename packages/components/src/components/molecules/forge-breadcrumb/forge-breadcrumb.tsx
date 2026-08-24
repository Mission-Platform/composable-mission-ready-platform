import { type MpElement } from '@mission-platform/forge';

import styles from './forge-breadcrumb.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type BreadcrumbSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single breadcrumb trail entry. */
export interface BreadcrumbItem {
  /** Display label. */
  label: string;
  /** Destination URL. Intermediate entries with an `href` render as links. */
  href?: string;
}

export interface BreadcrumbProperties {
  /** The breadcrumb trail, root-first. The last entry is the current page. */
  items: BreadcrumbItem[];
  /** Visual separator rendered between entries. Defaults to `'/'`. */
  separator?: string;
  /** Size token controlling the trail's scale. Defaults to `'md'`. */
  size?: BreadcrumbSize;
}

/**
 * `ForgeBreadcrumb` — breadcrumb trail authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders an ordered list inside a labelled `<nav>`: every entry except the
 * last with an `href` is a link, the last entry is the current page
 * (`aria-current="page"`), and a configurable `separator` is drawn between
 * entries. Every crumb — link or current — inherits the trail's own font from
 * the `forge-size--*` modifier on the `<nav>`, so the current page is
 * typographically in line with its siblings and only differs in colour. It owns
 * its styling through the co-located CSS Module `forge-breadcrumb.module.scss`.
 *
 * The original Vue SFC supported `vue-router` `to` targets via `RouterLink`; the
 * neutral version renders a plain `<a href>` (the established router
 * substitution), so only the `href` link form is carried over.
 */
export function ForgeBreadcrumb(properties: Readonly<BreadcrumbProperties>): MpElement {
  const { items, separator = '/', size = 'md' } = properties;

  return (
    <nav
      aria-label="Breadcrumb"
      className={[styles['forge-breadcrumb'], size ? `forge-size--${size}` : undefined]}
    >
      <ol className={styles['forge-breadcrumb__list']}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={index}
              className={styles['forge-breadcrumb__item']}
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={styles['forge-breadcrumb__separator']}
                >
                  {separator}
                </span>
              ) : undefined}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className={styles['forge-breadcrumb__link']}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={styles['forge-breadcrumb__current']}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
