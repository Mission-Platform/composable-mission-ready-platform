<script setup lang="ts">
  import { useIconSize } from '../../useIconSize.ts'

  export type SortDirection = 'asc' | 'desc' | null

  const props = withDefaults(
    defineProps<{
      size?: number | string
      color?: string
      ariaLabel?: string
      active?: boolean
      direction?: SortDirection
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      ariaLabel: undefined,
      active: false,
      direction: null,
    },
  )

  const sizeValue = useIconSize(() => props.size)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    :width="sizeValue"
    :height="sizeValue"
    :aria-label="ariaLabel"
    :aria-hidden="!ariaLabel"
    role="img"
    class="base-icon-sort"
  >
    <path
      d="M12 3l5 7H7l5-7z"
      :fill="active && direction === 'asc' ? color : 'none'"
      :stroke="color"
      stroke-width="1.5"
    />
    <path
      d="M12 21l-5-7h10l-5 7z"
      :fill="active && direction === 'desc' ? color : 'none'"
      :stroke="color"
      stroke-width="1.5"
    />
  </svg>
</template>

<style scoped>
  .base-icon-sort {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
