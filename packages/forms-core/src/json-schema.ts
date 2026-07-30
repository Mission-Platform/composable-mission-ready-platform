import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { isFieldVisible } from './conditions';

import type {
  FormErrors,
  FormFieldSchema,
  FormFieldType,
  FormJsonSchema,
  FormValues,
  JsonSchemaProperty,
  LocationFormat,
  LocationValue,
  SchemaFormTranslate,
} from './types';
import type { ErrorObject, SchemaObject, ValidateFunction } from 'ajv';

/** A blank {@link LocationValue} for the given format (defaults to `dd`). */
function emptyLocation(format: LocationFormat = 'dd'): LocationValue {
  return { lat: undefined, lng: undefined, format };
}

/** Widgets whose value is an object range `{ start, end }`. */
const RANGE_WIDGETS = new Set<FormFieldType>(['daterange', 'timerange', 'datetimerange']);

/** Whether a widget stores a composite object value (range or location). */
function isCompositeWidget(type: FormFieldType): boolean {
  return RANGE_WIDGETS.has(type) || type === 'location';
}

/** Whether a composite (range / location) value counts as "no input". */
function isCompositeEmpty(type: FormFieldType, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (type === 'location') {
    const loc = value as { lat?: unknown; lng?: unknown };
    return (loc.lat === null || loc.lat === undefined) && (loc.lng === null || loc.lng === undefined);
  }
  const range = value as { start?: unknown; end?: unknown };
  return !range.start && !range.end;
}

// ─── JSON Schema → SchemaForm derivation helpers ──────────────────────────────
//
// The JSON Schema document is the single source of truth.  Everything
// SchemaForm needs is derived from it:
//   • the ordered list of render-ready fields (`jsonSchemaToFields`)
//   • the default value for each field (`jsonSchemaDefaults`)
//   • a validator that checks the form against the schema (`createFormValidator`)
//
// Validation is performed by Ajv (https://ajv.js.org/), which validates the
// JSON Schema directly — callers never author or pass in Zod schemas.

// ─── Field derivation (presentation) ──────────────────────────────────────────

/** Resolve the option list for a property declared via `enum` or `oneOf`. */
function resolveOptions(property: JsonSchemaProperty): Array<{ label: string; value: string | number }> | undefined {
  if (property.oneOf?.length) {
    return property.oneOf.map((entry) => ({
      label: entry.title ?? String(entry.const),
      value: entry.const,
    }));
  }

  if (property.enum?.length) {
    return property.enum.map((value) => ({
      label: property.ui?.enumLabels?.[String(value)] ?? String(value),
      value,
    }));
  }

  return undefined;
}

/** Infer the control to render for a property when `ui.widget` is not set. */
function inferWidget(property: JsonSchemaProperty): FormFieldType {
  if (property.ui?.widget) return property.ui.widget;

  // An `object`-typed property (with or without nested `properties`) is a
  // grouped field set.
  if (property.type === 'object' || property.properties) return 'fieldset';

  if (property.type === 'array') return 'multiselect';

  if (property.enum?.length || property.oneOf?.length) return 'select';

  switch (property.type) {
    case 'boolean': {
      return 'checkbox';
    }
    case 'number':
    case 'integer': {
      return 'number';
    }
    default: {
      if (property.format === 'email') return 'email';
      if (property.format === 'url') return 'url';
      if (property.format === 'tel') return 'tel';
      if (property.format === 'password') return 'password';
      if (property.format === 'date') return 'date';
      if (property.format === 'time') return 'time';
      if (property.format === 'date-time') return 'datetime';
      return 'text';
    }
  }
}

