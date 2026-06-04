<script lang="ts" setup>
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  defineProps<{
    colspan: number;
    text: string;
  }>();
</script>

<template>
  <tr>
    <td
      :colspan="colspan"
      class="base-table__empty"
    >
      <BaseTypography
        as="span"
        color="tertiary"
        variant="body-md"
      >
        {{ text }}
      </BaseTypography>
    </td>
  </tr>
</template>
