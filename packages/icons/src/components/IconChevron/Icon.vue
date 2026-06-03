<script setup lang="ts">
  import { computed } from 'vue'
  import { useIconSize } from '../../useIconSize.ts'

  export type IconDirection = 'up' | 'right' | 'down' | 'left'

  const props = withDefaults(
    defineProps<{
      size?: number | string
      color?: string
      direction?: IconDirection
      ariaLabel?: string
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      direction: 'down',
      ariaLabel: undefined,
    },
  )

  const sizeValue = useIconSize(() => props.size)

  const rotationMap: Record<IconDirection, number> = {
    up: 180,
    right: 270,
    down: 0,
    left: 90,
  }

  const transform = computed(() => `rotate(${rotationMap[props.direction]}deg)`)
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
    :style="{ transform: transform, transition: 'transform 200ms ease' }"
    :aria-label="ariaLabel ?? `Chevron ${direction}`"
    :aria-hidden="!ariaLabel"
    role="img"
    class="base-icon-chevron"
  >
    <path d="M6 9L12 15L18 9"/>
  </svg>
</template>

<style scoped>
  .base-icon-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