/** Copy the numeric / location / datetime presentation hints onto a field. */
function applyWidgetMeta(field: FormFieldSchema, property: JsonSchemaProperty): void {
  const ui = property.ui;
  if (property.type === 'number' || property.type === 'integer' || field.type === 'stepper') {
    if (typeof property.minimum === 'number') field.min = property.minimum;
    if (typeof property.maximum === 'number') field.max = property.maximum;
    if (ui?.step !== undefined) field.step = ui.step;
    if (ui?.precision !== undefined) field.precision = ui.precision;
    field.integer = ui?.integer ?? property.type === 'integer';
    if (ui?.unsigned) field.unsigned = true;
  }
  if (
    (field.type === 'time' ||
      field.type === 'datetime' ||
      field.type === 'timerange' ||
      field.type === 'datetimerange') &&
    ui?.showSeconds
  )
    field.showSeconds = true;
  if (field.type === 'location') {
    field.locationFormat = ui?.locationFormat ?? 'dd';
  }
  if (ui?.visibleWhen) field.visibleWhen = ui.visibleWhen;
}

/** Derive a single render-ready field, recursing into nested field sets. */
function propertyToField(key: string, property: JsonSchemaProperty, isRequired: boolean): FormFieldSchema {
  const type = inferWidget(property);

  // A field set owns nested child fields rather than a value of its own.
  if (type === 'fieldset') {
    const group: FormFieldSchema = {
      key,
      type,
      label: property.title,
      hint: property.ui?.hint ?? property.description,
      required: isRequired,
      disabled: property.ui?.disabled,
      fields: propertiesToFields(property.properties ?? {}, property.required),
    };
    if (property.ui?.visibleWhen) group.visibleWhen = property.ui.visibleWhen;
    return group;
  }

  const field: FormFieldSchema = {
    key,
    type,
    label: property.title,
    hint: property.ui?.hint ?? property.description,
    placeholder: property.ui?.placeholder,
    required: isRequired,
    disabled: property.ui?.disabled,
    options: resolveOptions(property),
    rows: property.ui?.rows,
    accept: property.ui?.accept,
    multiple: property.ui?.multiple,
    capture: property.ui?.capture,
    autocomplete: property.ui?.autocomplete,
    autocapitalize: property.ui?.autocapitalize,
    suggestions: property.ui?.suggestions,
    minDate: property.ui?.minDate,
    maxDate: property.ui?.maxDate,
  };
  applyWidgetMeta(field, property);
  return field;
}

/** Derive the ordered fields for a `properties` map and its `required` list. */
function propertiesToFields(
  properties: Record<string, JsonSchemaProperty>,
  requiredKeys?: string[],
): FormFieldSchema[] {
  const required = new Set(requiredKeys);
  return Object.entries(properties).map(([key, property]) => propertyToField(key, property, required.has(key)));
}

/**
 * Convert a {@link FormJsonSchema} into the ordered list of render-ready
 * {@link FormFieldSchema} descriptors consumed by the field renderer.  Nested
 * `object` (field set) properties are recursed into, so a field set carries its
 * own ordered `fields`.
 */
export function jsonSchemaToFields(schema: FormJsonSchema): FormFieldSchema[] {
  return propertiesToFields(schema.properties, schema.required);
}

/** The default value for a single property (recursing into nested field sets). */
function propertyDefault(property: JsonSchemaProperty): unknown {
  if (property.default !== undefined) return property.default;

  const widget = property.ui?.widget;
  const type = property.type ?? 'string';

  // Composite (range / location) widgets are object-typed but own a fixed-shape
  // value rather than nested child fields, so they are handled before field sets.
  if (widget === 'location') return emptyLocation(property.ui?.locationFormat ?? 'dd');
  if (widget === 'datetimerange') return { start: '', end: '', timezone: 'browser' };
  if (widget === 'daterange' || widget === 'timerange') return { start: '', end: '' };

  // Field sets default to a nested object of their children's own defaults.
  if (type === 'object' || widget === 'fieldset') {
    return objectDefaults(property.properties ?? {});
  }
  if (widget === 'file') return undefined;
  if (type === 'array' || widget === 'multiselect') return [];
  if (type === 'boolean') return false;
  if (type === 'number' || type === 'integer' || widget === 'stepper') return undefined;
  return '';
}

/** Build the default value object for a `properties` map. */
function objectDefaults(properties: Record<string, JsonSchemaProperty>): FormValues {
  const defaults: FormValues = {};
  for (const [key, property] of Object.entries(properties)) {
    defaults[key] = propertyDefault(property);
  }
  return defaults;
}

