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
    :aria-label="ariaLabel ?? 'Remove Table Column'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-table-column-remove"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 3h10v18H3z" />
    <line
      x1="3"
      x2="13"
      y1="9"
      y2="9"
    />
    <line
      x1="3"
      x2="13"
      y1="15"
      y2="15"
    />
    <line
      x1="16"
      x2="22"
      y1="12"
      y2="12"
    />
    <line
      x1="16"
      x2="13"
      y1="9"
      y2="18"
    />
  </svg>
</template>

<style scoped>
  .base-icon-table-column-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
