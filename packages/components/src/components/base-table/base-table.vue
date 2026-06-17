<script generic="T extends Record<string, unknown>" lang="ts" setup>
  import { computed, ref } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseTableBody from './base-table-body.vue';
  import BaseTableHead from './base-table-head.vue';

  import type { SortDirection, TableColumn } from './types';

  export type { TableColumn } from './types';
  export type { SortDirection } from './types';

  const props = withDefaults(
    defineProps<{
      columns: TableColumn<T>[];
      rows: T[];
      caption?: string;
      striped?: boolean;
      bordered?: boolean;
      hoverable?: boolean;
      loading?: boolean;
      emptyText?: string;
    }>(),
    {
      caption: undefined,
      striped: false,
      bordered: false,
      hoverable: true,
      loading: false,
      emptyText: 'No data available',
    },
  );

  const emit = defineEmits<{
    sort: [key: string, direction: SortDirection];
  }>();

  const sortKey = ref<string | null>(null);
  const sortDir = ref<SortDirection>(null);

  const sortedRows = computed<T[]>(() => {
    if (!sortKey.value || sortDir.value === null) return props.rows;
    return [...props.rows].sort((a, b) => {
      const av = a[sortKey.value!];
      const bv = b[sortKey.value!];
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir.value === 'asc' ? cmp : -cmp;
    });
  });

  function toggleSort(col: TableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey.value !== col.key) {
      sortKey.value = col.key;
      sortDir.value = 'asc';
    } else if (sortDir.value === 'asc') {
      sortDir.value = 'desc';
    } else {
      sortKey.value = null;
      sortDir.value = null;
    }
    emit('sort', col.key, sortDir.value);
  }
</script>

<template>
  <div class="base-table-wrapper">
    <div
      v-if="loading"
      aria-busy="true"
      aria-label="Loading table data"
      class="base-table__loading"
    >
      <span
        aria-label="Loading…"
        class="base-table__spinner"
        role="status"
      />
    </div>
    <table
      :class="[
        'base-table',
        {
          'base-table--striped': striped,
          'base-table--bordered': bordered,
          'base-table--hoverable': hoverable,
        },
      ]"
    >
      <caption
        v-if="caption"
        class="base-table__caption"
      >
        <BaseTypography
          as="span"
          color="primary"
          variant="body-md"
          weight="semibold"
        >
          {{ caption }}
        </BaseTypography>
      </caption>
      <BaseTableHead
        :columns="columns"
        :sort-dir="sortDir"
        :sort-key="sortKey"
        @sort="toggleSort"
      />
      <BaseTableBody
        :columns="columns"
        :empty-text="emptyText"
        :loading="loading"
        :rows="sortedRows"
      >
        <template
          v-for="col in columns"
          #[`cell-${col.key}`]="slotProps"
        >
          <slot
            :name="`cell-${col.key}`"
            v-bind="slotProps"
          />
        </template>
      </BaseTableBody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;
  @use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

  @layer mp.components {
    .base-table-wrapper {
      position: relative;
      overflow-x: auto;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
    }

    .base-table__loading {
      position: absolute;
      inset: 0;
      background-color: var(--mp-color-bg-loading-overlay);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      border-radius: var(--mp-radius-md);
    }

    .base-table__spinner {
      display: inline-block;
      width: var(--mp-size-icon-lg);
      height: var(--mp-size-icon-lg);
      border: 0.214rem solid var(--mp-color-primary-default);
      border-top-color: transparent;
      border-radius: var(--mp-radius-full);
      animation: mp-spin 0.65s linear infinite;
    }

    .base-table {
      @include mp.mp-font-body-sm;

      width: 100%;
      border-collapse: collapse;

      &__caption {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);
        text-align: left;
        caption-side: top;

        /* typography handled by BaseTypography */
      }

      &__head {
        background-color: var(--mp-color-bg-muted);
      }

      &__th {
        padding: var(--mp-spacing-2) var(--mp-spacing-3);
        text-align: left;
        white-space: nowrap;
        border-bottom: 1px solid var(--mp-color-border-default);

        @include bp.bp-up('sm') {
          padding: var(--mp-spacing-3) var(--mp-spacing-4);
        }

        &--align-center {
          text-align: center;
        }

        &--align-right {
          text-align: right;
        }

        &--sortable {
          cursor: pointer;
          user-select: none;

          &:hover {
            background-color: var(--mp-color-bg-sunken);
            color: var(--mp-color-text-primary);
          }
        }
      }

      &__th-content {
        display: inline-flex;
        align-items: center;
        gap: var(--mp-spacing-1);
      }

      &__sort-icon {
        opacity: 0.5;
      }

      &__td {
        padding: var(--mp-spacing-2) var(--mp-spacing-3);
        vertical-align: middle;

        @include bp.bp-up('sm') {
          padding: var(--mp-spacing-3) var(--mp-spacing-4);
        }

        &--align-center {
          text-align: center;
        }

        &--align-right {
          text-align: right;
        }
      }

      &__row {
        border-bottom: 1px solid var(--mp-color-border-default);

        &:last-child {
          border-bottom: none;
        }
      }

      &__empty {
        padding: var(--mp-spacing-8) var(--mp-spacing-4);
        text-align: center;

        /* typography handled by BaseTypography */
      }

      /* Striped */
      &--striped .base-table__row:nth-child(even) {
        background-color: var(--mp-color-bg-muted);
      }

      /* Bordered */
      &--bordered {
        .base-table__th,
        .base-table__td {
          border: 1px solid var(--mp-color-border-default);
        }
      }

      /* Hoverable */
      &--hoverable .base-table__row:hover {
        background-color: var(--mp-color-bg-muted);
      }
    }

    @keyframes mp-spin {
      to {
        transform: rotate(360deg);
      }
    }
  }
</style>
