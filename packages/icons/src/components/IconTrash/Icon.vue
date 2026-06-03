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
    class="base-icon-trash"
  >
    <polyline points="3,6 5,6 21,6"/><path d="M19 6L18.149 19.148A2 2 0 0 1 16.154 21H7.846A2 2 0 0 1 5.851 19.148L5 6"/><path d="M10 11V17"/><path d="M14 11V17"/><path d="M9 6V4A1 1 0 0 1 10 3H14A1 1 0 0 1 15 4V6"/>
  </svg>
</template>

<style scoped>
  .base-icon-trash {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
