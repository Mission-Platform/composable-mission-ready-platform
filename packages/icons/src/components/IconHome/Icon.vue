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
    class="base-icon-home"
  >
    <path d="M3 9L12 2L21 9V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20Z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
</template>

<style scoped>
  .base-icon-home {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
