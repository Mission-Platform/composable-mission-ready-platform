import { IconUpload } from '@mission-platform/icons';
import { h, useId, useState, type MpElement, type MpProperties } from '@mission-platform/forge';

import { BaseTypography } from '../base-typography';

import styles from './base-file-input.module.scss';

/** Field size token — canonical 2xs → 2xl scale. */
export type FileInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface FileInputProperties extends MpProperties {
  /**
   * Selected file(s) (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: File | File[];
  /** Allow selecting multiple files. */
  multiple?: boolean;
  /** Native `accept` token list (e.g. `'image/*,.pdf'`). */
  accept?: string;
  /** Native `capture` hint (prefer a device camera/microphone). */
  capture?: boolean | 'user' | 'environment';
  /** Field size. Defaults to `'md'`. */
  size?: FileInputSize;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the control. */
  hint?: string;
  /** Error message shown below the control (replaces the hint). */
  error?: string;
  /** Disable the control. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Render a drag-and-drop dropzone instead of the browse button row. */
  dragDrop?: boolean;
  /** "Browse" action label. Defaults to `'Browse files'`. */
  browseLabel?: string;
  /** Dropzone prompt label. Defaults to `'Drag & drop files here or'`. */
  dragLabel?: string;
  /** Empty-state label. Defaults to `'No file chosen'`. */
  noFileLabel?: string;
  /** Fired with the next file selection (the controlled `v-model` update). */
  onUpdateModelValue?: (value?: File | File[]) => void;
  /** Fired with the native `FileList` (omitted when cleared) when the selection changes. */
  onChange?: (files?: FileList) => void;
}

/**
 * `BaseFileInput` — file input authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Wraps a visually-hidden native `<input type="file">` with either a browse
 * button row or a drag-and-drop dropzone (`dragDrop`), plus a label/hint/error
 * trio. It owns its styling through the co-located CSS Module
 * `base-file-input.module.scss` and composes the neutral {@link BaseTypography}.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the drag/selection
 * state uses the neutral `useState` hook; the upload icon is the write-once
 * `@mission-platform/icons` `IconUpload` (itself compiled to React/Vue); the
 * `useI18n` labels become plain string props; and the `v-model` + `change` emit
 * become the `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseFileInput(properties: Readonly<FileInputProperties>): MpElement {
  const {
    multiple = false,
    accept,
    capture,
    size = 'md',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    dragDrop = false,
    browseLabel = 'Browse files',
    dragLabel = 'Drag & drop files here or',
    noFileLabel = 'No file chosen',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [isDragging, setIsDragging] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const handleFiles = (files: FileList | null | undefined): void => {
    if (!files || files.length === 0) {
      properties.onUpdateModelValue?.();
      properties.onChange?.();
      setDisplayName('');
      return;
    }
    const result = multiple ? [...files] : files[0];
    properties.onUpdateModelValue?.(result);
    properties.onChange?.(files);
    setDisplayName(multiple ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : files[0].name);
  };

  const handleInputChange = (event: Event): void => {
    handleFiles((event.target as HTMLInputElement).files);
  };

  const handleDrop = (event: DragEvent): void => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    handleFiles(event.dataTransfer?.files ?? undefined);
  };

  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (): void => setIsDragging(false);

  return (
    <div
      className={[
        styles['base-file-input'],
        styles[`base-file-input--${size}`],
        {
          [styles['base-file-input--error']]: !!error,
          [styles['base-file-input--disabled']]: disabled,
        },
      ]}
    >
      {label ? (
        <label
          className={[
            styles['base-file-input__label'],
            {
              [styles['base-file-input__label--hidden']]: labelHidden,
            },
          ]}
          for={resolvedId}
        >
          <BaseTypography
            as="span"
            color="primary"
            variant="label"
          >
            {label}
          </BaseTypography>
          {required ? (
            <span
              aria-hidden="true"
              className={styles['base-file-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      {dragDrop ? (
        <div
          className={[
            styles['base-file-input__dropzone'],
            {
              [styles['base-file-input__dropzone--active']]: isDragging,
            },
          ]}
          role="presentation"
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span
            aria-hidden="true"
            className={styles['base-file-input__icon']}
          >
            <IconUpload size="lg" />
          </span>
          <p className={styles['base-file-input__drop-text']}>
            <BaseTypography
              as="span"
              color="secondary"
              variant="body-sm"
            >
              {`${dragLabel} `}
            </BaseTypography>
            <label
              className={styles['base-file-input__browse-link']}
              for={resolvedId}
            >
              {browseLabel}
            </label>
          </p>
          {displayName ? (
            <p className={styles['base-file-input__file-name']}>
              <BaseTypography
                as="span"
                variant="body-sm"
                weight="medium"
              >
                {displayName}
              </BaseTypography>
            </p>
          ) : undefined}
        </div>
      ) : (
        <div className={styles['base-file-input__row']}>
          <label
            className={[
              styles['base-file-input__button'],
              {
                [styles['base-file-input__button--disabled']]: disabled,
              },
            ]}
            for={resolvedId}
          >
            {browseLabel}
          </label>
          <span className={styles['base-file-input__name']}>
            <BaseTypography
              as="span"
              color="secondary"
              variant="body-sm"
            >
              {displayName || noFileLabel}
            </BaseTypography>
          </span>
        </div>
      )}
      <input
        id={resolvedId}
        accept={accept}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        capture={capture}
        className={styles['base-file-input__native']}
        disabled={disabled}
        multiple={multiple}
        required={required}
        type="file"
        onChange={handleInputChange}
      />
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['base-file-input__error']}
          role="alert"
        >
          <BaseTypography
            as="span"
            color="inherit"
            variant="caption"
          >
            {error}
          </BaseTypography>
        </p>
      ) : hint ? (
        <p
          id={`${resolvedId}-hint`}
          className={styles['base-file-input__hint']}
        >
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {hint}
          </BaseTypography>
        </p>
      ) : undefined}
    </div>
  );
}
