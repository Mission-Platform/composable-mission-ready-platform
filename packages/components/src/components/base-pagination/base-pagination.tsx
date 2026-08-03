import { IconChevron, IconChevrons } from '@mission-platform/icons';
import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './base-pagination.module.scss';

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

export interface PaginationProperties extends MpProperties {
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
}

function range(start: number, end: number): number[] {
  const length = Math.max(0, end - start + 1);
  return Array.from({ length }, (_, index) => start + index);
}

/**
 * `BasePagination` — page navigation control authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a list of page buttons with optional first/previous/next/last
 * controls and MUI-style truncation ellipses for large page counts. The current
 * page is **controlled** via `modelValue`; user interaction fires both
 * `onUpdateModelValue` (the `v-model` update) and `onChange`. Provide either
 * `pageCount` directly, or `total` + `pageSize` and the page count is derived.
 * It owns its styling through the co-located CSS Module
 * `base-pagination.module.scss`.
 *
 * The original Vue SFC used `v-model` + a `change` emit; the neutral version
 * uses the established controlled `modelValue` + callback-prop convention.
 */
export function BasePagination(properties: Readonly<PaginationProperties>): MpElement {
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

  const navClass = classNames(styles['base-pagination'], styles[`base-pagination--${size}`], {
    [styles['base-pagination--disabled']]: disabled,
  });

  return (
    <nav
      aria-label={ariaLabel}
      className={navClass}
    >
      <ul className={styles['base-pagination__list']}>
        {controls.map((control, index) => (
          <li key={index}>
            {control.kind === 'page' ? (
              <button
                aria-current={control.page === currentPage ? 'page' : undefined}
                aria-label={`Go to page ${control.page}`}
                className={[
                  styles['base-pagination__btn'],
                  {
                    [styles['base-pagination__btn--active']]: control.page === currentPage,
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
                className={styles['base-pagination__ellipsis']}
              >
                …
              </span>
            ) : (
              <button
                aria-label={control.ariaLabel}
                className={[styles['base-pagination__btn'], styles[`base-pagination__btn--${control.modifier}`]]}
                disabled={control.disabled}
                type="button"
                onClick={() => goTo(control.target)}
              >
                {control.modifier === 'edge' ? (
                  <IconChevrons
                    direction={control.direction}
                    size="2xs"
                  />
                ) : (
                  <IconChevron
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
