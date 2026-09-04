import { createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface BreadcrumbStyleProperties {
  readonly 'navigation-breadcrumb-current-text'?: string;
  readonly 'navigation-breadcrumb-gap-default'?: string;
  readonly 'navigation-breadcrumb-gap-wide'?: string;
  readonly 'navigation-breadcrumb-link-focus-ring'?: string;
  readonly 'navigation-breadcrumb-link-radius'?: string;
  readonly 'navigation-breadcrumb-link-text'?: string;
  readonly 'navigation-breadcrumb-link-text-hover'?: string;
  readonly 'navigation-breadcrumb-separator'?: string;
}

export type BreadcrumbStyle = CSSStyleProperties & {
  readonly '--forge-breadcrumb-navigation-breadcrumb-current-text'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-gap-default'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-gap-wide'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-link-focus-ring'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-link-radius'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-link-text'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-link-text-hover'?: string | undefined;
  readonly '--forge-breadcrumb-navigation-breadcrumb-separator'?: string | undefined;
};

function createBreadcrumbStyle(
  properties: Readonly<BreadcrumbStyleProperties> | undefined,
): BreadcrumbStyle | undefined {
  return createForgeStyle({
    '--forge-breadcrumb-navigation-breadcrumb-current-text': properties?.['navigation-breadcrumb-current-text'],
    '--forge-breadcrumb-navigation-breadcrumb-gap-default': properties?.['navigation-breadcrumb-gap-default'],
    '--forge-breadcrumb-navigation-breadcrumb-gap-wide': properties?.['navigation-breadcrumb-gap-wide'],
    '--forge-breadcrumb-navigation-breadcrumb-link-focus-ring': properties?.['navigation-breadcrumb-link-focus-ring'],
    '--forge-breadcrumb-navigation-breadcrumb-link-radius': properties?.['navigation-breadcrumb-link-radius'],
    '--forge-breadcrumb-navigation-breadcrumb-link-text': properties?.['navigation-breadcrumb-link-text'],
    '--forge-breadcrumb-navigation-breadcrumb-link-text-hover': properties?.['navigation-breadcrumb-link-text-hover'],
    '--forge-breadcrumb-navigation-breadcrumb-separator': properties?.['navigation-breadcrumb-separator'],
  }) as BreadcrumbStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface BreadcrumbProperties {
  /** The breadcrumb trail, root-first. The last entry is the current page. */
  items: BreadcrumbItem[];
  /** Visual separator rendered between entries. Defaults to `'/'`. */
  separator?: string;
  /** Size token controlling the trail's scale. Defaults to `'md'`. */
  size?: BreadcrumbSize;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<BreadcrumbStyleProperties>;
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
  const style = createBreadcrumbStyle(properties.properties);

  const { items, separator = '/', size = 'md' } = properties;

  return (
    <nav
      aria-label="Breadcrumb"
      className={[styles['forge-breadcrumb'], size ? `forge-size--${size}` : undefined]}
      style={style}
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
