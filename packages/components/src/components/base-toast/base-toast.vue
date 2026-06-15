<script lang="ts" setup>
  /**
   * `BaseToast` — A single toast notification card for the Mission Platform UI.
   *
   * Presentational item rendered by `BaseToastContainer` for each entry in the
   * `useToast` store, but also usable standalone. Shows an intent icon, an
   * optional title, the message, and an optional dismiss button.
   *
   * Accessibility:
   * - Renders `role="alert"` (assertive) for `error` / `warning` variants and
   *   `role="status"` (polite) otherwise.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import type { ToastVariant } from '../../composables/use-toast';

  const props = withDefaults(
    defineProps<{
      /** Intent / colour treatment. Defaults to `'info'`. */
      variant?: ToastVariant;
      /** Bold title rendered above the message. */
      title?: string;
      /** The message text (overridden by the default slot). */
      message?: string;
      /** Whether to render a dismiss button. Defaults to `true`. */
      dismissible?: boolean;
      /** Accessible label for the dismiss button. Defaults to `'Dismiss'`. */
      dismissLabel?: string;
    }>(),
    {
      variant: 'info',
      title: undefined,
      message: undefined,
      dismissible: true,
      dismissLabel: 'Dismiss',
    },
  );

  const emit = defineEmits<{
    /** Emitted when the dismiss button is pressed. */
    dismiss: [];
  }>();

  /**
   * Slots:
   * @slot default — the message body (overrides the `message` prop).
   * @slot icon — overrides the built-in status icon.
   */
  defineSlots<{
    default?: (props: Record<string, never>) => unknown;
    icon?: (props: Record<string, never>) => unknown;
  }>();

  const role = computed(() => (props.variant === 'error' || props.variant === 'warning' ? 'alert' : 'status'));
  const ariaLive = computed(() => (role.value === 'alert' ? 'assertive' : 'polite'));
</script>

<template>
  <div
    :aria-live="ariaLive"
    :class="['base-toast', `base-toast--${variant}`]"
    :role="role"
  >
    <span
      aria-hidden="true"
      class="base-toast__icon"
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
    <div class="base-toast__content">
      <p
        v-if="title"
        class="base-toast__title"
      >
        {{ title }}
      </p>
      <div class="base-toast__message">
        <slot>{{ message }}</slot>
      </div>
    </div>
    <button
      v-if="dismissible"
      :aria-label="dismissLabel"
      class="base-toast__dismiss"
      type="button"
      @click="emit('dismiss')"
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
  .base-toast {
    display: flex;
    align-items: flex-start;
    gap: var(--mp-spacing-3);
    width: 100%;
    max-width: 24rem;
    padding: var(--mp-spacing-3) var(--mp-spacing-4);
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-left-width: 4px;
    border-radius: var(--mp-radius-md);
    box-shadow: var(--mp-shadow-lg);
    color: var(--mp-color-text-primary);
    font-family: var(--mp-font-family-sans);
    pointer-events: auto;

    &__icon {
      display: flex;
      flex-shrink: 0;
      margin-top: 1px;
    }

    &__content {
      flex: 1 1 auto;
      min-width: 0;
    }

    &__title {
      margin: 0 0 var(--mp-spacing-1);
      font-size: var(--mp-size-font-sm);
      font-weight: var(--mp-font-weight-semibold, 600);
    }

    &__message {
      font-size: var(--mp-size-font-sm);
      color: var(--mp-color-text-secondary);
      overflow-wrap: break-word;
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
      color: var(--mp-color-text-tertiary);
      cursor: pointer;
      transition: color 150ms ease;

      &:hover {
        color: var(--mp-color-text-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 1px;
      }
    }

    /* Variants — accent the icon and left border. */
    &--info {
      border-left-color: var(--mp-color-information-default);

      .base-toast__icon {
        color: var(--mp-color-information-default);
      }
    }

    &--success {
      border-left-color: var(--mp-color-success-default);

      .base-toast__icon {
        color: var(--mp-color-success-default);
      }
    }

    &--warning {
      border-left-color: var(--mp-color-warning-default);

      .base-toast__icon {
        color: var(--mp-color-warning-default);
      }
    }

    &--error {
      border-left-color: var(--mp-color-error-default);

      .base-toast__icon {
        color: var(--mp-color-error-default);
      }
    }

    &--neutral {
      border-left-color: var(--mp-color-border-strong);

      .base-toast__icon {
        color: var(--mp-color-text-secondary);
      }
    }
  }
</style>
