import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';
import { ForgeIconChevron, ForgeIconChevrons } from '@mission-platform/icons';

import styles from './forge-pagination.module.scss';

/** Size token controlling button dimensions — canonical 2xs → 2xl scale. */
export type PaginationSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A rendered pagination item: a page number or a truncation ellipsis. */
export type PaginationItem = number | 'ellipsis';

/** A single rendered control in the pagination list (data-only model). */
type PaginationControl =
  | { kind: 'ellipsis' }
  | { kind: 'page'; page: number }
  | {
      kind: 'nav';
      ariaLabel: string;
      direction: 'left' | 'right';
      target: number;
      disabled: boolean;
      modifier: 'edge' | 'prev' | 'next';
    };

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface PaginationStyleProperties {
  readonly font?: string;
  readonly 'navigation-font-family'?: string;
  readonly 'navigation-pagination-border-active'?: string;
  readonly 'navigation-pagination-border-default'?: string;
  readonly 'navigation-pagination-border-hover'?: string;
  readonly 'navigation-pagination-border-width'?: string;
  readonly 'navigation-pagination-focus-ring'?: string;
  readonly 'navigation-pagination-font-2xl'?: string;
  readonly 'navigation-pagination-font-2xs'?: string;
  readonly 'navigation-pagination-font-lg'?: string;
  readonly 'navigation-pagination-font-md'?: string;
  readonly 'navigation-pagination-font-sm'?: string;
  readonly 'navigation-pagination-font-xl'?: string;
  readonly 'navigation-pagination-font-xs'?: string;
  readonly 'navigation-pagination-gap-default'?: string;
  readonly 'navigation-pagination-gap-wide'?: string;
  readonly 'navigation-pagination-gap-wider'?: string;
  readonly 'navigation-pagination-opacity-disabled'?: string;
  readonly 'navigation-pagination-padding-inline'?: string;
  readonly 'navigation-pagination-radius'?: string;
  readonly 'navigation-pagination-surface-active'?: string;
  readonly 'navigation-pagination-surface-default'?: string;
  readonly 'navigation-pagination-surface-hover'?: string;
  readonly 'navigation-pagination-text-active'?: string;
  readonly 'navigation-pagination-text-default'?: string;
  readonly 'navigation-pagination-text-ellipsis'?: string;
  readonly 'navigation-pagination-transition-duration'?: string;
  readonly 'navigation-pagination-transition-easing'?: string;
  readonly size?: string;
}

export type PaginationStyle = CSSStyleProperties & {
  readonly '--forge-pagination-font'?: string | undefined;
  readonly '--forge-pagination-navigation-font-family'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-border-active'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-border-default'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-border-hover'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-border-width'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-focus-ring'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-2xl'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-2xs'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-lg'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-md'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-sm'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-xl'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-font-xs'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-gap-default'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-gap-wide'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-gap-wider'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-opacity-disabled'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-padding-inline'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-radius'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-surface-active'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-surface-default'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-surface-hover'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-text-active'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-text-default'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-text-ellipsis'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-transition-duration'?: string | undefined;
  readonly '--forge-pagination-navigation-pagination-transition-easing'?: string | undefined;
  readonly '--forge-pagination-size'?: string | undefined;
};

