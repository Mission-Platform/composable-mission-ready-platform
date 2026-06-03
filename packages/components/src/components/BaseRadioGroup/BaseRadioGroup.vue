<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import BaseRadio from '../BaseRadio/BaseRadio.vue'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export interface RadioOption {
    label: string
    value: string | number
    disabled?: boolean
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: string | number
      options?: RadioOption[]
      legend?: string
      legendHidden?: boolean
      hint?: string
      error?: string
      disabled?: boolean
      required?: boolean
      direction?: 'vertical' | 'horizontal'
      name?: string
    }>(),
    {
      modelValue: undefined,
      options: () => [],
      legend: undefined,
      legendHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      direction: 'vertical',
      name: undefined,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string | number]
    change: [event: Event]
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { required: 'required' } },
  })
  const groupId = computed(() => props.name ?? `radio-group-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <fieldset
    :class="[
      'base-radio-group',
      { 'base-radio-group--error': !!error, 'base-radio-group--disabled': disabled },
    ]"
  >
    <legend v-if="legend" :class="['base-radio-group__legend', { 'base-radio-group__legend--hidden': legendHidden }]">
      <BaseTypography variant="label" as="span" color="primary">{{ legend }}</BaseTypography>
      <span v-if="required" class="base-radio-group__required" :title="t('required')" aria-hidden="true">*</span>
    </legend>
    <div :class="['base-radio-group__options', `base-radio-group__options--${direction}`]">
      <BaseRadio
        v-for="opt in options"
        :key="opt.value"
        :model-value="modelValue"
        :value="opt.value"
        :label="opt.label"
        :disabled="disabled || opt.disabled"
        :id="`${groupId}-${opt.value}`"
        @update:model-value="(v) => emit('update:modelValue', v)"
        @change="(e) => emit('change', e)"
      />
      <slot />
    </div>
    <BaseTypography v-if="error" variant="caption" as="p" color="inherit" class="base-radio-group__error" role="alert">{{ error }}</BaseTypography>
    <BaseTypography v-else-if="hint" variant="caption" as="p" color="secondary" class="base-radio-group__hint">{{ hint }}</BaseTypography>
  </fieldset>
</template>

<style scoped lang="scss">
  .base-radio-group {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-2);

    &__legend {
      padding: 0;
      margin-bottom: var(--mp-spacing-1);

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

    &__options {
      display: flex;
      gap: var(--mp-spacing-2);

      &--vertical {
        flex-direction: column;
      }

      &--horizontal {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--mp-spacing-4);
      }
    }

    &--disabled {
      pointer-events: none;
      color: var(--mp-color-text-disabled);
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
