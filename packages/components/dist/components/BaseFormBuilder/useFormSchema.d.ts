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
export declare function useFormSchema(schema: FormSchema, initialValues?: FormValues): {
    /** Reactive bag of current form values. */
    values: FormValues;
    /** Reactive per-field error map. */
    errors: FormErrors;
    /** Whether the last `validate()` call passed without errors. */
    isValid: import("vue").Ref<boolean, boolean>;
    /** Run validation; returns `true` when valid. */
    validate: () => boolean;
    /** Reset values back to initial state and clear errors. */
    reset: () => void;
};
