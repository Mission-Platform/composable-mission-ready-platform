// ─── FormBuilder ⇄ JSON Schema conversion ────────────────────────────────────
//
// Pure, dependency-light helpers that translate between the builder's working
// {@link BuilderField} tree and the {@link SchemaFormDefinition} consumed by
// `BaseSchemaForm`. Keeping the conversion in one isolated, side-effect-free
// module makes it trivial to unit-test the round trip independently of any
// component or drag-and-drop concern.

import { nanoid } from 'nanoid';

import type {
  BuilderField,
  BuilderFieldOption,
  FieldCondition,
  FieldsToSchemaOptions,
  FieldTypeDescriptor,
  FormFieldType,
  FormJsonSchema,
  JsonSchemaProperty,
  JsonSchemaType,
  SchemaFormDefinition,
} from './types';

/** The field types offered in the builder palette, in display order. */
export const DEFAULT_FIELD_TYPES: FieldTypeDescriptor[] = [
  { type: 'text', label: 'Text', description: 'Single-line text' },
  { type: 'textarea', label: 'Text area', description: 'Multi-line text' },
  { type: 'email', label: 'Email', description: 'Email address' },
  { type: 'number', label: 'Number', description: 'Numeric value' },
  { type: 'select', label: 'Select', description: 'Pick one option' },
  { type: 'multiselect', label: 'Multi-select', description: 'Pick several options' },
  { type: 'radio', label: 'Radio group', description: 'Pick one (visible)' },
  { type: 'checkbox', label: 'Checkbox', description: 'A single toggle' },
  { type: 'switch', label: 'Switch', description: 'On / off toggle' },
  { type: 'date', label: 'Date', description: 'Calendar date' },
  { type: 'datetime', label: 'Date & time', description: 'Date with a time' },
  { type: 'file', label: 'File upload', description: 'Attach a file' },
  { type: 'location', label: 'Location', description: 'Map coordinates' },
  { type: 'fieldset', label: 'Field set', description: 'A group of fields' },
];

/** Widgets backed by a JSON Schema `number` (vs `integer`, handled via `ui`). */
const NUMBER_WIDGETS = new Set<FormFieldType>(['number', 'stepper']);

/** Widgets backed by a JSON Schema `boolean`. */
const BOOLEAN_WIDGETS = new Set<FormFieldType>(['checkbox', 'switch']);

/** Widgets that expose an author-defined list of options. */
const OPTION_WIDGETS = new Set<FormFieldType>(['select', 'radio', 'multiselect']);

/** Maps a string-typed widget onto its JSON Schema `format`, when it has one. */
const WIDGET_FORMATS: Partial<Record<FormFieldType, JsonSchemaProperty['format']>> = {
  email: 'email',
  url: 'url',
  tel: 'tel',
  password: 'password',
  date: 'date',
  time: 'time',
  datetime: 'date-time',
};

// ─── Naming helpers ───────────────────────────────────────────────────────────

/** Turns a human label into a safe `snake_case` schema key. */
export function slugify(label: string): string {
  const slug = label
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/gu, '') // strip diacritics
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '_')
    .replaceAll(/^_+|_+$/gu, '');
  return slug || 'field';
}

