<script setup lang="ts">
  import { useId } from '../../composables/useId'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export type SwitchSize = 'sm' | 'md' | 'lg'

  const props = withDefaults(
    defineProps<{
      modelValue?: boolean
      label?: string
      ariaLabel?: string
      hint?: string
      error?: string
      size?: SwitchSize
      disabled?: boolean
      id?: string
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
  )

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    change: [event: Event]
  }>()

  const { id: resolvedId } = useId(props.id)

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.checked)
    emit('change', event)
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
          type="checkbox"
          role="switch"
          :checked="modelValue"
          :disabled="disabled"
          :aria-label="!label ? ariaLabel : undefined"
          :aria-checked="modelValue"
          :aria-invalid="!!error || undefined"
          :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
          class="base-switch__input"
          @change="handleChange"
        />
        <span class="base-switch__track" aria-hidden="true">
          <span class="base-switch__thumb" />
        </span>
      </span>
      <span v-if="label" class="base-switch__label">
        <BaseTypography variant="body-md" as="span" color="primary">{{ label }}</BaseTypography>
      </span>
    </label>
    <BaseTypography v-if="error" :id="`${resolvedId}-error`" variant="caption" as="p" color="inherit" class="base-switch__error" role="alert">{{ error }}</BaseTypography>
    <BaseTypography v-else-if="hint" :id="`${resolvedId}-hint`" variant="caption" as="p" color="secondary" class="base-switch__hint">{{ hint }}</BaseTypography>
  </div>
</template>

<style scoped lang="scss">
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
          transform: translateX(var(--_thumb-translate));
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

    // Sizes
    &--sm {
      --_thumb-translate: 16px;

      .base-switch__track {
        width: 32px;
        height: 18px;
        padding: 2px;
      }

      .base-switch__thumb {
        width: 14px;
        height: 14px;
      }

      // label typography handled by BaseTypography
    }

    &--md {
      --_thumb-translate: 20px;

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
      --_thumb-translate: 26px;

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
      // typography handled by BaseTypography
    }

    // States
    &--error {
      .base-switch__track {
        outline: 1px solid var(--mp-color-danger-default);
      }
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
