import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  Slot,
  type ClassValue,
  type MpChild,
  type MpContext,
  type MpElement,
} from '@mission-platform/forge-jsx';

import styles from './forge-form.module.scss';

export interface FormContextValue {
  /** The current form values. */
  values: Record<string, unknown>;
  /** Field-level validation error messages. */
  errors: Record<string, string>;
  /** Map of touched fields by name. */
  touched: Record<string, boolean>;
  /** Map of dirty fields by name (changed from initial value). */
  dirty: Record<string, boolean>;
  /** True while async submission is in progress. */
  isSubmitting: boolean;
  /** True when there are zero validation errors. */
  isValid: boolean;
  /** True when at least one field has been modified from initial values. */
  isDirty: boolean;
  /** Sets value for a single field by name. */
  setFieldValue: (name: string, value: unknown) => void;
  /** Sets touched state for a single field by name. */
  setFieldTouched: (name: string, isTouched?: boolean) => void;
  /** Sets or clears an error message for a single field by name. */
  setFieldError: (name: string, error?: string) => void;
  /** Replaces or updates the entire values dictionary. */
  setValues: (
    values: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>),
  ) => void;
  /** Replaces or updates the entire errors dictionary. */
  setErrors: (errors: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>)) => void;
  /** Replaces or updates the entire touched dictionary. */
  setTouched: (
    touched: Record<string, boolean> | ((previous: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
  /** Resets form to initial or provided values and clears errors/touched/dirty states. */
  resetForm: (nextValues?: Record<string, unknown>) => void;
  /** Triggers validation and submit handlers programmatically. */
  submitForm: () => Promise<void>;
  /** Runs validation against current or passed values and updates error state. */
  validateForm: (values?: Record<string, unknown>) => Promise<Record<string, string>>;
  /** Runs validation for a single field and updates its error state. */
  validateField: (name: string) => Promise<string | undefined>;
  /** Returns standard props to spread onto field inputs. */
  getFieldProperties: (name: string) => {
    name: string;
    value: unknown;
    error: string | undefined;
    touched: boolean;
    onChange: (eventOrValue: unknown) => void;
    onBlur: () => void;
  };
  /** Returns standard props to spread onto field inputs (shorthand alias). */
  getFieldProps: (name: string) => {
    name: string;
    value: unknown;
    error: string | undefined;
    touched: boolean;
    onChange: (eventOrValue: unknown) => void;
    onBlur: () => void;
  };
}

export type FormContext = FormContextValue;

/**
 * Default no-op callback used as fallback before form provider initializes.
 */
function defaultNoop(): void {
  // Intentionally empty fallback handler
}

/**
 * Baseline default form context provided when useFormContext is called outside a ForgeForm.
 */
export const defaultFormContext: FormContextValue = {
  values: {},
  errors: {},
  touched: {},
  dirty: {},
  isSubmitting: false,
  isValid: true,
  isDirty: false,
  setFieldValue: defaultNoop,
  setFieldTouched: defaultNoop,
  setFieldError: defaultNoop,
  setValues: defaultNoop,
  setErrors: defaultNoop,
  setTouched: defaultNoop,
  resetForm: defaultNoop,
  submitForm: () => Promise.resolve(),
  validateForm: () => Promise.resolve({}),
  // eslint-disable-next-line unicorn/no-useless-undefined -- interface specifies returning undefined when valid
  validateField: () => Promise.resolve(undefined),
  getFieldProperties: (name: string) => ({
    name,
    value: undefined,
    error: undefined,
    touched: false,
    onChange: defaultNoop,
    onBlur: defaultNoop,
  }),
  getFieldProps: (name: string) => ({
    name,
    value: undefined,
    error: undefined,
    touched: false,
    onChange: defaultNoop,
    onBlur: defaultNoop,
  }),
};

export const FormContext: MpContext<FormContextValue | undefined> = createContext<FormContextValue | undefined>(
  undefined,
);

/**
 * Hook to access the form context in child fields or nested components.
 */
export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  return context ?? defaultFormContext;
}

export interface ForgeFormProps {
  /** Initial form values for uncontrolled mode. Defaults to `{}`. */
  initialValues?: Record<string, unknown>;
  /** Controlled form values. When provided, component operates in controlled mode. */
  values?: Record<string, unknown>;
  /** Initial field-level errors dictionary. */
  errors?: Record<string, string>;
  /** Emitted whenever form values change. */
  onUpdateValues?: (values: Record<string, unknown>) => void;
  /** Emitted whenever form values change (standard alias). */
  onValuesChange?: (values: Record<string, unknown>) => void;
  /** Custom validation function returning a map of field name to error message. */
  validate?: (values: Record<string, unknown>) => Record<string, string> | Promise<Record<string, string>>;
  /** Schema validator supporting safeParse or validate (Zod, Valibot, Standard Schema, Yup). */
  schema?: unknown;
  /** Form submission handler called only when validation passes. */
  onSubmit?: (values: Record<string, unknown>, context: FormContextValue) => void | Promise<void>;
  /** Reset event handler. */
  onReset?: (event?: Event) => void;
  /** Custom ID for the form element. */
  id?: string;
  /** Extra class names applied to the root form element. */
  className?: ClassValue;
  /** Disables browser default HTML5 validation. Defaults to `true`. */
  noValidate?: boolean;
  /** Whether to show the accessible error summary banner when validation fails. Defaults to `true`. */
  showErrorSummary?: boolean;
  /** Heading displayed inside the error summary banner. Defaults to `'There is a problem with your submission'`. */
  errorSummaryTitle?: string;
  /** When true, runs validation automatically whenever a field value changes. Defaults to `false`. */
  validateOnChange?: boolean;
  /** Slot content or child form controls. */
  children?: MpChild | readonly MpChild[];
}

export type ForgeFormProperties = ForgeFormProps;

/**
 * Navigates focus to the invalid field element when an error summary link is clicked.
 *
 * @param _event - The triggered click event.
 * @param field - The field name or identifier to focus.
 */
function handleErrorLinkClick(_event: Event, field: string): void {
  if (typeof document !== 'undefined') {
    try {
      const escapedField = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(field) : field;
      const target =
        document.querySelector<HTMLElement>(`#${escapedField}`) ??
        document.querySelector<HTMLElement>(`[name="${escapedField}"]`);
      if (target) {
        target.focus();
      }
    } catch {
      // Ignore querySelector syntax errors for malformed field names
    }
  }
}

/**
 * Normalizes a Standard Schema issue path segment array or string into a dot-separated string.
 *
 * @param path - The path property from a Standard Schema issue.
 * @returns A dot-separated field path string.
 */
function formatStandardPath(path: unknown): string {
  if (Array.isArray(path)) {
    return path
      .map((segment: unknown) =>
        typeof segment === 'object' && segment !== null && 'key' in segment
          ? String((segment as { key: unknown }).key)
          : String(segment),
      )
      .join('.');
  }
  return String(path ?? '');
}

/**
 * Validates form values using a Standard Schema compliant validator (e.g. Valibot, ArkType, Zod v3.24+).
 *
 * @param values - Current form values to validate.
 * @param schema - Schema candidate containing `~standard` validation contract.
 * @returns Map of field names to error messages.
 */
export async function validateWithStandardSchema(
  values: Record<string, unknown>,
  schema: unknown,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  const s = schema as Record<string, unknown>;
  const standard = s['~standard'] as
    { validate?: (v: unknown) => Promise<{ issues?: Array<{ path?: unknown; message: string }> }> } | undefined;

  if (typeof standard?.validate !== 'function') {
    return errors;
  }

  const result = await standard.validate(values);
  if (result?.issues) {
    for (const issue of result.issues) {
      const path = formatStandardPath(issue.path);
      const key = path || '_form';
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
  }

  return errors;
}

/**
 * Validates form values using a Zod or schema object implementing `safeParse`.
 *
 * @param values - Current form values to validate.
 * @param schema - Schema candidate containing `safeParse` method.
 * @returns Map of field names to error messages.
 */
export async function validateWithSafeParse(
  values: Record<string, unknown>,
  schema: unknown,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  const safeParse = (
    schema as {
      safeParse?: (v: unknown) => {
        success: boolean;
        error?: {
          issues?: Array<{ path?: unknown; message: string }>;
          errors?: Array<{ path?: unknown; message: string }>;
        };
      };
    }
  ).safeParse;

  if (typeof safeParse !== 'function') {
    return errors;
  }

  const result = await safeParse(values);
  if (!result.success && result.error) {
    const issues = result.error.issues || result.error.errors;
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? '');
        const key = path || '_form';
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
    }
  }

  return errors;
}

