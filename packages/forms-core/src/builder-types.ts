// ─── FormBuilder type definitions ────────────────────────────────────────────
//
// The form builder is the visual, drag-and-drop authoring counterpart to the
// schema-driven form: the form *renders* a JSON Schema, the builder lets a user
// *author* one. The builder's working representation is a (possibly nested)
// tree of {@link BuilderField}s; that tree is converted to — and hydrated back
// from — the very same {@link SchemaFormDefinition} that drives the form, so
// the produced schema can be fed straight into a form with no translation layer.
//
// These types are framework-agnostic and live in `@mission-platform/forms-core`
// so the Vue `@mission-platform/components` builder and the write-once
// `@mission-platform/components` builder share one model (the
// `@dnd-kit`-specific group/drag helpers stay in the Vue component, which is the
// only consumer that needs them).

import type { Autocapitalize, Autocomplete, FieldCondition, FormFieldType, LocationFormat } from './types';

/** A single option for a `select` / `radio` / `multiselect` builder field. */
export interface BuilderFieldOption {
  /** Human-readable label shown to the end user. */
  label: string;
  /** Stored value written to the form data. */
  value: string;
}

/**
 * The builder's working representation of one form field — a flattened,
 * UI-friendly mirror of a JSON Schema property plus a stable, builder-only
 * `id` used for selection, drag-and-drop, and list keying. The `id` never
 * leaks into the generated schema.
 */
export interface BuilderField {
  /** Stable, builder-internal identity (never emitted into the schema). */
  id: string;
  /** Property key written to the schema's `properties` map. */
  key: string;
  /** Visual control to render. */
  type: FormFieldType;
  /** Field label (`title` in the generated schema). */
  label: string;
  /** Placeholder text for text-like inputs. */
  placeholder?: string;
  /** Helper text shown below the field. */
  hint?: string;
  /** Whether the field is required. */
  required: boolean;
  /** Whether the field is rendered read-only in the generated form. */
  disabled?: boolean;
  /** Allowed values for `select` / `radio` / `multiselect` fields. */
  options: BuilderFieldOption[];
  /** Number of visible rows (textarea / markdown). */
  rows?: number;
  /** Minimum string length (string-typed widgets). */
  minLength?: number;
  /** Maximum string length (string-typed widgets). */
  maxLength?: number;
  /** Regular-expression pattern the value must match (string widgets). */
  pattern?: string;
  /** Inclusive numeric minimum (number / stepper widget). */
  minimum?: number;
  /** Inclusive numeric maximum (number / stepper widget). */
  maximum?: number;
  /** The value must be a multiple of this (number / stepper widget; e.g. `0.01`). */
  multipleOf?: number;
  /** Restrict a number / stepper field to whole numbers. */
  integer?: boolean;
  /** Disallow negative values on a number / stepper field. */
  unsigned?: boolean;
  /** Fractional-digit precision for a float number / stepper field. */
  precision?: number;
  /** Increment/decrement amount for the `stepper` widget. */
  stepAmount?: number;
  /** Expose a seconds field on `time` / `datetime` / range widgets. */
  showSeconds?: boolean;
  /** Coordinate variant for the `location` widget. */
  locationFormat?: LocationFormat;
  /** Accepted file types for the `file` widget (the input's `accept` attr). */
  accept?: string;
  /** Whether the `file` widget accepts multiple files / the `email` widget multiple addresses. */
  multiple?: boolean;
  /** Native `capture` hint for the `file` widget. */
  capture?: boolean | 'user' | 'environment';
  /** Native `autocomplete` token for text-like inputs. */
  autocomplete?: Autocomplete;
  /** Native `autocapitalize` hint for text-like inputs. */
  autocapitalize?: Autocapitalize;
  /** Autocomplete suggestions (`<datalist>`) for text-like inputs. */
  suggestions?: string[];
  /** Earliest selectable date (`YYYY-MM-DD`) for date / date-range widgets. */
  minDate?: string;
  /** Latest selectable date (`YYYY-MM-DD`) for date / date-range widgets. */
  maxDate?: string;
  /** Default value applied when the form supplies none. */
  defaultValue?: unknown;
  /**
   * Conditional-visibility rule: the field renders only while this condition
   * holds against the rest of the form's values (serialised to `ui.visibleWhen`).
   */
  visibleWhen?: FieldCondition;
  /**
   * Nested child fields, present only for the `fieldset` type. A field set is a
   * grouping control that serialises to a nested `object` schema property,
   * letting authors build arbitrarily deep groups of fields.
   */
  children?: BuilderField[];
}

/**
 * A field type as presented in the builder's palette. Dragging one onto the
 * canvas creates a new {@link BuilderField} of the given `type`.
 */
export interface FieldTypeDescriptor {
  /** The control this palette entry creates. */
  type: FormFieldType;
  /** Human-readable label shown in the palette. */
  label: string;
  /** Optional one-line description shown beneath the label. */
  description?: string;
}

/** Options accepted by the field → schema converters. */
export interface FieldsToSchemaOptions {
  /** Optional form title written to the schema. */
  title?: string;
  /** Optional form description written to the schema. */
  description?: string;
  /** Emit a multi-step **wizard** (array of step schemas) instead of one object. */
  wizard?: boolean;
  /** Per-step titles, indexed by step number. */
  stepTitles?: string[];
  /** Per-step descriptions (sub-labels), indexed by step number. */
  stepDescriptions?: string[];
  /** Per-step conditional-visibility rules, indexed by step number. */
  stepConditions?: Array<FieldCondition | undefined>;
  /** Explicit number of wizard steps to emit (preserves empty steps). */
  stepCount?: number;
}
