// ─── JSON Schema → SchemaForm type definitions ────────────────────────────────
//
// SchemaForm is driven entirely by a JSON Schema document.  The schema is the
// single source of truth: the rendered controls are derived from it and the
// form is validated against it with Ajv (https://ajv.js.org/).  Consumers never
// pass a validation schema in — they describe the form with standard JSON Schema
// keywords (plus a small, namespaced `ui` extension for presentation-only
// concerns) and SchemaForm does the rest.
//
// A single object describes a one-step form.  A top-level *array* of object
// schemas instead describes a multi-step **form wizard**: each array entry is
// one step, with its `title`/`description` used as the step's label.
//
// The primitive type union and the compiled-schema shape are reused straight
// from Ajv's own published types (`JSONType`, `SchemaObject`) rather than being
// re-declared, so they stay in lock-step with the validator.

import type { JSONType } from 'ajv';

/** Re-export of Ajv's compiled JSON Schema object type. */
export type { SchemaObject } from 'ajv';

/**
 * The visual control rendered for a field.  This is a presentation concern, so
 * it lives under the non-standard `ui.widget` extension rather than being a
 * JSON Schema keyword.  When omitted, SchemaForm infers a sensible widget from
 * the property's `type`, `format`, and `enum`.
 */
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
  | 'radio';

/**
 * JSON Schema primitive types supported by SchemaForm — the subset of Ajv's
 * own {@link JSONType} that maps onto a form control.
 */
export type JsonSchemaType = Extract<JSONType, 'string' | 'number' | 'integer' | 'boolean'>;

/** JSON Schema string `format` values SchemaForm understands. */
export type JsonSchemaStringFormat = 'email' | 'url' | 'tel' | 'password';

/**
 * Presentation-only hints for a single property, kept out of the standard
 * JSON Schema keyword space under a namespaced `ui` object.
 */
export interface FieldUiOptions {
  /** Force a specific control instead of the inferred one. */
  widget?: FormFieldType;
  /** Placeholder text for text-like inputs. */
  placeholder?: string;
  /** Helper text shown below the field (falls back to `description`). */
  hint?: string;
  /** Number of visible rows (textarea / markdown). */
  rows?: number;
  /** Disable the individual field. */
  disabled?: boolean;
  /**
   * Human-readable labels for `enum` values, keyed by the stringified value.
   * Only used when options are declared via `enum` (use `oneOf` for inline
   * labels instead).
   */
  enumLabels?: Record<string, string>;
}

/**
 * A single JSON Schema property descriptor.  Standard validation keywords map
 * directly onto generated Zod rules.
 */
export interface JsonSchemaProperty {
  /** JSON Schema primitive type.  Defaults to `'string'`. */
  type?: JsonSchemaType;
  /** Field label (`title` in JSON Schema). */
  title?: string;
  /** Field description — used as helper text when `ui.hint` is absent. */
  description?: string;
  /** String format constraint (also influences the inferred input type). */
  format?: JsonSchemaStringFormat;
  /** Minimum string length. */
  minLength?: number;
  /** Maximum string length. */
  maxLength?: number;
  /** Regular-expression pattern the string must match. */
  pattern?: string;
  /** Inclusive numeric minimum. */
  minimum?: number;
  /** Inclusive numeric maximum. */
  maximum?: number;
  /** Allowed values (renders a select/radio control). */
  enum?: Array<string | number>;
  /** Allowed values with inline labels (renders a select/radio control). */
  oneOf?: Array<{ const: string | number; title?: string }>;
  /** Default value applied when the caller supplies none. */
  default?: unknown;
  /**
   * Custom validation message override.  When a string, it is used for every
   * failed constraint on this property; when an object, messages are matched
   * per JSON Schema keyword.
   */
  errorMessage?: string | Record<string, string>;
  /** Presentation-only hints. */
  ui?: FieldUiOptions;
}

/**
 * A single form (or, in a wizard, a single step): a JSON Schema `object`
 * document.  When used directly it describes a one-step form; when used as an
 * entry of a top-level array it describes one wizard step.  Validation is
 * performed against it with Ajv internally.
 */
export interface FormJsonSchema {
  /** Always `'object'` for forms (optional — assumed when omitted). */
  type?: 'object';
  /**
   * Human-readable title.  In a wizard this labels the step in the step
   * indicator; in a single-step form it is currently unused for layout.
   */
  title?: string;
  /** Optional description, used as the step's sub-label in a wizard. */
  description?: string;
  /** Map of field key → property schema.  Insertion order = render order. */
  properties: Record<string, JsonSchemaProperty>;
  /** Keys that are required (non-empty / checked). */
  required?: string[];
}

/**
 * The sole input to `<BaseSchemaForm>` / `useSchemaForm`.
 *
 * - A single {@link FormJsonSchema} object renders a one-step form.
 * - An **array** of {@link FormJsonSchema} objects renders a multi-step form
 *   wizard, one step per entry, validated step by step.
 */
export type SchemaFormDefinition = FormJsonSchema | FormJsonSchema[];

/**
 * How a wizard ({@link SchemaFormDefinition} array) validates its steps.
 *
 * - `'per-step'` (default): each step is validated before the wizard may
 *   advance to a later step; forward navigation is blocked while the current
 *   step has errors.
 * - `'final'`: steps are never gated — the user may move freely between steps
 *   and validation only runs for the whole form when it is submitted/finished.
 *
 * In **both** modes any step that currently holds validation errors is
 * highlighted in the step indicator.
 */
export type SchemaFormValidationMode = 'per-step' | 'final';

/**
 * A resolved, render-ready field descriptor.  SchemaForm derives one of these
 * per property from the {@link FormJsonSchema}; it is *not* part of the public
 * input surface and carries no validation logic of its own.
 */
export interface FormFieldSchema {
  /** Field key – used as the form data property name. */
  key: string;
  /** Visual control to render. */
  type: FormFieldType;
  /** Human-readable label shown above the field. */
  label?: string;
  /** Helper text displayed below the field. */
  hint?: string;
  /** Placeholder text (for text-like inputs). */
  placeholder?: string;
  /** Whether the field is required. */
  required: boolean;
  /** Whether the field is disabled. */
  disabled?: boolean;
  /** Allowed values for `select` and `radio` field types. */
  options?: Array<{ label: string; value: string | number }>;
  /** Number of visible rows (textarea / markdown). */
  rows?: number;
}

/** Per-field error map, keyed by `FormFieldSchema.key`. */
export type FormErrors = Record<string, string | undefined>;

/**
 * Translation function used to localise generated validation messages.  It
 * mirrors vue-i18n's `t(key, named)` signature: given a message key and an
 * optional bag of named interpolation values, it returns the localised string.
 * When omitted, SchemaForm falls back to built-in English messages.
 */
export type SchemaFormTranslate = (key: string, named?: Record<string, unknown>) => string;

/** The reactive form data bag, keyed by field key. */
export type FormValues = Record<string, unknown>;
