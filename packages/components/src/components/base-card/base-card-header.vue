<script lang="ts" setup>
  /**
   * `BaseCardHeader` — Card header component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';
</script>

<template>
  <header class="base-card__header">
    <BaseTypography
      as="div"
      color="primary"
      variant="h5"
    >
      <slot />
    </BaseTypography>
  </header>
</template>
