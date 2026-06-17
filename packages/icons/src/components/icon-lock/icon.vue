<script lang="ts" setup>
  import { useIconSize } from '../../use-icon-size.ts';

  const props = withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
      ariaLabel?: string;
      /** When true the shackle is raised to show an unlocked state. */
      open?: boolean;
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      ariaLabel: undefined,
      open: false,
    },
  );

  const sizeValue = useIconSize(() => props.size);
</script>

<template>
  <svg
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel"
    :class="{ 'base-icon-lock--open': open }"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-lock"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      height="11"
      rx="2"
      ry="2"
      width="18"
      x="3"
      y="11"
    />
    <path
      class="base-icon-lock__shackle"
      d="M7 11V7A5 5 0 0 1 17 7V11"
    />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
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
  }
</style>
