<script lang="ts" setup>
  /**
   * `BaseVirtualTableFooter` — Virtual table footer component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  defineProps<{
    rowCount: number;
    sortKey: string | undefined;
    sortDir: 'asc' | 'desc' | null;
  }>();
</script>

<template>
  <div
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
    class="virtual-table__footer"
  >
    <slot>
      <span>{{ rowCount.toLocaleString() }} rows</span>
      <span v-if="sortKey">
        Sorted by
        <strong style="color: var(--mp-color-text-primary)">{{ sortKey }}</strong>
        ({{ sortDir }})
      </span>
    </slot>
  </div>
</template>
