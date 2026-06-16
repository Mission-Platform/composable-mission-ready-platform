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
    class="base-icon-draw-triangle"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="12,3 22,20 2,20" />
    <circle
      :fill="color"
      cx="12"
      cy="3"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="22"
      cy="20"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="2"
      cy="20"
      r="1.5"
      stroke="none"
    />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-draw-triangle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
