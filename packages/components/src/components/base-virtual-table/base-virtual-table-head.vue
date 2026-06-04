<script generic="T extends Record<string, unknown>" lang="ts" setup>
  import { IconSort } from '@mission-platform/icons';

  import type { SortDirection, TableColumn } from '../base-table/types';

  defineProps<{
    columns: TableColumn<T>[];
    sortKey: string | undefined;
    sortDir: SortDirection;
    bordered: boolean;
    headerHeight: number;
  }>();

  const emit = defineEmits<{
    sort: [col: TableColumn<T>];
  }>();
</script>

<template>
  <!-- div + role="rowgroup/row/columnheader" replaces <thead>/<tr>/<th> so that
       display:flex and overflow work correctly on Mobile Safari. -->
  <div
    :style="{
      height: `${headerHeight}px`,
      flexShrink: '0',
      display: 'flex',
      alignItems: 'center',
      borderBottom: '2px solid var(--mp-color-border-strong)',
      background: 'var(--mp-color-bg-sunken)',
      overflow: 'hidden',
    }"
    class="virtual-table__head"
    role="rowgroup"
  >
    <div
      role="row"
      style="display: flex; width: 100%"
    >
      <div
        v-for="col in columns"
        :key="col.key"
        :aria-sort="
          col.sortable
            ? sortKey === col.key
              ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
              : undefined
            : undefined
        "
        :style="{
          flex: col.width ? `0 0 ${col.width}` : '1',
          minWidth: col.width ?? '80px',
          padding: '0 var(--mp-spacing-3)',
          fontSize: 'var(--mp-font-size-xs)',
          fontWeight: 'var(--mp-font-weight-semibold)',
          color: 'var(--mp-color-text-secondary)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: col.align ?? 'left',
          cursor: col.sortable ? 'pointer' : 'default',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mp-spacing-1)',
          borderRight: bordered ? '1px solid var(--mp-color-border-default)' : undefined,
        }"
        :tabindex="0"
        role="columnheader"
        @click="emit('sort', col)"
        @keydown.enter.prevent="col.sortable && emit('sort', col)"
        @keydown.space.prevent="col.sortable && emit('sort', col)"
      >
        <span>{{ col.label }}</span>
        <IconSort
          v-if="col.sortable"
          :active="sortKey === col.key"
          :direction="sortDir"
          size="xs"
        />
      </div>
    </div>
  </div>
</template>
