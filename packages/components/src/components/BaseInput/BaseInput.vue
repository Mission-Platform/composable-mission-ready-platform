<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  import { useId } from '../../composables/useId'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export type InputSize = 'sm' | 'md' | 'lg'
  export type InputType =
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'search'
    | 'tel'
    | 'url'

  const props = withDefaults(
    defineProps<{
      modelValue?: string | number
      type?: InputType
      size?: InputSize
      placeholder?: string
      label?: string
      labelHidden?: boolean
      hint?: string
      error?: string
      disabled?: boolean
      required?: boolean
      id?: string
    }>(),
    {
      modelValue: '',
      type: 'text',
      size: 'md',
      placeholder: '',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      id: undefined,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string | number]
    change: [event: Event]
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: {
      en: { required: 'required' },
    },
  })
  const { id: resolvedId } = useId(props.id)

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', props.type === 'number' ? target.valueAsNumber : target.value)
  }
</script>

<template>
  <div
    :class="['base-input', `base-input--${size}`, { 'base-input--error': !!error, 'base-input--disabled': disabled }]"
  >
    <label v-if="label" :for="resolvedId" :class="['base-input__label', { 'base-input__label--hidden': labelHidden }]">
      <BaseTypography variant="label" as="span" color="primary">{{ label }}</BaseTypography>
      <span v-if="required" class="base-input__required" :title="t('required')" aria-hidden="true">*</span>
    </label>
    <div class="base-input__wrapper">
      <slot name="prefix" />
      <input
        :id="resolvedId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        class="base-input__field"
        @input="handleInput"
        @change="emit('change', $event)"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
      <slot name="suffix" />
    </div>
    <BaseTypography v-if="error" :id="`${resolvedId}-error`" variant="caption" as="p" color="inherit" class="base-input__error" role="alert">{{ error }}</BaseTypography>
    <BaseTypography v-else-if="hint" :id="`${resolvedId}-hint`" variant="caption" as="p" color="secondary" class="base-input__hint">{{ hint }}</BaseTypography>
  </div>
</template>

<style scoped lang="scss">
  .base-input {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__label {
      // typography handled by BaseTypography

      &--hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    }

    &__required {
      color: var(--mp-color-danger-default);
      margin-left: 2px;
    }

    &__wrapper {
      display: flex;
      align-items: center;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      transition: border-color 150ms ease, box-shadow 150ms ease;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__field {
      flex: 1;
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    // Sizes
    &--sm {
      .base-input__field {
        padding: var(--mp-spacing-1) var(--mp-spacing-2);
        font-size: var(--mp-font-size-sm);
      }
    }

    &--md {
      .base-input__field {
        padding: var(--mp-spacing-2) var(--mp-spacing-3);
        font-size: var(--mp-font-size-md);
      }
    }

    &--lg {
      .base-input__field {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);
        font-size: var(--mp-font-size-lg);
      }
    }

    // States
    &--error {
      .base-input__wrapper {
        border-color: var(--mp-color-danger-default);

        &:focus-within {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-input__wrapper {
        background-color: var(--mp-color-bg-muted);
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