/** Returns `base`, or `base_2`, `base_3`, … until it no longer collides. */
export function uniqueKey(base: string, used: Iterable<string>): string {
  const taken = new Set(used);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

/**
 * Validates a field key against its siblings: it must be non-empty and unique
 * within its container. Returns a human-readable message, or `undefined` when
 * the key is valid. `siblingKeys` are the keys of the *other* fields in the
 * same container (excluding the field being validated).
 */
export function fieldKeyError(key: string, siblingKeys: Iterable<string>): string | undefined {
  if (!key.trim()) return 'A key is required.';
  if (new Set(siblingKeys).has(key)) return 'Another field in this group already uses this key.';
  return undefined;
}

// ─── Widget classification ─────────────────────────────────────────────────────

/** The JSON Schema primitive type a widget serialises to. */
export function widgetToJsonType(widget: FormFieldType): JsonSchemaType {
  if (NUMBER_WIDGETS.has(widget)) return 'number';
  if (BOOLEAN_WIDGETS.has(widget)) return 'boolean';
  if (widget === 'multiselect') return 'array';
  if (widget === 'fieldset') return 'object';
  return 'string';
}

/** Whether the widget exposes an author-defined option list. */
export function widgetHasOptions(widget: FormFieldType): boolean {
  return OPTION_WIDGETS.has(widget);
}

/** Whether the widget is numeric (`number` / `stepper`). */
export function isNumberWidget(widget: FormFieldType): boolean {
  return NUMBER_WIDGETS.has(widget);
}

/** Whether the widget is a grouping field set. */
export function isFieldsetWidget(widget: FormFieldType): boolean {
  return widget === 'fieldset';
}

// ─── Field factory ─────────────────────────────────────────────────────────────

/** Generates a fresh, collision-resistant builder-field id. */
export function nextFieldId(): string {
  return `field_${nanoid(8)}`;
}

/** A sensible default option list for newly created option-based fields. */
function defaultOptions(): BuilderFieldOption[] {
  return [
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
  ];
}

/** Title-cases a field type into a default human label, e.g. `text` → `Text`. */
function defaultLabel(type: FormFieldType): string {
  const descriptor = DEFAULT_FIELD_TYPES.find((item) => item.type === type);
  return descriptor?.label ?? type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Creates a new {@link BuilderField} of the given `type`. The key is derived
 * from the label (or type) and de-duplicated against `usedKeys`. Field sets
 * start with an empty `children` array; option widgets get two starter options.
 */
export function createField(options: {
  type: FormFieldType;
  label?: string;
  key?: string;
  usedKeys?: Iterable<string>;
}): BuilderField {
  const { type, usedKeys = [] } = options;
  const label = options.label ?? defaultLabel(type);
  const baseKey = options.key ?? slugify(label);
  return {
    id: nextFieldId(),
    key: uniqueKey(baseKey, usedKeys),
    type,
    label,
    required: false,
    options: widgetHasOptions(type) ? defaultOptions() : [],
    ...(isFieldsetWidget(type) ? { children: [] as BuilderField[] } : {}),
  };
}

// ─── Builder field → JSON Schema property ───────────────────────────────────────

/** Drops `undefined` entries so the generated schema stays terse. */
function compact<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as T;
}

/** Returns `true` when the flag is set, else `undefined` (so it is dropped). */
function flag(value: boolean | undefined): true | undefined {
  return value || undefined;
}

/** Returns the list only when it has entries, else `undefined` (so it is dropped). */
function nonEmpty<T>(value: T[] | undefined): T[] | undefined {
  return value && value.length > 0 ? value : undefined;
}

/** Builds the `ui` options object for a field (omitting empty hints). */
function buildUi(field: BuilderField): JsonSchemaProperty['ui'] {
  const ui = compact({
    widget: field.type,
    placeholder: field.placeholder,
    hint: field.hint,
    rows: field.rows,
    accept: field.accept,
    multiple: flag(field.multiple),
    capture: field.capture,
    autocomplete: field.autocomplete,
    autocapitalize: field.autocapitalize,
    suggestions: nonEmpty(field.suggestions),
    minDate: field.minDate,
    maxDate: field.maxDate,
    disabled: flag(field.disabled),
    integer: flag(field.integer),
    unsigned: flag(field.unsigned),
    precision: field.precision,
    step: field.stepAmount,
    showSeconds: flag(field.showSeconds),
    locationFormat: field.locationFormat,
    visibleWhen: field.visibleWhen,
  });
  return ui as JsonSchemaProperty['ui'];
}

/** A schema `title` derived from a field label, or `undefined` when blank. */
function titleOf(field: BuilderField): string | undefined {
  return field.label || undefined;
}

/** Builds the nested `object` property for a field-set field and its children. */
function fieldsetProperty(field: BuilderField): JsonSchemaProperty {
  const children = field.children ?? [];
  return compact({
    type: 'object',
    title: titleOf(field),
    description: field.hint,
    ui: buildUi(field),
    properties: fieldsToProperties(children),
    required: requiredKeys(children),
  }) as JsonSchemaProperty;
}

/** Converts a single {@link BuilderField} into a {@link JsonSchemaProperty}. */
export function builderFieldToProperty(field: BuilderField): JsonSchemaProperty {
  // Field set: a nested object property owning its own children.
  if (isFieldsetWidget(field.type)) return fieldsetProperty(field);

  const property: JsonSchemaProperty = compact({
    type: widgetToJsonType(field.type),
    title: titleOf(field),
    format: WIDGET_FORMATS[field.type],
    minLength: field.minLength,
    maxLength: field.maxLength,
    pattern: field.pattern,
    minimum: field.minimum,
    maximum: field.maximum,
    multipleOf: field.multipleOf,
    default: field.defaultValue,
    ui: buildUi(field),
  });

  if (widgetHasOptions(field.type) && field.options.length > 0) {
    property.oneOf = field.options.map((option) => ({ const: option.value, title: option.label }));
  }

  return property;
}

/** Builds an ordered `{ key: property }` map from a list of fields. */
function fieldsToProperties(fields: BuilderField[]): Record<string, JsonSchemaProperty> {
  const properties: Record<string, JsonSchemaProperty> = {};
  for (const field of fields) properties[field.key] = builderFieldToProperty(field);
  return properties;
}

/** The keys of the required fields in a list (schema `required` array). */
function requiredKeys(fields: BuilderField[]): string[] | undefined {
  const keys = fields.filter((field) => field.required).map((field) => field.key);
  return keys.length > 0 ? keys : undefined;
}

// ─── Builder fields → schema definition ─────────────────────────────────────────

/** Builds a single-step {@link FormJsonSchema} from top-level fields. */
export function fieldsToSchema(fields: BuilderField[], options: FieldsToSchemaOptions = {}): FormJsonSchema {
  return compact({
    type: 'object',
    title: options.title || undefined,
    description: options.description || undefined,
    properties: fieldsToProperties(fields),
    required: requiredKeys(fields),
  }) as FormJsonSchema;
}

/**
 * Builds a multi-step wizard ({@link FormJsonSchema}[]) from a per-step field
 * matrix: `steps[i]` holds the top-level fields assigned to wizard step `i`.
 */
export function fieldsToWizardSchema(steps: BuilderField[][], options: FieldsToSchemaOptions = {}): FormJsonSchema[] {
  const stepTitles = options.stepTitles ?? [];
  const stepDescriptions = options.stepDescriptions ?? [];
  const stepConditions = options.stepConditions ?? [];
  const stepCount = Math.max(
    1,
    options.stepCount ?? 0,
    steps.length,
    stepTitles.length,
    stepDescriptions.length,
    stepConditions.length,
  );

  return Array.from({ length: stepCount }, (_, step) => {
    const stepFields = steps[step] ?? [];
    return compact({
      type: 'object',
      title: stepTitles[step] || undefined,
      description: stepDescriptions[step] || undefined,
      properties: fieldsToProperties(stepFields),
      required: requiredKeys(stepFields),
      visibleWhen: stepConditions[step],
    }) as FormJsonSchema;
  });
}

/**
 * Builds the schema definition, choosing single-step or wizard from `options`.
 * In wizard mode `fields` is the per-step matrix (`BuilderField[][]`); otherwise
 * it is the flat top-level list (`BuilderField[]`).
 */
export function fieldsToDefinition(
  fields: BuilderField[] | BuilderField[][],
  options: FieldsToSchemaOptions = {},
): SchemaFormDefinition {
  return options.wizard
    ? fieldsToWizardSchema(fields as BuilderField[][], options)
    : fieldsToSchema(fields as BuilderField[], options);
}

// ─── JSON Schema → builder fields ───────────────────────────────────────────────

/** Reads the option list from a property's `oneOf` / `enum`. */
function propertyOptions(property: JsonSchemaProperty): BuilderFieldOption[] {
  if (Array.isArray(property.oneOf)) {
    return property.oneOf.map((entry) => ({
      value: String(entry.const),
      label: entry.title ?? String(entry.const),
    }));
  }
  if (Array.isArray(property.enum)) {
    return property.enum.map((value) => ({ value: String(value), label: String(value) }));
  }
  return [];
}

/** JSON-Schema primitive `type` → builder widget, consulted by {@link inferWidget}. */
const JSON_TYPE_WIDGETS: Partial<Record<JsonSchemaType, FormFieldType>> = {
  object: 'fieldset',
  number: 'number',
  integer: 'number',
  boolean: 'checkbox',
  array: 'multiselect',
};

/** JSON-Schema string `format` → builder widget, consulted by {@link inferWidget}. */
const FORMAT_WIDGETS: Partial<Record<NonNullable<JsonSchemaProperty['format']>, FormFieldType>> = {
  email: 'email',
  url: 'url',
  tel: 'tel',
  password: 'password',
  date: 'date',
  time: 'time',
  'date-time': 'datetime',
};

/** Widget implied by a property's structure (nested object, or primitive type). */
function widgetForShape(property: JsonSchemaProperty): FormFieldType | undefined {
  if (property.properties) return 'fieldset';
  return property.type ? JSON_TYPE_WIDGETS[property.type] : undefined;
}

/** Widget implied by a property exposing an enumerated value list. */
function widgetForEnum(property: JsonSchemaProperty): FormFieldType | undefined {
  return property.oneOf || property.enum ? 'select' : undefined;
}

/** Widget implied by a property's string `format` (falls back to plain text). */
function widgetForFormat(format: JsonSchemaProperty['format']): FormFieldType {
  return (format ? FORMAT_WIDGETS[format] : undefined) ?? 'text';
}

/** Infers the builder widget for a property (pinned `ui.widget` wins). */
function inferWidget(property: JsonSchemaProperty): FormFieldType {
  return property.ui?.widget ?? widgetForShape(property) ?? widgetForEnum(property) ?? widgetForFormat(property.format);
}

/** Validation constraints copied verbatim from a schema property onto a field. */
function validationFromProperty(property: JsonSchemaProperty): Partial<BuilderField> {
  return {
    minLength: property.minLength,
    maxLength: property.maxLength,
    pattern: property.pattern,
    minimum: property.minimum,
    maximum: property.maximum,
    multipleOf: property.multipleOf,
  };
}

/** UI hints lifted from a property's `ui` block (and `description`) onto a field. */
function uiHintsFromProperty(property: JsonSchemaProperty): Partial<BuilderField> {
  const ui = property.ui ?? {};
  return {
    placeholder: ui.placeholder,
    hint: ui.hint ?? property.description,
    disabled: flag(ui.disabled),
    rows: ui.rows,
    integer: flag(ui.integer),
    unsigned: flag(ui.unsigned),
    precision: ui.precision,
    stepAmount: ui.step,
    showSeconds: flag(ui.showSeconds),
    locationFormat: ui.locationFormat,
    accept: ui.accept,
    multiple: flag(ui.multiple),
    capture: ui.capture,
    autocomplete: ui.autocomplete,
    autocapitalize: ui.autocapitalize,
    suggestions: ui.suggestions?.map(String),
    minDate: ui.minDate,
    maxDate: ui.maxDate,
    visibleWhen: ui.visibleWhen,
  };
}

/** Hydrates a field-set property's nested child fields. */
function fieldsetChildren(property: JsonSchemaProperty): BuilderField[] {
  return propertiesToFields(property.properties ?? {}, property.required ?? []);
}

/** Converts a single schema property (with its key) into a {@link BuilderField}. */
function propertyToField(key: string, property: JsonSchemaProperty, required: boolean): BuilderField {
  const type = inferWidget(property);

  const field: BuilderField = {
    id: nextFieldId(),
    key,
    type,
    label: property.title ?? key,
    required,
    options: widgetHasOptions(type) ? propertyOptions(property) : [],
    defaultValue: property.default,
    ...validationFromProperty(property),
    ...uiHintsFromProperty(property),
  };

  if (isFieldsetWidget(type)) {
    field.children = fieldsetChildren(property);
  }

  return field;
}

/** Converts an ordered property map into a list of builder fields. */
function propertiesToFields(properties: Record<string, JsonSchemaProperty>, required: string[]): BuilderField[] {
  const requiredSet = new Set(required);
  return Object.entries(properties).map(([key, property]) => propertyToField(key, property, requiredSet.has(key)));
}

/** Normalises a definition into its array-of-steps form. */
function definitionSteps(definition: SchemaFormDefinition | undefined): FormJsonSchema[] {
  if (!definition) return [];
  return Array.isArray(definition) ? definition : [definition];
}

/**
 * Hydrates a {@link SchemaFormDefinition} back into the builder's working field
 * representation. A wizard (array) definition becomes a per-step matrix
 * (`BuilderField[][]`, one inner list per step); a single-step (object)
 * definition becomes a flat list (`BuilderField[]`).
 */
export function schemaToFields(definition: SchemaFormDefinition | undefined): BuilderField[] | BuilderField[][] {
  const steps = definitionSteps(definition);
  if (Array.isArray(definition)) {
    return steps.map((step) => propertiesToFields(step.properties ?? {}, step.required ?? []));
  }
  const [step] = steps;
  return propertiesToFields(step?.properties ?? {}, step?.required ?? []);
}

/** The per-step titles of a wizard definition (empty for a single-step form). */
export function schemaStepTitles(definition: SchemaFormDefinition | undefined): string[] {
  return definitionSteps(definition).map((step) => step.title ?? '');
}

/** The per-step descriptions of a wizard definition. */
export function schemaStepDescriptions(definition: SchemaFormDefinition | undefined): string[] {
  return definitionSteps(definition).map((step) => step.description ?? '');
}

/** The per-step conditional-visibility rules of a wizard definition. */
export function schemaStepConditions(definition: SchemaFormDefinition | undefined): Array<FieldCondition | undefined> {
  return definitionSteps(definition).map((step) => step.visibleWhen);
}