/**
 * Compute the default value for each field from the JSON Schema, honouring
 * explicit `default` keywords and falling back to type-appropriate blanks.
 * Field sets recurse into a nested object of their children's defaults.
 */
export function jsonSchemaDefaults(schema: FormJsonSchema): FormValues {
  return objectDefaults(schema.properties);
}

// ─── Validation (Ajv) ─────────────────────────────────────────────────────────

/** Ajv only understands a subset of our `format`s; the rest are input hints. */
const AJV_SUPPORTED_FORMATS = new Set(['email', 'url']);

/**
 * Compile a `properties` map + `required` list into a standard object schema.
 *
 * When `rootValues` is supplied, any property carrying a `ui.visibleWhen`
 * condition that does not currently hold is **omitted** — both from
 * `properties` and from `required` — so a hidden-but-required field never
 * blocks validation.
 */
function objectToStandardSchema(
  properties: Record<string, JsonSchemaProperty>,
  requiredKeys: string[] | undefined,
  rootValues?: FormValues,
): SchemaObject {
  const required = new Set(requiredKeys);
  const standardProperties: Record<string, Record<string, unknown>> = {};

  for (const [key, property] of Object.entries(properties)) {
    if (
      rootValues &&
      property.ui?.visibleWhen &&
      !isFieldVisible({ visibleWhen: property.ui.visibleWhen }, rootValues)
    ) {
      required.delete(key);
      continue;
    }
    standardProperties[key] = propertyToStandardSchema(property, required.has(key), rootValues);
  }

  return {
    type: 'object',
    properties: standardProperties,
    required: [...required],
    additionalProperties: true,
  };
}

/**
 * Translate a single property (with its `ui`/`errorMessage` extensions and
 * `oneOf`-as-options) into a clean, Ajv-compilable schema fragment.  Field sets
 * recurse into a nested `object` schema with their own nested `required` list.
 */
function propertyToStandardSchema(
  property: JsonSchemaProperty,
  isRequired: boolean,
  rootValues?: FormValues,
): Record<string, unknown> {
  const widget = property.ui?.widget;
  const type = property.type ?? 'string';
  const standard: Record<string, unknown> = {};

  // Range / location widgets store a composite object.  Presence is enforced
  // through the owning `required` list (empty composites are pruned before
  // validation); the object's interior is not deeply validated here.  These are
  // object-typed, so they must be handled before the field-set branch below.
  if (widget && isCompositeWidget(widget)) {
    standard.type = 'object';
    if (property.title) standard.title = property.title;
    return standard;
  }

  // Field sets serialise to a nested object schema validated in its own right.
  if (type === 'object' || widget === 'fieldset') {
    const nested = objectToStandardSchema(property.properties ?? {}, property.required, rootValues);
    Object.assign(standard, nested);
    if (property.title) standard.title = property.title;
    return standard;
  }

  // File widgets carry `File` objects that JSON Schema cannot describe; only
  // their presence is enforced (via the owning `required` list).
  if (widget === 'file') {
    if (property.title) standard.title = property.title;
    return standard;
  }

  // Multiselect widgets serialise to an array of allowed values.
  if (type === 'array' || widget === 'multiselect') {
    standard.type = 'array';
    const memberEnum = property.oneOf?.map((entry) => entry.const) ?? property.enum;
    if (memberEnum?.length) standard.items = { enum: memberEnum };
    if (isRequired) standard.minItems = 1;
    if (property.title) standard.title = property.title;
    return standard;
  }

  if (type === 'boolean') {
    standard.type = 'boolean';
    if (isRequired) standard.const = true;
  } else if (type === 'number' || type === 'integer') {
    standard.type = property.ui?.integer ? 'integer' : type;
    if (typeof property.minimum === 'number') standard.minimum = property.minimum;
    else if (property.ui?.unsigned) standard.minimum = 0;
    if (typeof property.maximum === 'number') standard.maximum = property.maximum;
    if (typeof property.exclusiveMinimum === 'number') standard.exclusiveMinimum = property.exclusiveMinimum;
    if (typeof property.exclusiveMaximum === 'number') standard.exclusiveMaximum = property.exclusiveMaximum;
    if (typeof property.multipleOf === 'number') standard.multipleOf = property.multipleOf;
  } else {
    standard.type = 'string';
    // Required strings must be non-empty (empty values are stripped before
    // validation, so a missing-but-required string is caught by `required`).
    if (isRequired) standard.minLength = Math.max(1, property.minLength ?? 0);
    else if (typeof property.minLength === 'number') standard.minLength = property.minLength;
    if (typeof property.maxLength === 'number') standard.maxLength = property.maxLength;
    if (property.pattern) standard.pattern = property.pattern;
    if (property.format && AJV_SUPPORTED_FORMATS.has(property.format)) {
      standard.format = property.format;
    }
  }

  // Enumerations: prefer `oneOf` consts, fall back to `enum`.
  const enumValues = property.oneOf?.map((entry) => entry.const) ?? property.enum;
  if (enumValues?.length) {
    standard.enum = enumValues;
  }

  if (property.title) standard.title = property.title;

  return standard;
}

