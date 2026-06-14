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

import type { LocationFormat } from '../base-location-input/location';
import type { JSONType } from 'ajv';

/** Re-export of Ajv's compiled JSON Schema object type. */
export type { SchemaObject } from 'ajv';

/** Re-export of the canonical location value types used by the `location` widget. */
export type { LocationFormat, LocationValue } from '../base-location-input/location';

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
  | 'stepper'
  | 'url'
  | 'tel'
  | 'textarea'
  | 'markdown'
  | 'checkbox'
  | 'switch'
  | 'select'
  | 'radio'
  | 'multiselect'
  | 'date'
  | 'time'
  | 'datetime'
  | 'daterange'
  | 'timerange'
  | 'datetimerange'
  | 'location'
  | 'file'
  | 'fieldset';

// ─── Conditional field blocks ─────────────────────────────────────────────────
//
// A field (or field set / "input group") can declare a `ui.visibleWhen`
// condition so it is shown only when other fields hold particular values.
// Conditions are expressed declaratively in the JSON Schema and combined with
// the familiar `allOf` / `anyOf` / `oneOf` keywords, mirroring JSON Schema's own
// boolean combinators.

/**
 * A single leaf condition that tests one field's current value.  Exactly one
 * comparator is normally set; when several are present they must *all* hold for
 * the leaf to pass.
 */
export interface FieldConditionLeaf {
  /** The (optionally dotted) key of the field whose value is tested. */
  field: string;
  /** Passes when the value strictly equals this. */
  equals?: string | number | boolean;
  /** Passes when the value does **not** equal this. */
  notEquals?: string | number | boolean;
  /** Passes when the value is one of these (handy for `select` / `radio`). */
  in?: Array<string | number | boolean>;
  /** Passes when the value contains this entry (for `multiselect` arrays). */
  contains?: string | number | boolean;
  /** Passes when the numeric value is greater than this. */
  gt?: number;
  /** Passes when the numeric value is greater than or equal to this. */
  gte?: number;
  /** Passes when the numeric value is less than this. */
  lt?: number;
  /** Passes when the numeric value is less than or equal to this. */
  lte?: number;
  /**
   * When `true`, passes if the value is "filled" (non-empty / truthy); when
   * `false`, passes if it is empty / falsy.  Useful to reveal a block once any
   * value has been entered.
   */
  truthy?: boolean;
}

/**
 * A combinator grouping nested {@link FieldCondition}s.  Mirrors JSON Schema's
 * boolean keywords:
 *
 * - `allOf` — passes when **every** nested condition passes (logical AND).
 * - `anyOf` — passes when **at least one** passes (logical OR).
 * - `oneOf` — passes when **exactly one** passes (logical XOR).
 *
 * Multiple keywords on the same group are themselves AND-ed together.
 */
export interface FieldConditionGroup {
  /** Passes when every nested condition passes. */
  allOf?: FieldCondition[];
  /** Passes when at least one nested condition passes. */
  anyOf?: FieldCondition[];
  /** Passes when exactly one nested condition passes. */
  oneOf?: FieldCondition[];
}

/** Either a leaf comparison or a boolean combinator of nested conditions. */
export type FieldCondition = FieldConditionLeaf | FieldConditionGroup;

/**
 * JSON Schema primitive types supported by SchemaForm — the subset of Ajv's
 * own {@link JSONType} that maps onto a form control.
 */
export type JsonSchemaType = Extract<JSONType, 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'>;

/** JSON Schema string `format` values SchemaForm understands. */
export type JsonSchemaStringFormat = 'email' | 'url' | 'tel' | 'password' | 'date' | 'time' | 'date-time';

/** Native `autocapitalize` hint values for text-like inputs. */
export type Autocapitalize = 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';

/**
 * The standard HTML `autocomplete` tokens, as catalogued by MDN
 * (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete).
 *
 * These are the named *detail* tokens a single text-like input can advertise so
 * browsers and password managers can offer the right saved value. The list
 * intentionally omits the grouping/section modifiers (`section-*`, `shipping`,
 * `billing`, `home`, `work`, …) that only ever prefix one of these tokens — a
 * `(string & {})` member keeps such compound values (e.g. `'shipping street-address'`)
 * assignable while still surfacing the known tokens to editor autocompletion.
 */
