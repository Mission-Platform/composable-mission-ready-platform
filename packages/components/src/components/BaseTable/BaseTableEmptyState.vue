<script setup lang="ts">
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  defineProps<{
    colspan: number
    text: string
  }>()
</script>

<template>
  <tr>
    <td :colspan="colspan" class="base-table__empty">
      <BaseTypography variant="body-md" as="span" color="tertiary">{{ text }}</BaseTypography>
    </td>
  </tr>
</template>
