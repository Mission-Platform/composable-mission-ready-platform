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
    class="base-icon-draw-polygon"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="12,3 21,9 18,20 6,20 3,9" />
    <circle
      :fill="color"
      cx="12"
      cy="3"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="21"
      cy="9"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="18"
      cy="20"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="6"
      cy="20"
      r="1.5"
      stroke="none"
    />
    <circle
      :fill="color"
      cx="3"
      cy="9"
      r="1.5"
      stroke="none"
    />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-draw-polygon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
