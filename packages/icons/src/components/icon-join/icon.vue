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
    class="base-icon-join"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="3"
      x2="10"
      y1="12"
      y2="12"
    />
    <line
      x1="14"
      x2="21"
      y1="12"
      y2="12"
    />
    <circle
      :fill="color"
      cx="12"
      cy="12"
      r="2"
      stroke="none"
    />
    <polyline points="9,9 12,12 9,15" />
    <polyline points="15,9 12,12 15,15" />
  </svg>
</template>

<style scoped>
  .base-icon-join {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
