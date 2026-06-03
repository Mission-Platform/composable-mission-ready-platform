<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'

  import BaseFormBuilderField from './BaseFormBuilderField.vue'
  import BaseFormBuilderActions from './BaseFormBuilderActions.vue'

  import { useFormSchema } from './useFormSchema'
  import type { FormSchema, FormValues } from './types'

  export type { FormSchema, FormValues }
  export type { FormFieldSchema, FormFieldType, FormErrors } from './types'

  const props = withDefaults(
    defineProps<{
      schema: FormSchema
      modelValue?: FormValues
      disabled?: boolean
    }>(),
    {
      modelValue: () => ({}),
      disabled: false,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [values: FormValues]
    submit: [values: FormValues, isValid: boolean]
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: {
      en: { submit: 'Submit', reset: 'Reset' },
    },
  })

  const { values, errors, isValid, validate, reset } = useFormSchema(props.schema, props.modelValue)

  /** Keep local reactive `values` in sync with external `modelValue` changes. */
  const fieldList = computed(() => props.schema.fields)

  function onFieldUpdate(key: string, value: unknown) {
    values[key] = value
    emit('update:modelValue', { ...values })
  }

  function handleSubmit() {
    const valid = validate()
    emit('submit', { ...values }, valid)
  }

  function handleReset() {
    reset()
    emit('update:modelValue', { ...values })
  }

  /** Expose for parent use via template ref. */
  defineExpose({ values, errors, isValid, validate, reset })
</script>

<template>
  <form class="form-builder" novalidate @submit.prevent="handleSubmit" @reset.prevent="handleReset">
    <div class="form-builder__fields">
      <BaseFormBuilderField
        v-for="field in fieldList"
        :key="field.key"
        :field="field"
        :value="values[field.key]"
        :error="errors[field.key]"
        :disabled="disabled"
        @update="onFieldUpdate"
      />
    </div>

    <BaseFormBuilderActions :reset-label="t('reset')" :submit-label="t('submit')">
      <template v-if="$slots.actions" #default>
        <slot name="actions" />
      </template>
    </BaseFormBuilderActions>
  </form>
</template>

<style scoped lang="scss">
  .form-builder {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-4);

    &__fields {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-4);
    }
  }
</style>
