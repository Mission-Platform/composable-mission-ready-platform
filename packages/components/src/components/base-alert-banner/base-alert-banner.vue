<script lang="ts" setup>
  /**
   * `BaseAlertBanner` — Inline alert / notification banner for the Mission
   * Platform UI.
   *
   * Communicates contextual feedback (informational, success, warning, error,
   * or neutral) with an optional title, status icon, dismiss button, and an
   * actions slot.
   *
   * Accessibility:
   * - Renders `role="alert"` (assertive) for `warning` / `error` variants and
   *   `role="status"` (polite) otherwise.
   * - The dismiss button exposes an accessible label.
   *
   * The banner is shown/hidden via the `modelValue` prop (`v-model`). When
   * dismissed it emits `update:modelValue=false` and `dismiss`.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  /** Intent / colour treatment of the banner. */
  export type AlertBannerVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

  const props = withDefaults(
    defineProps<{
      /** Controls visibility (`v-model`). Defaults to `true`. */
      modelValue?: boolean;
      /** Intent / colour treatment. Defaults to `'info'`. */
      variant?: AlertBannerVariant;
      /** Bold title rendered above the message. */
      title?: string;
      /** Whether to render a dismiss (close) button. */
      dismissible?: boolean;
      /** Whether to render the built-in status icon. Defaults to `true`. */
      icon?: boolean;
      /** Accessible label for the dismiss button. Defaults to `'Dismiss'`. */
      dismissLabel?: string;
    }>(),
    {
      modelValue: true,
      variant: 'info',
      title: undefined,
      dismissible: false,
      icon: true,
      dismissLabel: 'Dismiss',
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    /** Emitted when the dismiss button is pressed. */
    dismiss: [];
  }>();

  /**
   * Slots:
   * @slot default — the banner message.
   * @slot icon — overrides the built-in status icon.
   * @slot actions — a row of actions rendered after the message.
   */
  defineSlots<{
    default?: (props: Record<string, never>) => unknown;
    icon?: (props: Record<string, never>) => unknown;
    actions?: (props: Record<string, never>) => unknown;
  }>();

  const role = computed(() => (props.variant === 'error' || props.variant === 'warning' ? 'alert' : 'status'));
  const ariaLive = computed(() => (role.value === 'alert' ? 'assertive' : 'polite'));

  function dismiss(): void {
    emit('update:modelValue', false);
    emit('dismiss');
  }
</script>

<template>
  <div
    v-if="modelValue"
    :aria-live="ariaLive"
    :class="['base-alert-banner', `base-alert-banner--${variant}`]"
    :role="role"
  >
    <span
      v-if="icon"
      aria-hidden="true"
      class="base-alert-banner__icon"
    >
      <slot name="icon">
        <svg
          fill="none"
          height="20"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <template v-if="variant === 'success'">
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path d="m9 12 2 2 4-4" />
          </template>
          <template v-else-if="variant === 'error'">
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </template>
          <template v-else-if="variant === 'warning'">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </template>
          <template v-else>
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </template>
        </svg>
      </slot>
    </span>
    <div class="base-alert-banner__content">
      <BaseTypography
        v-if="title"
        as="p"
        class="base-alert-banner__title"
        color="inherit"
        variant="body-sm"
        weight="semibold"
      >
        {{ title }}
      </BaseTypography>
      <BaseTypography
        v-if="$slots.default"
        as="div"
        class="base-alert-banner__message"
        color="inherit"
        variant="body-sm"
      >
        <slot />
      </BaseTypography>
      <div
        v-if="$slots.actions"
        class="base-alert-banner__actions"
      >
        <slot name="actions" />
      </div>
    </div>
    <button
      v-if="dismissible"
      :aria-label="dismissLabel"
      class="base-alert-banner__dismiss"
      type="button"
      @click="dismiss"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
  .base-alert-banner {
    display: flex;
    align-items: flex-start;
    gap: var(--mp-spacing-3);
    padding: var(--mp-spacing-3) var(--mp-spacing-4);
    border: 1px solid transparent;
    border-radius: var(--mp-radius-md);
    font-family: var(--mp-font-family-sans);

    &__icon {
      display: flex;
      flex-shrink: 0;
      margin-top: 1px;
    }

    &__content {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);
      min-width: 0;
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--mp-spacing-2);
      margin-top: var(--mp-spacing-2);
    }

    &__dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: var(--mp-spacing-1);
      margin: calc(var(--mp-spacing-1) * -1);
      background: transparent;
      border: 0;
      border-radius: var(--mp-radius-sm);
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 150ms ease;

      &:hover {
        opacity: 1;
      }

      &:focus-visible {
        outline: 2px solid currentcolor;
        outline-offset: 1px;
      }
    }

    /* Variants */
    @mixin tone($family) {
      background-color: var(--mp-color-#{$family}-muted);
      border-color: var(--mp-color-#{$family}-subtle);
      color: var(--mp-color-#{$family}-text);
    }

    &--info {
      @include tone('information');
    }

    &--success {
      @include tone('success');
    }

    &--warning {
      @include tone('warning');
    }

    &--error {
      @include tone('error');
    }

    &--neutral {
      @include tone('default');
    }
  }
</style>
