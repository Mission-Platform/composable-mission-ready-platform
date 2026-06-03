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
    class="base-icon-draw-square"
  >
    <rect x="3" y="3" width="18" height="18" rx="1"/>
    <circle cx="3" cy="3" r="1.5" :fill="color" stroke="none"/>
    <circle cx="21" cy="3" r="1.5" :fill="color" stroke="none"/>
    <circle cx="21" cy="21" r="1.5" :fill="color" stroke="none"/>
    <circle cx="3" cy="21" r="1.5" :fill="color" stroke="none"/>
  </svg>
</template>

<style scoped>
  .base-icon-draw-square {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
