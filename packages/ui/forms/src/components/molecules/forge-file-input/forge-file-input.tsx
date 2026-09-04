import {
  useId,
  useState,
  createForgeStyle,
  type ClassValue,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeIconUpload } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-file-input.module.scss';

/** Field size token — canonical 2xs → 2xl scale. */
export type FileInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface FileInputStyleProperties {
  readonly 'input-file-border-active'?: string;
  readonly 'input-file-border-default'?: string;
  readonly 'input-file-border-hover'?: string;
  readonly 'input-file-border-invalid'?: string;
  readonly 'input-file-border-width-default'?: string;
  readonly 'input-file-border-width-dropzone'?: string;
  readonly 'input-file-font-weight'?: string;
  readonly 'input-file-gap-dropzone'?: string;
  readonly 'input-file-gap-row'?: string;
  readonly 'input-file-gap-stack'?: string;
  readonly 'input-file-padding-dropzone-block'?: string;
  readonly 'input-file-padding-dropzone-inline'?: string;
  readonly 'input-file-radius-button'?: string;
  readonly 'input-file-radius-dropzone'?: string;
  readonly 'input-file-required'?: string;
  readonly 'input-file-size-2xl-font-size'?: string;
  readonly 'input-file-size-2xl-padding-block'?: string;
  readonly 'input-file-size-2xl-padding-inline'?: string;
  readonly 'input-file-size-2xs-font-size'?: string;
  readonly 'input-file-size-2xs-padding-block'?: string;
  readonly 'input-file-size-2xs-padding-inline'?: string;
  readonly 'input-file-size-lg-font-size'?: string;
  readonly 'input-file-size-lg-padding-block'?: string;
  readonly 'input-file-size-lg-padding-inline'?: string;
  readonly 'input-file-size-md-font-size'?: string;
  readonly 'input-file-size-md-padding-block'?: string;
  readonly 'input-file-size-md-padding-inline'?: string;
  readonly 'input-file-size-sm-font-size'?: string;
  readonly 'input-file-size-sm-padding-block'?: string;
  readonly 'input-file-size-sm-padding-inline'?: string;
  readonly 'input-file-size-xl-font-size'?: string;
  readonly 'input-file-size-xl-padding-block'?: string;
  readonly 'input-file-size-xl-padding-inline'?: string;
  readonly 'input-file-size-xs-font-size'?: string;
  readonly 'input-file-size-xs-padding-block'?: string;
  readonly 'input-file-size-xs-padding-inline'?: string;
  readonly 'input-file-surface-active'?: string;
  readonly 'input-file-surface-default'?: string;
  readonly 'input-file-surface-disabled'?: string;
  readonly 'input-file-surface-hover'?: string;
  readonly 'input-file-text-default'?: string;
  readonly 'input-file-text-disabled'?: string;
  readonly 'input-file-text-error'?: string;
  readonly 'input-file-text-link'?: string;
  readonly 'input-file-text-link-hover'?: string;
  readonly 'input-file-text-muted'?: string;
}

export type FileInputStyle = CSSStyleProperties & {
  readonly '--forge-file-input-input-file-border-active'?: string | undefined;
  readonly '--forge-file-input-input-file-border-default'?: string | undefined;
  readonly '--forge-file-input-input-file-border-hover'?: string | undefined;
  readonly '--forge-file-input-input-file-border-invalid'?: string | undefined;
  readonly '--forge-file-input-input-file-border-width-default'?: string | undefined;
  readonly '--forge-file-input-input-file-border-width-dropzone'?: string | undefined;
  readonly '--forge-file-input-input-file-font-weight'?: string | undefined;
  readonly '--forge-file-input-input-file-gap-dropzone'?: string | undefined;
  readonly '--forge-file-input-input-file-gap-row'?: string | undefined;
  readonly '--forge-file-input-input-file-gap-stack'?: string | undefined;
  readonly '--forge-file-input-input-file-padding-dropzone-block'?: string | undefined;
  readonly '--forge-file-input-input-file-padding-dropzone-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-radius-button'?: string | undefined;
  readonly '--forge-file-input-input-file-radius-dropzone'?: string | undefined;
  readonly '--forge-file-input-input-file-required'?: string | undefined;
  readonly '--forge-file-input-input-file-size-2xl-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-size-2xs-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-size-lg-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-lg-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-size-md-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-md-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-md-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-size-sm-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-sm-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-size-xl-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-xl-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-size-xs-font-size'?: string | undefined;
  readonly '--forge-file-input-input-file-size-xs-padding-block'?: string | undefined;
  readonly '--forge-file-input-input-file-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-file-input-input-file-surface-active'?: string | undefined;
  readonly '--forge-file-input-input-file-surface-default'?: string | undefined;
  readonly '--forge-file-input-input-file-surface-disabled'?: string | undefined;
  readonly '--forge-file-input-input-file-surface-hover'?: string | undefined;
  readonly '--forge-file-input-input-file-text-default'?: string | undefined;
  readonly '--forge-file-input-input-file-text-disabled'?: string | undefined;
  readonly '--forge-file-input-input-file-text-error'?: string | undefined;
  readonly '--forge-file-input-input-file-text-link'?: string | undefined;
  readonly '--forge-file-input-input-file-text-link-hover'?: string | undefined;
  readonly '--forge-file-input-input-file-text-muted'?: string | undefined;
};

