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
    :aria-label="ariaLabel ?? 'Italic'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-italic"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="19"
      x2="10"
      y1="4"
      y2="4"
    />
    <line
      x1="14"
      x2="5"
      y1="20"
      y2="20"
    />
    <line
      x1="15"
      x2="9"
      y1="4"
      y2="20"
    />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-italic {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
