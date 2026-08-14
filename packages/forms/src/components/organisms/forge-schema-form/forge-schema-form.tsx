import { ForgeButton, ForgeTypography } from '@mission-platform/components';
import { h, type MpChild, type MpElement, Slot, useMemo, useState } from '@mission-platform/forge';
import {
  createFormValidator,
  evaluateCondition,
  type FieldCondition,
  type FormErrors,
  type FormFieldSchema,
  type FormJsonSchema,
  type FormValidator,
  type FormValues,
  isFieldVisible,
  jsonSchemaDefaults,
  jsonSchemaToFields,
  type SchemaFormDefinition,
  type SchemaFormValidationMode,
} from '@mission-platform/forms-core';

import { ForgeCheckbox } from '../../atoms/forge-checkbox';
import { ForgeInput } from '../../atoms/forge-input';
import { ForgeSwitch } from '../../atoms/forge-switch';
import { ForgeTextarea } from '../../atoms/forge-textarea';
import { ForgeDateInput } from '../../molecules/forge-date-input';
import { ForgeDateRangeInput } from '../../molecules/forge-date-range-input';
import { ForgeFieldSet } from '../../molecules/forge-field-set';
import { ForgeFileInput } from '../../molecules/forge-file-input';
import { ForgeLocationInput, type LocationValue } from '../../molecules/forge-location-input';
import { ForgeMultiselect } from '../../molecules/forge-multiselect';
import { ForgeNumberStepper } from '../../molecules/forge-number-stepper';
import { ForgePhoneInput } from '../../molecules/forge-phone-input';
import { ForgeRadioGroup } from '../../molecules/forge-radio-group';
import { ForgeSelect } from '../../molecules/forge-select';
import { ForgeTimeInput } from '../../molecules/forge-time-input';
import { ForgeTimeRangeInput } from '../../molecules/forge-time-range-input';
import sizeStyles from '../../size.module.scss';
import { ForgeDateTimeRangeInput } from '../forge-date-time-range-input';
import { ForgeFormWizard, type WizardStep } from '../forge-form-wizard';

import styles from './forge-schema-form.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type SchemaFormSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Re-export the shared schema-form type surface so consumers of the JSX
// component can import the same names they used from the Vue component.
export type {
  FieldCondition,
  FieldUiOptions,
  FormErrors,
  FormFieldSchema,
  FormFieldType,
  FormJsonSchema,
  FormValues,
  JsonSchemaProperty,
  JsonSchemaStringFormat,
  JsonSchemaType,
  SchemaFormDefinition,
  SchemaFormTranslate,
  SchemaFormValidationMode,
  SchemaObject,
} from '@mission-platform/forms-core';

export interface SchemaFormProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * JSON Schema definition driving both the rendered fields and validation.
   * A single object is a one-step form; an array is a multi-step wizard.
   */
  schema: SchemaFormDefinition;
  /**
   * The current values (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: FormValues;
  /** Size token controlling the form's font scale. Defaults to `'md'`. */
  size?: SchemaFormSize;
  /** Disable the whole form. */
  disabled?: boolean;
  /**
   * Wizard validation strategy. `'per-step'` (default) validates each step
   * before advancing; `'final'` lets the user move freely and only validates
   * on submit. Ignored for single-step forms.
   */
  validationMode?: SchemaFormValidationMode;
  /** Optional renderer for rich fields supplied by a UI package at composition time. */
  renderField?: SchemaFormFieldRenderer;
  /** Fired with the next full values bag (the controlled `v-model` update). */
  onUpdateModelValue?: (values: FormValues) => void;
  /** Fired with the values bag and validity on submit. */
  onSubmit?: (values: FormValues, isValid: boolean) => void;
}

export interface SchemaFormFieldRendererContext {
  field: FormFieldSchema;
  value: unknown;
  error?: string;
  disabled: boolean;
  onUpdateModelValue: (value: unknown) => void;
}

export type SchemaFormFieldRenderer = (context: SchemaFormFieldRendererContext) => MpElement | undefined;

/** A single, render-ready step derived from one {@link FormJsonSchema}. */
interface SchemaFormStep {
  id: string;
  title?: string;
  description?: string;
  fields: FormFieldSchema[];
}

/** The text-like input widget types resolved straight onto `ForgeInput`. */
const TEXT_WIDGETS = new Set(['text', 'email', 'password', 'url']);

