<script lang="ts" setup>
  import { computed } from 'vue';

  import { useIconSize } from '../../use-icon-size.ts';

  export type IconDirection = 'up' | 'right' | 'down' | 'left';

  const props = withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
      direction?: IconDirection;
      ariaLabel?: string;
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      direction: 'down',
      ariaLabel: undefined,
    },
  );

  const sizeValue = useIconSize(() => props.size);

  const rotationMap: Record<IconDirection, number> = {
    up: 180,
    right: 270,
    down: 0,
    left: 90,
  };

  const transform = computed(() => `rotate(${rotationMap[props.direction]}deg)`);
</script>

<template>
  <svg
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel ?? `Chevron ${direction}`"
    :height="sizeValue"
    :stroke="color"
    :style="{ transform: transform, transition: 'transform 200ms ease' }"
    :width="sizeValue"
    class="base-icon-chevron"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 9L12 15L18 9" />
  </svg>
</template>

<style scoped>
  .base-icon-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
