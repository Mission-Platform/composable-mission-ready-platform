<script lang="ts" setup>
  /**
   * `BaseSwitch` — Switch component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useId } from '../../composables/use-id';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type SwitchSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      modelValue?: boolean;
      label?: string;
      ariaLabel?: string;
      hint?: string;
      error?: string;
      size?: SwitchSize;
      disabled?: boolean;
      id?: string;
    }>(),
    {
      modelValue: false,
      label: undefined,
      ariaLabel: undefined,
      hint: undefined,
      error: undefined,
      size: 'md',
      disabled: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    change: [event: Event];
  }>();

  const { id: resolvedId } = useId(props.id);

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.checked);
    emit('change', event);
  }
</script>

<template>
  <div
    :class="[
      'base-switch',
      `base-switch--${size}`,
      { 'base-switch--error': !!error, 'base-switch--disabled': disabled },
    ]"
  >
    <label class="base-switch__row">
      <span class="base-switch__track-wrapper">
        <input
          :id="resolvedId"
          :aria-checked="modelValue"
          :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
          :aria-invalid="!!error || undefined"
          :aria-label="!label ? ariaLabel : undefined"
          :checked="modelValue"
          :disabled="disabled"
          class="base-switch__input"
          role="switch"
          type="checkbox"
          @change="handleChange"
        />
        <span
          aria-hidden="true"
          class="base-switch__track"
        >
          <span class="base-switch__thumb" />
        </span>
      </span>
      <span
        v-if="label"
        class="base-switch__label"
      >
        <BaseTypography
          as="span"
          color="primary"
          variant="body-md"
        >
          {{ label }}
        </BaseTypography>
      </span>
    </label>
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-switch__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="base-switch__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  .base-switch {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__row {
      display: inline-flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      cursor: pointer;
    }

    &__track-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    /* Sizes */
    &--sm {
      --thumb-translate: 16px;

      .base-switch__track {
        width: 32px;
        height: 18px;
        padding: 2px;
      }

      .base-switch__thumb {
        width: 14px;
        height: 14px;
      }

      /* label typography handled by BaseTypography */
    }

    &--md {
      --thumb-translate: 20px;

      .base-switch__track {
        width: 40px;
        height: 22px;
        padding: 2px;
      }

      .base-switch__thumb {
        width: 18px;
        height: 18px;
      }
    }

    &--lg {
      --thumb-translate: 26px;

      .base-switch__track {
        width: 52px;
        height: 28px;
        padding: 3px;
      }

      .base-switch__thumb {
        width: 22px;
        height: 22px;
      }
    }

    &__label {
      /* typography handled by BaseTypography */
    }

    /* States */
    &--error {
      .base-switch__track {
        outline: 1px solid var(--mp-color-danger-default);
      }
    }

    &__input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;

      &:focus-visible ~ .base-switch__track {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:checked ~ .base-switch__track {
        background-color: var(--mp-color-primary-default);

        .base-switch__thumb {
          transform: translateX(var(--thumb-translate));
        }
      }
    }

    &__track {
      display: flex;
      align-items: center;
      background-color: var(--mp-color-border-default);
      border-radius: var(--mp-radius-full);
      transition: background-color 200ms ease;
      pointer-events: none;
    }

    &__thumb {
      display: block;
      background-color: var(--mp-color-text-on-primary);
      border-radius: 50%;
      box-shadow: var(--mp-shadow-sm);
      transition: transform 200ms ease;
      flex-shrink: 0;
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-switch__row {
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
    }

    &__hint {
      margin: 0;
    }
  }
</style>
