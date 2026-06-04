<script lang="ts" setup>
  import BaseTypography from '../BaseTypography/BaseTypography.vue';
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
