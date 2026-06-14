import { computed, reactive, readonly, ref, watch } from 'vue';

import { evaluateCondition } from './conditions';
import { createFormValidator, jsonSchemaDefaults, jsonSchemaToFields } from './json-schema';

import type {
  FieldCondition,
  FormErrors,
  FormFieldSchema,
  FormJsonSchema,
  FormValues,
  SchemaFormDefinition,
  SchemaFormTranslate,
} from './types';

/**
 * A single, render-ready step derived from one {@link FormJsonSchema}.  A
 * one-step form has exactly one of these; a wizard has one per array entry.
 */
export interface SchemaFormStep {
  /** Stable id (`step-<index>`), used as the wizard step key. */
  id: string;
  /** Step title (from the schema `title`) — labels the wizard step. */
  title?: string;
  /** Step description (from the schema `description`) — sub-label in a wizard. */
  description?: string;
  /** Render-ready fields for this step. */
  fields: FormFieldSchema[];
}

/** Normalise the public definition into an array of step schemas. */
function toStepSchemas(definition: SchemaFormDefinition): FormJsonSchema[] {
  return Array.isArray(definition) ? definition : [definition];
}

/**
 * Whether an error key belongs to a field — directly (`field.key`) or as a
 * nested field-set child (`field.key.<child>`, dotted path).
 */
function errorBelongsToField(errorKey: string, fieldKey: string): boolean {
  return errorKey === fieldKey || errorKey.startsWith(`${fieldKey}.`);
}

/**
 * Manages reactive form state and validation for a {@link SchemaFormDefinition}.
 *
 * The JSON Schema is the single source of truth: the render-ready fields *and*
 * the validation rules are both derived from it.  Validation runs through Ajv
 * (https://ajv.js.org/) against the JSON Schema directly — callers never pass a
 * validation schema in.
 *
 * Passing a single object schema yields a one-step form; passing a top-level
 * **array** of object schemas yields a multi-step **wizard** (one step per
 * entry) with `next`/`previous`/`goTo` navigation that validates each step before
 * advancing.  In both cases the values are a single shared bag keyed by field
 * key, so steps may freely share or build up the same model.
 *
 * Pass `translate` (mirroring vue-i18n's `t(key, named)`) to localise the
 * generated validation messages; when omitted, built-in English messages are
 * used.
 *
 * @example
 * ```ts
 * const schema = {
 *   type: 'object',
 *   properties: { name: { type: 'string', title: 'Name', minLength: 2 } },
 *   required: ['name'],
 * }
 * const { fields, values, errors, validate, reset } = useSchemaForm(schema, { name: '' })
 * ```
 */
