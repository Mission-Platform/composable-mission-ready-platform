import { h, type MpElement, type MpProperties, useEffect, useId, useRef } from '@mission-platform/forge';
import { ForgeIconCheck, ForgeIconMinus } from '@mission-platform/icons';

import sizeStyles from '../../../styles/size.module.scss';
import { ForgeTypography } from '../forge-typography';

import styles from './forge-checkbox.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type CheckboxSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface CheckboxProperties extends MpProperties {
  /**
   * Checked state. A `boolean` for a standalone checkbox, or a `string[]` of
   * selected `value`s when the checkbox participates in a group. Controlled via
   * `modelValue` + `onUpdateModelValue`. Defaults to `false`.
   * @model onUpdateModelValue
   */
  modelValue?: boolean | string[];
  /** This checkbox's value, used when `modelValue` is a `string[]` group. */
  value?: string;
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
  /** Render the mixed/indeterminate state. */
  indeterminate?: boolean;
  /** Field size. Defaults to `'md'`. */
  size?: CheckboxSize;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next checked value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: boolean | string[]) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
}

/**
 * `ForgeCheckbox` — checkbox control authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Supports both a standalone boolean and a `string[]` group (toggling its
 * `value` in/out of the array). It owns its styling through the co-located CSS
 * Module `forge-checkbox.module.scss` and composes the neutral {@link ForgeTypography}
 * for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the indeterminate
 * DOM property is set through a `useRef` + `useEffect` pair (the neutral
 * equivalent of the SFC `watch`); the check/indeterminate markers are the
 * write-once `@mission-platform/icons` `ForgeIconCheck`/`ForgeIconMinus`; the `useI18n`
 * "required" title becomes a plain
 * string; and the `v-model` + `change` emit become the established
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeCheckbox(properties: Readonly<CheckboxProperties>): MpElement {
  const {
    modelValue = false,
    value,
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    indeterminate = false,
    size = 'md',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const inputReference = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputReference.current) {
      inputReference.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const selectedValues = Array.isArray(modelValue) ? new Set<string>(modelValue) : undefined;
  const isChecked = selectedValues ? value !== undefined && selectedValues.has(value) : modelValue;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const handleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (Array.isArray(modelValue) && value !== undefined) {
      const next = [...modelValue];
      if (target.checked) {
        next.push(value);
      } else {
        properties.onUpdateModelValue?.(next.filter((selectedValue: string) => selectedValue !== value));
        properties.onChange?.(event);
        return;
      }
      properties.onUpdateModelValue?.(next);
    } else {
      properties.onUpdateModelValue?.(target.checked);
    }
    properties.onChange?.(event);
  };

  return (
    <div
      className={[
        styles['forge-checkbox'],
        sizeStyles[`forge-size--${size}`],
        {
          [styles['forge-checkbox--error']]: !!error,
          [styles['forge-checkbox--disabled']]: disabled,
        },
      ]}
    >
      <label
        className={styles['forge-checkbox__row']}
        for={resolvedId}
      >
        <span className={styles['forge-checkbox__control-wrapper']}>
          <input
            ref={inputReference}
            id={resolvedId}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            checked={isChecked}
            className={styles['forge-checkbox__input']}
            disabled={disabled}
            required={required}
            type="checkbox"
            value={value}
            onChange={handleChange}
          />
          <span
            aria-hidden="true"
            className={styles['forge-checkbox__box']}
          >
            <span className={styles['forge-checkbox__glyph']}>
              {indeterminate ? <ForgeIconMinus size="2xs" /> : <ForgeIconCheck size="2xs" />}
            </span>
          </span>
        </span>
        {label ? (
          <span
            className={[
              styles['forge-checkbox__label'],
              {
                [styles['forge-checkbox__label--hidden']]: labelHidden,
              },
            ]}
          >
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-md"
            >
              {label}
            </ForgeTypography>
            {required ? (
              <span
                aria-hidden="true"
                className={styles['forge-checkbox__required']}
                title="required"
              >
                *
              </span>
            ) : undefined}
          </span>
        ) : undefined}
      </label>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-checkbox__error']}
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
          className={styles['forge-checkbox__hint']}
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