/**
 * Extracts error mappings from a Yup validation error exception.
 *
 * @param validationError - Thrown exception from Yup validate.
 * @returns Map of field names to error messages.
 */
function extractYupErrors(validationError: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  const error = validationError as
    | { inner?: Array<{ path?: string; message: string }>; errors?: Record<string, string>; message?: string }
    | undefined;

  if (error && Array.isArray(error.inner) && error.inner.length > 0) {
    for (const item of error.inner) {
      const path = item.path || '_form';
      if (!errors[path]) {
        errors[path] = item.message;
      }
    }
  } else if (error && typeof error.errors === 'object' && error.errors !== null && !Array.isArray(error.errors)) {
    Object.assign(errors, error.errors);
  } else if (error?.message) {
    errors._form = error.message;
  }

  return errors;
}

/**
 * Validates form values using a Yup schema or validator object implementing `validate`.
 *
 * @param values - Current form values to validate.
 * @param schema - Schema candidate containing `validate` method.
 * @returns Map of field names to error messages.
 */
export async function validateWithYup(
  values: Record<string, unknown>,
  schema: unknown,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  const validateFunction = (schema as { validate?: (v: unknown, opts: unknown) => Promise<unknown> }).validate;
  if (typeof validateFunction !== 'function') {
    return errors;
  }

  try {
    const result = (await validateFunction(values, { abortEarly: false })) as Record<string, unknown> | undefined;
    if (result && typeof result === 'object') {
      if ('errors' in result && typeof result.errors === 'object' && result.errors !== null) {
        Object.assign(errors, result.errors);
      } else if ('issues' in result && Array.isArray(result.issues)) {
        for (const issue of result.issues as Array<{ path?: unknown; message: string }>) {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? '');
          const key = path || '_form';
          if (!errors[key]) {
            errors[key] = issue.message;
          }
        }
      }
    }
  } catch (validationError: unknown) {
    return extractYupErrors(validationError);
  }

  return errors;
}