/** Whether an error key belongs to a field — directly or as a nested child. */
function errorBelongsToField(errorKey: string, fieldKey: string): boolean {
  return errorKey === fieldKey || errorKey.startsWith(`${fieldKey}.`);
}

/** Read a (possibly dotted) field path out of a values object. */
function valueAtPath(values: FormValues, path: string): unknown {
  let cursor: unknown = values;
  for (const segment of path.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/**
 * Return a shallow clone of `values` with `path` (a plain or dotted key) set to
 * `value`, creating intermediate field-set objects as needed — so React/Vue see
 * a fresh reference and the caller's bag is never mutated in place.
 */
function withPath(values: FormValues, path: string, value: unknown): FormValues {
  const segments = path.split('.');
  const root: FormValues = { ...values };
  let cursor: Record<string, unknown> = root;
  for (const segment of segments.slice(0, -1)) {
    const existing = cursor[segment];
    cursor[segment] = typeof existing === 'object' && existing !== null ? { ...(existing as object) } : {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments.at(-1) as string] = value;
  return root;
}

/**
 * `ForgeSchemaForm` — a JSON-Schema-driven form authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Like the Vue original it is driven entirely by a JSON Schema: both the
 * rendered fields and the validation rules are derived from it through the
 * shared `@mission-platform/forms-core` package (so the two frameworks validate
 * identically — parity by construction). A single object schema renders a
 * one-step form; a top-level **array** renders a multi-step **wizard**. Fields
 * support nested field sets, `ui.visibleWhen` conditional visibility, and Ajv
 * validation surfaced as per-field error messages.
 *
 * Substitutions from the Vue SFC: the dynamic `<component :is>` control
 * resolution is a static `switch` over the (already-shared) resolved field type;
 * the per-step `ForgeSchemaFormField`/`ForgeSchemaFormActions` sub-components are
 * inlined; the `ForgeFormWizard` body slot becomes the active step's `content`
 * prop; generated validation messages use the built-in English fallback (the
 * neutral dialect has no i18n); and `v-model`/emits become callback props with
 * an overridable `actions` slot.
 */
export function ForgeSchemaForm(properties: Readonly<SchemaFormProperties>): MpElement {
  const { schema, modelValue = {}, disabled = false, validationMode = 'per-step', size = 'md' } = properties;

  // Derive the render-ready steps, validators, step conditions, and merged
  // defaults from the schema (the single source of truth).
  const model = useMemo(() => {
    const stepSchemas: FormJsonSchema[] = Array.isArray(schema) ? schema : [schema];
    const steps: SchemaFormStep[] = stepSchemas.map((stepSchema, index) => ({
      id: `step-${index}`,
      title: stepSchema.title,
      description: stepSchema.description,
      fields: jsonSchemaToFields(stepSchema),
    }));
    const validators: FormValidator[] = stepSchemas.map((stepSchema) => createFormValidator(stepSchema));
    const stepConditions: Array<FieldCondition | undefined> = stepSchemas.map((stepSchema) => stepSchema.visibleWhen);
    const defaultValues: FormValues = Object.assign(
      {},
      ...stepSchemas.map((stepSchema) => jsonSchemaDefaults(stepSchema)),
    );
    return { isWizard: Array.isArray(schema), steps, validators, stepConditions, defaultValues };
  }, [schema]);

  const [values, setValues] = useState<FormValues>({ ...model.defaultValues, ...modelValue });
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(0);

  // The absolute indices of the steps currently visible (a step may be hidden
  // by its own `visibleWhen`); never empty, so the form always renders.
  const visibleStepIndices = ((): number[] => {
    const indices = model.steps
      .map((_, index) => index)
      .filter((index) => {
        const condition = model.stepConditions[index];
        return condition ? evaluateCondition(condition, values) : true;
      });
    return indices.length > 0 ? indices : [0];
  })();

  const visibleStepIndexSet = new Set<number>(visibleStepIndices);
  let currentVisiblePosition = 0;
  for (const [position, stepIndex] of visibleStepIndices.entries()) {
    if (stepIndex === currentStep) {
      currentVisiblePosition = position;
      break;
    }
  }
  const activeStepIndex = visibleStepIndexSet.has(currentStep) ? currentStep : (visibleStepIndices[0] ?? 0);
  const currentFields = model.steps[activeStepIndex]?.fields ?? [];

  // Per-step flag: `true` when any field on that step currently has an error.
  const stepHasErrors = model.steps.map((step) =>
    step.fields.some((field) => Object.keys(errors).some((errorKey) => errorBelongsToField(errorKey, field.key))),
  );

  const emitValues = (next: FormValues): void => {
    setValues(next);
    properties.onUpdateModelValue?.(next);
  };

  const onFieldUpdate = (path: string, value: unknown): void => {
    emitValues(withPath(values, path, value));
  };

  const validateStep = (index: number): boolean => {
    const stepErrors = model.validators[index]?.validate(values) ?? {};
    const fieldKeys = model.steps[index].fields.map((field) => field.key);
    const kept: FormErrors = {};
    for (const [key, message] of Object.entries(errors)) {
      if (!fieldKeys.some((fieldKey) => errorBelongsToField(key, fieldKey))) kept[key] = message;
    }
    setErrors({ ...kept, ...stepErrors });
    return Object.keys(stepErrors).length === 0;
  };

  const validate = (): boolean => {
    let merged: FormErrors = {};
    let valid = true;
    for (const index of visibleStepIndices) {
      const stepErrors = model.validators[index]?.validate(values) ?? {};
      merged = { ...merged, ...stepErrors };
      if (Object.keys(stepErrors).length > 0) valid = false;
    }
    setErrors(merged);
    return valid;
  };

  const goTo = (index: number): void => {
    if (visibleStepIndexSet.has(index)) setCurrentStep(index);
  };

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const valid = validate();
    properties.onSubmit?.({ ...values }, valid);
  };

  const handleReset = (event: Event): void => {
    event.preventDefault();
    const fresh = { ...model.defaultValues, ...modelValue };
    setErrors({});
    setCurrentStep(0);
    emitValues(fresh);
  };

  // Wizard navigation: per-step mode gates forward moves on the current step
  // validating; final mode never gates. Positions are within the visible steps.
  const onWizardNavigate = (position: number): void => {
    const targetIndex = visibleStepIndices[position];
    if (targetIndex === undefined) return;
    if (validationMode === 'final' || position <= currentVisiblePosition) {
      goTo(targetIndex);
      return;
    }
    if (validateStep(activeStepIndex)) goTo(targetIndex);
  };

  /** Render one resolved field at `path` (recursing into field sets). */
  const renderField = (field: FormFieldSchema, path: string): MpElement | undefined => {
    if (!isFieldVisible(field, values)) return undefined;

    const value = valueAtPath(values, path);
    const error = errors[path];
    const fieldDisabled = disabled || field.disabled || false;
    const onUpdate = (next: unknown): void => onFieldUpdate(path, next);
    const modelUpdate = { 'onUpdate:modelValue': onUpdate, onUpdateModelValue: onUpdate };

    const renderedField = properties.renderField?.({
      field,
      value,
      error,
      disabled: fieldDisabled,
      onUpdateModelValue: onUpdate,
    });
    if (renderedField !== undefined) return renderedField;

    const type = field.type ?? 'text';

    if (TEXT_WIDGETS.has(type)) {
      return (
        <ForgeInput
          {...modelUpdate}
          autocapitalize={field.autocapitalize}
          autocomplete={field.autocomplete}
          className={styles['forge-schema-form__field']}
          disabled={fieldDisabled}
          error={error}
          hint={field.hint}
          label={field.label}
          list={field.suggestions}
          modelValue={(value as string | number) ?? ''}
          multiple={field.multiple}
          placeholder={field.placeholder}
          required={field.required}
          type={(type === 'text' ? 'text' : type) as 'text' | 'email' | 'password' | 'url'}
        />
      );
    }

    switch (type) {
      case 'tel': {
        return (
          <ForgePhoneInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as string) ?? ''}
            placeholder={field.placeholder}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'number':
      case 'stepper': {
        return (
          <ForgeNumberStepper
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            integer={field.integer}
            label={field.label}
            max={field.max}
            min={field.min}
            modelValue={(value as number) ?? undefined}
            placeholder={field.placeholder}
            precision={field.precision}
            required={field.required}
            step={field.step}
            unsigned={field.unsigned}
            {...modelUpdate}
          />
        );
      }
      case 'textarea': {
        return (
          <ForgeTextarea
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as string) ?? ''}
            placeholder={field.placeholder}
            required={field.required}
            rows={field.rows}
            {...modelUpdate}
          />
        );
      }
      case 'markdown': {
        return (
          <ForgeTextarea
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as string) ?? ''}
            placeholder={field.placeholder}
            required={field.required}
            rows={field.rows}
            {...modelUpdate}
          />
        );
      }
      case 'code': {
        return (
          <fieldset className={[styles['forge-schema-form__field'], styles['forge-schema-form__code']]}>
            {field.label ? (
              <legend className={styles['forge-schema-form__code-legend']}>
                <ForgeTypography
                  as="span"
                  variant="label"
                >
                  {field.label}
                  {field.required ? <span aria-hidden="true"> *</span> : undefined}
                </ForgeTypography>
              </legend>
            ) : undefined}
            <ForgeTextarea
              rows={field.rows ?? 12}
              modelValue={(value as string) ?? ''}
              disabled={fieldDisabled}
              {...modelUpdate}
            />
            {field.hint || error ? (
              <ForgeTypography
                as="p"
                className={[
                  styles['forge-schema-form__code-hint'],
                  {
                    [styles['forge-schema-form__code-hint--error']]: Boolean(error),
                  },
                ]}
                color="inherit"
                variant="caption"
              >
                {error || field.hint}
              </ForgeTypography>
            ) : undefined}
          </fieldset>
        );
      }
      case 'checkbox': {
        return (
          <ForgeCheckbox
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={Boolean(value)}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'switch': {
        return (
          <ForgeSwitch
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={Boolean(value)}
            {...modelUpdate}
          />
        );
      }
      case 'select': {
        return (
          <ForgeSelect
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as string | number) ?? ''}
            options={field.options ?? []}
            placeholder={field.placeholder}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'radio': {
        return (
          <ForgeRadioGroup
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            legend={field.label}
            modelValue={(value as string | number) ?? ''}
            options={(field.options ?? []).map((option) => ({ label: option.label, value: String(option.value) }))}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'multiselect': {
        return (
          <ForgeMultiselect
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as Array<string | number>) ?? []}
            options={field.options ?? []}
            placeholder={field.placeholder}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'datetime': {
        const [date = '', time = ''] = String(value ?? '').split('T');
        const onPartUpdate = (part: 'date' | 'time', next: string): void => {
          const merged = part === 'date' ? { date: next, time } : { date, time: next };
          onUpdate(merged.date || merged.time ? `${merged.date}T${merged.time}` : '');
        };
        return (
          <fieldset className={[styles['forge-schema-form__field'], styles['forge-schema-form__datetime']]}>
            {field.label ? (
              <legend className={styles['forge-schema-form__datetime-legend']}>
                <ForgeTypography
                  as="span"
                  variant="label"
                >
                  {field.label}
                  {field.required ? <span aria-hidden="true"> *</span> : undefined}
                </ForgeTypography>
              </legend>
            ) : undefined}
            <div className={styles['forge-schema-form__datetime-controls']}>
              <ForgeDateInput
                disabled={fieldDisabled}
                label="Date"
                max={field.maxDate}
                min={field.minDate}
                modelValue={date}
                required={field.required}
                onUpdateModelValue={(next: string) => onPartUpdate('date', next)}
              />
              <ForgeTimeInput
                disabled={fieldDisabled}
                label="Time"
                modelValue={time}
                required={field.required}
                onUpdateModelValue={(next: string) => onPartUpdate('time', next)}
              />
            </div>
            {field.hint || error ? (
              <ForgeTypography
                as="p"
                className={[
                  styles['forge-schema-form__datetime-hint'],
                  {
                    [styles['forge-schema-form__datetime-hint--error']]: Boolean(error),
                  },
                ]}
                color="inherit"
                variant="caption"
              >
                {error || field.hint}
              </ForgeTypography>
            ) : undefined}
          </fieldset>
        );
      }
      case 'date': {
        return (
          <ForgeDateInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            max={field.maxDate}
            min={field.minDate}
            modelValue={(value as string) ?? ''}
            placeholder={field.placeholder}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'time': {
        return (
          <ForgeTimeInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as string) ?? ''}
            required={field.required}
            showSeconds={field.showSeconds}
            {...modelUpdate}
          />
        );
      }
      case 'daterange': {
        return (
          <ForgeDateRangeInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            max={field.maxDate}
            min={field.minDate}
            modelValue={(value as { start: string; end: string }) ?? { start: '', end: '' }}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'timerange': {
        return (
          <ForgeTimeRangeInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as { start: string; end: string }) ?? { start: '', end: '' }}
            required={field.required}
            showSeconds={field.showSeconds}
            {...modelUpdate}
          />
        );
      }
      case 'datetimerange': {
        return (
          <ForgeDateTimeRangeInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            max={field.maxDate}
            min={field.minDate}
            modelValue={
              (value as { start: string; end: string; timezone: 'browser' | 'utc' }) ?? {
                start: '',
                end: '',
                timezone: 'browser',
              }
            }
            required={field.required}
            showSeconds={field.showSeconds}
            {...modelUpdate}
          />
        );
      }
      case 'location': {
        return (
          <ForgeLocationInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            format={field.locationFormat}
            hint={field.hint}
            label={field.label}
            modelValue={(value as LocationValue) ?? undefined}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      case 'fieldset': {
        return (
          <ForgeFieldSet
            className={styles['forge-schema-form__field']}
            description={field.hint}
            disabled={fieldDisabled}
            legend={field.label}
          >
            {(field.fields ?? []).map((child) => renderField(child, `${path}.${child.key}`))}
          </ForgeFieldSet>
        );
      }
      case 'file': {
        return (
          <ForgeFileInput
            accept={field.accept}
            capture={field.capture}
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as File[]) ?? []}
            multiple={field.multiple}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
      default: {
        return (
          <ForgeInput
            className={styles['forge-schema-form__field']}
            disabled={fieldDisabled}
            error={error}
            hint={field.hint}
            label={field.label}
            modelValue={(value as string) ?? ''}
            placeholder={field.placeholder}
            required={field.required}
            {...modelUpdate}
          />
        );
      }
    }
  };

  // The active wizard step's body. It is a **render helper** (a node-returning
  // local) so each step's `content` render property carries a deferred function
  // rather than a live element: that is what lets the Svelte target lower it to
  // a `{#snippet}` (a data property cannot carry a snippet), while React and Vue
  // simply call it. Only the active step renders a body; the others are empty.
  const renderWizardStepContent = (): MpElement => (
    <div className={styles['forge-schema-form__fields']}>
      {currentFields.map((field) => renderField(field, field.key))}
    </div>
  );

  // Wizard mode: a top-level array of step schemas.
  if (model.isWizard) {
    const wizardSteps: WizardStep[] = visibleStepIndices.map((stepIndex, position) => {
      const step = model.steps[stepIndex];
      return {
        id: step.id,
        title: step.title ?? `Step ${position + 1}`,
        description: step.description,
        error: stepHasErrors[stepIndex],
        content: position === currentVisiblePosition ? renderWizardStepContent : undefined,
      };
    });

    return (
      <form
        className={[
          styles['forge-schema-form'],
          styles['forge-schema-form--wizard'],
          sizeStyles[`forge-size--${size}`],
          {
            [styles['forge-schema-form--disabled']]: disabled,
          },
        ]}
        onSubmit={handleSubmit}
      >
        <ForgeFormWizard
          linear={validationMode === 'per-step'}
          modelValue={currentVisiblePosition}
          steps={wizardSteps}
          onComplete={() => handleSubmit(new Event('submit'))}
          onUpdateModelValue={onWizardNavigate}
        />
      </form>
    );
  }

  // Single-step form.
  return (
    <form
      className={[
        styles['forge-schema-form'],
        sizeStyles[`forge-size--${size}`],
        {
          [styles['forge-schema-form--disabled']]: disabled,
        },
      ]}
      onReset={handleReset}
      onSubmit={handleSubmit}
    >
      <div className={styles['forge-schema-form__fields']}>
        {currentFields.map((field) => renderField(field, field.key))}
      </div>
      <div className={styles['forge-schema-form__actions']}>
        <Slot name="actions">
          <ForgeButton
            disabled={disabled}
            type="reset"
            variant="secondary"
          >
            Reset
          </ForgeButton>
          <ForgeButton
            disabled={disabled}
            type="submit"
            variant="primary"
          >
            Submit
          </ForgeButton>
        </Slot>
      </div>
    </form>
  );
}
