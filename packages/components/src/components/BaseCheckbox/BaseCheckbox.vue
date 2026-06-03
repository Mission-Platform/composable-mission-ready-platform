<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'

  import { useId } from '../../composables/useId'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  const props = withDefaults(
    defineProps<{
      modelValue?: boolean | string[]
      value?: string
      label?: string
      labelHidden?: boolean
      hint?: string
      error?: string
      disabled?: boolean
      required?: boolean
      indeterminate?: boolean
      id?: string
    }>(),
    {
      modelValue: false,
      value: undefined,
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      indeterminate: false,
      id: undefined,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: boolean | string[]]
    change: [event: Event]
  }>()

  const isChecked = computed(() => {
    if (Array.isArray(props.modelValue)) {
      return props.value !== undefined && props.modelValue.includes(props.value)
    }
    return props.modelValue
  })

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    if (Array.isArray(props.modelValue) && props.value !== undefined) {
      const next = [...props.modelValue]
      if (target.checked) {
        next.push(props.value)
      } else {
        const idx = next.indexOf(props.value)
        if (idx !== -1) next.splice(idx, 1)
      }
      emit('update:modelValue', next)
    } else {
      emit('update:modelValue', target.checked)
    }
    emit('change', event)
  }

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { required: 'required' } },
  })
  const { id: resolvedId } = useId(props.id)

  const checkboxRef = ref<HTMLInputElement | null>(null)

  watch(
    () => props.indeterminate,
    (val) => {
      if (checkboxRef.value) checkboxRef.value.indeterminate = val
    },
    { immediate: true },
  )
</script>

<template>
  <div
    :class="[
      'base-checkbox',
      { 'base-checkbox--error': !!error, 'base-checkbox--disabled': disabled },
    ]"
  >
    <label class="base-checkbox__row">
      <span class="base-checkbox__control-wrapper">
        <input
          :id="resolvedId"
          ref="checkboxRef"
          type="checkbox"
          :checked="isChecked"
          :value="value"
          :disabled="disabled"
          :required="required"
          :aria-invalid="!!error || undefined"
          :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
          class="base-checkbox__input"
          @change="handleChange"
        />
        <span class="base-checkbox__box" aria-hidden="true">
          <svg
            v-if="indeterminate"
            class="base-checkbox__icon"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <svg
            v-else
            class="base-checkbox__icon"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </span>
      <span v-if="label" :class="['base-checkbox__label', { 'base-checkbox__label--hidden': labelHidden }]">
        <BaseTypography variant="body-md" as="span" color="primary">{{ label }}</BaseTypography>
        <span v-if="required" class="base-checkbox__required" :title="t('required')" aria-hidden="true">*</span>
      </span>
    </label>
    <BaseTypography v-if="error" :id="`${resolvedId}-error`" variant="caption" as="p" color="inherit" class="base-checkbox__error" role="alert">{{ error }}</BaseTypography>
    <BaseTypography v-else-if="hint" :id="`${resolvedId}-hint`" variant="caption" as="p" color="secondary" class="base-checkbox__hint">{{ hint }}</BaseTypography>
  </div>
</template>

<style scoped lang="scss">
  .base-checkbox {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__row {
      display: inline-flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      cursor: pointer;
    }

    &__control-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;

      &:focus-visible ~ .base-checkbox__box {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:checked ~ .base-checkbox__box,
      &:indeterminate ~ .base-checkbox__box {
        background-color: var(--mp-color-primary-default);
        border-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
      }
    }

    &__box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border: 2px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-sm);
      background-color: var(--mp-color-bg-surface);
      color: transparent;
      transition: background-color 150ms ease, border-color 150ms ease;
      pointer-events: none;
    }

    &__icon {
      width: 12px;
      height: 12px;
    }

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

    // States
    &--error {
      .base-checkbox__box {
        border-color: var(--mp-color-danger-default);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-checkbox__row {
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
      padding-left: calc(18px + var(--mp-spacing-2));
    }

    &__hint {
      margin: 0;
      padding-left: calc(18px + var(--mp-spacing-2));
    }
  }
</style>
