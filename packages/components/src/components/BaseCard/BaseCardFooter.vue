<script setup lang="ts">
  import BaseTypography from '../BaseTypography/BaseTypography.vue'
</script>

<template>
  <footer class="base-card__footer">
    <BaseTypography variant="body-sm" as="div" color="secondary">
      <slot />
    </BaseTypography>
  </footer>
</template>
