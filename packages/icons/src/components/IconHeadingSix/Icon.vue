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
    :aria-label="ariaLabel ?? 'Heading 6'"
    :aria-hidden="!ariaLabel"
    role="img"
    class="base-icon-heading-six"
  >
    <line x1="4" y1="6" x2="4" y2="18"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="4" y1="12" x2="12" y2="12"/><text x="16" y="18" font-size="8" font-family="sans-serif" fill="currentColor" stroke="none">6</text>
  </svg>
</template>

<style scoped>
  .base-icon-heading-six {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
