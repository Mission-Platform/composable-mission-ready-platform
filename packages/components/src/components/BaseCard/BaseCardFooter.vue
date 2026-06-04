<script lang="ts" setup>
  import BaseTypography from '../BaseTypography/BaseTypography.vue';
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
