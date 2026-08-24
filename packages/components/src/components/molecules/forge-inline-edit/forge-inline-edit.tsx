import {
  classNames,
  hasSlot,
  type MpChild,
  type MpElement,
  Slot,
  useEffect,
  useId,
  useRef,
  useState,
} from '@mission-platform/forge';

import styles from './forge-inline-edit.module.scss';

export type InlineEditSize = 'sm' | 'md' | 'lg';
export type InlineEditInputType = 'text' | 'email' | 'url' | 'number';
export type InlineEditValidator = (value: string) => string | undefined;

export interface InlineEditProperties {
  /** Rendered read-only value, or the editor's default slot when supplied. */
  children?: MpChild | readonly MpChild[];
  modelValue: string;
  placeholder?: string;
  label?: string;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  inputType?: InlineEditInputType;
  size?: InlineEditSize;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  maxLength?: number;
  defaultEditing?: boolean;
  id?: string;
  error?: string;
  validate?: InlineEditValidator;
  onUpdateModelValue?: (value: string) => void;
  onSave?: (value: string) => void;
  onCancel?: () => void;
  onValidationError?: (message: string) => void;
}

/** A compact read/edit control with keyboard submit, cancel, and validation. */
export function ForgeInlineEdit(properties: Readonly<InlineEditProperties>): MpElement {
  const {
    modelValue = '',
    placeholder = 'Add a value',
    label,
    editLabel = 'Edit',
    saveLabel = 'Save',
    cancelLabel = 'Cancel',
    inputType = 'text',
    size = 'md',
    disabled = false,
    readonly = false,
    required = false,
    maxLength,
    defaultEditing = false,
  } = properties;
  const [editing, setEditing] = useState(defaultEditing && !disabled && !readonly);
  const [draft, setDraft] = useState(modelValue);
  const [validationError, setValidationError] = useState<string | undefined>(properties.error);
  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const inputReference = useRef<HTMLInputElement | null>(null);
  const errorId = `${resolvedId}-error`;
  const labelId = `${resolvedId}-label`;

  useEffect(() => {
    if (editing) inputReference.current?.focus();
  }, [editing]);

  const beginEdit = (): void => {
    if (!disabled && !readonly) {
      setDraft(modelValue);
      setValidationError(undefined);
      setEditing(true);
    }
  };
  const cancel = (): void => {
    setDraft(modelValue);
    setValidationError(undefined);
    setEditing(false);
    properties.onCancel?.();
  };
  const save = (): void => {
    const message =
      properties.error ?? (required && !draft.trim() ? 'This field is required.' : properties.validate?.(draft));
    if (message) {
      setValidationError(message);
      properties.onValidationError?.(message);
      return;
    }
    properties.onUpdateModelValue?.(draft);
    properties.onSave?.(draft);
    setEditing(false);
  };
  const error = properties.error ?? validationError;

  return (
    <div
      className={classNames(styles['forge-inline-edit'], styles[`forge-inline-edit--${size}`], {
        [styles['forge-inline-edit--disabled']]: disabled,
        [styles['forge-inline-edit--error']]: !!error,
      })}
    >
      {label ? (
        <span
          id={labelId}
          className={styles['forge-inline-edit__label']}
        >
          {label}
        </span>
      ) : undefined}
      {editing ? (
        <form
          className={styles['forge-inline-edit__form']}
          onSubmit={(event: Event) => {
            event.preventDefault();
            save();
          }}
        >
          <input
            ref={inputReference}
            id={resolvedId}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ? undefined : placeholder}
            aria-labelledby={label ? labelId : undefined}
            className={styles['forge-inline-edit__input']}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            required={required}
            type={inputType}
            value={draft}
            onInput={(event: Event) => setDraft((event.target as HTMLInputElement).value)}
            onKeydown={(event: KeyboardEvent) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
              }
            }}
          />
          <button
            className={styles['forge-inline-edit__button']}
            disabled={disabled}
            type="submit"
          >
            {saveLabel}
          </button>
          <button
            className={styles['forge-inline-edit__button']}
            disabled={disabled}
            type="button"
            onClick={cancel}
          >
            {cancelLabel}
          </button>
        </form>
      ) : (
        <div className={styles['forge-inline-edit__display']}>
          <span className={styles['forge-inline-edit__value']}>
            <Slot>{properties.children ?? (modelValue || placeholder)}</Slot>
          </span>
          {readonly ? undefined : (
            <button
              aria-label={editLabel}
              className={styles['forge-inline-edit__button']}
              disabled={disabled}
              type="button"
              onClick={beginEdit}
            >
              {editLabel}
            </button>
          )}
        </div>
      )}
      {error ? (
        <p
          id={errorId}
          className={styles['forge-inline-edit__error']}
          role="alert"
        >
          {error}
        </p>
      ) : undefined}
      {hasSlot('footer') ? (
        <div className={styles['forge-inline-edit__footer']}>
          <Slot name="footer" />
        </div>
      ) : undefined}
    </div>
  );
}
