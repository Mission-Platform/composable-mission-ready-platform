import { h, hasSlot, Slot, useRef, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';

import styles from './base-textarea.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type TextareaSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Native CSS resize behaviour. */
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';
/** Native `autocapitalize` hint for on-screen keyboards. */
export type TextareaAutocapitalize = 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';

export interface TextareaProperties extends MpProperties {
  /** Field value (controlled via `modelValue` + `onUpdateModelValue`). */
  modelValue?: string;
  /** Visible number of text rows. Defaults to `4`. */
  rows?: number;
  /** Field size. Defaults to `'md'`. */
  size?: TextareaSize;
  /** CSS resize behaviour. Defaults to `'vertical'`. */
  resize?: TextareaResize;
  /** Placeholder text. */
  placeholder?: string;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message shown below the field (replaces the hint). */
  error?: string;
  /** Disable the field. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Native `autocomplete` token (e.g. `'street-address'`, `'off'`). */
  autocomplete?: string;
  /** Native `autocapitalize` hint. */
  autocapitalize?: TextareaAutocapitalize;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (icon or button), top-aligned — the `start` named slot. */
  start?: MpChild;
  /** Trailing extension content (icon or button), top-aligned — the `end` named slot. */
  end?: MpChild;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
  /** Fired with the native `blur` event. */
  onBlur?: (event: FocusEvent) => void;
  /** Fired with the native `focus` event. */
  onFocus?: (event: FocusEvent) => void;
}

/**
 * `BaseTextarea` — multi-line text field authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Supports the canonical `2xs … 2xl` size scale, a configurable `rows`/`resize`,
 * a label/hint/error trio, and leading/trailing extension content. It owns its
 * styling through the co-located CSS Module `base-textarea.module.scss` and
 * composes the neutral {@link BaseTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable becomes the
 * shared `nextFieldId` helper resolved once in a `useRef`; the `start`/`end`
 * regions are authored as named slots (`<Slot>`) with their presence detected
 * through the framework-neutral {@link hasSlot} helper; and the `v-model` +
 * `change`/`blur`/`focus` emits become the
 * `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props.
 */
export function BaseTextarea(properties: TextareaProperties): MpElement {
  const {
    modelValue = '',
    rows = 4,
    size = 'md',
    resize = 'vertical',
    placeholder = '',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    autocomplete,
    autocapitalize,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-textarea'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const handleInput = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement;
    properties.onUpdateModelValue?.(target.value);
  };

  return (
    <div
      classNames={[
        styles['base-textarea'],
        styles[`base-textarea--${size}`],
        {
          [styles['base-textarea--error']]: !!error,
          [styles['base-textarea--disabled']]: disabled,
        },
      ]}
    >
      {label ? (
        <label
          classNames={[
            styles['base-textarea__label'],
            {
              [styles['base-textarea__label--hidden']]: labelHidden,
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
              classNames={styles['base-textarea__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      <div classNames={styles['base-textarea__wrapper']}>
        {hasSlot('start') ? (
          <span classNames={[styles['base-textarea__extension'], styles['base-textarea__extension--start']]}>
            <Slot name="start" />
          </span>
        ) : undefined}
        <textarea
          id={resolvedId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          autocapitalize={autocapitalize}
          autocomplete={autocomplete}
          classNames={styles['base-textarea__field']}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          rows={rows}
          style={{ resize }}
          value={modelValue}
          onBlur={(event: FocusEvent) => properties.onBlur?.(event)}
          onChange={(event: Event) => properties.onChange?.(event)}
          onFocus={(event: FocusEvent) => properties.onFocus?.(event)}
          onInput={handleInput}
        />
        {hasSlot('end') ? (
          <span classNames={[styles['base-textarea__extension'], styles['base-textarea__extension--end']]}>
            <Slot name="end" />
          </span>
        ) : undefined}
      </div>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['base-textarea__error']}
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
          classNames={styles['base-textarea__hint']}
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