/**
 * Validates form values using a custom synchronous or asynchronous validation function.
 *
 * @param values - Current form values to validate.
 * @param validate - Custom validation function returning error mappings.
 * @returns Map of field names to error messages.
 */
export async function validateWithFunction(
  values: Record<string, unknown>,
  validate?: (values: Record<string, unknown>) => Record<string, string> | Promise<Record<string, string>>,
): Promise<Record<string, string>> {
  if (!validate) {
    return {};
  }
  const customErrors = await validate(values);
  if (customErrors && typeof customErrors === 'object') {
    return customErrors;
  }
  return {};
}

/**
 * Validates form values against a supported schema object (Standard Schema, Zod/safeParse, or Yup/validate).
 *
 * @param values - Current form values to validate.
 * @param schema - Schema instance to validate against.
 * @returns Map of field names to error messages.
 */
async function validateWithSchema(values: Record<string, unknown>, schema: unknown): Promise<Record<string, string>> {
  if (!schema || typeof schema !== 'object') {
    return {};
  }
  const s = schema as Record<string, unknown>;
  if (typeof (s['~standard'] as { validate?: unknown } | undefined)?.validate === 'function') {
    return validateWithStandardSchema(values, schema);
  }
  if (typeof (s as { safeParse?: unknown }).safeParse === 'function') {
    return validateWithSafeParse(values, schema);
  }
  if (typeof (s as { validate?: unknown }).validate === 'function') {
    return validateWithYup(values, schema);
  }
  return {};
}

