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
    class="base-icon-draw-polygon"
  >
    <polygon points="12,3 21,9 18,20 6,20 3,9"/>
    <circle cx="12" cy="3" r="1.5" :fill="color" stroke="none"/>
    <circle cx="21" cy="9" r="1.5" :fill="color" stroke="none"/>
    <circle cx="18" cy="20" r="1.5" :fill="color" stroke="none"/>
    <circle cx="6" cy="20" r="1.5" :fill="color" stroke="none"/>
    <circle cx="3" cy="9" r="1.5" :fill="color" stroke="none"/>
  </svg>
</template>

<style scoped>
  .base-icon-draw-polygon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
