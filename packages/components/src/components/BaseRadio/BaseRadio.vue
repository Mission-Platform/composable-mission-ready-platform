<script setup lang="ts">
  import { computed } from 'vue'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  const props = withDefaults(
    defineProps<{
      modelValue?: string | number
      value: string | number
      label?: string
      labelHidden?: boolean
      disabled?: boolean
      id?: string
    }>(),
    {
      modelValue: undefined,
      label: undefined,
      labelHidden: false,
      disabled: false,
      id: undefined,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string | number]
    change: [event: Event]
  }>()

  const isChecked = computed(() => props.modelValue === props.value)

  function handleChange(event: Event) {
    emit('update:modelValue', props.value)
    emit('change', event)
  }
</script>

<template>
  <label
    :class="['base-radio', { 'base-radio--checked': isChecked, 'base-radio--disabled': disabled }]"
  >
    <span class="base-radio__control-wrapper">
      <input
        :id="id"
        type="radio"
        :checked="isChecked"
        :value="value"
        :disabled="disabled"
        class="base-radio__input"
        @change="handleChange"
      />
      <span class="base-radio__circle" aria-hidden="true" />
    </span>
    <BaseTypography v-if="label" variant="body-md" as="span" color="primary" :class="['base-radio__label', { 'base-radio__label--hidden': labelHidden }]">{{ label }}</BaseTypography>
    <slot />
  </label>
</template>

<style scoped lang="scss">
  .base-radio {
    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    cursor: pointer;

    &__control-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
    }

    &__input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;

      &:focus-visible ~ .base-radio__circle {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:checked ~ .base-radio__circle {
        border-color: var(--mp-color-primary-default);

        &::after {
          transform: translate(-50%, -50%) scale(1);
        }
      }
    }

    &__circle {
      display: block;
      width: 18px;
      height: 18px;
      border: 2px solid var(--mp-color-border-default);
      border-radius: 50%;
      background-color: var(--mp-color-bg-surface);
      transition: border-color 150ms ease;
      pointer-events: none;

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--mp-color-primary-default);
        transform: translate(-50%, -50%) scale(0);
        transition: transform 150ms ease;
      }
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

    &--disabled {
      opacity: 0.5;
      pointer-events: none;
      cursor: not-allowed;
    }
  }
</style>
