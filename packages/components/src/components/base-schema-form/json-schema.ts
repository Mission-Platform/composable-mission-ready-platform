import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { emptyLocation } from '../base-location-input/location';

import { isFieldVisible } from './conditions';

import type {
  SchemaFormTranslate,
  FormErrors,
  FormFieldSchema,
  FormFieldType,
  FormJsonSchema,
  FormValues,
  JsonSchemaProperty,
} from './types';
import type { ErrorObject, SchemaObject, ValidateFunction } from 'ajv';

/** Widgets whose value is an object range `{ start, end }`. */
const RANGE_WIDGETS = new Set<FormFieldType>(['daterange', 'timerange', 'datetimerange']);

/** Whether a widget stores a composite object value (range or location). */
function isCompositeWidget(type: FormFieldType): boolean {
  return RANGE_WIDGETS.has(type) || type === 'location';
}

/** Whether a composite (range / location) value counts as "no input". */
function isCompositeEmpty(type: FormFieldType, value: unknown): boolean {
  if (value == null) return true;
  const checkers: Record<string, (v: unknown) => boolean> = {
    location: (v) => {
      const loc = v as { lat?: unknown; lng?: unknown };
      return loc.lat == null && loc.lng == null;
    },
    default: (v) => {
      const range = v as { start?: unknown; end?: unknown };
      return !range.start && !range.end;
    },
  };
  const checker = checkers[type] || checkers.default;
  return checker(value);
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

  const typeWidgetMap: Record<string, FormFieldType> = {
    boolean: 'checkbox',
    number: 'number',
    integer: 'number'
  };

  if (typeWidgetMap[property.type]) {
    return typeWidgetMap[property.type];
  }

  const formatWidgetMap: Record<string, FormFieldType> = {
    email: 'email',
    url: 'url',
    tel: 'tel',
    password: 'password',
    date: 'date',
    time: 'time',
    'date-time': 'datetime'
  };

  return formatWidgetMap[property.format] || 'text';
}

/** Copy the numeric / location / datetime presentation hints onto a field. */
function applyWidgetMeta(field: FormFieldSchema, property: JsonSchemaProperty): void {
  const ui = property.ui;

  const numberHandler = (field: FormFieldSchema, property: JsonSchemaProperty, ui: any) => {
    if (typeof property.minimum === 'number') field.min = property.minimum;
    if (typeof property.maximum === 'number') field.max = property.maximum;
    if (ui?.step !== undefined) field.step = ui.step;
    if (ui?.precision !== undefined) field.precision = ui.precision;
    field.integer = ui?.integer ?? property.type === 'integer';
    if (ui?.unsigned) field.unsigned = true;
  };

  const metaHandlers: Record<string, (field: FormFieldSchema, property: JsonSchemaProperty, ui: any) => void> = {
    number: numberHandler,
    integer: numberHandler,
    stepper: numberHandler,
    time: (field, property, ui) => {
      if (ui?.showSeconds) field.showSeconds = true;
    },
    datetime: (field, property, ui) => {
      if (ui?.showSeconds) field.showSeconds = true;
    },
    timerange: (field, property, ui) => {
      if (ui?.showSeconds) field.showSeconds = true;
    },
    datetimerange: (field, property, ui) => {
      if (ui?.showSeconds) field.showSeconds = true;
    },
    location: (field, property, ui) => {
      field.locationFormat = ui?.locationFormat ?? 'dd';
    },
  };

  const typeKey = property.type in metaHandlers ? property.type : field.type;
  const handler = metaHandlers[typeKey];
  if (handler) handler(field, property, ui);

  if (ui?.visibleWhen) field.visibleWhen = ui.visibleWhen;
}

