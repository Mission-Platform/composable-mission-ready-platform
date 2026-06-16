<script lang="ts" setup>
  /**
   * `BasePagination` — Page navigation control for the Mission Platform UI.
   *
   * Renders a list of page buttons with first/previous/next/last controls and
   * truncation ellipses for large page counts. The current page is controlled
   * via `modelValue` (`v-model`). Provide either `pageCount` directly, or
   * `total` + `pageSize` and the page count is derived.
   *
   * Accessibility:
   * - Wrapped in a `<nav>` with a configurable `aria-label`.
   * - The active page button sets `aria-current="page"`.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  /** Size token controlling button dimensions. */
  export type PaginationSize = 'sm' | 'md' | 'lg';

  /** A rendered pagination item: a page number or a truncation ellipsis. */
  export type PaginationItem = number | 'ellipsis';

  const props = withDefaults(
    defineProps<{
      /** Current page (1-based, `v-model`). */
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
    }>(),
    {
      modelValue: 1,
      pageCount: undefined,
      total: undefined,
      pageSize: 10,
      siblingCount: 1,
      boundaryCount: 1,
      showEdges: false,
      showPrevNext: true,
      size: 'md',
      disabled: false,
      ariaLabel: 'Pagination',
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [page: number];
    /** Emitted whenever the page changes via user interaction. */
    change: [page: number];
  }>();

  const resolvedPageCount = computed(() => {
    if (props.total !== undefined) {
      return Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize)));
    }
    return Math.max(1, props.pageCount ?? 1);
  });

  const currentPage = computed(() => Math.min(Math.max(1, props.modelValue), resolvedPageCount.value));

  function range(start: number, end: number): number[] {
    const length = Math.max(0, end - start + 1);
    return Array.from({ length }, (_, index) => start + index);
  }

  /** MUI-style page range with truncation ellipses. */
  const items = computed<PaginationItem[]>(() => {
    const count = resolvedPageCount.value;
    const page = currentPage.value;
    const boundaryCount = Math.max(0, props.boundaryCount);
    const siblingCount = Math.max(0, props.siblingCount);

    const startPages = range(1, Math.min(boundaryCount, count));
    const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);

    const siblingsStart = Math.max(
      Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
      boundaryCount + 2,
    );
    const siblingsEnd = Math.min(
      Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
      endPages.length > 0 ? endPages[0] - 2 : count - 1,
    );

    const result: PaginationItem[] = [
      ...startPages,
      ...(siblingsStart > boundaryCount + 2
        ? ['ellipsis' as const]
        : boundaryCount + 1 < count - boundaryCount
          ? [boundaryCount + 1]
          : []),
      ...range(siblingsStart, siblingsEnd),
      ...(siblingsEnd < count - boundaryCount - 1
        ? ['ellipsis' as const]
        : count - boundaryCount > boundaryCount
          ? [count - boundaryCount]
          : []),
      ...endPages,
    ];

    return result;
  });

  const canGoPrev = computed(() => currentPage.value > 1);
  const canGoNext = computed(() => currentPage.value < resolvedPageCount.value);

  function goTo(page: number): void {
    if (props.disabled) return;
    const next = Math.min(Math.max(1, page), resolvedPageCount.value);
    if (next === currentPage.value) return;
    emit('update:modelValue', next);
    emit('change', next);
  }
</script>

<template>
  <nav
    :aria-label="ariaLabel"
    :class="['base-pagination', `base-pagination--${size}`, { 'base-pagination--disabled': disabled }]"
  >
    <ul class="base-pagination__list">
      <li v-if="showEdges">
        <button
          :class="['base-pagination__btn', 'base-pagination__btn--edge']"
          :disabled="disabled || !canGoPrev"
          aria-label="Go to first page"
          type="button"
          @click="goTo(1)"
        >
          «
        </button>
      </li>
      <li v-if="showPrevNext">
        <button
          :class="['base-pagination__btn', 'base-pagination__btn--prev']"
          :disabled="disabled || !canGoPrev"
          aria-label="Go to previous page"
          type="button"
          @click="goTo(currentPage - 1)"
        >
          ‹
        </button>
      </li>
      <li
        v-for="(item, index) in items"
        :key="`${item}-${index}`"
      >
        <span
          v-if="item === 'ellipsis'"
          aria-hidden="true"
          class="base-pagination__ellipsis"
        >
          …
        </span>
        <button
          v-else
          :aria-current="item === currentPage ? 'page' : undefined"
          :aria-label="`Go to page ${item}`"
          :class="['base-pagination__btn', { 'base-pagination__btn--active': item === currentPage }]"
          :disabled="disabled"
          type="button"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </li>
      <li v-if="showPrevNext">
        <button
          :class="['base-pagination__btn', 'base-pagination__btn--next']"
          :disabled="disabled || !canGoNext"
          aria-label="Go to next page"
          type="button"
          @click="goTo(currentPage + 1)"
        >
          ›
        </button>
      </li>
      <li v-if="showEdges">
        <button
          :class="['base-pagination__btn', 'base-pagination__btn--edge']"
          :disabled="disabled || !canGoNext"
          aria-label="Go to last page"
          type="button"
          @click="goTo(resolvedPageCount)"
        >
          »
        </button>
      </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-pagination {
      &__list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--mp-spacing-1);
        list-style: none;
        margin: 0;
        padding: 0;
      }

      &__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--mp-pagination-size, 2.25rem);
        height: var(--mp-pagination-size, 2.25rem);
        padding: 0 var(--mp-spacing-2);
        background-color: transparent;
        color: var(--mp-color-text-primary);
        border: 1px solid var(--mp-color-border-default);
        border-radius: var(--mp-radius-md);
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-pagination-font, var(--mp-size-font-sm));
        cursor: pointer;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          color 150ms ease;

        &--active {
          background-color: var(--mp-color-primary-default);
          border-color: var(--mp-color-primary-default);
          color: var(--mp-color-text-on-primary);
          cursor: default;
        }

        &:focus-visible {
          outline: none;
          box-shadow: var(--mp-shadow-focus-primary);
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        &:hover:not(:disabled, .base-pagination__btn--active) {
          background-color: var(--mp-color-bg-muted);
          border-color: var(--mp-color-border-strong);
        }
      }

      &__ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--mp-pagination-size, 2.25rem);
        height: var(--mp-pagination-size, 2.25rem);
        color: var(--mp-color-text-tertiary);
        user-select: none;
      }

      &--sm {
        --mp-pagination-size: 1.75rem;
        --mp-pagination-font: var(--mp-size-font-xs);
      }

      &--md {
        --mp-pagination-size: 2.25rem;
        --mp-pagination-font: var(--mp-size-font-sm);
      }

      &--lg {
        --mp-pagination-size: 2.75rem;
        --mp-pagination-font: var(--mp-size-font-md);
      }
    }
  }
</style>