export type AutocompleteToken =
  | 'off'
  | 'on'
  | 'name'
  | 'honorific-prefix'
  | 'given-name'
  | 'additional-name'
  | 'family-name'
  | 'honorific-suffix'
  | 'nickname'
  | 'email'
  | 'username'
  | 'new-password'
  | 'current-password'
  | 'one-time-code'
  | 'organization-title'
  | 'organization'
  | 'street-address'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'address-level4'
  | 'address-level3'
  | 'address-level2'
  | 'address-level1'
  | 'country'
  | 'country-name'
  | 'postal-code'
  | 'cc-name'
  | 'cc-given-name'
  | 'cc-additional-name'
  | 'cc-family-name'
  | 'cc-number'
  | 'cc-exp'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-csc'
  | 'cc-type'
  | 'transaction-currency'
  | 'transaction-amount'
  | 'language'
  | 'bday'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'sex'
  | 'tel'
  | 'tel-country-code'
  | 'tel-national'
  | 'tel-area-code'
  | 'tel-local'
  | 'tel-local-prefix'
  | 'tel-local-suffix'
  | 'tel-extension'
  | 'impp'
  | 'url'
  | 'photo'
  | 'webauthn';

/**
 * The native `autocomplete` value for a text-like input. One of the standard
 * {@link AutocompleteToken}s, or any other string for the rarer compound /
 * section-prefixed forms the spec also allows.
 */
export type Autocomplete = AutocompleteToken | (string & {});

/**
 * Selectable `autocomplete` tokens grouped for a builder dropdown. The `group`
 * key lets a consumer render `<optgroup>`-style sections; values are the raw
 * {@link AutocompleteToken}s written to the input's `autocomplete` attribute.
 */
