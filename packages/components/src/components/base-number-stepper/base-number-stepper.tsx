import { IconMinus, IconPlus } from '@mission-platform/icons';
import { h, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';


import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';

import styles from './base-number-stepper.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type NumberStepperSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface NumberStepperProperties extends MpProperties {
  /** The numeric value, or `''`/`undefined` when empty (controlled via `modelValue`). */
  modelValue?: number | '' | undefined;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message shown below the field (replaces the hint). */
  error?: string;
  /** Disable the control. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Field size. Defaults to `'md'`. */
  size?: NumberStepperSize;
  /** Inclusive minimum value. */
  min?: number;
  /** Inclusive maximum value. */
  max?: number;
  /** Increment/decrement amount for the buttons and arrow keys. Defaults to `1`. */
  step?: number;
  /** Restrict input to whole numbers. */
  integer?: boolean;
  /** Disallow negative values (clamps the effective minimum to `0`). */
  unsigned?: boolean;
  /** Fractional digits a float value is rounded/displayed to. */
  precision?: number;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value?: number) => void;
  /** Fired alongside `onUpdateModelValue` whenever the value changes. */
  onChange?: (value?: number) => void;
}

/**
 * `BaseNumberStepper` — numeric stepper authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * A number field flanked by decrement/increment buttons, configurable as a
 * signed/unsigned integer or a fixed-`precision` float. It owns its styling
 * through the co-located CSS Module `base-number-stepper.module.scss` and
 * composes the neutral {@link BaseTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable becomes the
 * shared `nextFieldId` helper resolved once in a `useRef`; the `BaseStack`
 * wrapper becomes a plain flex `<div>`; the decrement/increment glyphs are the
 * write-once `@mission-platform/icons` `IconMinus`/`IconPlus`; and the
 * `v-model` + `change` emit become the established `onUpdateModelValue`/`onChange`
 * callback props.
 */
export function BaseNumberStepper(properties: NumberStepperProperties): MpElement {
  const {
    modelValue = undefined,
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    placeholder = '',
    size = 'md',
    min,
    max,
    step = 1,
    integer = false,
    unsigned = false,
    precision,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-number-stepper'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const effectiveMin = unsigned ? Math.max(0, min ?? 0) : min;

  const current: number | undefined =
    modelValue === undefined || modelValue === ''
      ? undefined
      : typeof modelValue === 'number'
        ? modelValue
        : Number(modelValue);

  const display =
    current === undefined || Number.isNaN(current)
      ? ''
      : !integer && precision !== undefined
        ? current.toFixed(precision)
        : String(current);

  const normalise = (value: number): number => {
    let next = value;
    if (integer) {
      next = Math.trunc(next);
    } else if (precision !== undefined) {
      const factor = 10 ** precision;
      next = Math.round(next * factor) / factor;
    }
    if (effectiveMin !== undefined) {
      next = Math.max(effectiveMin, next);
    }
    if (max !== undefined) {
      next = Math.min(max, next);
    }
    return next;
  };

  const commit = (value?: number): void => {
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const onInput = (event: Event): void => {
    const raw = (event.target as HTMLInputElement).value;
    if (raw.trim() === '') {
      commit();
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return;
    }
    commit(normalise(parsed));
  };

  const canDecrement = !disabled && (effectiveMin === undefined || (current ?? 0) > effectiveMin);
  const canIncrement = !disabled && (max === undefined || (current ?? 0) < max);

  const adjust = (direction: 1 | -1): void => {
    if (disabled) {
      return;
    }
    const base = current ?? effectiveMin ?? 0;
    commit(normalise(base + direction * step));
  };

  return (
    <div
      classNames={[styles['base-number-stepper'], styles[`base-number-stepper--${size}`], {
        [styles['base-number-stepper--error']]: !!error,
        [styles['base-number-stepper--disabled']]: disabled,
      }]}
    >
      {label ? (
        <label
          classNames={[styles['base-number-stepper__label'], {
            [styles['base-number-stepper__label--hidden']]: labelHidden,
          }]}
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
              classNames={styles['base-number-stepper__required']}
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      <div classNames={styles['base-number-stepper__wrapper']}>
        <button
          aria-label="Decrease"
          classNames={styles['base-number-stepper__btn']}
          disabled={!canDecrement}
          tabindex={-1}
          type="button"
          onClick={() => adjust(-1)}
        >
          <IconMinus size="sm" />
        </button>
        <input
          id={resolvedId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          classNames={styles['base-number-stepper__field']}
          disabled={disabled}
          inputmode="decimal"
          max={max}
          min={effectiveMin}
          placeholder={placeholder}
          required={required}
          step={integer ? 1 : step}
          type="number"
          value={display}
          onInput={onInput}
        />
        <button
          aria-label="Increase"
          classNames={styles['base-number-stepper__btn']}
          disabled={!canIncrement}
          tabindex={-1}
          type="button"
          onClick={() => adjust(1)}
        >
          <IconPlus size="sm" />
        </button>
      </div>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['base-number-stepper__error']}
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
          classNames={styles['base-number-stepper__hint']}
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
