<script generic="T extends Record<string, unknown>" lang="ts" setup>
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  import BaseTableEmptyState from './BaseTableEmptyState.vue';

  import type { TableColumn } from './types';

  defineProps<{
    rows: T[];
    columns: TableColumn<T>[];
    loading: boolean;
    emptyText: string;
  }>();

  defineSlots<{
    cell(props: { row: T; col: TableColumn<T>; value: unknown }): unknown;
    row(props: { row: T; index: number }): unknown;
  }>();

  function resolveCell(row: T, col: TableColumn<T>): unknown {
    const raw = row[col.key];
    return col.render ? col.render(raw, row) : raw;
  }
</script>

<template>
  <tbody
    :aria-busy="loading"
    :class="['base-table__body', { 'base-table__body--loading': loading }]"
  >
    <template v-if="!loading && rows.length === 0">
      <BaseTableEmptyState
        :colspan="columns.length"
        :text="emptyText"
      />
    </template>
    <template v-else>
      <tr
        v-for="(row, index) in rows"
        :key="index"
        class="base-table__row"
      >
        <slot
          :index="index"
          :row="row"
          name="row"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="['base-table__td', `base-table__td--align-${col.align ?? 'left'}`]"
          >
            <slot
              :col="col"
              :row="row"
              :value="resolveCell(row, col)"
              name="cell"
            >
              <BaseTypography
                as="span"
                color="primary"
                variant="body-sm"
              >
                {{ resolveCell(row, col) }}
              </BaseTypography>
            </slot>
          </td>
        </slot>
      </tr>
    </template>
  </tbody>
</template>
