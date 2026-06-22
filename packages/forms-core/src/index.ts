// ─── @mission-platform/forms-core ─────────────────────────────────────────────
//
// Framework-agnostic forms core shared by the Vue `@mission-platform/components`
// SchemaForm / FormBuilder and the write-once `@mission-platform/components`
// counterparts.  Both frameworks derive their fields, validate, evaluate
// conditional visibility, and convert builder fields ⇄ JSON Schema through this
// single implementation, so they stay in parity by construction.

// Schema-form type surface (JSON Schema dialect + render-ready field shape).
export type {
  Autocapitalize,
  Autocomplete,
  AutocompleteToken,
  FieldCondition,
  FieldConditionGroup,
  FieldConditionLeaf,
  FieldUiOptions,
  FormErrors,
  FormFieldSchema,
  FormFieldType,
  FormJsonSchema,
  FormValues,
  JsonSchemaProperty,
  JsonSchemaStringFormat,
  JsonSchemaType,
  LocationFormat,
  LocationValue,
  SchemaFormDefinition,
  SchemaFormTranslate,
  SchemaFormValidationMode,
  SchemaObject,
} from './types';
export { AUTOCOMPLETE_OPTIONS } from './types';

// Conditional-visibility evaluation.
export { evaluateCondition, isFieldVisible } from './conditions';

// JSON Schema → render-ready fields / defaults + Ajv validation.
export { createFormValidator, jsonSchemaDefaults, jsonSchemaToFields } from './json-schema';
export type { FormValidator } from './json-schema';

// Form-builder working model.
export type { BuilderField, BuilderFieldOption, FieldsToSchemaOptions, FieldTypeDescriptor } from './builder-types';

// Form-builder field ⇄ JSON Schema conversion.
export {
  builderFieldToProperty,
  createField,
  DEFAULT_FIELD_TYPES,
  fieldKeyError,
  fieldsToDefinition,
  fieldsToSchema,
  fieldsToWizardSchema,
  isDateWidget,
  isFieldsetWidget,
  isFileWidget,
  isLocationWidget,
  isMultilineWidget,
  isNumberWidget,
  isTextWidget,
  isTimeWidget,
  nextFieldId,
  schemaStepConditions,
  schemaStepDescriptions,
  schemaStepTitles,
  schemaToFields,
  slugify,
  uniqueKey,
  widgetHasOptions,
  widgetToJsonType,
} from './form-schema';
