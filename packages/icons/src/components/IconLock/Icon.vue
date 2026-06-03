<script setup lang="ts">
  import { useIconSize } from '../../useIconSize.ts'

  const props = withDefaults(
    defineProps<{
      size?: number | string
      color?: string
      ariaLabel?: string
      /** When true the shackle is raised to show an unlocked state. */
      open?: boolean
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      ariaLabel: undefined,
      open: false,
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
    class="base-icon-lock"
    :class="{ 'base-icon-lock--open': open }"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path class="base-icon-lock__shackle" d="M7 11V7A5 5 0 0 1 17 7V11"/>
  </svg>
</template>

<style scoped>
  .base-icon-lock {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
    overflow: visible;
  }

  .base-icon-lock__shackle {
    transform-origin: 7px 11px;
    transform: rotate(0deg) translateY(0);
  }

  @media (prefers-reduced-motion: no-preference) {
    .base-icon-lock__shackle {
      transition: transform 0.3s ease;
    }
  }

  .base-icon-lock--open .base-icon-lock__shackle {
    transform: rotate(-20deg) translateY(-3px);
  }
</style>
