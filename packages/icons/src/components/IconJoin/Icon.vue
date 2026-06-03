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
    class="base-icon-join"
  >
    <line x1="3" y1="12" x2="10" y2="12"/>
    <line x1="14" y1="12" x2="21" y2="12"/>
    <circle cx="12" cy="12" r="2" :fill="color" stroke="none"/>
    <polyline points="9,9 12,12 9,15"/>
    <polyline points="15,9 12,12 15,15"/>
  </svg>
</template>

<style scoped>
  .base-icon-join {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