/** Derive a single render-ready field, recursing into nested field sets. */
function propertyToField(key: string, property: JsonSchemaProperty, isRequired: boolean): FormFieldSchema {
  const type = inferWidget(property);

  const fieldBuilders: Record<string, () => FormFieldSchema> = {
    // A field set owns nested child fields rather than a value of its own.
    fieldset: () => {
      const group: FormFieldSchema = {
        key,
        type,
        label: property.title,
        hint: property.ui?.hint ?? property.description,
        required: isRequired,
        disabled: property.ui?.disabled,
        fields: propertiesToFields(property.properties ?? {}, property.required),
        visibleWhen: property.ui?.visibleWhen,
      };
      return group;
    },
    default: () => {
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
    },
  };

  return (fieldBuilders[type] || fieldBuilders.default)();
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
  const widgetDefaults: Record<string, unknown> = {
    location: emptyLocation(property.ui?.locationFormat ?? 'dd'),
    datetimerange: { start: '', end: '', timezone: 'browser' },
    daterange: { start: '', end: '' },
    timerange: { start: '', end: '' },
    file: undefined,
    multiselect: [],
    stepper: undefined,
    fieldset: objectDefaults(property.properties ?? {}),
  };
  if (widget && Object.prototype.hasOwnProperty.call(widgetDefaults, widget)) {
    return widgetDefaults[widget];
  }

  const typeDefaults: Record<string, unknown> = {
    object: objectDefaults(property.properties ?? {}),
    array: [],
    boolean: false,
    number: undefined,
    integer: undefined,
  };
  if (Object.prototype.hasOwnProperty.call(typeDefaults, type)) {
    return typeDefaults[type];
  }
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
  const title = property.title;

  // Determine which schema handler to use
  let mode: string;
  if (widget && isCompositeWidget(widget)) {
    mode = 'composite';
  } else if (widget === 'fieldset' || type === 'object') {
    mode = 'fieldset';
  } else {
    mode = widget || type;
  }

  const handlers: Record<string, (s: Record<string, unknown>) => Record<string, unknown>> = {
    composite: (s) => {
      s.type = 'object';
      if (title) s.title = title;
      return s;
    },
    fieldset: (s) => {
      const nested = objectToStandardSchema(property.properties ?? {}, property.required, rootValues);
      Object.assign(s, nested);
      if (title) s.title = title;
      return s;
    },
    string: (s) => {
      s.type = 'string';
      if (title) s.title = title;
      return s;
    },
    number: (s) => {
      s.type = 'number';
      if (title) s.title = title;
      return s;
    },
    integer: (s) => {
      s.type = 'integer';
      if (title) s.title = title;
      return s;
    },
    boolean: (s) => {
      s.type = 'boolean';
      if (title) s.title = title;
      return s;
    },
    default: (s) => {
      s.type = type;
      if (title) s.title = title;
      return s;
    },
  };

  const handler = handlers[mode] || handlers.default;
  return handler(standard);
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
  const entries = Object.entries(properties);

  const conditionHandlers: Array<{ check: (ctx: { key: string; property: JsonSchemaProperty; widget: string | undefined; value: any; values: FormValues; rootValues: FormValues; cleaned: FormValues; }) => boolean; handle: (ctx: { key: string; property: JsonSchemaProperty; widget: string | undefined; value: any; values: FormValues; rootValues: FormValues; cleaned: FormValues; }) => boolean | void; }> = [
    {
      check: (ctx) =>
        ctx.property.ui?.visibleWhen &&
        !isFieldVisible({ visibleWhen: ctx.property.ui.visibleWhen }, ctx.rootValues),
      handle: () => true, // skip
    },
    {
      check: (ctx) => ctx.widget && isCompositeWidget(ctx.widget),
      handle: (ctx) => {
        if (isCompositeEmpty(ctx.widget, ctx.value)) return true;
        ctx.cleaned[ctx.key] = ctx.value;
        return true;
      },
    },
    {
      check: (ctx) =>
        ctx.property.type === 'object' || ctx.widget === 'fieldset',
      handle: (ctx) => {
        const nested = (ctx.values[ctx.key] ?? {}) as FormValues;
        ctx.cleaned[ctx.key] = pruneObjectValues(
          typeof nested === 'object' && nested !== null ? nested : {},
          ctx.property.properties ?? {},
          ctx.rootValues,
        );
        return true;
      },
    },
    {
      check: (ctx) => ctx.value === '' || ctx.value === null || ctx.value === undefined,
      handle: () => true, // skip
    },
    {
      check: () => true,
      handle: (ctx) => {
        ctx.cleaned[ctx.key] = ctx.value;
        return true;
      },
    },
  ];

  for (const [key, property] of entries) {
    const widget = property.ui?.widget;
    const value = values[key];
    const ctx = { key, property, widget, value, values, rootValues, cleaned };
    for (const handler of conditionHandlers) {
      if (handler.check(ctx)) {
        handler.handle(ctx);
        break;
      }
    }
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

const ERROR_DESCRIPTOR_MAP: Record<string, (label: string, parameters: { limit?: number; format?: string }) => MessageDescriptor> = {
  required: (label) => ({ key: 'required', params: { label } }),
  minLength: (label, { limit }) =>
    (limit ?? 0) <= 1
      ? { key: 'required', params: { label } }
      : { key: 'minLength', params: { label, limit: limit! } },
  minItems: (label) => ({ key: 'required', params: { label } }),
  maxLength: (label, { limit }) => ({ key: 'maxLength', params: { label, limit } }),
  minimum: (label, { limit }) => ({ key: 'minimum', params: { label, limit } }),
  maximum: (label, { limit }) => ({ key: 'maximum', params: { label, limit } }),
  format: (label, { format }) => ({ key: 'format', params: { label, format } }),
  pattern: (label) => ({ key: 'pattern', params: { label } }),
  enum: (label) => ({ key: 'enum', params: { label } }),
  number: (label) => ({ key: 'number', params: { label } }),
  invalid: (label) => ({ key: 'invalid', params: { label } }),
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
  const descriptorFn = ERROR_DESCRIPTOR_MAP[error.keyword];
  if (descriptorFn) {
    return descriptorFn(label, parameters);
  }
  return { key: error.keyword, params: { label } };
}
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
  const overrideMap: Record<string, (params: any) => string | undefined> = {
    required: () => messageFor(property, 'required'),
    const: () => messageFor(property, 'required'),
    minLength: (params) => ((params.limit ?? 0) <= 1 ? messageFor(property, 'required') : undefined),
  };

  const explicit = messageFor(property, error.keyword);
  const mapped = overrideMap[error.keyword]?.(error.params as { limit?: number });

  const override = explicit ?? mapped;

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

  const handlers: Record<string, (err: ErrorObject, p: string) => string | undefined> = {
    required: (err, p) => {
      const missing = (err.params as { missingProperty?: string }).missingProperty;
      if (!missing) return p || undefined;
      return p ? `${p}.${missing}` : missing;
    }
  };

  const handler = handlers[error.keyword];
  return handler ? handler(error, path) : path || undefined;
}

/** The validator returned by {@link createFormValidator}. */
export interface FormValidator {
  /** Validate `values`; returns per-field errors (empty object when valid). */
  validate(values: FormValues): FormErrors;
  /** The compiled, standards-compliant JSON Schema (Ajv's `SchemaObject`). */
  readonly jsonSchema: SchemaObject;
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
  const ajv = new Ajv({ allErrors: true, coerceTypes: true, strict: false });
  addFormats(ajv);

  // The exposed schema is the full, unconditional one (every field visible).
  const jsonSchema = toStandardJsonSchema(schema);
  const baseValidate: ValidateFunction = ajv.compile(jsonSchema);

  // When the form has conditional fields the effective schema depends on the
  // current values (hidden fields drop out of `properties`/`required`), so the
  // validator is recompiled per call; otherwise the precompiled one is reused.
  const conditional = hasConditionalFields(schema.properties);

  return {
    jsonSchema,
    validate(values: FormValues): FormErrors {
      const validateFunction = conditional
        ? ajv.compile(toStandardJsonSchema(schema, values))
        : baseValidate;
      // Validate a pruned clone so empty optional fields pass and the caller's
      // reactive state is never mutated by Ajv's type coercion.
      const data = pruneEmptyValues(values, schema);
      const valid = validateFunction(data);

      return (!valid && validateFunction.errors)
        ? validateFunction.errors.reduce((errorsAcc: FormErrors, error) => {
            const key = fieldKeyForError(error);
            if (key && !errorsAcc[key]) {
              errorsAcc[key] = resolveMessage(schema, key, error, translate);
            }
            return errorsAcc;
          }, {})
        : {};
    },
  };
}
