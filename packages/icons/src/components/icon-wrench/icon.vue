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
    class="base-icon-wrench"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.7 6.3a4.5 4.5 0 0 0 5.95 5.95L22 13.59V20a2 2 0 0 1-2 2h-6.41l-1.34-1.34a4.5 4.5 0 0 0-5.95-5.95L4 12.42V6a2 2 0 0 1 2-2h6.41l2.29 2.3Z"
    />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-wrench {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
