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
    class="base-icon-draw-circle"
  >
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="1.5" :fill="color" stroke="none"/>
    <circle cx="21" cy="12" r="1.5" :fill="color" stroke="none"/>
    <line x1="12" y1="12" x2="21" y2="12" stroke-dasharray="3,2"/>
  </svg>
</template>

<style scoped>
  .base-icon-draw-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
