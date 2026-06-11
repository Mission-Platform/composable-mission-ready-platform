import Ajv from 'ajv';
import addFormats from 'ajv-formats';

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
function resolveOptions(
  property: JsonSchemaProperty,
): Array<{ label: string; value: string | number }> | undefined {
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
      return 'text';
    }
  }
}

/**
 * Convert a {@link FormJsonSchema} into the ordered list of render-ready
 * {@link FormFieldSchema} descriptors consumed by the field renderer.
 */
export function jsonSchemaToFields(schema: FormJsonSchema): FormFieldSchema[] {
  const required = new Set(schema.required);

  return Object.entries(schema.properties).map(([key, property]) => ({
    key,
    type: inferWidget(property),
    label: property.title,
    hint: property.ui?.hint ?? property.description,
    placeholder: property.ui?.placeholder,
    required: required.has(key),
    disabled: property.ui?.disabled,
    options: resolveOptions(property),
    rows: property.ui?.rows,
  }));
}

/**
 * Compute the default value for each field from the JSON Schema, honouring
 * explicit `default` keywords and falling back to type-appropriate blanks.
 */
export function jsonSchemaDefaults(schema: FormJsonSchema): FormValues {
  const defaults: FormValues = {};

  for (const [key, property] of Object.entries(schema.properties)) {
    if (property.default !== undefined) {
      defaults[key] = property.default;
      continue;
    }

    const type = property.type ?? 'string';
    if (type === 'boolean') {
      defaults[key] = false;
    } else if (type === 'number' || type === 'integer') {
      defaults[key] = undefined;
    } else {
      defaults[key] = '';
    }
  }

  return defaults;
}

// ─── Validation (Ajv) ─────────────────────────────────────────────────────────

/** Ajv only understands a subset of our `format`s; the rest are input hints. */
const AJV_SUPPORTED_FORMATS = new Set(['email', 'url']);

/**
 * Translate a {@link FormJsonSchema} (with its `ui`/`errorMessage` extensions
 * and `oneOf`-as-options) into a clean, standards-compliant JSON Schema that
 * Ajv can compile.  Required booleans become `const: true` so that an unchecked
 * box fails validation (e.g. "accept terms").
 */
function toStandardJsonSchema(schema: FormJsonSchema): SchemaObject {
  const required = new Set(schema.required);
  const properties: Record<string, Record<string, unknown>> = {};

  for (const [key, property] of Object.entries(schema.properties)) {
    const type = property.type ?? 'string';
    const isRequired = required.has(key);
    const standard: Record<string, unknown> = {};

    if (type === 'boolean') {
      standard.type = 'boolean';
      if (isRequired) standard.const = true;
    } else if (type === 'number' || type === 'integer') {
      standard.type = type;
      if (typeof property.minimum === 'number') standard.minimum = property.minimum;
      if (typeof property.maximum === 'number') standard.maximum = property.maximum;
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

    properties[key] = standard;
  }

  return {
    type: 'object',
    properties,
    required: [...required],
    additionalProperties: true,
  };
}

/** Strip values that represent "no input" so optional fields validate cleanly. */
function pruneEmptyValues(values: FormValues, schema: FormJsonSchema): FormValues {
  const cleaned: FormValues = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value === null || value === undefined) continue;
    // Only forward keys the schema knows about.
    if (key in schema.properties) cleaned[key] = value;
  }

  return cleaned;
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
function describeError(
  property: JsonSchemaProperty | undefined,
  key: string,
  error: ErrorObject,
): MessageDescriptor {
  const label = property?.title ?? key;
  const parameters = error.params as { limit?: number; format?: string };

  switch (error.keyword) {
    case 'required': {
      return { key: 'required', params: { label } };
    }
    case 'minLength': {
      const limit = parameters.limit ?? 0;
      return limit <= 1
        ? { key: 'required', params: { label } }
        : { key: 'minLength', params: { label, limit } };
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

/** Resolve the best error message for a single Ajv error. */
function resolveMessage(
  schema: FormJsonSchema,
  key: string,
  error: ErrorObject,
  translate?: SchemaFormTranslate,
): string {
  const property = schema.properties[key];

  // Prefer an explicit per-keyword override, then a "required" override for the
  // keywords that effectively mean "this field is required".  Overrides are
  // authored literals, so they intentionally bypass translation.
  const override =
    messageFor(property, error.keyword) ??
    (['required', 'const'].includes(error.keyword) ? messageFor(property, 'required') : undefined) ??
    (error.keyword === 'minLength' &&
    ((error.params as { limit?: number }).limit ?? 0) <= 1
      ? messageFor(property, 'required')
      : undefined);

  if (override) return override;

  return renderMessage(describeError(property, key, error), translate);
}

/** Map the field key an Ajv error belongs to. */
function fieldKeyForError(error: ErrorObject): string | undefined {
  if (error.keyword === 'required') {
    return (error.params as { missingProperty?: string }).missingProperty;
  }
  // instancePath looks like "/email"; take the first segment.
  const segment = error.instancePath.replace(/^\//, '').split('/')[0];
  return segment || undefined;
}

/** The validator returned by {@link createFormValidator}. */
export interface FormValidator {
  /** Validate `values`; returns per-field errors (empty object when valid). */
  validate(values: FormValues): FormErrors;
  /** The compiled, standards-compliant JSON Schema (Ajv's `SchemaObject`). */
  readonly jsonSchema: SchemaObject;
}

/**
 * Compile a {@link FormJsonSchema} into a reusable validator backed by Ajv.
 * Both presence rules and value constraints come straight from the JSON Schema.
 *
 * Generated error messages are localised through the optional `translate`
 * function (mirroring vue-i18n's `t(key, named)`); when omitted, built-in
 * English messages are used.  Author-supplied `errorMessage` overrides always
 * win and are returned verbatim.
 */
export function createFormValidator(
  schema: FormJsonSchema,
  translate?: SchemaFormTranslate,
): FormValidator {
  const ajv = new Ajv({ allErrors: true, coerceTypes: true, strict: false });
  addFormats(ajv);

  const jsonSchema = toStandardJsonSchema(schema);
  const validateFunction: ValidateFunction = ajv.compile(jsonSchema);

  return {
    jsonSchema,
    validate(values: FormValues): FormErrors {
      const errors: FormErrors = {};
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