export const AUTOCOMPLETE_OPTIONS: ReadonlyArray<{ group: string; label: string; value: AutocompleteToken }> = [
  { group: 'General', label: 'On (let the browser decide)', value: 'on' },
  { group: 'General', label: 'Off (disable autofill)', value: 'off' },
  { group: 'Contact', label: 'Email', value: 'email' },
  { group: 'Contact', label: 'Phone', value: 'tel' },
  { group: 'Contact', label: 'Phone — country code', value: 'tel-country-code' },
  { group: 'Contact', label: 'Phone — national number', value: 'tel-national' },
  { group: 'Contact', label: 'Phone — area code', value: 'tel-area-code' },
  { group: 'Contact', label: 'Phone — local number', value: 'tel-local' },
  { group: 'Contact', label: 'Phone — extension', value: 'tel-extension' },
  { group: 'Contact', label: 'URL / homepage', value: 'url' },
  { group: 'Contact', label: 'Instant-messaging handle', value: 'impp' },
  { group: 'Contact', label: 'Photo / avatar URL', value: 'photo' },
  { group: 'Name', label: 'Full name', value: 'name' },
  { group: 'Name', label: 'Honorific prefix (Mr, Ms, Dr…)', value: 'honorific-prefix' },
  { group: 'Name', label: 'Given (first) name', value: 'given-name' },
  { group: 'Name', label: 'Additional (middle) name', value: 'additional-name' },
  { group: 'Name', label: 'Family (last) name', value: 'family-name' },
  { group: 'Name', label: 'Honorific suffix (Jr, PhD…)', value: 'honorific-suffix' },
  { group: 'Name', label: 'Nickname', value: 'nickname' },
  { group: 'Account', label: 'Username', value: 'username' },
  { group: 'Account', label: 'New password', value: 'new-password' },
  { group: 'Account', label: 'Current password', value: 'current-password' },
  { group: 'Account', label: 'One-time code', value: 'one-time-code' },
  { group: 'Account', label: 'WebAuthn credential', value: 'webauthn' },
  { group: 'Organization', label: 'Organization name', value: 'organization' },
  { group: 'Organization', label: 'Job title', value: 'organization-title' },
  { group: 'Address', label: 'Street address (full)', value: 'street-address' },
  { group: 'Address', label: 'Address line 1', value: 'address-line1' },
  { group: 'Address', label: 'Address line 2', value: 'address-line2' },
  { group: 'Address', label: 'Address line 3', value: 'address-line3' },
  { group: 'Address', label: 'Address level 1 (state / province)', value: 'address-level1' },
  { group: 'Address', label: 'Address level 2 (city)', value: 'address-level2' },
  { group: 'Address', label: 'Address level 3', value: 'address-level3' },
  { group: 'Address', label: 'Address level 4', value: 'address-level4' },
  { group: 'Address', label: 'Country code', value: 'country' },
  { group: 'Address', label: 'Country name', value: 'country-name' },
  { group: 'Address', label: 'Postal / ZIP code', value: 'postal-code' },
  { group: 'Payment', label: 'Cardholder name', value: 'cc-name' },
  { group: 'Payment', label: 'Card number', value: 'cc-number' },
  { group: 'Payment', label: 'Card expiry', value: 'cc-exp' },
  { group: 'Payment', label: 'Card expiry month', value: 'cc-exp-month' },
  { group: 'Payment', label: 'Card expiry year', value: 'cc-exp-year' },
  { group: 'Payment', label: 'Card security code (CVC)', value: 'cc-csc' },
  { group: 'Payment', label: 'Card type', value: 'cc-type' },
  { group: 'Payment', label: 'Transaction currency', value: 'transaction-currency' },
  { group: 'Payment', label: 'Transaction amount', value: 'transaction-amount' },
  { group: 'Personal', label: 'Birthday', value: 'bday' },
  { group: 'Personal', label: 'Birthday — day', value: 'bday-day' },
  { group: 'Personal', label: 'Birthday — month', value: 'bday-month' },
  { group: 'Personal', label: 'Birthday — year', value: 'bday-year' },
  { group: 'Personal', label: 'Sex / gender', value: 'sex' },
  { group: 'Personal', label: 'Preferred language', value: 'language' },
];

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
  /** Accepted file types for the `file` widget (the input's `accept` attr). */
  accept?: string;
  /**
   * For the `file` widget, the native `capture` hint (prefer a device camera /
   * microphone); for the `email` widget, allow multiple comma-separated
   * addresses.
   */
  multiple?: boolean;
  /**
   * Native `capture` hint for the `file` widget — prefer a device camera /
   * microphone, optionally the user-facing (`'user'`) or rear (`'environment'`)
   * camera.
   */
  capture?: boolean | 'user' | 'environment';
  /** Native `autocomplete` token for text-like inputs (e.g. `'email'`, `'off'`). */
  autocomplete?: Autocomplete;
  /** Native `autocapitalize` hint for text-like inputs. */
  autocapitalize?: Autocapitalize;
  /** Autocomplete suggestions for text-like inputs, rendered as a `<datalist>`. */
  suggestions?: Array<string | number>;
  /** Earliest selectable date (`YYYY-MM-DD`) for date / date-range widgets. */
  minDate?: string;
  /** Latest selectable date (`YYYY-MM-DD`) for date / date-range widgets. */
  maxDate?: string;
  /** Disable the individual field. */
  disabled?: boolean;
  /**
   * Human-readable labels for `enum` values, keyed by the stringified value.
   * Only used when options are declared via `enum` (use `oneOf` for inline
   * labels instead).
   */
  enumLabels?: Record<string, string>;
  /**
   * For `number` / `stepper` widgets: when `true` only whole numbers are
   * accepted; pair with {@link unsigned} to disallow negatives.  Mirrors a
   * JSON Schema `type: 'integer'`.
   */
  integer?: boolean;
  /**
   * For `number` / `stepper` widgets: when `true` negative values are
   * disallowed (the control clamps at, and validation enforces, `minimum: 0`).
   */
  unsigned?: boolean;
  /**
   * For float `number` / `stepper` widgets: the number of fractional digits the
   * value is rounded/displayed to.  Centimetre-grade coordinates, for example,
   * use `7`.  Ignored when {@link integer} is set.
   */
  precision?: number;
  /** Increment/decrement step for the `stepper` widget (defaults to `1`). */
  step?: number;
  /** Whether the `time` / `datetime` controls expose a seconds field. */
  showSeconds?: boolean;
  /** The coordinate variant entered/serialised by the `location` widget. */
  locationFormat?: LocationFormat;
  /**
   * Conditional-visibility rule: the field (or field set) renders only while
   * this condition holds against the rest of the form's values.  Hidden fields
   * are excluded from validation, so a hidden-but-required field never blocks
   * submission.
   */
  visibleWhen?: FieldCondition;
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
  /** Exclusive numeric minimum (value must be strictly greater). */
  exclusiveMinimum?: number;
  /** Exclusive numeric maximum (value must be strictly less). */
  exclusiveMaximum?: number;
  /** The value must be a multiple of this (e.g. `0.01` for two decimals). */
  multipleOf?: number;
  /** Allowed values (renders a select/radio control). */
  enum?: Array<string | number>;
  /** Allowed values with inline labels (renders a select/radio control). */
  oneOf?: Array<{ const: string | number; title?: string }>;
  /**
   * Nested property map for a grouped `object`-typed property (a *field set*).
   * Insertion order is render order, mirroring the top-level
   * {@link FormJsonSchema.properties}.
   */
  properties?: Record<string, JsonSchemaProperty>;
  /** Keys that are required within a nested `object` property. */
  required?: string[];
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
  /**
   * Conditional-visibility rule for a **wizard step**.  When set (only
   * meaningful for an entry of a top-level wizard array), the whole step — its
   * indicator entry and its fields — is shown only while this condition holds
   * against the shared form values.  A hidden step is skipped during forward /
   * backward navigation and excluded from validation, so a hidden-but-required
   * field on it never blocks submission.  Mirrors the field-level
   * {@link FieldUiOptions.visibleWhen}.
   */
  visibleWhen?: FieldCondition;
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
  /** Allowed values for `select`, `radio`, and `multiselect` field types. */
  options?: Array<{ label: string; value: string | number }>;
  /** Number of visible rows (textarea / markdown). */
  rows?: number;
  /** Accepted file types for the `file` widget. */
  accept?: string;
  /** Whether the `file` widget accepts multiple files / the `email` widget multiple addresses. */
  multiple?: boolean;
  /** Native `capture` hint for the `file` widget. */
  capture?: boolean | 'user' | 'environment';
  /** Native `autocomplete` token for text-like inputs. */
  autocomplete?: Autocomplete;
  /** Native `autocapitalize` hint for text-like inputs. */
  autocapitalize?: Autocapitalize;
  /** Autocomplete suggestions for text-like inputs (a native `<datalist>`). */
  suggestions?: Array<string | number>;
  /** Earliest selectable date (`YYYY-MM-DD`) for date / date-range widgets. */
  minDate?: string;
  /** Latest selectable date (`YYYY-MM-DD`) for date / date-range widgets. */
  maxDate?: string;
  /** Inclusive numeric minimum (`number` / `stepper`). */
  min?: number;
  /** Inclusive numeric maximum (`number` / `stepper`). */
  max?: number;
  /** Increment/decrement step (`stepper`; also the input `step` attr). */
  step?: number;
  /** Fractional-digit precision for a float `number` / `stepper`. */
  precision?: number;
  /** Whether the numeric field accepts only whole numbers. */
  integer?: boolean;
  /** Whether the numeric field disallows negative values. */
  unsigned?: boolean;
  /** Whether the `time` / `datetime` controls expose a seconds field. */
  showSeconds?: boolean;
  /** The coordinate variant entered/serialised by the `location` widget. */
  locationFormat?: LocationFormat;
  /**
   * Conditional-visibility rule copied from `ui.visibleWhen`.  When present the
   * field renders only while the condition holds against the form's values.
   */
  visibleWhen?: FieldCondition;
  /**
   * Nested child fields for a `fieldset` (a grouped `object` property).  Each
   * child renders into the field set's value object, keyed by its own `key`.
   */
  fields?: FormFieldSchema[];
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
