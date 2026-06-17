<script lang="ts" setup>
  /**
   * `BaseBadge` — Badge component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';

  export type BadgeVariant =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'default'
    | 'success'
    | 'warning'
    | 'information'
    | 'error'
    | 'critical';
  export type BadgeSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  withDefaults(
    defineProps<{
      variant?: BadgeVariant;
      size?: BadgeSize;
      pill?: boolean;
    }>(),
    {
      variant: 'default',
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
  @layer mp.components {
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

      /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
      @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
        &--#{$size} {
          padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
          font-size: var(--mp-size-font-#{$size});
        }
      }

      /* Variants */
      @mixin tone($family) {
        background-color: var(--mp-color-#{$family}-muted);
        color: var(--mp-color-#{$family}-text);
      }

      &--default {
        @include tone('default');
      }

      &--primary {
        @include tone('primary');
      }

      &--secondary {
        @include tone('secondary');
      }

      &--tertiary {
        @include tone('tertiary');
      }

      &--success {
        @include tone('success');
      }

      &--warning {
        @include tone('warning');
      }

      &--information {
        @include tone('information');
      }

      &--error {
        @include tone('error');
      }

      &--critical {
        @include tone('critical');
      }
    }
  }
</style>