function createFileInputStyle(properties: Readonly<FileInputStyleProperties> | undefined): FileInputStyle | undefined {
  return createForgeStyle({
    '--forge-file-input-input-file-border-active': properties?.['input-file-border-active'],
    '--forge-file-input-input-file-border-default': properties?.['input-file-border-default'],
    '--forge-file-input-input-file-border-hover': properties?.['input-file-border-hover'],
    '--forge-file-input-input-file-border-invalid': properties?.['input-file-border-invalid'],
    '--forge-file-input-input-file-border-width-default': properties?.['input-file-border-width-default'],
    '--forge-file-input-input-file-border-width-dropzone': properties?.['input-file-border-width-dropzone'],
    '--forge-file-input-input-file-font-weight': properties?.['input-file-font-weight'],
    '--forge-file-input-input-file-gap-dropzone': properties?.['input-file-gap-dropzone'],
    '--forge-file-input-input-file-gap-row': properties?.['input-file-gap-row'],
    '--forge-file-input-input-file-gap-stack': properties?.['input-file-gap-stack'],
    '--forge-file-input-input-file-padding-dropzone-block': properties?.['input-file-padding-dropzone-block'],
    '--forge-file-input-input-file-padding-dropzone-inline': properties?.['input-file-padding-dropzone-inline'],
    '--forge-file-input-input-file-radius-button': properties?.['input-file-radius-button'],
    '--forge-file-input-input-file-radius-dropzone': properties?.['input-file-radius-dropzone'],
    '--forge-file-input-input-file-required': properties?.['input-file-required'],
    '--forge-file-input-input-file-size-2xl-font-size': properties?.['input-file-size-2xl-font-size'],
    '--forge-file-input-input-file-size-2xl-padding-block': properties?.['input-file-size-2xl-padding-block'],
    '--forge-file-input-input-file-size-2xl-padding-inline': properties?.['input-file-size-2xl-padding-inline'],
    '--forge-file-input-input-file-size-2xs-font-size': properties?.['input-file-size-2xs-font-size'],
    '--forge-file-input-input-file-size-2xs-padding-block': properties?.['input-file-size-2xs-padding-block'],
    '--forge-file-input-input-file-size-2xs-padding-inline': properties?.['input-file-size-2xs-padding-inline'],
    '--forge-file-input-input-file-size-lg-font-size': properties?.['input-file-size-lg-font-size'],
    '--forge-file-input-input-file-size-lg-padding-block': properties?.['input-file-size-lg-padding-block'],
    '--forge-file-input-input-file-size-lg-padding-inline': properties?.['input-file-size-lg-padding-inline'],
    '--forge-file-input-input-file-size-md-font-size': properties?.['input-file-size-md-font-size'],
    '--forge-file-input-input-file-size-md-padding-block': properties?.['input-file-size-md-padding-block'],
    '--forge-file-input-input-file-size-md-padding-inline': properties?.['input-file-size-md-padding-inline'],
    '--forge-file-input-input-file-size-sm-font-size': properties?.['input-file-size-sm-font-size'],
    '--forge-file-input-input-file-size-sm-padding-block': properties?.['input-file-size-sm-padding-block'],
    '--forge-file-input-input-file-size-sm-padding-inline': properties?.['input-file-size-sm-padding-inline'],
    '--forge-file-input-input-file-size-xl-font-size': properties?.['input-file-size-xl-font-size'],
    '--forge-file-input-input-file-size-xl-padding-block': properties?.['input-file-size-xl-padding-block'],
    '--forge-file-input-input-file-size-xl-padding-inline': properties?.['input-file-size-xl-padding-inline'],
    '--forge-file-input-input-file-size-xs-font-size': properties?.['input-file-size-xs-font-size'],
    '--forge-file-input-input-file-size-xs-padding-block': properties?.['input-file-size-xs-padding-block'],
    '--forge-file-input-input-file-size-xs-padding-inline': properties?.['input-file-size-xs-padding-inline'],
    '--forge-file-input-input-file-surface-active': properties?.['input-file-surface-active'],
    '--forge-file-input-input-file-surface-default': properties?.['input-file-surface-default'],
    '--forge-file-input-input-file-surface-disabled': properties?.['input-file-surface-disabled'],
    '--forge-file-input-input-file-surface-hover': properties?.['input-file-surface-hover'],
    '--forge-file-input-input-file-text-default': properties?.['input-file-text-default'],
    '--forge-file-input-input-file-text-disabled': properties?.['input-file-text-disabled'],
    '--forge-file-input-input-file-text-error': properties?.['input-file-text-error'],
    '--forge-file-input-input-file-text-link': properties?.['input-file-text-link'],
    '--forge-file-input-input-file-text-link-hover': properties?.['input-file-text-link-hover'],
    '--forge-file-input-input-file-text-muted': properties?.['input-file-text-muted'],
  }) as FileInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface FileInputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<FileInputStyleProperties>;
}