/**
 * Translate a {@link FormJsonSchema} (with its `ui`/`errorMessage` extensions
 * and `oneOf`-as-options) into a clean, standards-compliant JSON Schema that
 * Ajv can compile.  Required booleans become `const: true` so that an unchecked
 * box fails validation (e.g. "accept terms"); field sets become nested `object`
 * schemas with their own `required` lists.
 */
function toStandardJsonSchema(schema: FormJsonSchema, rootValues?: FormValues): SchemaObject {
  return objectToStandardSchema(schema.properties, schema.required, rootValues);
}

/**
 * Strip values that represent "no input" so optional fields validate cleanly,
 * recursing into nested field-set objects.  Object-typed properties are always
 * forwarded (as a pruned object) so their nested `required` children are still
 * validated.
 */
function pruneObjectValues(
  values: FormValues,
  properties: Record<string, JsonSchemaProperty>,
  rootValues: FormValues,
): FormValues {
  const cleaned: FormValues = {};

  for (const [key, property] of Object.entries(properties)) {
    // Conditionally-hidden fields are dropped entirely, so neither their value
    // constraints nor a `required` entry can fail validation while hidden.
    if (property.ui?.visibleWhen && !isFieldVisible({ visibleWhen: property.ui.visibleWhen }, rootValues)) {
      continue;
    }

    const widget = property.ui?.widget;
    const value = values[key];

    // Empty composite (range / location) values are treated as "no input" so an
    // optional field passes and a required one is caught by the `required` list.
    // Checked before the field-set branch since these are object-typed too.
    if (widget && isCompositeWidget(widget)) {
      if (isCompositeEmpty(widget, value)) continue;
      cleaned[key] = value;
      continue;
    }

    if (property.type === 'object' || widget === 'fieldset') {
      const nested = (values[key] ?? {}) as FormValues;
      cleaned[key] = pruneObjectValues(
        typeof nested === 'object' && nested !== null ? nested : {},
        property.properties ?? {},
        rootValues,
      );
      continue;
    }

    if (value === '' || value === null || value === undefined) continue;
    cleaned[key] = value;
  }

  return cleaned;
}

/** Strip values that represent "no input" so optional fields validate cleanly. */
function pruneEmptyValues(values: FormValues, schema: FormJsonSchema): FormValues {
  return pruneObjectValues(values, schema.properties, values);
}

/** Look up a configured error-message override for a given JSON Schema keyword. */
function messageFor(property: JsonSchemaProperty | undefined, keyword: string): string | undefined {
  const override = property?.errorMessage;
  if (typeof override === 'string') return override;
  if (override && typeof override === 'object') return override[keyword];
  return undefined;
}

/**
 * A localisable description of a validation failure: the i18n message key
 * (resolved under the `errors.` namespace) plus the named interpolation values
 * it needs.  Decoupling the *what* (this descriptor) from the *how* (rendering
 * via a translate function or the English fallback) is what makes the generated
 * messages translatable.
 */
interface MessageDescriptor {
  /** Message key, looked up as `errors.<key>` when a translate fn is present. */
  key: string;
  /** Named interpolation values (always includes the field `label`). */
  params: Record<string, unknown>;
}

