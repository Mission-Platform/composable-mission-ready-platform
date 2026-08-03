import { h, useEffect, useId, useState, type MpElement, type MpProperties } from '@mission-platform/forge';

import { BaseTypography } from '../base-typography';

import styles from './base-color-input.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type ColorInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Matches a 6-digit `#rrggbb` hex colour. */
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export interface ColorInputProperties extends MpProperties {
  /**
   * Colour value (controlled via `modelValue` + `onUpdateModelValue`). Defaults to `'#000000'`.
   * @model onUpdateModelValue
   */
  modelValue?: string;
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
  /** Field size. Defaults to `'md'`. */
  size?: ColorInputSize;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the committed value (the native `change`). */
  onChange?: (value: string) => void;
}

/**
 * `BaseColorInput` — colour picker authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Pairs a native `<input type="color">` (presented as a swatch) with a hex text
 * field. The colour is controlled via `modelValue`; the swatch and the hex
 * field stay in sync, and only valid `#rrggbb` values are propagated. It owns
 * its styling through the co-located CSS Module `base-color-input.module.scss`
 * and composes the neutral {@link BaseTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the local hex `ref`
 * becomes a {@link useState} kept in sync with external `modelValue` changes via
 * a {@link useEffect}; and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseColorInput(properties: Readonly<ColorInputProperties>): MpElement {
  const {
    modelValue = '#000000',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    size = 'md',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [hexText, setHexText] = useState<string>(modelValue);

  // Keep the hex text field in sync when the model changes externally.
  useEffect(() => {
    setHexText(modelValue);
  }, [modelValue]);

  const handleColorInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    setHexText(value);
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const handleTextInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    setHexText(value);
    if (HEX_PATTERN.test(value)) {
      properties.onUpdateModelValue?.(value);
      properties.onChange?.(value);
    }
  };

  const handleTextChange = (event: Event): void => {
    let value = (event.target as HTMLInputElement).value.trim();
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    if (HEX_PATTERN.test(value)) {
      setHexText(value);
      properties.onUpdateModelValue?.(value);
      properties.onChange?.(value);
    } else {
      setHexText(modelValue);
    }
  };

  return (
    <div
      className={[
        styles['base-color-input'],
        styles[`base-color-input--${size}`],
        {
          [styles['base-color-input--error']]: !!error,
          [styles['base-color-input--disabled']]: disabled,
        },
      ]}
    >
      {label ? (
        <label
          className={[
            styles['base-color-input__label'],
            {
              [styles['base-color-input__label--hidden']]: labelHidden,
            },
          ]}
          for={`${resolvedId}-text`}
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
              className={styles['base-color-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <div className={styles['base-color-input__wrapper']}>
        <label
          aria-label="Open colour picker"
          className={styles['base-color-input__swatch-label']}
          for={resolvedId}
          style={{ backgroundColor: modelValue }}
        />
        <input
          id={resolvedId}
          className={styles['base-color-input__picker']}
          disabled={disabled}
          required={required}
          type="color"
          value={modelValue}
          onChange={handleColorInput}
          onInput={handleColorInput}
        />
        <input
          id={`${resolvedId}-text`}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          className={styles['base-color-input__text']}
          disabled={disabled}
          maxlength={7}
          placeholder="#000000"
          spellcheck={false}
          type="text"
          value={hexText}
          onBlur={handleTextChange}
          onChange={handleTextChange}
          onInput={handleTextInput}
        />
      </div>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['base-color-input__error']}
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
          className={styles['base-color-input__hint']}
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
