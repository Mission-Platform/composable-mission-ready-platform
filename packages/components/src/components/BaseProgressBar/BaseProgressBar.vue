<script setup lang="ts">
  import { computed } from 'vue'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export type ProgressVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info'
  export type ProgressSize = 'sm' | 'md' | 'lg'

  const props = withDefaults(
    defineProps<{
      value?: number
      max?: number
      variant?: ProgressVariant
      size?: ProgressSize
      label?: string
      showLabel?: boolean
      indeterminate?: boolean
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
  )

  const percent = computed(() =>
    props.indeterminate ? 0 : Math.min(100, Math.max(0, (props.value / props.max) * 100)),
  )
</script>

<template>
  <div :class="['base-progress-bar', `base-progress-bar--${size}`]">
    <div
      v-if="label || showLabel"
      class="base-progress-bar__header"
    >
      <BaseTypography v-if="label" variant="body-sm" weight="medium" as="span" color="primary" class="base-progress-bar__label">{{ label }}</BaseTypography>
      <BaseTypography v-if="showLabel && !indeterminate" variant="body-sm" as="span" color="secondary" class="base-progress-bar__value">{{ Math.round(percent) }}%</BaseTypography>
    </div>
    <progress
      class="base-progress-bar__track"
      :class="[
        `base-progress-bar__track--${variant}`,
        { 'base-progress-bar__track--indeterminate': indeterminate },
      ]"
      :value="indeterminate ? undefined : value"
      :max="max"
      :aria-label="label"
    />
  </div>
</template>

<style scoped lang="scss">
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
      // typography handled by BaseTypography
    }

    &__value {
      // typography handled by BaseTypography
    }

    &__track {
      appearance: none;
      display: block;
      width: 100%;
      border: none;
      border-radius: var(--mp-radius-full);
      overflow: hidden;
      background-color: var(--mp-color-bg-muted);

      // WebKit: trough
      &::-webkit-progress-bar {
        background-color: var(--mp-color-bg-muted);
        border-radius: var(--mp-radius-full);
      }

      // WebKit: fill per variant
      &--primary::-webkit-progress-value { background-color: var(--mp-color-primary-default); border-radius: var(--mp-radius-full); }
      &--success::-webkit-progress-value { background-color: var(--mp-color-success-default); border-radius: var(--mp-radius-full); }
      &--danger::-webkit-progress-value  { background-color: var(--mp-color-danger-default);  border-radius: var(--mp-radius-full); }
      &--warning::-webkit-progress-value { background-color: var(--mp-color-warning-default); border-radius: var(--mp-radius-full); }
      &--info::-webkit-progress-value    { background-color: var(--mp-color-info-default);    border-radius: var(--mp-radius-full); }

      // Firefox / standard: fill per variant
      &--primary::-moz-progress-bar { background-color: var(--mp-color-primary-default); border-radius: var(--mp-radius-full); }
      &--success::-moz-progress-bar { background-color: var(--mp-color-success-default); border-radius: var(--mp-radius-full); }
      &--danger::-moz-progress-bar  { background-color: var(--mp-color-danger-default);  border-radius: var(--mp-radius-full); }
      &--warning::-moz-progress-bar { background-color: var(--mp-color-warning-default); border-radius: var(--mp-radius-full); }
      &--info::-moz-progress-bar    { background-color: var(--mp-color-info-default);    border-radius: var(--mp-radius-full); }

      &--indeterminate {
        animation: mp-progress-indeterminate 1.5s ease-in-out infinite;
      }
    }

    // Sizes
    &--sm .base-progress-bar__track { height: 4px; }
    &--md .base-progress-bar__track { height: 8px; }
    &--lg .base-progress-bar__track { height: 12px; }
  }

  @keyframes mp-progress-indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
</style>
