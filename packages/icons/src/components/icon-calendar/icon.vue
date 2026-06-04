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
    class="base-icon-calendar"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      height="18"
      rx="2"
      ry="2"
      width="18"
      x="3"
      y="4"
    />
    <line
      x1="16"
      x2="16"
      y1="2"
      y2="6"
    />
    <line
      x1="8"
      x2="8"
      y1="2"
      y2="6"
    />
    <line
      x1="3"
      x2="21"
      y1="10"
      y2="10"
    />
  </svg>
</template>

<style scoped>
  .base-icon-calendar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
