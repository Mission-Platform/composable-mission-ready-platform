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
    :aria-label="ariaLabel ?? 'Bullet List'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-bullet-list"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="9"
      x2="20"
      y1="6"
      y2="6"
    />
    <line
      x1="9"
      x2="20"
      y1="12"
      y2="12"
    />
    <line
      x1="9"
      x2="20"
      y1="18"
      y2="18"
    />
    <circle
      cx="4"
      cy="6"
      fill="currentColor"
      r="1"
      stroke="none"
    />
    <circle
      cx="4"
      cy="12"
      fill="currentColor"
      r="1"
      stroke="none"
    />
    <circle
      cx="4"
      cy="18"
      fill="currentColor"
      r="1"
      stroke="none"
    />
  </svg>
</template>

<style scoped>
  .base-icon-bullet-list {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