/**
 * Runs all configured validation passes (schema and custom validator function) against form values.
 *
 * @param values - Current form values.
 * @param validate - Optional custom validation function.
 * @param schema - Optional schema validator (Standard Schema, Zod, Yup).
 * @returns Combined field error dictionary.
 */
export async function runValidation(
  values: Record<string, unknown>,
  validate?: (values: Record<string, unknown>) => Record<string, string> | Promise<Record<string, string>>,
  schema?: unknown,
): Promise<Record<string, string>> {
  const schemaErrors = schema ? await validateWithSchema(values, schema) : {};
  const functionErrors = validate ? await validateWithFunction(values, validate) : {};

  return { ...schemaErrors, ...functionErrors };
}

/**
 * Context-driven form component supporting controlled and uncontrolled state,
 * Standard Schema / Zod / Yup validation, accessible error summary, and framework adapters.
 */
export function ForgeForm(properties: Readonly<ForgeFormProps>): MpElement {
  const generatedId = useId();
  const formId = properties.id ?? generatedId;
  const summaryId = `${formId}-error-summary`;
  const summaryHeadingId = `${summaryId}-heading`;

  const isControlled = properties.values !== undefined;
  const [uncontrolledValues, setUncontrolledValues] = useState<Record<string, unknown>>(properties.initialValues ?? {});
  const currentValues = isControlled ? (properties.values as Record<string, unknown>) : uncontrolledValues;

  const [errors, setErrors] = useState<Record<string, string>>(properties.errors ?? {});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const validationSequenceReference = useRef<number>(0);

  const valuesReference = useRef<Record<string, unknown>>(currentValues);
  const errorsReference = useRef<Record<string, string>>(properties.errors ?? {});
  const touchedReference = useRef<Record<string, boolean>>({});
  const dirtyReference = useRef<Record<string, boolean>>({});
  const isSubmittingReference = useRef<boolean>(false);

  /**
   * Sets value for a single field by name, updating dirty and clearing field error.
   *
   * @param name - Form field identifier.
   * @param value - New value for the field.
   */
  const setFieldValue = (name: string, value: unknown): void => {
    const nextValues = {
      ...(isControlled ? (properties.values as Record<string, unknown>) : valuesReference.current),
      [name]: value,
    };
    valuesReference.current = nextValues;
    if (!isControlled) {
      setUncontrolledValues(nextValues);
    }

    const initial = properties.initialValues?.[name];
    const nextDirty = {
      ...dirtyReference.current,
      [name]: value !== initial,
    };
    dirtyReference.current = nextDirty;
    setDirty(nextDirty);

    if (errorsReference.current[name]) {
      const { [name]: _, ...rest } = errorsReference.current;
      errorsReference.current = rest;
      setErrors(rest);
    }

    properties.onUpdateValues?.(nextValues);
    properties.onValuesChange?.(nextValues);

    if (properties.validateOnChange) {
      const currentSequence = ++validationSequenceReference.current;
      void runValidation(nextValues, properties.validate, properties.schema).then((validationErrors) => {
        if (currentSequence === validationSequenceReference.current) {
          errorsReference.current = validationErrors;
          setErrors(validationErrors);
        }
      });
    }
  };

  /**
   * Sets touched state for a single field by name.
   *
   * @param name - Form field identifier.
   * @param isFieldTouched - Whether the field has been touched.
   */
  const setFieldTouched = (name: string, isFieldTouched = true): void => {
    const nextTouched = {
      ...touchedReference.current,
      [name]: isFieldTouched,
    };
    touchedReference.current = nextTouched;
    setTouched(nextTouched);
  };

  /**
   * Sets or clears an error message for a single field by name immutably.
   *
   * @param name - Form field identifier.
   * @param error - Error message string or undefined to clear.
   */
  const setFieldError = (name: string, error?: string): void => {
    if (!error) {
      const { [name]: _, ...rest } = errorsReference.current;
      errorsReference.current = rest;
      setErrors(rest);
      return;
    }
    const nextErrors = {
      ...errorsReference.current,
      [name]: error,
    };
    errorsReference.current = nextErrors;
    setErrors(nextErrors);
  };

  /**
   * Replaces or updates the entire values dictionary and recalculates dirty state.
   *
   * @param next - Next values object or updater function.
   */
  const setValues = (
    next: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>),
  ): void => {
    const resolved = typeof next === 'function' ? next(valuesReference.current) : next;
    valuesReference.current = resolved;
    if (!isControlled) {
      setUncontrolledValues(resolved);
    }
    const nextDirty: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(resolved)) {
      nextDirty[key] = value !== properties.initialValues?.[key];
    }
    dirtyReference.current = nextDirty;
    setDirty(nextDirty);
    properties.onUpdateValues?.(resolved);
    properties.onValuesChange?.(resolved);
  };

  /**
   * Resets form values, errors, touched, and dirty state.
   *
   * @param nextValues - Optional values to reset to; defaults to initialValues.
   */
  const resetForm = (nextValues?: Record<string, unknown>): void => {
    const targetValues = nextValues ?? properties.initialValues ?? {};
    valuesReference.current = targetValues;
    if (!isControlled) {
      setUncontrolledValues(targetValues);
    }
    errorsReference.current = {};
    touchedReference.current = {};
    dirtyReference.current = {};
    isSubmittingReference.current = false;
    setErrors({});
    setTouched({});
    setDirty({});
    setIsSubmitting(false);
    properties.onUpdateValues?.(targetValues);
    properties.onValuesChange?.(targetValues);
  };

  /**
   * Runs validation against current or passed values and updates error state.
   *
   * @param targetVals - Optional specific values to validate.
   * @returns Field error dictionary.
   */
  const validateForm = async (targetVals?: Record<string, unknown>): Promise<Record<string, string>> => {
    const vals = targetVals ?? valuesReference.current;
    const currentSequence = ++validationSequenceReference.current;
    const validationErrors = await runValidation(vals, properties.validate, properties.schema);
    if (currentSequence === validationSequenceReference.current) {
      errorsReference.current = validationErrors;
      setErrors(validationErrors);
    }
    return validationErrors;
  };

  /**
   * Runs validation for a single field and updates its error state.
   *
   * @param name - Field name to validate.
   * @returns Field error message or undefined if valid.
   */
  const validateField = async (name: string): Promise<string | undefined> => {
    const currentSequence = ++validationSequenceReference.current;
    const validationErrors = await runValidation(valuesReference.current, properties.validate, properties.schema);
    const fieldError = validationErrors[name];
    if (currentSequence === validationSequenceReference.current) {
      setFieldError(name, fieldError);
    }
    return fieldError;
  };

  /**
   * Produces standard props to spread onto field inputs.
   *
   * @param name - Field name.
   * @returns Input binding properties.
   */
  const getFieldProperties = (name: string) => ({
    name,
    get value() {
      return valuesReference.current[name];
    },
    get error() {
      return errorsReference.current[name];
    },
    get touched() {
      return touchedReference.current[name] ?? false;
    },
    onChange: (eventOrValue: unknown) => {
      let nextValue = eventOrValue;
      if (
        eventOrValue !== null &&
        typeof eventOrValue === 'object' &&
        'target' in eventOrValue &&
        (eventOrValue as { target: unknown }).target !== null &&
        typeof (eventOrValue as { target: unknown }).target === 'object'
      ) {
        const target = (eventOrValue as { target: { type?: string; checked?: boolean; value?: unknown } }).target;
        nextValue = target.type === 'checkbox' ? target.checked : target.value;
      }
      setFieldValue(name, nextValue);
    },
    onBlur: () => {
      setFieldTouched(name, true);
    },
  });

  /**
   * Executes validation and calls onSubmit if form values are valid.
   *
   * @param event - Optional triggering event.
   */
  const executeSubmit = async (event?: Event): Promise<void> => {
    event?.preventDefault?.();
    isSubmittingReference.current = true;
    setIsSubmitting(true);

    try {
      const currentSequence = ++validationSequenceReference.current;
      const validationErrors = await runValidation(valuesReference.current, properties.validate, properties.schema);

      const allFieldNames = new Set([
        ...Object.keys(valuesReference.current),
        ...Object.keys(properties.initialValues ?? {}),
        ...Object.keys(errorsReference.current),
        ...Object.keys(validationErrors),
      ]);
      const nextTouched: Record<string, boolean> = {};
      for (const key of allFieldNames) {
        nextTouched[key] = true;
      }
      touchedReference.current = nextTouched;
      setTouched(nextTouched);

      const hasValidationErrors = Object.keys(validationErrors).length > 0;
      if (hasValidationErrors) {
        if (currentSequence === validationSequenceReference.current) {
          errorsReference.current = validationErrors;
          setErrors(validationErrors);
        }
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            const summaryElement = document.querySelector<HTMLElement>(`#${summaryId}`);
            if (summaryElement instanceof HTMLElement) {
              summaryElement.focus();
            }
          }, 0);
        }
        return;
      }

      if (currentSequence === validationSequenceReference.current) {
        errorsReference.current = {};
        setErrors({});
      }
      await properties.onSubmit?.(valuesReference.current, contextValue);
    } finally {
      isSubmittingReference.current = false;
      setIsSubmitting(false);
    }
  };

  /**
   * Programmatically triggers form validation and submission.
   */
  const submitForm = async (): Promise<void> => {
    await executeSubmit();
  };

  /**
   * Form submit DOM event handler.
   *
   * @param event - Native submit event.
   */
  const handleSubmit = (event: Event): void => {
    void executeSubmit(event);
  };

  /**
   * Form reset DOM event handler.
   *
   * @param event - Native reset event.
   */
  const handleReset = (event: Event): void => {
    event.preventDefault();
    resetForm();
    properties.onReset?.(event);
  };

  const isDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const contextValue: FormContextValue = useMemo(
    () => ({
      get values() {
        return isControlled ? (properties.values as Record<string, unknown>) : valuesReference.current;
      },
      get errors() {
        return errorsReference.current;
      },
      get touched() {
        return touchedReference.current;
      },
      get dirty() {
        return dirtyReference.current;
      },
      get isSubmitting() {
        return isSubmittingReference.current;
      },
      get isValid() {
        return Object.keys(errorsReference.current).length === 0;
      },
      get isDirty() {
        return Object.values(dirtyReference.current).some(Boolean);
      },
      setFieldValue,
      setFieldTouched,
      setFieldError,
      setValues,
      setErrors,
      setTouched,
      resetForm,
      submitForm,
      validateForm,
      validateField,
      getFieldProperties,
      getFieldProps: getFieldProperties,
    }),
    [currentValues, errors, touched, dirty, isSubmitting, isValid, isDirty],
  );

  const errorEntries = Object.entries(errors).filter(([_, message]) => Boolean(message));
  const hasErrors = errorEntries.length > 0;
  const showErrorSummary = properties.showErrorSummary ?? true;
  const errorSummaryTitle = properties.errorSummaryTitle ?? 'There is a problem with your submission';
  const noValidate = properties.noValidate ?? true;

  return (
    <FormContext.Provider value={contextValue}>
      <form
        id={formId}
        className={[styles['forge-form'], properties.className]}
        noValidate={noValidate}
        onSubmit={handleSubmit}
        onReset={handleReset}
      >
        {hasErrors && showErrorSummary ? (
          <div
            id={summaryId}
            aria-labelledby={summaryHeadingId}
            aria-live="assertive"
            className={styles['forge-form__error-summary']}
            role="alert"
            tabIndex={-1}
          >
            <h3
              id={summaryHeadingId}
              className={styles['forge-form__error-heading']}
            >
              {errorSummaryTitle}
            </h3>
            <ul className={styles['forge-form__error-list']}>
              {errorEntries.map(([field, message]) => (
                <li
                  key={field}
                  className={styles['forge-form__error-item']}
                >
                  {field.startsWith('_') ? (
                    <span className={styles['forge-form__error-message']}>{message}</span>
                  ) : (
                    <a
                      className={styles['forge-form__error-link']}
                      href={`#${field}`}
                      onClick={(event: unknown) => handleErrorLinkClick(event as Event, field)}
                    >
                      {message}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : undefined}
        {properties.children ?? <Slot />}
      </form>
    </FormContext.Provider>
  );
}
