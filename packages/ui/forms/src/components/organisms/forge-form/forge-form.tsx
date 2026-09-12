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

export const defaultFormContext: FormContextValue = {
  values: {},
  errors: {},
  touched: {},
  dirty: {},
  isSubmitting: false,
  isValid: true,
  isDirty: false,
  setFieldValue: () => {},
  setFieldTouched: () => {},
  setFieldError: () => {},
  setValues: () => {},
  setErrors: () => {},
  setTouched: () => {},
  resetForm: () => {},
  submitForm: async () => {},
  validateForm: async () => ({}),
  // eslint-disable-next-line unicorn/no-useless-undefined -- interface specifies returning undefined when valid
  validateField: async () => undefined,
  getFieldProperties: (name: string) => ({
    name,
    value: undefined,
    error: undefined,
    touched: false,
    onChange: () => {},
    onBlur: () => {},
  }),
  getFieldProps: (name: string) => ({
    name,
    value: undefined,
    error: undefined,
    touched: false,
    onChange: () => {},
    onBlur: () => {},
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

async function runValidation(
  values: Record<string, unknown>,
  validate?: (values: Record<string, unknown>) => Record<string, string> | Promise<Record<string, string>>,
  schema?: unknown,
): Promise<Record<string, string>> {
  let errors: Record<string, string> = {};

  if (schema && typeof schema === 'object') {
    const s = schema as Record<string, unknown>;
    // eslint-disable-next-line unicorn/prefer-switch -- branch checks inspect different properties of schema
    if (typeof (s['~standard'] as { validate?: unknown } | undefined)?.validate === 'function') {
      const standard = s['~standard'] as {
        validate: (v: unknown) => Promise<{ issues?: Array<{ path?: unknown; message: string }> }>;
      };
      const result = await standard.validate(values);
      if (result && result.issues) {
        for (const issue of result.issues) {
          const path = Array.isArray(issue.path)
            ? issue.path
                .map((segment: unknown) =>
                  typeof segment === 'object' && segment !== null && 'key' in segment
                    ? String((segment as { key: unknown }).key)
                    : String(segment),
                )
                .join('.')
            : String(issue.path ?? '');
          const key = path || '_form';
          if (!errors[key]) {
            errors[key] = issue.message;
          }
        }
      }
    } else if (typeof (s as { safeParse?: unknown }).safeParse === 'function') {
      const safeParse = (
        s as {
          safeParse: (v: unknown) => {
            success: boolean;
            error?: {
              issues?: Array<{ path?: unknown; message: string }>;
              errors?: Array<{ path?: unknown; message: string }>;
            };
          };
        }
      ).safeParse;
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
    } else if (typeof (s as { validate?: unknown }).validate === 'function') {
      try {
        const validateFunction = (s as { validate: (v: unknown, opts: unknown) => Promise<unknown> }).validate;
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
        } else if (error && error.message) {
          errors._form = error.message;
        }
      }
    }
  }

  // 4. Custom validate function
  if (validate) {
    const customErrors = await validate(values);
    if (customErrors && typeof customErrors === 'object') {
      errors = { ...errors, ...customErrors };
    }
  }

  return errors;
}

export function ForgeForm(properties: Readonly<ForgeFormProps>): MpElement {
  const generatedId = useId();
  const formId = properties.id ?? generatedId;
  const summaryId = `${formId}-error-summary`;
  const summaryHeadingId = `${summaryId}-heading`;
  const errorSummaryReference = useRef<HTMLDivElement | null>(null);

  const isControlled = properties.values !== undefined;
  const [uncontrolledValues, setUncontrolledValues] = useState<Record<string, unknown>>(properties.initialValues ?? {});
  const currentValues = isControlled ? (properties.values as Record<string, unknown>) : uncontrolledValues;

  const [errors, setErrors] = useState<Record<string, string>>(properties.errors ?? {});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const validationSequenceReference = useRef<number>(0);

  const setFieldValue = (name: string, value: unknown): void => {
    const nextValues = { ...currentValues, [name]: value };
    if (!isControlled) {
      setUncontrolledValues(nextValues);
    }

    const initial = properties.initialValues?.[name];
    setDirty((previous) => ({
      ...previous,
      [name]: value !== initial,
    }));

    if (errors[name]) {
      setErrors((previous) => {
        const next = { ...previous };
        delete next[name];
        return next;
      });
    }

    properties.onUpdateValues?.(nextValues);
    properties.onValuesChange?.(nextValues);

    if (properties.validateOnChange) {
      const currentSequence = ++validationSequenceReference.current;
      void runValidation(nextValues, properties.validate, properties.schema).then((validationErrors) => {
        if (currentSequence === validationSequenceReference.current) {
          setErrors(validationErrors);
        }
      });
    }
  };

  const setFieldTouched = (name: string, isFieldTouched = true): void => {
    setTouched((previous) => ({
      ...previous,
      [name]: isFieldTouched,
    }));
  };

  const setFieldError = (name: string, error?: string): void => {
    setErrors((previous) => {
      if (!error) {
        const next = { ...previous };
        delete next[name];
        return next;
      }
      return {
        ...previous,
        [name]: error,
      };
    });
  };

  const setValues = (
    next: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>),
  ): void => {
    const resolved = typeof next === 'function' ? next(currentValues) : next;
    if (!isControlled) {
      setUncontrolledValues(resolved);
    }
    const nextDirty: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(resolved)) {
      nextDirty[key] = value !== properties.initialValues?.[key];
    }
    setDirty(nextDirty);
    properties.onUpdateValues?.(resolved);
    properties.onValuesChange?.(resolved);
  };

  const resetForm = (nextValues?: Record<string, unknown>): void => {
    const targetValues = nextValues ?? properties.initialValues ?? {};
    if (!isControlled) {
      setUncontrolledValues(targetValues);
    }
    setErrors({});
    setTouched({});
    setDirty({});
    setIsSubmitting(false);
    properties.onUpdateValues?.(targetValues);
    properties.onValuesChange?.(targetValues);
  };

  const validateForm = async (targetVals?: Record<string, unknown>): Promise<Record<string, string>> => {
    const vals = targetVals ?? currentValues;
    const currentSequence = ++validationSequenceReference.current;
    const validationErrors = await runValidation(vals, properties.validate, properties.schema);
    if (currentSequence === validationSequenceReference.current) {
      setErrors(validationErrors);
    }
    return validationErrors;
  };

  const validateField = async (name: string): Promise<string | undefined> => {
    const currentSequence = ++validationSequenceReference.current;
    const validationErrors = await runValidation(currentValues, properties.validate, properties.schema);
    const fieldError = validationErrors[name];
    if (currentSequence === validationSequenceReference.current) {
      setFieldError(name, fieldError);
    }
    return fieldError;
  };

  const getFieldProperties = (name: string) => ({
    name,
    value: currentValues[name],
    error: errors[name],
    touched: touched[name] ?? false,
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

  const executeSubmit = async (event?: Event): Promise<void> => {
    event?.preventDefault?.();
    setIsSubmitting(true);

    try {
      const currentSequence = ++validationSequenceReference.current;
      const validationErrors = await runValidation(currentValues, properties.validate, properties.schema);

      const allFieldNames = new Set([
        ...Object.keys(currentValues),
        ...Object.keys(properties.initialValues ?? {}),
        ...Object.keys(errors),
        ...Object.keys(validationErrors),
      ]);
      const nextTouched: Record<string, boolean> = {};
      for (const key of allFieldNames) {
        nextTouched[key] = true;
      }
      setTouched(nextTouched);

      const hasValidationErrors = Object.keys(validationErrors).length > 0;
      if (hasValidationErrors) {
        if (currentSequence === validationSequenceReference.current) {
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
        setErrors({});
      }
      await properties.onSubmit?.(currentValues, contextValue);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitForm = async (): Promise<void> => {
    await executeSubmit();
  };

  const handleSubmit = (event: Event): void => {
    void executeSubmit(event);
  };

  const handleReset = (event: Event): void => {
    event.preventDefault();
    resetForm();
    properties.onReset?.(event);
  };

  const isDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const contextValue: FormContextValue = useMemo(
    () => ({
      values: currentValues,
      errors,
      touched,
      dirty,
      isSubmitting,
      isValid,
      isDirty,
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
            ref={errorSummaryReference}
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
