<script setup lang="ts">
  import { useIconSize } from '../../useIconSize.ts'

  const props = withDefaults(
    defineProps<{
      size?: number | string
      color?: string
      ariaLabel?: string
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      ariaLabel: undefined,
    },
  )

  const sizeValue = useIconSize(() => props.size)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="color"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :width="sizeValue"
    :height="sizeValue"
    :aria-label="ariaLabel"
    :aria-hidden="!ariaLabel"
    role="img"
    class="base-icon-settings"
  >
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15A1.65 1.65 0 0 0 19 16.35L19.08 16.6A2 2 0 1 1 16.08 19.6L15.83 19.52A1.65 1.65 0 0 0 14.35 20.06L14.2 20.39A2 2 0 1 1 9.8 20.39L9.65 20.06A1.65 1.65 0 0 0 8.17 19.52L7.92 19.6A2 2 0 1 1 4.92 16.6L5 16.35A1.65 1.65 0 0 0 4.6 15L4.34 14.8A2 2 0 1 1 4.34 9.2L4.6 9A1.65 1.65 0 0 0 5 7.65L4.92 7.4A2 2 0 1 1 7.92 4.4L8.17 4.48A1.65 1.65 0 0 0 9.65 3.94L9.8 3.61A2 2 0 1 1 14.2 3.61L14.35 3.94A1.65 1.65 0 0 0 15.83 4.48L16.08 4.4A2 2 0 1 1 19.08 7.4L19 7.65A1.65 1.65 0 0 0 19.4 9L19.66 9.2A2 2 0 1 1 19.66 14.8Z"/>
  </svg>
</template>

<style scoped>
  .base-icon-settings {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