/**
 * `ForgeFileInput` — file input authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Wraps a visually-hidden native `<input type="file">` with either a browse
 * button row or a drag-and-drop dropzone (`dragDrop`), plus a label/hint/error
 * trio. It owns its styling through the co-located CSS Module
 * `forge-file-input.module.scss` and composes the neutral {@link ForgeTypography}.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the drag/selection
 * state uses the neutral `useState` hook; the upload icon is the write-once
 * `@mission-platform/icons` `ForgeIconUpload` (itself compiled to React/Vue); the
 * `useI18n` labels become plain string props; and the `v-model` + `change` emit
 * become the `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeFileInput(properties: Readonly<FileInputProperties>): MpElement {
  const style = createFileInputStyle(properties.properties);

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
        styles['forge-file-input'],
        styles[`forge-file-input--${size}`],
        {
          [styles['forge-file-input--error']]: !!error,
          [styles['forge-file-input--disabled']]: disabled,
        },
        properties.className,
      ]}
      style={style}
    >
      {label ? (
        <label
          className={[
            styles['forge-file-input__label'],
            {
              [styles['forge-file-input__label--hidden']]: labelHidden,
            },
          ]}
          for={resolvedId}
        >
          <ForgeTypography
            as="span"
            color="primary"
            variant="label"
          >
            {label}
          </ForgeTypography>
          {required ? (
            <span
              aria-hidden="true"
              className={styles['forge-file-input__required']}
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
            styles['forge-file-input__dropzone'],
            {
              [styles['forge-file-input__dropzone--active']]: isDragging,
            },
          ]}
          role="presentation"
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span
            aria-hidden="true"
            className={styles['forge-file-input__icon']}
          >
            <ForgeIconUpload size="lg" />
          </span>
          <p className={styles['forge-file-input__drop-text']}>
            <ForgeTypography
              as="span"
              color="secondary"
              variant="body-sm"
            >
              {`${dragLabel} `}
            </ForgeTypography>
            <label
              className={styles['forge-file-input__browse-link']}
              for={resolvedId}
            >
              {browseLabel}
            </label>
          </p>
          {displayName ? (
            <p className={styles['forge-file-input__file-name']}>
              <ForgeTypography
                as="span"
                variant="body-sm"
                weight="medium"
              >
                {displayName}
              </ForgeTypography>
            </p>
          ) : undefined}
        </div>
      ) : (
        <div className={styles['forge-file-input__row']}>
          <label
            className={[
              styles['forge-file-input__button'],
              {
                [styles['forge-file-input__button--disabled']]: disabled,
              },
            ]}
            for={resolvedId}
          >
            {browseLabel}
          </label>
          <span className={styles['forge-file-input__name']}>
            <ForgeTypography
              as="span"
              color="secondary"
              variant="body-sm"
            >
              {displayName || noFileLabel}
            </ForgeTypography>
          </span>
        </div>
      )}
      <input
        id={resolvedId}
        accept={accept}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        capture={capture}
        className={styles['forge-file-input__native']}
        disabled={disabled}
        multiple={multiple}
        required={required}
        type="file"
        onChange={handleInputChange}
      />
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-file-input__error']}
          role="alert"
        >
          <ForgeTypography
            as="span"
            color="inherit"
            variant="caption"
          >
            {error}
          </ForgeTypography>
        </p>
      ) : hint ? (
        <p
          id={`${resolvedId}-hint`}
          className={styles['forge-file-input__hint']}
        >
          <ForgeTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {hint}
          </ForgeTypography>
        </p>
      ) : undefined}
    </div>
  );
}
