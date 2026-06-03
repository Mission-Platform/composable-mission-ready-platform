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
    class="base-icon-scale-down"
  >
    <polyline points="3,9 3,3 9,3"/>
    <polyline points="15,21 21,21 21,15"/>
    <polyline points="9,3 3,3 3,9"/>
    <polyline points="21,9 21,3 15,3"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <line x1="3" y1="3" x2="10" y2="10"/>
    <line x1="21" y1="21" x2="14" y2="14"/>
  </svg>
</template>

<style scoped>
  .base-icon-scale-down {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
