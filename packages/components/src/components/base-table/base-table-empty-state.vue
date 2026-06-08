<script lang="ts" setup>
  /**
   * `BaseTableEmptyState` — Table empty state component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';

  defineProps<{
    colspan: number;
    text: string;
  }>();
</script>

<template>
  <tr>
    <td
      :colspan="colspan"
      class="base-table__empty"
    >
      <BaseTypography
        as="span"
        color="tertiary"
        variant="body-md"
      >
        {{ text }}
      </BaseTypography>
    </td>
  </tr>
</template>
