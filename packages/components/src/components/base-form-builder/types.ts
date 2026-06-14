// ─── FormBuilder type definitions ────────────────────────────────────────────
//
// `BaseFormBuilder` is the visual, drag-and-drop authoring counterpart to
// `BaseSchemaForm`: SchemaForm *renders* a JSON Schema, the builder lets a user
// *author* one. The builder's working representation is a (possibly nested)
// tree of {@link BuilderField}s; that tree is converted to — and hydrated back
// from — the very same {@link SchemaFormDefinition} that drives
// `BaseSchemaForm`, so the produced schema can be fed straight into a form with
// no translation layer.

import type {
  Autocapitalize,
  Autocomplete,
  FieldCondition,
  FormFieldType,
  LocationFormat,
} from '../base-schema-form/types';

export type {
  FormFieldType,
  FormJsonSchema,
  SchemaFormDefinition,
  JsonSchemaProperty,
  JsonSchemaType,
  FieldUiOptions,
  FieldCondition,
  FieldConditionLeaf,
  FieldConditionGroup,
  LocationFormat,
  Autocapitalize,
  Autocomplete,
  AutocompleteToken,
} from '../base-schema-form/types';

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
 * `id` used for selection, drag-and-drop, and `v-for` keying. The `id` never
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

/**
 * The payload carried by a `@dnd-kit/vue` draggable so the drag-end handler can
 * tell a palette insertion from a canvas reorder.
 */
export type FormBuilderDragData = { kind: 'palette'; fieldType: FormFieldType } | { kind: 'field'; id: string };

/**
 * The payload carried by a `@dnd-kit/vue` droppable that marks a drop target the
 * builder understands: the root canvas, a field row, a nested field set, or a
 * wizard step.
 */
export type FormBuilderDropData =
  | { kind: 'canvas' }
  | { kind: 'field'; id: string }
  | { kind: 'fieldset'; id: string }
  | { kind: 'step'; step: number };

/** Identifier of the `@dnd-kit/vue` sortable group shared by the root canvas. */
export const CANVAS_GROUP = 'mission-form-builder-canvas';

/**
 * Identifier of the `@dnd-kit/vue` sortable group shared by the palette entries.
 * The palette is its own sortable list so dragging an entry over the canvas is a
 * cross-group sortable move: dnd-kit projects the entry into the canvas list and
 * opens the placeholder gap, previewing where the new field will land. The entry
 * is never consumed — the builder re-adds a fresh field on drop.
 */
export const PALETTE_GROUP = 'mission-form-builder-palette';

/**
 * The `@dnd-kit/vue` sortable `plugins` set used by the builder's canvas field
 * rows. It is deliberately **empty**, which *replaces* dnd-kit's default sortable
 * plugins — most importantly dropping the `OptimisticSortingPlugin`.
 *
 * That plugin live-reorders — and, across groups, re-parents — the sortable DOM
 * nodes on every `dragover` (via `insertAdjacentElement`). With the builder's
 * deeply nested, per-container sortable groups (the root canvas, each wizard
 * step, and every field set) this makes rows visibly "jump around" mid-drag and
 * fights Vue, which only mutates the field tree once, on drop. With the plugin
 * gone every row stays put while dragging; the intended landing spot is previewed
 * instead by the pointer-following `DragOverlay` ghost and the highlighted drop
 * target. The default keyboard sortable plugin is dropped too, but it added
 * nothing here — the drag handle is `aria-hidden` and not focusable, so keyboard
 * reordering is provided solely by the explicit move-up / move-down row buttons.
 *
 * Pass it through a getter (`plugins: () => CANVAS_SORTABLE_PLUGINS`) so Vue's
 * `toValue` returns the array as-is instead of invoking it as a getter.
 */
export const CANVAS_SORTABLE_PLUGINS: [] = [];

/**
 * Builds the sortable group id for a canvas container: the root canvas list when
 * `parentId` is omitted, or a per-field-set group keyed by the owning field's
 * id, so dnd-kit reorders rows only within their own container.
 */
export function canvasGroup(parentId?: string): string {
  return parentId ? `${CANVAS_GROUP}:${parentId}` : CANVAS_GROUP;
}

/**
 * Builds the sortable group id for a wizard **step** list. In wizard mode the
 * root canvas is split into one list per step, each in its own group. A distinct
 * `#step:` separator keeps these ids from colliding with field-set groups.
 */
export function canvasStepGroup(step: number): string {
  return `${CANVAS_GROUP}#step:${step}`;
}

/**
 * The inverse of {@link canvasStepGroup}: extracts the zero-based step index from
 * a wizard step sortable group, or `undefined` for any non-step group.
 */
export function canvasGroupStep(group: unknown): number | undefined {
  if (typeof group !== 'string') return undefined;
  const prefix = `${CANVAS_GROUP}#step:`;
  if (!group.startsWith(prefix)) return undefined;
  const step = Number(group.slice(prefix.length));
  return Number.isInteger(step) && step >= 0 ? step : undefined;
}

/**
 * The inverse of {@link canvasGroup}: extracts the owning field-set id from a
 * canvas group, or `undefined` for the root canvas (and any non-canvas group).
 */
export function canvasGroupParentId(group: unknown): string | undefined {
  if (typeof group !== 'string') return undefined;
  if (group === CANVAS_GROUP) return undefined;
  const prefix = `${CANVAS_GROUP}:`;
  return group.startsWith(prefix) ? group.slice(prefix.length) : undefined;
}

/** Whether a `@dnd-kit/vue` sortable `group` belongs to the builder canvas. */
export function isCanvasGroup(group: unknown): boolean {
  return group === CANVAS_GROUP || canvasGroupParentId(group) !== undefined || canvasGroupStep(group) !== undefined;
}
