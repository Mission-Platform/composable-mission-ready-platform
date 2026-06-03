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
    class="base-icon-split"
  >
    <line x1="3" y1="12" x2="10" y2="12"/>
    <line x1="14" y1="12" x2="21" y2="12"/>
    <circle cx="12" cy="12" r="2" :fill="color" stroke="none"/>
    <line x1="12" y1="5" x2="12" y2="9" stroke-dasharray="2,2"/>
    <line x1="12" y1="15" x2="12" y2="19" stroke-dasharray="2,2"/>
  </svg>
</template>

<style scoped>
  .base-icon-split {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
