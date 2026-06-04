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
    :aria-label="ariaLabel ?? 'Heading'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-heading"
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
    <line
      x1="17"
      x2="20"
      y1="10"
      y2="8"
    />
    <line
      x1="20"
      x2="20"
      y1="8"
      y2="18"
    />
  </svg>
</template>

<style scoped>
  .base-icon-heading {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