function createPaginationStyle(
  properties: Readonly<PaginationStyleProperties> | undefined,
): PaginationStyle | undefined {
  return createForgeStyle({
    '--forge-pagination-font': properties?.['font'],
    '--forge-pagination-navigation-font-family': properties?.['navigation-font-family'],
    '--forge-pagination-navigation-pagination-border-active': properties?.['navigation-pagination-border-active'],
    '--forge-pagination-navigation-pagination-border-default': properties?.['navigation-pagination-border-default'],
    '--forge-pagination-navigation-pagination-border-hover': properties?.['navigation-pagination-border-hover'],
    '--forge-pagination-navigation-pagination-border-width': properties?.['navigation-pagination-border-width'],
    '--forge-pagination-navigation-pagination-focus-ring': properties?.['navigation-pagination-focus-ring'],
    '--forge-pagination-navigation-pagination-font-2xl': properties?.['navigation-pagination-font-2xl'],
    '--forge-pagination-navigation-pagination-font-2xs': properties?.['navigation-pagination-font-2xs'],
    '--forge-pagination-navigation-pagination-font-lg': properties?.['navigation-pagination-font-lg'],
    '--forge-pagination-navigation-pagination-font-md': properties?.['navigation-pagination-font-md'],
    '--forge-pagination-navigation-pagination-font-sm': properties?.['navigation-pagination-font-sm'],
    '--forge-pagination-navigation-pagination-font-xl': properties?.['navigation-pagination-font-xl'],
    '--forge-pagination-navigation-pagination-font-xs': properties?.['navigation-pagination-font-xs'],
    '--forge-pagination-navigation-pagination-gap-default': properties?.['navigation-pagination-gap-default'],
    '--forge-pagination-navigation-pagination-gap-wide': properties?.['navigation-pagination-gap-wide'],
    '--forge-pagination-navigation-pagination-gap-wider': properties?.['navigation-pagination-gap-wider'],
    '--forge-pagination-navigation-pagination-opacity-disabled': properties?.['navigation-pagination-opacity-disabled'],
    '--forge-pagination-navigation-pagination-padding-inline': properties?.['navigation-pagination-padding-inline'],
    '--forge-pagination-navigation-pagination-radius': properties?.['navigation-pagination-radius'],
    '--forge-pagination-navigation-pagination-surface-active': properties?.['navigation-pagination-surface-active'],
    '--forge-pagination-navigation-pagination-surface-default': properties?.['navigation-pagination-surface-default'],
    '--forge-pagination-navigation-pagination-surface-hover': properties?.['navigation-pagination-surface-hover'],
    '--forge-pagination-navigation-pagination-text-active': properties?.['navigation-pagination-text-active'],
    '--forge-pagination-navigation-pagination-text-default': properties?.['navigation-pagination-text-default'],
    '--forge-pagination-navigation-pagination-text-ellipsis': properties?.['navigation-pagination-text-ellipsis'],
    '--forge-pagination-navigation-pagination-transition-duration':
      properties?.['navigation-pagination-transition-duration'],
    '--forge-pagination-navigation-pagination-transition-easing':
      properties?.['navigation-pagination-transition-easing'],
    '--forge-pagination-size': properties?.['size'],
  }) as PaginationStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface PaginationProperties {
  /**
   * Current page (1-based; controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: number;
  /** Total number of pages. Ignored when `total` is provided. */
  pageCount?: number;
  /** Total number of items. Combined with `pageSize` to derive the page count. */
  total?: number;
  /** Items per page (used with `total`). Defaults to `10`. */
  pageSize?: number;
  /** Number of sibling pages shown on each side of the current page. Defaults to `1`. */
  siblingCount?: number;
  /** Number of pages always shown at the start and end. Defaults to `1`. */
  boundaryCount?: number;
  /** Show the jump-to-first / jump-to-last buttons. */
  showEdges?: boolean;
  /** Show the previous / next buttons. Defaults to `true`. */
  showPrevNext?: boolean;
  /** Button size. Defaults to `'md'`. */
  size?: PaginationSize;
  /** Disable all controls. */
  disabled?: boolean;
  /** Accessible label for the navigation landmark. Defaults to `'Pagination'`. */
  ariaLabel?: string;
  /** Fired when the page changes (the controlled `v-model` update). */
  onUpdateModelValue?: (page: number) => void;
  /** Fired whenever the page changes via user interaction. */
  onChange?: (page: number) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<PaginationStyleProperties>;
}

function range(start: number, end: number): number[] {
  const length = Math.max(0, end - start + 1);
  return Array.from({ length }, (_, index) => start + index);
}

/**
 * `ForgePagination` — page navigation control authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a list of page buttons with optional first/previous/next/last
 * controls and MUI-style truncation ellipses for large page counts. The current
 * page is **controlled** via `modelValue`; user interaction fires both
 * `onUpdateModelValue` (the `v-model` update) and `onChange`. Provide either
 * `pageCount` directly, or `total` + `pageSize` and the page count is derived.
 * It owns its styling through the co-located CSS Module
 * `forge-pagination.module.scss`.
 *
 * The original Vue SFC used `v-model` + a `change` emit; the neutral version
 * uses the established controlled `modelValue` + callback-prop convention.
 */
export function ForgePagination(properties: Readonly<PaginationProperties>): MpElement {
  const style = createPaginationStyle(properties.properties);

  const {
    modelValue = 1,
    pageCount,
    total,
    pageSize = 10,
    siblingCount = 1,
    boundaryCount = 1,
    showEdges = false,
    showPrevNext: showPreviousNext = true,
    size = 'md',
    disabled = false,
    ariaLabel = 'Pagination',
  } = properties;

  const resolvedPageCount =
    total === undefined ? Math.max(1, pageCount ?? 1) : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, modelValue), resolvedPageCount);

  const clampedBoundary = Math.max(0, boundaryCount);
  const clampedSibling = Math.max(0, siblingCount);

  const startPages = range(1, Math.min(clampedBoundary, resolvedPageCount));
  const endPages = range(Math.max(resolvedPageCount - clampedBoundary + 1, clampedBoundary + 1), resolvedPageCount);

  const siblingsStart = Math.max(
    Math.min(currentPage - clampedSibling, resolvedPageCount - clampedBoundary - clampedSibling * 2 - 1),
    clampedBoundary + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(currentPage + clampedSibling, clampedBoundary + clampedSibling * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : resolvedPageCount - 1,
  );

  const items: PaginationItem[] = [
    ...startPages,
    ...(siblingsStart > clampedBoundary + 2
      ? ['ellipsis' as const]
      : clampedBoundary + 1 < resolvedPageCount - clampedBoundary
        ? [clampedBoundary + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < resolvedPageCount - clampedBoundary - 1
      ? ['ellipsis' as const]
      : resolvedPageCount - clampedBoundary > clampedBoundary
        ? [resolvedPageCount - clampedBoundary]
        : []),
    ...endPages,
  ];

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < resolvedPageCount;

  const goTo = (page: number): void => {
    if (disabled) {
      return;
    }
    const next = Math.min(Math.max(1, page), resolvedPageCount);
    if (next === currentPage) {
      return;
    }
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
  };

  // A flat, data-only control model so the `<ul>` has a single mapped child (the
  // neutral dialect's JSX→template path requires a `.map()` to be the sole child
  // of its parent — sibling control buttons cannot live alongside it).
  const controls: PaginationControl[] = [];
  if (showEdges) {
    controls.push({
      kind: 'nav',
      ariaLabel: 'Go to first page',
      direction: 'left',
      target: 1,
      disabled: disabled || !canGoPrevious,
      modifier: 'edge',
    });
  }
  if (showPreviousNext) {
    controls.push({
      kind: 'nav',
      ariaLabel: 'Go to previous page',
      direction: 'left',
      target: currentPage - 1,
      disabled: disabled || !canGoPrevious,
      modifier: 'prev',
    });
  }
  for (const item of items) {
    controls.push(item === 'ellipsis' ? { kind: 'ellipsis' } : { kind: 'page', page: item });
  }
  if (showPreviousNext) {
    controls.push({
      kind: 'nav',
      ariaLabel: 'Go to next page',
      direction: 'right',
      target: currentPage + 1,
      disabled: disabled || !canGoNext,
      modifier: 'next',
    });
  }
  if (showEdges) {
    controls.push({
      kind: 'nav',
      ariaLabel: 'Go to last page',
      direction: 'right',
      target: resolvedPageCount,
      disabled: disabled || !canGoNext,
      modifier: 'edge',
    });
  }

  const navClass = classNames(styles['forge-pagination'], styles[`forge-pagination--${size}`], {
    [styles['forge-pagination--disabled']]: disabled,
  });

  return (
    <nav
      aria-label={ariaLabel}
      className={navClass}
      style={style}
    >
      <ul className={styles['forge-pagination__list']}>
        {controls.map((control, index) => (
          <li key={index}>
            {control.kind === 'page' ? (
              <button
                aria-current={control.page === currentPage ? 'page' : undefined}
                aria-label={`Go to page ${control.page}`}
                className={[
                  styles['forge-pagination__btn'],
                  {
                    [styles['forge-pagination__btn--active']]: control.page === currentPage,
                  },
                ]}
                disabled={disabled}
                type="button"
                onClick={() => goTo(control.page)}
              >
                {control.page}
              </button>
            ) : control.kind === 'ellipsis' ? (
              <span
                aria-hidden="true"
                className={styles['forge-pagination__ellipsis']}
              >
                …
              </span>
            ) : (
              <button
                aria-label={control.ariaLabel}
                className={[styles['forge-pagination__btn'], styles[`forge-pagination__btn--${control.modifier}`]]}
                disabled={control.disabled}
                type="button"
                onClick={() => goTo(control.target)}
              >
                {control.modifier === 'edge' ? (
                  <ForgeIconChevrons
                    direction={control.direction}
                    size="2xs"
                  />
                ) : (
                  <ForgeIconChevron
                    direction={control.direction}
                    size="2xs"
                  />
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
