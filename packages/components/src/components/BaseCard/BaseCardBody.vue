<script setup lang="ts">
  import BaseTypography from '../BaseTypography/BaseTypography.vue'
</script>

<template>
  <div class="base-card__body">
    <BaseTypography variant="body-md" as="div" color="primary">
      <slot />
    </BaseTypography>
  </div>
</template>
