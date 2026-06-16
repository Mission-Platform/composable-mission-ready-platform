<script lang="ts" setup>
  /**
   * `BaseIconButton` is a compact, square, icon-only button for the Mission Platform UI.
   *
   * It renders a native `<button>` with consistent theming, sizing, focus-visible
   * outlines, and a disabled state. Use it for icon-only affordances such as the
   * close control in dialog / modal / sidebar headers, toolbar actions, or chip
   * removal — anywhere a label would be visually redundant.
   *
   * Because the button has no visible text, an accessible name is **required**:
   * pass it via the `label` prop, which is applied as `aria-label`. Place the icon
   * (typically from `@mission-platform/icons`) in the default slot.
   *
   * Accessibility:
   * - `label` is required and rendered as `aria-label` so assistive tech announces a name.
   * - When `disabled`, the native `disabled` attribute is applied and `click` is suppressed.
   *
   * @example
   * ```html
   * <BaseIconButton label="Close" variant="ghost" @click="onClose">
   *   <IconClose size="md" />
   * </BaseIconButton>
   * ```
   */

  /** Visual treatment of the icon button. */
  export type IconButtonVariant = 'ghost' | 'primary' | 'secondary' | 'danger';
  /** Size token controlling the square padding. */
  export type IconButtonSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** Accessible name, applied as `aria-label`. Required because the button is icon-only. */
      label: string;
      /** Visual treatment. Defaults to `'ghost'`. */
      variant?: IconButtonVariant;
      /** Size token controlling the square padding. Defaults to `'md'`. */
      size?: IconButtonSize;
      /** Whether the button is non-interactive. Suppresses `click` and applies the native `disabled` attribute. */
      disabled?: boolean;
      /** Native `type` attribute. Defaults to `'button'` to avoid accidental form submissions. */
      type?: 'button' | 'submit' | 'reset';
    }>(),
    {
      variant: 'ghost',
      size: 'md',
      disabled: false,
      type: 'button',
    },
  );

  const emit = defineEmits<{
    /** Emitted on a real user click. Suppressed while `disabled`. */
    click: [event: MouseEvent];
  }>();

  /**
   * Default slot — the icon to render inside the button.
   * @slot default
   */
  defineSlots<{
    default(props: Record<string, never>): unknown;
  }>();

  function handleClick(event: MouseEvent) {
    if (!props.disabled) {
      emit('click', event);
    }
  }
</script>

<template>
  <button
    :aria-label="label"
    :class="['base-icon-button', `base-icon-button--${variant}`, `base-icon-button--${size}`]"
    :disabled="disabled"
    :type="type"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: var(--mp-radius-sm);
      background: transparent;
      color: var(--mp-color-text-secondary);
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background-color 150ms ease,
        border-color 150ms ease,
        color 150ms ease,
        box-shadow 150ms ease,
        opacity 150ms ease;

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      /* Sizes — square padding. */
      &--sm {
        padding: var(--mp-spacing-1);
      }

      &--md {
        padding: var(--mp-spacing-2);
      }

      &--lg {
        padding: var(--mp-spacing-3);
      }

      /* Variants */

      /* Ghost — transparent, the default toolbar / close affordance. */
      &--ghost {
        &:hover:not(:disabled) {
          background-color: var(--mp-color-bg-muted);
          color: var(--mp-color-text-primary);
        }

        &:active:not(:disabled) {
          background-color: var(--mp-color-bg-sunken);
        }
      }

      /* Primary — solid brand fill. */
      &--primary {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);

        &:hover:not(:disabled) {
          background-color: var(--mp-color-primary-hover);
        }

        &:active:not(:disabled) {
          background-color: var(--mp-color-primary-active, var(--mp-color-primary-hover));
        }
      }

      /* Secondary — outlined (medium emphasis). */
      &--secondary {
        border-color: var(--mp-color-border-default);
        background-color: var(--mp-color-bg-surface);
        color: var(--mp-color-text-primary);

        &:hover:not(:disabled) {
          background-color: var(--mp-color-bg-muted);
          border-color: var(--mp-color-border-strong);
        }

        &:active:not(:disabled) {
          background-color: var(--mp-color-bg-sunken);
        }
      }

      /* Danger — destructive icon action. */
      &--danger {
        color: var(--mp-color-error-default);

        &:focus-visible {
          box-shadow: var(--mp-shadow-focus-danger);
        }

        &:hover:not(:disabled) {
          background-color: var(--mp-color-error-default);
          color: var(--mp-color-text-on-primary);
        }
      }
    }
  }
</style>
