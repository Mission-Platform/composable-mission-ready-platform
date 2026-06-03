import type { ZodTypeAny } from 'zod'

// ─── JSON Schema field types supported by FormBuilder ─────────────────────────

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'url'
  | 'tel'
  | 'textarea'
  | 'markdown'
  | 'checkbox'
  | 'switch'
  | 'select'
  | 'radio'

/**
 * A single JSON-Schema-like field descriptor that FormBuilder uses to render
 * the correct Base* component.
 */
export interface FormFieldSchema {
  /** Field key – used as the form data property name. */
  key: string
  /** Visual control to render.  Defaults to `'text'`. */
  type?: FormFieldType
  /** Human-readable label shown above the field. */
  label?: string
  /** Helper text displayed below the field. */
  hint?: string
  /** Placeholder text (for text-like inputs). */
  placeholder?: string
  /** Mark the field as required. */
  required?: boolean
  /** Disable the field entirely. */
  disabled?: boolean
  /**
   * Allowed values for `select` and `radio` field types.
   * Each entry is `{ label, value }`.
   */
  options?: Array<{ label: string; value: string | number }>
  /** Number of visible rows (textarea / markdown). */
  rows?: number
  /** `zod` schema used to validate this individual field. */
  schema?: ZodTypeAny
}

/**
 * Top-level form schema passed to `<FormBuilder>` / `useFormSchema`.
 */
export interface FormSchema {
  fields: FormFieldSchema[]
  /**
   * Optional Zod object schema that validates the whole form at once.
   * When provided, `validate()` from `useFormSchema` runs this instead of
   * per-field schemas.
   */
  zodSchema?: ZodTypeAny
}

/** Per-field error map, keyed by `FormFieldSchema.key`. */
export type FormErrors = Record<string, string | undefined>

/** The reactive form data bag, keyed by field key. */
export type FormValues = Record<string, unknown>
