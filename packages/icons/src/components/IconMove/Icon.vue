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
    class="base-icon-move"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline points="5,9 12,2 19,9" />
    <polyline points="5,15 12,22 19,15" />
    <polyline points="9,5 2,12 9,19" />
    <polyline points="15,5 22,12 15,19" />
    <line
      x1="12"
      x2="12"
      y1="2"
      y2="22"
    />
    <line
      x1="2"
      x2="22"
      y1="12"
      y2="12"
    />
  </svg>
</template>

<style scoped>
  .base-icon-move {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
