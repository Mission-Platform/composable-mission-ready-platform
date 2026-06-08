<script lang="ts" setup>
  /**
   * `BaseSkeleton` — Skeleton component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  export type SkeletonShape = 'line' | 'circle' | 'block';

  withDefaults(
    defineProps<{
      shape?: SkeletonShape;
      width?: string;
      height?: string;
      animated?: boolean;
    }>(),
    {
      shape: 'line',
      width: undefined,
      height: undefined,
      animated: true,
    },
  );
</script>

<template>
  <span
    :class="['base-skeleton', `base-skeleton--${shape}`, { 'base-skeleton--animated': animated }]"
    :style="{ width: width, height: height }"
    aria-hidden="true"
  />
</template>

<style lang="scss" scoped>
  .base-skeleton {
    display: block;
    background-color: var(--mp-color-bg-muted);
    border-radius: var(--mp-radius-sm);
    position: relative;
    overflow: hidden;

    &--animated::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, var(--mp-color-skeleton-shimmer) 50%, transparent 100%);
      animation: mp-skeleton-shimmer 1.6s ease-in-out infinite;
    }

    /* Shapes */
    &--line {
      width: 100%;
      height: 1em;
      border-radius: var(--mp-radius-sm);
    }

    &--circle {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--mp-radius-full);
    }

    &--block {
      width: 100%;
      height: 8rem;
      border-radius: var(--mp-radius-md);
    }
  }

  @keyframes mp-skeleton-shimmer {
    0% {
      transform: translateX(-100%);
    }

    100% {
      transform: translateX(100%);
    }
  }
</style>
