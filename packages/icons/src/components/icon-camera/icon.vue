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
    class="base-icon-camera"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle
      cx="12"
      cy="13"
      r="4"
    />
  </svg>
</template>

<style scoped>
  .base-icon-camera {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
