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
    :aria-label="ariaLabel ?? 'Remove Table Column'"
    :aria-hidden="!ariaLabel"
    role="img"
    class="base-icon-table-column-remove"
  >
    <path d="M3 3h10v18H3z"/><line x1="3" y1="9" x2="13" y2="9"/><line x1="3" y1="15" x2="13" y2="15"/><line x1="16" y1="12" x2="22" y2="12"/><line x1="16" y1="9" x2="13" y2="18"/>
  </svg>
</template>

<style scoped>
  .base-icon-table-column-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
