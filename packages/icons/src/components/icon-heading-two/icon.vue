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
    :aria-label="ariaLabel ?? 'Heading 2'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-heading-two"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="4"
      x2="4"
      y1="6"
      y2="18"
    />
    <line
      x1="12"
      x2="12"
      y1="6"
      y2="18"
    />
    <line
      x1="4"
      x2="12"
      y1="12"
      y2="12"
    />
    <text
      fill="currentColor"
      font-family="sans-serif"
      font-size="8"
      stroke="none"
      x="16"
      y="18"
    >
      2
    </text>
  </svg>
</template>

<style scoped>
  .base-icon-heading-two {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
