<script setup lang="ts" generic="T extends Record<string, unknown>">
  import type { TableColumn } from '../BaseTable'

  const props = defineProps<{
    row: T
    index: number
    columns: TableColumn<T>[]
    rowHeight: number
    striped: boolean
    bordered: boolean
  }>()

  const emit = defineEmits<{
    rowClick: [row: T, index: number]
  }>()

  defineSlots<{
    [key: string]: (props: { value: unknown; row: T; index: number }) => unknown
  }>()

  function cellValue(col: TableColumn<T>): string {
    const raw = props.row[col.key]
    return col.render ? col.render(raw, props.row) : raw == null ? '' : String(raw)
  }

  function bgColor(): string {
    return props.striped && props.index % 2 !== 0
      ? 'var(--mp-color-bg-sunken)'
      : 'var(--mp-color-bg-surface)'
  }

  function onMouseover(el: HTMLElement) {
    el.style.backgroundColor = 'var(--mp-color-bg-muted)'
  }

  function onMouseleave(el: HTMLElement) {
    el.style.backgroundColor = bgColor()
  }
</script>

<template>
  <!-- div + role="row/gridcell" replaces <tr>/<td> — see BaseVirtualTable.vue
       for the rationale (Mobile Safari native table layout bug). -->
  <div
    class="virtual-table__row"
    role="row"
    :aria-rowindex="index + 1"
    :style="{
      display: 'flex',
      alignItems: 'center',
      height: `${rowHeight}px`,
      borderBottom: '1px solid var(--mp-color-border-default)',
      backgroundColor: bgColor(),
      cursor: 'default',
      transition: 'background-color 80ms ease',
    }"
    @click="emit('rowClick', row, index)"
    @mouseover="onMouseover($event.currentTarget as HTMLElement)"
    @mouseleave="onMouseleave($event.currentTarget as HTMLElement)"
  >
    <div
      v-for="col in columns"
      :key="col.key"
      role="gridcell"
      :style="{
        flex: col.width ? `0 0 ${col.width}` : '1',
        minWidth: col.width ?? '80px',
        padding: '0 var(--mp-spacing-3)',
        fontSize: 'var(--mp-font-size-sm)',
        color: 'var(--mp-color-text-primary)',
        textAlign: col.align ?? 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        borderRight: bordered ? '1px solid var(--mp-color-border-default)' : undefined,
      }"
    >
      <slot :name="`cell-${col.key}`" :value="row[col.key]" :row="row" :index="index">
        {{ cellValue(col) }}
      </slot>
    </div>
  </div>
</template>