/** Built-in English messages, used when no translate function is supplied. */
const FALLBACK_MESSAGES: Record<string, (parameters: Record<string, unknown>) => string> = {
  required: ({ label }) => `${label} is required`,
  minLength: ({ label, limit }) => `${label} must be at least ${limit} character(s)`,
  maxLength: ({ label, limit }) => `${label} must be at most ${limit} character(s)`,
  minimum: ({ label, limit }) => `${label} must be at least ${limit}`,
  maximum: ({ label, limit }) => `${label} must be at most ${limit}`,
  format: ({ label, format }) => `${label} must be a valid ${format}`,
  pattern: ({ label }) => `${label} is invalid`,
  enum: ({ label }) => `${label} must be one of the allowed values`,
  number: ({ label }) => `${label} must be a number`,
  invalid: ({ label }) => `${label} is invalid`,
};

/**
 * Map an Ajv {@link ErrorObject} to a localisable {@link MessageDescriptor}.
 * The `key` selects an `errors.<key>` i18n message; `params` carries the named
 * interpolation values (always including the field `label`).
 */
function describeError(property: JsonSchemaProperty | undefined, key: string, error: ErrorObject): MessageDescriptor {
  // For nested field-set children the key is dotted (e.g. `address.street`);
  // fall back to the leaf segment for a readable label.
  const label = property?.title ?? key.split('.').at(-1) ?? key;
  const parameters = error.params as { limit?: number; format?: string };

  switch (error.keyword) {
    case 'required': {
      return { key: 'required', params: { label } };
    }
    case 'minLength': {
      const limit = parameters.limit ?? 0;
      return limit <= 1 ? { key: 'required', params: { label } } : { key: 'minLength', params: { label, limit } };
    }
    case 'minItems': {
      // A required multiselect with no selection.
      return { key: 'required', params: { label } };
    }
    case 'maxLength': {
      return { key: 'maxLength', params: { label, limit: parameters.limit } };
    }
    case 'minimum': {
      return { key: 'minimum', params: { label, limit: parameters.limit } };
    }
    case 'maximum': {
      return { key: 'maximum', params: { label, limit: parameters.limit } };
    }
    case 'format': {
      return { key: 'format', params: { label, format: parameters.format ?? 'value' } };
    }
    case 'pattern': {
      return { key: 'pattern', params: { label } };
    }
    case 'enum': {
      return { key: 'enum', params: { label } };
    }
    case 'const': {
      // A required boolean (`const: true`) that is unchecked.
      return property?.type === 'boolean'
        ? { key: 'required', params: { label } }
        : { key: 'invalid', params: { label } };
    }
    case 'type': {
      return property?.type === 'number' || property?.type === 'integer'
        ? { key: 'number', params: { label } }
        : { key: 'invalid', params: { label } };
    }
    default: {
      return { key: 'invalid', params: { label } };
    }
  }
}

/** Render a {@link MessageDescriptor} via the translate fn, else English. */
function renderMessage(descriptor: MessageDescriptor, translate?: SchemaFormTranslate): string {
  if (translate) return translate(`errors.${descriptor.key}`, descriptor.params);
  const fallback = FALLBACK_MESSAGES[descriptor.key] ?? FALLBACK_MESSAGES.invalid;
  return fallback(descriptor.params);
}

/**
 * Resolve the property a (possibly dotted, nested) field key points at, walking
 * into nested field-set `properties`.  Returns `undefined` when no such
 * property exists.
 */
function propertyAtPath(schema: FormJsonSchema, key: string): JsonSchemaProperty | undefined {
  let properties: Record<string, JsonSchemaProperty> | undefined = schema.properties;
  let property: JsonSchemaProperty | undefined;
  for (const segment of key.split('.')) {
    property = properties?.[segment];
    if (!property) return undefined;
    properties = property.properties;
  }
  return property;
}

