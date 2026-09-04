import {
  classNames,
  hasSlot,
  Slot,
  useEffect,
  useId,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-inline-edit.module.scss';

export type InlineEditSize = 'sm' | 'md' | 'lg';
export type InlineEditInputType = 'text' | 'email' | 'url' | 'number';
export type InlineEditValidator = (value: string) => string | undefined;

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface InlineEditStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-danger-default'?: string;
  readonly 'color-danger-text'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-text-link'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-pad-block-sm'?: string;
  readonly 'size-pad-inline-sm'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
}

export type InlineEditStyle = CSSStyleProperties & {
  readonly '--forge-inline-edit-border-width-thick'?: string | undefined;
  readonly '--forge-inline-edit-border-width-thin'?: string | undefined;
  readonly '--forge-inline-edit-color-bg-surface'?: string | undefined;
  readonly '--forge-inline-edit-color-border-default'?: string | undefined;
  readonly '--forge-inline-edit-color-border-focus'?: string | undefined;
  readonly '--forge-inline-edit-color-danger-default'?: string | undefined;
  readonly '--forge-inline-edit-color-danger-text'?: string | undefined;
  readonly '--forge-inline-edit-color-primary-subtle'?: string | undefined;
  readonly '--forge-inline-edit-color-text-link'?: string | undefined;
  readonly '--forge-inline-edit-color-text-primary'?: string | undefined;
  readonly '--forge-inline-edit-font-size-sm'?: string | undefined;
  readonly '--forge-inline-edit-font-weight-semibold'?: string | undefined;
  readonly '--forge-inline-edit-opacity-disabled'?: string | undefined;
  readonly '--forge-inline-edit-radius-md'?: string | undefined;
  readonly '--forge-inline-edit-size-pad-block-sm'?: string | undefined;
  readonly '--forge-inline-edit-size-pad-inline-sm'?: string | undefined;
  readonly '--forge-inline-edit-spacing-1'?: string | undefined;
  readonly '--forge-inline-edit-spacing-2'?: string | undefined;
};

function createInlineEditStyle(
  properties: Readonly<InlineEditStyleProperties> | undefined,
): InlineEditStyle | undefined {
  return createForgeStyle({
    '--forge-inline-edit-border-width-thick': properties?.['border-width-thick'],
    '--forge-inline-edit-border-width-thin': properties?.['border-width-thin'],
    '--forge-inline-edit-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-inline-edit-color-border-default': properties?.['color-border-default'],
    '--forge-inline-edit-color-border-focus': properties?.['color-border-focus'],
    '--forge-inline-edit-color-danger-default': properties?.['color-danger-default'],
    '--forge-inline-edit-color-danger-text': properties?.['color-danger-text'],
    '--forge-inline-edit-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-inline-edit-color-text-link': properties?.['color-text-link'],
    '--forge-inline-edit-color-text-primary': properties?.['color-text-primary'],
    '--forge-inline-edit-font-size-sm': properties?.['font-size-sm'],
    '--forge-inline-edit-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-inline-edit-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-inline-edit-radius-md': properties?.['radius-md'],
    '--forge-inline-edit-size-pad-block-sm': properties?.['size-pad-block-sm'],
    '--forge-inline-edit-size-pad-inline-sm': properties?.['size-pad-inline-sm'],
    '--forge-inline-edit-spacing-1': properties?.['spacing-1'],
    '--forge-inline-edit-spacing-2': properties?.['spacing-2'],
  }) as InlineEditStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<InlineEditStyleProperties>;
}

/** A compact read/edit control with keyboard submit, cancel, and validation. */
export function ForgeInlineEdit(properties: Readonly<InlineEditProperties>): MpElement {
  const style = createInlineEditStyle(properties.properties);

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
      style={style}
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