export function useSchemaForm(
  definition: SchemaFormDefinition,
  initialValues: FormValues = {},
  translate?: SchemaFormTranslate,
) {
  const stepSchemas = toStepSchemas(definition);
  const isWizard = Array.isArray(definition);

  // Derive a render-ready step (fields) and a validator for each step schema.
  const steps: SchemaFormStep[] = stepSchemas.map((schema, index) => ({
    id: `step-${index}`,
    title: schema.title,
    description: schema.description,
    fields: jsonSchemaToFields(schema),
  }));
  const validators = stepSchemas.map((schema) => createFormValidator(schema, translate));

  // A step may carry its own `visibleWhen` condition; when present the whole
  // step is shown/skipped as a unit, mirroring field-level conditional blocks.
  const stepConditions: Array<FieldCondition | undefined> = stepSchemas.map((schema) => schema.visibleWhen);

  // Defaults are merged across every step so the shared values bag is complete.
  const defaultValues: FormValues = Object.assign({}, ...stepSchemas.map((schema) => jsonSchemaDefaults(schema)));

  const values = reactive<FormValues>({ ...defaultValues, ...initialValues });
  const errors = reactive<FormErrors>({});
  const isValid = ref(false);
  const currentStep = ref(0);

  /**
   * The absolute indices of the steps that are currently visible, in order.
   * A step with no `visibleWhen` is always visible; a conditional step is
   * included only while its condition holds against the shared values.  When
   * conditions hide every step, the first step is kept so the wizard always has
   * something to render.
   */
  const visibleStepIndices = computed<number[]>(() => {
    const indices = steps
      .map((_, index) => index)
      .filter((index) => {
        const condition = stepConditions[index];
        return condition ? evaluateCondition(condition, values) : true;
      });
    return indices.length > 0 ? indices : [0];
  });

  /** The position of the active step within {@link visibleStepIndices}. */
  function currentVisiblePosition(): number {
    const position = visibleStepIndices.value.indexOf(currentStep.value);
    return position === -1 ? 0 : position;
  }

  const isFirstStep = computed(() => currentVisiblePosition() === 0);
  const isLastStep = computed(() => currentVisiblePosition() === visibleStepIndices.value.length - 1);

  // If a value change hides the active step, snap to the nearest still-visible
  // step (the closest preceding one, else the first) so the wizard never lands
  // on a hidden step.
  watch(visibleStepIndices, (indices) => {
    if (indices.includes(currentStep.value)) return;
    const preceding = indices.findLast((index) => index <= currentStep.value);
    currentStep.value = preceding ?? indices[0] ?? 0;
  });

  /**
   * Reactive flag per step: `true` when any field belonging to that step
   * currently holds a validation error.  Used to highlight errored steps in
   * the wizard step indicator, regardless of the validation mode.
   */
  const stepHasErrors = computed<boolean[]>(() =>
    steps.map((step) =>
      step.fields.some((field) => Object.keys(errors).some((errorKey) => errorBelongsToField(errorKey, field.key))),
    ),
  );

  /** Clear the error entries that belong to a given step's fields. */
  function clearStepErrors(index: number) {
    const fieldKeys = steps[index].fields.map((field) => field.key);
    for (const errorKey of errors.keys()) {
      if (fieldKeys.some((fieldKey) => errorBelongsToField(errorKey, fieldKey))) {
        errors.delete(errorKey);
      }
    }
  }

  /** Clear every error entry. */
  function clearAllErrors() {
    errors.clear();
  }

  /**
   * Validate a single step against its slice of the shared values.  Returns
   * `true` when the step passes; otherwise populates that step's field errors.
   */
  function validateStep(index: number): boolean {
    clearStepErrors(index);
    const stepErrors = validators[index].validate(values);
    Object.assign(errors, stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  /**
   * Validate every **visible** step.  Returns `true` when the whole form is
   * valid; errors for all failing steps are populated so nothing is silently
   * missed.  Hidden (conditionally-skipped) steps are excluded, so a required
   * field on a hidden step never blocks submission.
   */
  function validate(): boolean {
    clearAllErrors();
    let valid = true;

    for (const index of visibleStepIndices.value) {
      const stepErrors = validators[index].validate(values);
      Object.assign(errors, stepErrors);
      if (Object.keys(stepErrors).length > 0) valid = false;
    }

    isValid.value = valid;
    return valid;
  }

  /**
   * Validate the current step and, when it passes and there is a next step,
   * advance to it.  Returns whether the current step was valid.
   */
  function next(): boolean {
    const valid = validateStep(currentStep.value);
    if (valid && !isLastStep.value) {
      const position = currentVisiblePosition();
      currentStep.value = visibleStepIndices.value[position + 1];
    }
    return valid;
  }

  /** Move back to the previous **visible** step (no validation). */
  function previous() {
    const position = currentVisiblePosition();
    if (position > 0) currentStep.value = visibleStepIndices.value[position - 1];
  }

  /**
   * Jump to an arbitrary step index.  Hidden (conditionally-skipped) steps are
   * ignored; any other out-of-range index is a no-op.
   */
  function goTo(index: number) {
    if (visibleStepIndices.value.includes(index)) currentStep.value = index;
  }

  /** Reset values to their initial state, clear errors, return to step one. */
  function reset() {
    const fresh = new Map([...Object.entries(defaultValues), ...Object.entries(initialValues)]);
    values.clear();
    for (const [key, val] of fresh) {
      values.set(key, val);
    }

    clearAllErrors();
    isValid.value = false;
    currentStep.value = 0;
  }

  return {
    /** Whether the definition describes a multi-step wizard. */
    isWizard,
    /** The ordered steps (one for a single-step form). */
    steps,
    /** Flattened render-ready fields across every step. */
    fields: steps.flatMap((step) => step.fields) as FormFieldSchema[],
    /** The compiled JSON Schema of the first step (read-only convenience). */
    jsonSchema: validators[0].jsonSchema,
    /** Reactive bag of current form values, shared across all steps. */
    values,
    /** Reactive per-field error map. */
    errors: readonly(errors) as FormErrors,
    /** Whether the last full `validate()` call passed without errors. */
    isValid,
    /** Zero-based absolute index of the active wizard step. */
    currentStep,
    /** Absolute indices of the steps currently visible, in order. */
    visibleStepIndices,
    /** Whether the active step is the first one. */
    isFirstStep,
    /** Whether the active step is the last one. */
    isLastStep,
    /** Reactive per-step flag: `true` when that step currently has errors. */
    stepHasErrors,
    /** Validate every step; returns `true` when the whole form is valid. */
    validate,
    /** Validate a single step; returns `true` when that step is valid. */
    validateStep,
    /** Validate the current step and advance when valid. */
    next,
    /** Move back to the previous step. */
    previous,
    /** Jump to a specific step index. */
    goTo,
    /** Reset values back to initial state and clear errors. */
    reset,
  };
}
