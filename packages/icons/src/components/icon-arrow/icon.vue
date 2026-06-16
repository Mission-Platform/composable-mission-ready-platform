<script lang="ts" setup>
  import { computed } from 'vue';

  import { useIconSize } from '../../use-icon-size.ts';

  export type IconArrowDirection = 'up' | 'right' | 'down' | 'left';

  const props = withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
      direction?: IconArrowDirection;
      ariaLabel?: string;
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      direction: 'up',
      ariaLabel: undefined,
    },
  );

  const sizeValue = useIconSize(() => props.size);

  const rotationMap: Record<IconArrowDirection, number> = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
  };

  const transform = computed(() => `rotate(${rotationMap[props.direction]}deg)`);
</script>

<template>
  <svg
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel ?? `Arrow ${direction}`"
    :height="sizeValue"
    :stroke="color"
    :style="{ transform: transform, transition: 'transform 200ms ease' }"
    :width="sizeValue"
    class="base-icon-arrow"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="12"
      x2="12"
      y1="19"
      y2="5"
    />
    <polyline points="5,12 12,5 19,12" />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
