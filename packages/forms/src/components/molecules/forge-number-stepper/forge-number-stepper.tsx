import { type ClassValue, type MpElement, useId } from '@mission-platform/forge';
import { ForgeIconMinus, ForgeIconPlus } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-number-stepper.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type NumberStepperSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface NumberStepperProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * The numeric value, or `''`/`undefined` when empty (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
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
 * `ForgeNumberStepper` — numeric stepper authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A number field flanked by decrement/increment buttons, configurable as a
 * signed/unsigned integer or a fixed-`precision` float. It owns its styling
 * through the co-located CSS Module `forge-number-stepper.module.scss` and
 * composes the neutral {@link ForgeTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the `ForgeStack`
 * wrapper becomes a plain flex `<div>`; the decrement/increment glyphs are the
 * write-once `@mission-platform/icons` `ForgeIconMinus`/`ForgeIconPlus`; and the
 * `v-model` + `change` emit become the established `onUpdateModelValue`/`onChange`
 * callback props.
 */
export function ForgeNumberStepper(properties: Readonly<NumberStepperProperties>): MpElement {
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

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
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
      className={[
        styles['forge-number-stepper'],
        styles[`forge-number-stepper--${size}`],
        {
          [styles['forge-number-stepper--error']]: !!error,
          [styles['forge-number-stepper--disabled']]: disabled,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          className={[
            styles['forge-number-stepper__label'],
            {
              [styles['forge-number-stepper__label--hidden']]: labelHidden,
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
              className={styles['forge-number-stepper__required']}
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      <div className={styles['forge-number-stepper__wrapper']}>
        <button
          aria-label="Decrease"
          className={styles['forge-number-stepper__btn']}
          disabled={!canDecrement}
          tabindex={-1}
          type="button"
          onClick={() => adjust(-1)}
        >
          <ForgeIconMinus size="sm" />
        </button>
        <input
          id={resolvedId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          className={styles['forge-number-stepper__field']}
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
          className={styles['forge-number-stepper__btn']}
          disabled={!canIncrement}
          tabindex={-1}
          type="button"
          onClick={() => adjust(1)}
        >
          <ForgeIconPlus size="sm" />
        </button>
      </div>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-number-stepper__error']}
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
          className={styles['forge-number-stepper__hint']}
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
