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
    class="base-icon-scale-up"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline points="15,3 21,3 21,9" />
    <polyline points="9,21 3,21 3,15" />
    <polyline points="21,15 21,21 15,21" />
    <polyline points="3,9 3,3 9,3" />
    <line
      x1="12"
      x2="21"
      y1="12"
      y2="3"
    />
    <line
      x1="12"
      x2="3"
      y1="12"
      y2="21"
    />
    <line
      x1="12"
      x2="21"
      y1="12"
      y2="21"
    />
    <line
      x1="12"
      x2="3"
      y1="12"
      y2="3"
    />
  </svg>
</template>

<style scoped>
  .base-icon-scale-up {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
