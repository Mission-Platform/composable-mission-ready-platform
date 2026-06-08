<script lang="ts" setup>
  /**
   * `BaseCardFooter` — Card footer component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';
</script>

<template>
  <footer class="base-card__footer">
    <BaseTypography
      as="div"
      color="secondary"
      variant="body-sm"
    >
      <slot />
    </BaseTypography>
  </footer>
</template>
