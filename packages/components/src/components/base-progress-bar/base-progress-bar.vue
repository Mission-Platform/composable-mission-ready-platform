<script lang="ts" setup>
  /**
   * `BaseProgressBar` — Progress bar component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  export type ProgressVariant =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'default'
    | 'success'
    | 'warning'
    | 'information'
    | 'error'
    | 'critical';
  export type ProgressSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      value?: number;
      max?: number;
      variant?: ProgressVariant;
      size?: ProgressSize;
      label?: string;
      showLabel?: boolean;
      indeterminate?: boolean;
    }>(),
    {
      value: 0,
      max: 100,
      variant: 'primary',
      size: 'md',
      label: undefined,
      showLabel: false,
      indeterminate: false,
    },
  );

  const percent = computed(() =>
    props.indeterminate ? 0 : Math.min(100, Math.max(0, (props.value / props.max) * 100)),
  );
</script>

<template>
  <div :class="['base-progress-bar', `base-progress-bar--${size}`]">
    <div
      v-if="label || showLabel"
      class="base-progress-bar__header"
    >
      <BaseTypography
        v-if="label"
        as="span"
        class="base-progress-bar__label"
        color="primary"
        variant="body-sm"
        weight="medium"
      >
        {{ label }}
      </BaseTypography>
      <BaseTypography
        v-if="showLabel && !indeterminate"
        as="span"
        class="base-progress-bar__value"
        color="secondary"
        variant="body-sm"
      >
        {{ Math.round(percent) }}%
      </BaseTypography>
    </div>
    <progress
      :aria-label="label"
      :class="[`base-progress-bar__track--${variant}`, { 'base-progress-bar__track--indeterminate': indeterminate }]"
      :max="max"
      :value="indeterminate ? undefined : value"
      class="base-progress-bar__track"
    />
  </div>
</template>

<style lang="scss" scoped>
  .base-progress-bar {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    &__label {
      /* typography handled by BaseTypography */
    }

    &__value {
      /* typography handled by BaseTypography */
    }

    &__track {
      appearance: none;
      display: block;
      width: 100%;
      border: none;
      border-radius: var(--mp-radius-full);
      overflow: hidden;
      background-color: var(--mp-color-bg-muted);

      /* WebKit: trough */
      &::-webkit-progress-bar {
        background-color: var(--mp-color-bg-muted);
        border-radius: var(--mp-radius-full);
      }

      /* Fill per variant (WebKit + Firefox/standard pseudo-elements) */
      @mixin fill($family) {
        &--#{$family}::-webkit-progress-value {
          background-color: var(--mp-color-#{$family}-default);
          border-radius: var(--mp-radius-full);
        }

        &--#{$family}::-moz-progress-bar {
          background-color: var(--mp-color-#{$family}-default);
          border-radius: var(--mp-radius-full);
        }
      }

      @include fill('primary');
      @include fill('secondary');
      @include fill('tertiary');
      @include fill('default');
      @include fill('success');
      @include fill('warning');
      @include fill('information');
      @include fill('error');
      @include fill('critical');

      &--indeterminate {
        animation: mp-progress-indeterminate 1.5s ease-in-out infinite;
      }
    }

    /* Sizes — canonical 2xs → 2xl scale (track thickness). */
    @each $size, $height in ('2xs': 2px, 'xs': 3px, 'sm': 4px, 'md': 8px, 'lg': 12px, 'xl': 16px, '2xl': 20px) {
      &--#{$size} .base-progress-bar__track {
        height: $height;
      }
    }
  }

  @keyframes mp-progress-indeterminate {
    0% {
      transform: translateX(-100%);
    }

    100% {
      transform: translateX(300%);
    }
  }
</style>
