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
    :aria-label="ariaLabel ?? 'Numbered List'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-numbered-list"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="10"
      x2="21"
      y1="6"
      y2="6"
    />
    <line
      x1="10"
      x2="21"
      y1="12"
      y2="12"
    />
    <line
      x1="10"
      x2="21"
      y1="18"
      y2="18"
    />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-2-2-2" />
  </svg>
</template>

<style scoped>
  .base-icon-numbered-list {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
