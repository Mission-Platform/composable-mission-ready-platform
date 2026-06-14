<script lang="ts" setup>
  /**
   * `BaseVirtualTableFooter` — Virtual table footer component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';

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
      <BaseTypography
        as="span"
        color="inherit"
        variant="caption"
      >
        {{ rowCount.toLocaleString() }} rows
      </BaseTypography>
      <BaseTypography
        v-if="sortKey"
        as="span"
        color="inherit"
        variant="caption"
      >
        Sorted by
        <BaseTypography
          as="strong"
          color="primary"
          variant="caption"
          weight="bold"
        >
          {{ sortKey }}
        </BaseTypography>
        ({{ sortDir }})
      </BaseTypography>
    </slot>
  </div>
</template>
