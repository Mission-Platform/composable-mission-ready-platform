<script lang="ts" setup>
  /**
   * `BaseFormBuilder` — Form builder component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { computed } from 'vue';

  import BaseFormBuilderActions from './base-form-builder-actions.vue';
  import BaseFormBuilderField from './base-form-builder-field.vue';
  import { useFormSchema } from './use-form-schema';

  import type { FormSchema, FormValues } from './types';

  export type { FormSchema, FormValues };
  export type { FormFieldSchema, FormFieldType, FormErrors } from './types';

  const props = withDefaults(
    defineProps<{
      schema: FormSchema;
      modelValue?: FormValues;
      disabled?: boolean;
    }>(),
    {
      modelValue: () => ({}),
      disabled: false,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [values: FormValues];
    submit: [values: FormValues, isValid: boolean];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  const { values, errors, isValid, validate, reset } = useFormSchema(props.schema, props.modelValue);

  /** Keep local reactive `values` in sync with external `modelValue` changes. */
  const fieldList = computed(() => props.schema.fields);

  function onFieldUpdate(key: string, value: unknown) {
    values[key] = value;
    emit('update:modelValue', { ...values });
  }

  function handleSubmit() {
    const valid = validate();
    emit('submit', { ...values }, valid);
  }

  function handleReset() {
    reset();
    emit('update:modelValue', { ...values });
  }

  /** Expose for parent use via template ref. */
  defineExpose({ values, errors, isValid, validate, reset });
</script>

<template>
  <form
    class="form-builder"
    novalidate
    @submit.prevent="handleSubmit"
    @reset.prevent="handleReset"
  >
    <div class="form-builder__fields">
      <BaseFormBuilderField
        v-for="field in fieldList"
        :key="field.key"
        :disabled="disabled"
        :error="errors[field.key]"
        :field="field"
        :value="values[field.key]"
        @update="onFieldUpdate"
      />
    </div>

    <BaseFormBuilderActions
      :reset-label="t('reset')"
      :submit-label="t('submit')"
    >
      <template
        v-if="$slots.actions"
        #default
      >
        <slot name="actions" />
      </template>
    </BaseFormBuilderActions>
  </form>
</template>

<style lang="scss" scoped>
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

<i18n lang="yaml">
en:
  submit: Submit
  reset: Reset
</i18n>
