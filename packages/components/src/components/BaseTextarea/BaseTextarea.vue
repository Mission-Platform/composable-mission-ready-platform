<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  import { useId } from '../../composables/useId'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export type TextareaSize = 'sm' | 'md' | 'lg'
  export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both'

  const props = withDefaults(
    defineProps<{
      modelValue?: string
      rows?: number
      size?: TextareaSize
      resize?: TextareaResize
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
      rows: 4,
      size: 'md',
      resize: 'vertical',
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
    'update:modelValue': [value: string]
    change: [event: Event]
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { required: 'required' } },
  })
  const { id: resolvedId } = useId(props.id)

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement
    emit('update:modelValue', target.value)
  }
</script>

<template>
  <div
    :class="[
      'base-textarea',
      `base-textarea--${size}`,
      { 'base-textarea--error': !!error, 'base-textarea--disabled': disabled },
    ]"
  >
    <label v-if="label" :for="resolvedId" :class="['base-textarea__label', { 'base-textarea__label--hidden': labelHidden }]">
      <BaseTypography variant="label" as="span" color="primary">{{ label }}</BaseTypography>
      <span v-if="required" class="base-textarea__required" :title="t('required')" aria-hidden="true">*</span>
    </label>
    <textarea
      :id="resolvedId"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :style="{ resize }"
      :aria-invalid="!!error || undefined"
      :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
      class="base-textarea__field"
      @input="handleInput"
      @change="emit('change', $event)"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
    />
    <BaseTypography v-if="error" :id="`${resolvedId}-error`" variant="caption" as="p" color="inherit" class="base-textarea__error" role="alert">{{ error }}</BaseTypography>
    <BaseTypography v-else-if="hint" :id="`${resolvedId}-hint`" variant="caption" as="p" color="secondary" class="base-textarea__hint">{{ hint }}</BaseTypography>
  </div>
</template>

<style scoped lang="scss">
  .base-textarea {
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

    &__field {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }

      &:focus {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    // Sizes
    &--sm .base-textarea__field {
      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      font-size: var(--mp-font-size-sm);
    }

    &--md .base-textarea__field {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      font-size: var(--mp-font-size-md);
    }

    &--lg .base-textarea__field {
      padding: var(--mp-spacing-3) var(--mp-spacing-4);
      font-size: var(--mp-font-size-lg);
    }

    // States
    &--error {
      .base-textarea__field {
        border-color: var(--mp-color-danger-default);

        &:focus {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-textarea__field {
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
