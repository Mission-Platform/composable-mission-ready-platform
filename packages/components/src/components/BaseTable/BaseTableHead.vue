<script generic="T extends Record<string, unknown>" lang="ts" setup>
  import { IconSort } from '@mission-platform/icons';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  import type { SortDirection, TableColumn } from './types';

  defineProps<{
    columns: TableColumn<T>[];
    sortKey: string | null;
    sortDir: SortDirection;
  }>();

  const emit = defineEmits<{
    sort: [col: TableColumn<T>];
  }>();

  function ariaSort(
    col: TableColumn<T>,
    sortKey: string | null,
    sortDir: SortDirection,
  ): 'ascending' | 'descending' | 'none' {
    if (!col.sortable) return 'none';
    if (sortKey !== col.key) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }
</script>

<template>
  <thead class="base-table__head">
    <tr>
      <th
        v-for="col in columns"
        :key="col.key"
        :aria-sort="col.sortable ? ariaSort(col, sortKey, sortDir) : undefined"
        :class="[
          'base-table__th',
          `base-table__th--align-${col.align ?? 'left'}`,
          { 'base-table__th--sortable': col.sortable },
        ]"
        scope="col"
        @click="emit('sort', col)"
      >
        <span class="base-table__th-content">
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
            weight="semibold"
          >
            {{ col.label }}
          </BaseTypography>
          <span
            v-if="col.sortable"
            class="base-table__sort-icon"
          >
            <IconSort
              :active="sortKey === col.key"
              :direction="sortDir"
              size="xs"
            />
          </span>
        </span>
      </th>
    </tr>
  </thead>
</template>
