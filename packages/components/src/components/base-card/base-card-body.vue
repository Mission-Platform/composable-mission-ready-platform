<script lang="ts" setup>
  /**
   * `BaseCardBody` — Card body component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';
</script>

<template>
  <div class="base-card__body">
    <BaseTypography
      as="div"
      color="primary"
      variant="body-md"
    >
      <slot />
    </BaseTypography>
  </div>
</template>
