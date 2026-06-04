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
    class="base-icon-draw-line"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline points="3,19 9,9 15,14 21,5" />
    <circle
      :fill="color"
      cx="3"
      cy="19"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="9"
      cy="9"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="15"
      cy="14"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="21"
      cy="5"
      r="1.5"
      stroke="none"
    />
  </svg>
</template>

<style scoped>
  .base-icon-draw-line {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
