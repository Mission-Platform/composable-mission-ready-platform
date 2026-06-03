<script setup lang="ts">
  import BaseTypography from '../BaseTypography/BaseTypography.vue'
</script>

<template>
  <header class="base-card__header">
    <BaseTypography variant="h5" as="div" color="primary">
      <slot />
    </BaseTypography>
  </header>
</template>
