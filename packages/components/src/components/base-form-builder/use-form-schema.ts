import { reactive, readonly, ref } from 'vue';

import type { FormErrors, FormSchema, FormValues } from './types';

/**
 * Manages reactive form state and Zod-powered validation for a given
 * `FormSchema`.
 *
 * @example
 * ```ts
 * const schema = {
 *   fields: [{ key: 'name', label: 'Name', schema: z.string().min(2) }],
 *   zodSchema: z.object({ name: z.string().min(2) }),
 * }
 * const { values, errors, validate, reset } = useFormSchema(schema, { name: '' })
 * ```
 */
export function useFormSchema(schema: FormSchema, initialValues: FormValues = {}) {
  // Build initial values from field defaults then overlay caller-supplied values
  const defaultValues: FormValues = {};
  for (const field of schema.fields) {
    if (field.type === 'checkbox' || field.type === 'switch') {
      defaultValues[field.key] = false;
    } else if (field.type === 'number') {
      defaultValues[field.key] = undefined;
    } else {
      defaultValues[field.key] = '';
    }
  }

  const values = reactive<FormValues>({ ...defaultValues, ...initialValues });
  const errors = reactive<FormErrors>({});
  const isValid = ref(false);

  /**
   * Validate the form.  Returns `true` when all fields are valid.
   *
   * - If `schema.zodSchema` is provided it is used to validate the whole form
   *   at once; field-level errors are mapped from `ZodError.issues`.
   * - Otherwise each field's own `.schema` is validated individually.
   */
  function validate(): boolean {
    // clear previous errors
    for (const key of Object.keys(errors)) {
      delete errors[key];
    }

    let valid = true;

    if (schema.zodSchema) {
      const result = schema.zodSchema.safeParse(values);
      if (!result.success) {
        valid = false;
        for (const issue of result.error.issues) {
          const key = issue.path[0] as string | undefined;
          if (key && !errors[key]) {
            errors[key] = issue.message;
          }
        }
      }
    } else {
      for (const field of schema.fields) {
        if (!field.schema) continue;
        const result = field.schema.safeParse(values[field.key]);
        if (!result.success) {
          valid = false;
          errors[field.key] = result.error.issues[0]?.message ?? 'Invalid value';
        }
      }
    }

    isValid.value = valid;
    return valid;
  }

  /** Reset form values to initial state and clear all errors. */
  function reset() {
    const fresh = { ...defaultValues, ...initialValues };
    for (const key of Object.keys(values)) {
      delete (values as Record<string, unknown>)[key];
    }
    Object.assign(values, fresh);

    for (const key of Object.keys(errors)) {
      delete errors[key];
    }
    isValid.value = false;
  }

  return {
    /** Reactive bag of current form values. */
    values,
    /** Reactive per-field error map. */
    errors: readonly(errors) as FormErrors,
    /** Whether the last `validate()` call passed without errors. */
    isValid,
    /** Run validation; returns `true` when valid. */
    validate,
    /** Reset values back to initial state and clear errors. */
    reset,
  };
}