/** Resolve the best error message for a single Ajv error. */
function resolveMessage(
  schema: FormJsonSchema,
  key: string,
  error: ErrorObject,
  translate?: SchemaFormTranslate,
): string {
  const property = propertyAtPath(schema, key);

  // Prefer an explicit per-keyword override, then a "required" override for the
  // keywords that effectively mean "this field is required".  Overrides are
  // authored literals, so they intentionally bypass translation.
  const override =
    messageFor(property, error.keyword) ??
    (['required', 'const'].includes(error.keyword) ? messageFor(property, 'required') : undefined) ??
    (error.keyword === 'minLength' && ((error.params as { limit?: number }).limit ?? 0) <= 1
      ? messageFor(property, 'required')
      : undefined);

  if (override) return override;

  return renderMessage(describeError(property, key, error), translate);
}

/**
 * Map the field key an Ajv error belongs to, as a dotted path for nested
 * field-set children (e.g. `address.street`).
 */
function fieldKeyForError(error: ErrorObject): string | undefined {
  // instancePath looks like "/address/street"; turn it into a dotted path.
  const path = error.instancePath.replace(/^\//, '').split('/').filter(Boolean).join('.');

  if (error.keyword === 'required') {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    if (!missing) return path || undefined;
    return path ? `${path}.${missing}` : missing;
  }

  return path || undefined;
}

/** The validator returned by {@link createFormValidator}. */
export interface FormValidator {
  /** The compiled, standards-compliant JSON Schema (Ajv's `SchemaObject`). */
  readonly jsonSchema: SchemaObject;

  /** Validate `values`; returns per-field errors (empty object when valid). */
  validate(values: FormValues): FormErrors;
}

/** Whether any property in the schema declares a `ui.visibleWhen` condition. */
function hasConditionalFields(properties: Record<string, JsonSchemaProperty>): boolean {
  return Object.values(properties).some(
    (property) =>
      property.ui?.visibleWhen !== undefined ||
      (property.properties ? hasConditionalFields(property.properties) : false),
  );
}

/**
 * Compile a {@link FormJsonSchema} into a reusable validator backed by Ajv.
 * Both presence rules and value constraints come straight from the JSON Schema.
 *
 * Generated error messages are localised through the optional `translate`
 * function (mirroring vue-i18n's `t(key, named)`); when omitted, built-in
 * English messages are used.  Author-supplied `errorMessage` overrides always
 * win and are returned verbatim.
 *
 * Fields gated by a `ui.visibleWhen` condition that does not currently hold are
 * excluded from validation, so a hidden-but-required field never blocks
 * submission.
 */
export function createFormValidator(schema: FormJsonSchema, translate?: SchemaFormTranslate): FormValidator {
  // The exposed schema is the full, unconditional one (every field visible).
  const jsonSchema = toStandardJsonSchema(schema);

  // When the form has conditional fields the effective schema depends on the
  // current values (hidden fields drop out of `properties`/`required`), so the
  // validator is recompiled per call; otherwise the precompiled one is reused.
  const conditional = hasConditionalFields(schema.properties);

  // Ajv compiles schemas with `new Function(...)`, which the Cloudflare Workers
  // runtime forbids ("Code generation from strings disallowed for this
  // context"). Compilation is therefore deferred until `validate()` is first
  // called: validation only ever runs in response to client interaction, never
  // during SSR, so the worker never triggers runtime code generation.
  let ajv: Ajv | undefined;
  let baseValidate: ValidateFunction | undefined;

  const getAjv = (): Ajv => {
    if (!ajv) {
      ajv = new Ajv({ allErrors: true, coerceTypes: true, strict: false });
      addFormats(ajv);
    }
    return ajv;
  };

  return {
    jsonSchema,
    validate(values: FormValues): FormErrors {
      const errors: FormErrors = {};
      const instance = getAjv();
      const validateFunction = conditional
        ? instance.compile(toStandardJsonSchema(schema, values))
        : (baseValidate ??= instance.compile(jsonSchema));
      // Validate a pruned clone so empty optional fields pass and the caller's
      // reactive state is never mutated by Ajv's type coercion.
      const data = pruneEmptyValues(values, schema);
      const valid = validateFunction(data);

      if (!valid && validateFunction.errors) {
        for (const error of validateFunction.errors) {
          const key = fieldKeyForError(error);
          if (key && !errors[key]) {
            errors[key] = resolveMessage(schema, key, error, translate);
          }
        }
      }

      return errors;
    },
  };
}
