<script lang="ts" setup>
  /**
   * `BaseSpinner` — Spinner component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';

  export type SpinnerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  export type SpinnerVariant =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'default'
    | 'success'
    | 'warning'
    | 'information'
    | 'error'
    | 'critical';

  withDefaults(
    defineProps<{
      size?: SpinnerSize;
      variant?: SpinnerVariant;
      label?: string;
    }>(),
    {
      size: 'md',
      variant: 'primary',
      label: undefined,
    },
  );

  const { t } = useI18n({ useScope: 'local' });
</script>

<template>
  <span
    :aria-label="label ?? t('loading')"
    :class="['base-spinner', `base-spinner--${size}`, `base-spinner--${variant}`]"
    role="status"
  />
</template>

<style lang="scss" scoped>
  .base-spinner {
    display: inline-block;
    border-style: solid;
    border-top-color: transparent;
    border-radius: var(--mp-radius-full);
    animation: mp-spin 0.65s linear infinite;
    flex-shrink: 0;

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size, $border-width in ('2xs': 2px, 'xs': 2px, 'sm': 2px, 'md': 3px, 'lg': 3px, 'xl': 4px, '2xl': 4px) {
      &--#{$size} {
        width: var(--mp-size-height-#{$size});
        height: var(--mp-size-height-#{$size});
        border-width: $border-width;
      }
    }

    /* Variants */
    @mixin tone($family) {
      border-color: var(--mp-color-#{$family}-default);
      border-top-color: transparent;
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

    &--default {
      @include tone('default');
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

  @keyframes mp-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

<i18n lang="yaml">
en:
  loading: Loading…
</i18n>
