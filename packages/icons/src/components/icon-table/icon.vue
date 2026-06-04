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
    :aria-label="ariaLabel ?? 'Table'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-table"
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
      y="3"
    />
    <line
      x1="3"
      x2="21"
      y1="9"
      y2="9"
    />
    <line
      x1="3"
      x2="21"
      y1="15"
      y2="15"
    />
    <line
      x1="9"
      x2="9"
      y1="3"
      y2="21"
    />
    <line
      x1="15"
      x2="15"
      y1="3"
      y2="21"
    />
  </svg>
</template>

<style scoped>
  .base-icon-table {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
