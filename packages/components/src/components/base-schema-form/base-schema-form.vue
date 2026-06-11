<script lang="ts" setup>
  /**
   * `BaseSchemaForm` — Schema-driven form component for the Mission Platform UI.
   *
   * Driven entirely by a JSON Schema definition: both the rendered fields and
   * the validation rules are derived from it (validated with Ajv).  Passing a
   * single object schema renders a one-step form; passing a top-level **array**
   * of object schemas renders a multi-step **form wizard**, one step per entry.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { computed } from 'vue';

  import BaseFormWizard from '../base-form-wizard/base-form-wizard.vue';

  import BaseSchemaFormActions from './base-schema-form-actions.vue';
  import BaseSchemaFormField from './base-schema-form-field.vue';
  import { useSchemaForm } from './use-schema-form';

  import type { FormValues, SchemaFormDefinition, SchemaFormValidationMode } from './types';
  import type { WizardStep } from '../base-form-wizard/base-form-wizard.vue';

  export type {
    FormJsonSchema,
    SchemaFormDefinition,
    SchemaFormValidationMode,
    FormValues,
  } from './types';
  export type {
    FormFieldSchema,
    FormFieldType,
    FormErrors,
    SchemaFormTranslate,
    JsonSchemaProperty,
    JsonSchemaType,
    JsonSchemaStringFormat,
    FieldUiOptions,
    SchemaObject,
  } from './types';

  const props = withDefaults(
    defineProps<{
      /**
       * JSON Schema definition driving both the rendered fields and validation.
       * A single object is a one-step form; an array is a multi-step wizard.
       */
      schema: SchemaFormDefinition;
      modelValue?: FormValues;
      disabled?: boolean;
      /**
       * Wizard validation strategy.  `'per-step'` (default) validates each step
       * before allowing the wizard to advance; `'final'` lets the user move
       * freely between steps and only validates on submit.  Ignored for
       * single-step forms.
       */
      validationMode?: SchemaFormValidationMode;
    }>(),
    {
      modelValue: () => ({}),
      disabled: false,
      validationMode: 'per-step',
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [values: FormValues];
    submit: [values: FormValues, isValid: boolean];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  // Localise the generated validation messages through this component's local
  // i18n scope (the `errors.*` keys in the `<i18n>` block below).  Callers can
  // therefore translate or override messages purely via i18n.
  const {
    isWizard,
    steps,
    currentStep,
    values,
    errors,
    isValid,
    stepHasErrors,
    validate,
    validateStep,
    goTo,
    reset,
  } = useSchemaForm(props.schema, props.modelValue, (key, named) => t(key, named ?? {}));

  /**
   * Wizard step descriptors derived from each step schema's title/description,
   * with `error` flagged for any step that currently holds validation errors so
   * the step indicator can highlight it.
   */
  const wizardSteps = computed<WizardStep[]>(() =>
    steps.map((step, index) => ({
      id: step.id,
      title: step.title ?? t('step', { index: index + 1 }),
      description: step.description,
      error: stepHasErrors.value[index],
    })),
  );

  /** Fields to render for the active step (the only step in a single form). */
  const currentFields = computed(() => steps[currentStep.value]?.fields ?? []);

  function onFieldUpdate(key: string, value: unknown) {
    values[key] = value;
    emit('update:modelValue', { ...values });
  }

  /**
   * Handle a wizard navigation request.
   *
   * - In `'per-step'` mode, moving forward is gated on the current step
   *   validating (a failed step stays put and is highlighted); moving back is
   *   always allowed.
   * - In `'final'` mode, navigation is never gated — the user moves freely and
   *   validation is deferred until submit.
   */
  function onWizardNavigate(index: number) {
    if (props.validationMode === 'final') {
      goTo(index);
      return;
    }

    if (index > currentStep.value) {
      if (validateStep(currentStep.value)) goTo(index);
    } else {
      goTo(index);
    }
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
  defineExpose({
    values,
    errors,
    isValid,
    stepHasErrors,
    validate,
    validateStep,
    reset,
    currentStep,
    goTo,
  });
</script>

<template>
  <!-- Wizard mode: a top-level array of step schemas. -->
  <form
    v-if="isWizard"
    class="schema-form schema-form--wizard"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <BaseFormWizard
      :linear="validationMode === 'per-step'"
      :model-value="currentStep"
      :steps="wizardSteps"
      @complete="handleSubmit"
      @update:model-value="onWizardNavigate"
    >
      <template #default>
        <div class="schema-form__fields">
          <BaseSchemaFormField
            v-for="field in currentFields"
            :key="field.key"
            :disabled="disabled"
            :error="errors[field.key]"
            :field="field"
            :value="values[field.key]"
            @update="onFieldUpdate"
          />
        </div>
      </template>
    </BaseFormWizard>
  </form>

  <!-- Single-step form. -->
  <form
    v-else
    class="schema-form"
    novalidate
    @submit.prevent="handleSubmit"
    @reset.prevent="handleReset"
  >
    <div class="schema-form__fields">
      <BaseSchemaFormField
        v-for="field in currentFields"
        :key="field.key"
        :disabled="disabled"
        :error="errors[field.key]"
        :field="field"
        :value="values[field.key]"
        @update="onFieldUpdate"
      />
    </div>

    <BaseSchemaFormActions
      :reset-label="t('reset')"
      :submit-label="t('submit')"
    >
      <template
        v-if="$slots.actions"
        #default
      >
        <slot name="actions" />
      </template>
    </BaseSchemaFormActions>
  </form>
</template>

<style lang="scss" scoped>
  .schema-form {
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
  step: 'Step {index}'
  errors:
    required: '{label} is required'
    minLength: '{label} must be at least {limit} character(s)'
    maxLength: '{label} must be at most {limit} character(s)'
    minimum: '{label} must be at least {limit}'
    maximum: '{label} must be at most {limit}'
    format: '{label} must be a valid {format}'
    pattern: '{label} is invalid'
    enum: '{label} must be one of the allowed values'
    number: '{label} must be a number'
    invalid: '{label} is invalid'
</i18n>
