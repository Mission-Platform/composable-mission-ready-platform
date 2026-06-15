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
    class="base-icon-qr-code"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      height="7"
      rx="1"
      width="7"
      x="3"
      y="3"
    />
    <rect
      height="7"
      rx="1"
      width="7"
      x="14"
      y="3"
    />
    <rect
      height="7"
      rx="1"
      width="7"
      x="3"
      y="14"
    />
    <path d="M14 14h3v3" />
    <path d="M21 14v7h-7" />
    <path d="M17 21h.01" />
    <path d="M21 17h.01" />
  </svg>
</template>

<style scoped>
  .base-icon-qr-code {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
