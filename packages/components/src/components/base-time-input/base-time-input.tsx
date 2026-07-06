import {
  h,
  hasSlot,
  Slot,
  useEffect,
  useRef,
  useState,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { BaseDropdown } from '../base-dropdown';
import { BaseTypography } from '../base-typography';
import { HOURS, MINUTES, SECONDS, clamp, displayTime, formatTime, pad, parseTime } from '../date-time';
import { nextFieldId } from '../field-id';

import styles from './base-time-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type TimeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface TimeInputProperties extends MpProperties {
  /** Selected time (`HH:MM` or `HH:MM:SS`), controlled via `modelValue`. */
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
  size?: TimeInputSize;
  /** Include a seconds column (and `:SS` in the value). Defaults to `false`. */
  showSeconds?: boolean;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (the `start` named slot). */
  start?: MpChild;
  /** Trailing extension content (the `end` named slot). */
  end?: MpChild;
  /** Fired with the next time string (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the next time string whenever it changes. */
  onChange?: (value: string) => void;
}

/**
 * `BaseTimeInput` — a time picker authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * A trigger button shows the selected `HH:MM[:SS]` time and opens a popover with
 * scrollable hour/minute(/second) lists. It owns its styling through the
 * co-located CSS Module `base-time-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link BaseDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * inline parse/format logic is
 * delegated to the co-located framework-agnostic `date-time.ts`; the local
 * `ref`s become {@link useState} resynced from `modelValue` via a
 * {@link useEffect}; the `useId` composable becomes `nextFieldId`; the inline
 * clock SVG becomes a `🕒` glyph; the `start`/`end` regions are authored as named
 * slots (`<Slot>`) with their presence detected through the framework-neutral
 * {@link hasSlot} helper; and the `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseTimeInput(properties: TimeInputProperties): MpElement {
  const {
    modelValue = '',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    size = 'md',
    showSeconds = false,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-time-input'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [open, setOpen] = useState<boolean>(false);

  const initial = parseTime(modelValue);
  const [localH, setLocalH] = useState<number>(initial.h);
  const [localM, setLocalM] = useState<number>(initial.m);
  const [localS, setLocalS] = useState<number>(initial.s);

  // Resync the local time when the model changes externally.
  useEffect(() => {
    const parts = parseTime(modelValue);
    setLocalH(parts.h);
    setLocalM(parts.m);
    setLocalS(parts.s);
  }, [modelValue]);

  const emitValue = (hour: number, minute: number, second: number): void => {
    const value = formatTime({ h: hour, m: minute, s: second }, showSeconds);
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const setHour = (hour: number): void => {
    const next = clamp(hour, 0, 23);
    setLocalH(next);
    emitValue(next, localM, localS);
  };
  const setMinute = (minute: number): void => {
    const next = clamp(minute, 0, 59);
    setLocalM(next);
    emitValue(localH, next, localS);
  };
  const setSecond = (second: number): void => {
    const next = clamp(second, 0, 59);
    setLocalS(next);
    emitValue(localH, localM, next);
  };

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }
    setOpen(!open);
  };

  const value = displayTime(modelValue, showSeconds);
  const placeholder = showSeconds ? 'HH:MM:SS' : 'HH:MM';

  const column = (
    header: string,
    units: readonly number[],
    active: number,
    onPick: (unit: number) => void,
  ): MpChild => (
    <div classNames={styles['base-time-input__col']}>
      <div classNames={styles['base-time-input__col-header']}>{header}</div>
      <div classNames={styles['base-time-input__scroll']}>
        {units.map((unit) => (
          <button
            key={unit}
            classNames={[
              styles['base-time-input__unit-btn'],
              {
                [styles['base-time-input__unit-btn--active']]: active === unit,
              },
            ]}
            type="button"
            onClick={() => onPick(unit)}
          >
            {pad(unit)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      classNames={[
        styles['base-time-input'],
        styles[`base-time-input--${size}`],
        {
          [styles['base-time-input--error']]: !!error,
          [styles['base-time-input--disabled']]: disabled,
        },
      ]}
    >
      {label ? (
        <label
          classNames={[
            styles['base-time-input__label'],
            {
              [styles['base-time-input__label--hidden']]: labelHidden,
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
              classNames={styles['base-time-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <BaseDropdown
        matchTriggerWidth={false}
        open={open}
        onUpdateOpen={(next: boolean) => setOpen(next)}
      >
        <div
          classNames={styles['base-time-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('start') ? (
            <span classNames={[styles['base-time-input__extension'], styles['base-time-input__extension--start']]}>
              <Slot name="start" />
            </span>
          ) : undefined}
          <button
            id={resolvedId}
            aria-describedby={describedBy}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ?? 'Time picker'}
            classNames={styles['base-time-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              classNames={[
                styles['base-time-input__value'],
                {
                  [styles['base-time-input__value--placeholder']]: !value,
                },
              ]}
            >
              {value || placeholder}
            </span>
            <span
              aria-hidden="true"
              classNames={styles['base-time-input__icon']}
            >
              🕒
            </span>
          </button>
          {hasSlot('end') ? (
            <span classNames={[styles['base-time-input__extension'], styles['base-time-input__extension--end']]}>
              <Slot name="end" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Time'} picker`}
          classNames={styles['base-time-input__popover']}
          role="dialog"
        >
          <div classNames={styles['base-time-input__columns']}>
            {column('HH', HOURS, localH, setHour)}
            <span classNames={styles['base-time-input__sep']}>:</span>
            {column('MM', MINUTES, localM, setMinute)}
            {showSeconds ? <span classNames={styles['base-time-input__sep']}>:</span> : undefined}
            {showSeconds ? column('SS', SECONDS, localS, setSecond) : undefined}
          </div>
          <div classNames={styles['base-time-input__footer']}>
            <button
              classNames={styles['base-time-input__done-btn']}
              type="button"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </BaseDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['base-time-input__error']}
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
          classNames={styles['base-time-input__hint']}
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
