export { default } from './base-form-builder.vue';

export { useFormBuilder } from './use-form-builder';
export type { UseFormBuilder, UseFormBuilderConfig, InsertTarget } from './use-form-builder';

export {
  DEFAULT_FIELD_TYPES,
  createField,
  nextFieldId,
  builderFieldToProperty,
  fieldsToSchema,
  fieldsToWizardSchema,
  fieldsToDefinition,
  schemaToFields,
  schemaStepTitles,
  schemaStepDescriptions,
  schemaStepConditions,
  fieldKeyError,
  slugify,
  uniqueKey,
  widgetToJsonType,
  widgetHasOptions,
  isNumberWidget,
  isFieldsetWidget,
} from './form-schema';

export {
  CANVAS_GROUP,
  PALETTE_GROUP,
  canvasGroup,
  canvasStepGroup,
  canvasGroupStep,
  canvasGroupParentId,
  isCanvasGroup,
} from './types';

export type {
  BuilderField,
  BuilderFieldOption,
  FieldTypeDescriptor,
  FieldsToSchemaOptions,
  FormBuilderDragData,
  FormBuilderDropData,
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
} from './types';
