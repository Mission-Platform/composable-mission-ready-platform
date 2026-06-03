<script setup lang="ts">
  defineProps<{
    rowCount: number
    sortKey: string | null
    sortDir: 'asc' | 'desc' | null
  }>()
</script>

<template>
  <div
    class="virtual-table__footer"
    :style="{
      flexShrink: '0',
      padding: 'var(--mp-spacing-2) var(--mp-spacing-4)',
      borderTop: '1px solid var(--mp-color-border-default)',
      background: 'var(--mp-color-bg-sunken)',
      fontSize: 'var(--mp-font-size-xs)',
      color: 'var(--mp-color-text-tertiary)',
      display: 'flex',
      justifyContent: 'space-between',
    }"
  >
    <slot>
      <span>{{ rowCount.toLocaleString() }} rows</span>
      <span v-if="sortKey">
        Sorted by <strong style="color: var(--mp-color-text-primary);">{{ sortKey }}</strong> ({{ sortDir }})
      </span>
    </slot>
  </div>
</template>
