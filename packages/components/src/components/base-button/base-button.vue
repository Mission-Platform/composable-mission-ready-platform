<script lang="ts" setup>
  /**
   * `BaseButton` is the foundational interactive element of the Mission Platform UI.
   *
   * It renders a native `<button>` with consistent theming, sizing, focus-visible
   * outlines, disabled / loading states, and a built-in accessible loading spinner.
   * Use the default slot for the button label and/or leading/trailing icons.
   *
   * Accessibility:
   * - Sets `aria-busy` while `loading` is true.
   * - The spinner exposes an `aria-label` localised via `vue-i18n` (`loading` key).
   * - When `disabled` or `loading`, the native `disabled` attribute is applied and
   *   click events are suppressed.
   *
   * @example
   * ```html
   * <BaseButton variant="primary" size="md" @click="onSave">Save</BaseButton>
   * ```
   */
  import { useI18n } from '@mission-platform/i18n';

  /** Visual treatment of the button. */
  export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'default'
    | 'success'
    | 'warning'
    | 'information'
    | 'error'
    | 'critical';
  /** Size token applied to padding and font-size. */
  export type ButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      /** Visual treatment. Defaults to `'primary'`. */
      variant?: ButtonVariant;
      /** Size token controlling padding and font-size. Defaults to `'md'`. */
      size?: ButtonSize;
      /** Whether the button is non-interactive. Suppresses `click` and applies the native `disabled` attribute. */
      disabled?: boolean;
      /** Shows the spinner, sets `aria-busy`, and suppresses `click`. */
      loading?: boolean;
      /** Native `type` attribute. Defaults to `'button'` to avoid accidental form submissions. */
      type?: 'button' | 'submit' | 'reset';
    }>(),
    {
      variant: 'primary',
      size: 'md',
      disabled: false,
      loading: false,
      type: 'button',
    },
  );

  const emit = defineEmits<{
    /** Emitted on a real user click. Suppressed while `disabled` or `loading`. */
    click: [event: MouseEvent];
  }>();

  /**
   * Default slot — button label and/or icon content.
   * @slot default
   */
  defineSlots<{
    default(props: Record<string, never>): unknown;
  }>();

  const { t } = useI18n({ useScope: 'local' });

  function handleClick(event: MouseEvent) {
    if (!props.disabled && !props.loading) {
      emit('click', event);
    }
  }
</script>

<template>
  <button
    :aria-busy="loading"
    :class="['base-button', `base-button--${variant}`, `base-button--${size}`, { 'base-button--loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
  >
    <span
      v-if="loading"
      :aria-label="t('loading')"
      aria-atomic="false"
      aria-live="off"
      class="base-button__spinner"
      role="status"
    />
    <slot />
  </button>
</template>

<style lang="scss" scoped>
  .base-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--mp-spacing-2);
    border: 1px solid transparent;
    border-radius: var(--mp-radius-md);
    font-family: var(--mp-font-family-sans);
    font-weight: var(--mp-font-weight-medium);
    line-height: var(--mp-line-height-tight);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      box-shadow 150ms ease,
      opacity 150ms ease;
    white-space: nowrap;
    user-select: none;

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} {
        padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
        font-size: var(--mp-size-font-#{$size});
      }
    }

    /* Variants */

    /* Solid fill (high emphasis) for brand / intent treatments. */
    @mixin solid($family) {
      background-color: var(--mp-color-#{$family}-default);
      color: var(--mp-color-text-on-primary);

      &:hover:not(:disabled) {
        background-color: var(--mp-color-#{$family}-hover);
      }

      &:active:not(:disabled) {
        background-color: var(--mp-color-#{$family}-active, var(--mp-color-#{$family}-hover));
      }
    }

    &--primary {
      @include solid('primary');
    }

    &--default {
      @include solid('default');
    }

    &--success {
      @include solid('success');
    }

    &--warning {
      @include solid('warning');
    }

    &--information {
      @include solid('information');
    }

    &--error {
      @include solid('error');

      &:focus-visible {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    &--critical {
      @include solid('critical');

      &:focus-visible {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    /* Secondary — outlined (medium emphasis). */
    &--secondary {
      background-color: var(--mp-color-bg-surface);
      border-color: var(--mp-color-border-default);
      color: var(--mp-color-text-primary);

      &:hover:not(:disabled) {
        background-color: var(--mp-color-bg-muted);
        border-color: var(--mp-color-border-strong);
      }

      &:active:not(:disabled) {
        background-color: var(--mp-color-bg-sunken);
      }
    }

    /* Tertiary — ghost / transparent (low emphasis). */
    &--tertiary {
      background-color: transparent;
      color: var(--mp-color-text-primary);

      &:hover:not(:disabled) {
        background-color: var(--mp-color-bg-muted);
      }

      &:active:not(:disabled) {
        background-color: var(--mp-color-bg-sunken);
      }
    }

    /* Loading spinner */
    &--loading {
      pointer-events: none;
    }

    &__spinner {
      width: 1em;
      height: 1em;
      border: 2px solid currentcolor;
      border-top-color: transparent;
      border-radius: var(--mp-radius-full);
      animation: mp-spin 0.6s linear infinite;
      flex-shrink: 0;
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
