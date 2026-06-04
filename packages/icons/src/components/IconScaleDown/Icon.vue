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
    class="base-icon-scale-down"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline points="3,9 3,3 9,3" />
    <polyline points="15,21 21,21 21,15" />
    <polyline points="9,3 3,3 3,9" />
    <polyline points="21,9 21,3 15,3" />
    <line
      x1="3"
      x2="10"
      y1="21"
      y2="14"
    />
    <line
      x1="21"
      x2="14"
      y1="3"
      y2="10"
    />
    <line
      x1="3"
      x2="10"
      y1="3"
      y2="10"
    />
    <line
      x1="21"
      x2="14"
      y1="21"
      y2="14"
    />
  </svg>
</template>

<style scoped>
  .base-icon-scale-down {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
