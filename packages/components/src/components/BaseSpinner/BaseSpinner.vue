<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  export type SpinnerVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'

  withDefaults(
    defineProps<{
      size?: SpinnerSize
      variant?: SpinnerVariant
      label?: string
    }>(),
    {
      size: 'md',
      variant: 'primary',
      label: undefined,
    },
  )

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { loading: 'Loading…' } },
  })
</script>

<template>
  <span
    :class="['base-spinner', `base-spinner--${size}`, `base-spinner--${variant}`]"
    role="status"
    :aria-label="label ?? t('loading')"
  />
</template>

<style scoped lang="scss">
  .base-spinner {
    display: inline-block;
    border-style: solid;
    border-top-color: transparent;
    border-radius: var(--mp-radius-full);
    animation: mp-spin 0.65s linear infinite;
    flex-shrink: 0;

    // Sizes
    &--xs { width: 12px; height: 12px; border-width: 2px; }
    &--sm { width: 16px; height: 16px; border-width: 2px; }
    &--md { width: 24px; height: 24px; border-width: 3px; }
    &--lg { width: 36px; height: 36px; border-width: 3px; }
    &--xl { width: 48px; height: 48px; border-width: 4px; }

    // Variants
    &--primary { border-color: var(--mp-color-primary-default); border-top-color: transparent; }
    &--success { border-color: var(--mp-color-success-default); border-top-color: transparent; }
    &--danger { border-color: var(--mp-color-danger-default); border-top-color: transparent; }
    &--warning { border-color: var(--mp-color-warning-default); border-top-color: transparent; }
    &--info { border-color: var(--mp-color-info-default); border-top-color: transparent; }
    &--neutral { border-color: var(--mp-color-border-strong); border-top-color: transparent; }
  }

  @keyframes mp-spin {
    to { transform: rotate(360deg); }
  }
</style>
