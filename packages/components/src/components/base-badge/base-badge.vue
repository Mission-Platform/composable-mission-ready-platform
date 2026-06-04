<script lang="ts" setup>
  import BaseTypography from '../base-typography/base-typography.vue';

  export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  export type BadgeSize = 'sm' | 'md';

  withDefaults(
    defineProps<{
      variant?: BadgeVariant;
      size?: BadgeSize;
      pill?: boolean;
    }>(),
    {
      variant: 'neutral',
      size: 'md',
      pill: false,
    },
  );
</script>

<template>
  <span :class="['base-badge', `base-badge--${variant}`, `base-badge--${size}`, { 'base-badge--pill': pill }]">
    <BaseTypography
      as="span"
      color="inherit"
      variant="caption"
      weight="medium"
    >
      <slot />
    </BaseTypography>
  </span>
</template>

<style lang="scss" scoped>
  .base-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-1);
    border-radius: var(--mp-radius-sm);
    font-family: var(--mp-font-family-sans);
    line-height: var(--mp-line-height-tight);
    white-space: nowrap;

    &--pill {
      border-radius: var(--mp-radius-full);
    }

    /* Sizes */
    &--sm {
      padding: 2px var(--mp-spacing-2);
    }

    &--md {
      padding: var(--mp-spacing-1) var(--mp-spacing-3);
    }

    /* Variants */
    &--neutral {
      background-color: var(--mp-color-bg-muted);
      color: var(--mp-color-text-secondary);
    }

    &--primary {
      background-color: var(--mp-color-primary-muted);
      color: var(--mp-color-primary-text);
    }

    &--success {
      background-color: var(--mp-color-success-muted);
      color: var(--mp-color-success-text);
    }

    &--warning {
      background-color: var(--mp-color-warning-muted);
      color: var(--mp-color-warning-text);
    }

    &--danger {
      background-color: var(--mp-color-danger-muted);
      color: var(--mp-color-danger-text);
    }

    &--info {
      background-color: var(--mp-color-info-muted);
      color: var(--mp-color-info-text);
    }
  }
</style>
