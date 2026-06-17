<script lang="ts" setup>
  import { useIconSize } from '../../use-icon-size.ts';

  const props = withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
      ariaLabel?: string;
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      ariaLabel: undefined,
    },
  );

  const sizeValue = useIconSize(() => props.size);
</script>

<template>
  <svg
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-align-right"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 6H21M9 12H21M6 18H21" />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-align-right {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
