<script setup lang="ts">
  import { computed } from 'vue'
  import { useIconSize } from '../../useIconSize.ts'

  export type IconArrowDirection = 'up' | 'right' | 'down' | 'left'

  const props = withDefaults(
    defineProps<{
      size?: number | string
      color?: string
      direction?: IconArrowDirection
      ariaLabel?: string
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      direction: 'up',
      ariaLabel: undefined,
    },
  )

  const sizeValue = useIconSize(() => props.size)

  const rotationMap: Record<IconArrowDirection, number> = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
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
    :aria-label="ariaLabel ?? `Arrow ${direction}`"
    :aria-hidden="!ariaLabel"
    role="img"
    class="base-icon-arrow"
  >
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/>
  </svg>
</template>

<style scoped>
  .base-icon-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
