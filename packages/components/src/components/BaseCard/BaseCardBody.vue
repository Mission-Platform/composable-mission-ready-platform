<script lang="ts" setup>
  import BaseTypography from '../BaseTypography/BaseTypography.vue';
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
