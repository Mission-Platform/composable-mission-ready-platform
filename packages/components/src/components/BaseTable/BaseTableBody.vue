<script setup lang="ts" generic="T extends Record<string, unknown>">
  import BaseTypography from '../BaseTypography/BaseTypography.vue'
  import BaseTableEmptyState from './BaseTableEmptyState.vue'
  import type { TableColumn } from './types'

  const props = defineProps<{
    rows: T[]
    columns: TableColumn<T>[]
    loading: boolean
    emptyText: string
  }>()

  defineSlots<{
    cell(props: { row: T; col: TableColumn<T>; value: unknown }): unknown
    row(props: { row: T; index: number }): unknown
  }>()

  function resolveCell(row: T, col: TableColumn<T>): unknown {
    const raw = row[col.key]
    return col.render ? col.render(raw, row) : raw
  }
</script>

<template>
  <tbody :class="['base-table__body', { 'base-table__body--loading': loading }]" :aria-busy="loading">
    <template v-if="!loading && rows.length === 0">
      <BaseTableEmptyState :colspan="columns.length" :text="emptyText" />
    </template>
    <template v-else>
      <tr
        v-for="(row, index) in rows"
        :key="index"
        class="base-table__row"
      >
        <slot name="row" :row="row" :index="index">
          <td
            v-for="col in columns"
            :key="col.key"
            :class="[
              'base-table__td',
              `base-table__td--align-${col.align ?? 'left'}`,
            ]"
          >
            <slot name="cell" :row="row" :col="col" :value="resolveCell(row, col)">
              <BaseTypography variant="body-sm" as="span" color="primary">{{ resolveCell(row, col) }}</BaseTypography>
            </slot>
          </td>
        </slot>
      </tr>
    </template>
  </tbody>
</template>
