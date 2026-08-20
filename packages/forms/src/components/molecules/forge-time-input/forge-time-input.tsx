import { ForgeDropdown } from '@mission-platform/float';
import {
  type ClassValue,
  h,
  hasSlot,
  type MpChild,
  type MpElement,
  Slot,
  useEffect,
  useId,
  useState,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import {
  clamp,
  displayTime,
  formatTime,
  HOURS,
  MINUTES,
  pad,
  parseTime,
  SECONDS,
} from '../../../utils/date-time/date-time';

import styles from './forge-time-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type TimeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface TimeInputProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * Selected time (`HH:MM` or `HH:MM:SS`), controlled via `modelValue`.
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
 * `ForgeTimeInput` — a time picker authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A trigger button shows the selected `HH:MM[:SS]` time and opens a popover with
 * scrollable hour/minute(/second) lists. It owns its styling through the
 * co-located CSS Module `forge-time-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link ForgeDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * inline parse/format logic is
 * delegated to the co-located framework-agnostic `date-time.ts`; the local
 * `ref`s become {@link useState} resynced from `modelValue` via a
 * {@link useEffect}; the `useId` composable maps to the framework-native `useId` hook; the inline
 * clock SVG becomes a `🕒` glyph; the `start`/`end` regions are authored as named
 * slots (`<Slot>`) with their presence detected through the framework-neutral
 * {@link hasSlot} helper; and the `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeTimeInput(properties: Readonly<TimeInputProperties>): MpElement {
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

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
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
    <div className={styles['forge-time-input__col']}>
      <div className={styles['forge-time-input__col-header']}>{header}</div>
      <div className={styles['forge-time-input__scroll']}>
        {units.map((unit) => (
          <button
            key={unit}
            className={[
              styles['forge-time-input__unit-btn'],
              {
                [styles['forge-time-input__unit-btn--active']]: active === unit,
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
      aria-disabled={disabled ? 'true' : undefined}
      className={[
        styles['forge-time-input'],
        styles[`forge-time-input--${size}`],
        {
          [styles['forge-time-input--error']]: !!error,
          [styles['forge-time-input--disabled']]: disabled,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          className={[
            styles['forge-time-input__label'],
            {
              [styles['forge-time-input__label--hidden']]: labelHidden,
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
              className={styles['forge-time-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <ForgeDropdown
        matchTriggerWidth={false}
        open={open}
        onUpdateOpen={(next: boolean) => setOpen(next)}
      >
        <div
          className={styles['forge-time-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('start') ? (
            <span className={[styles['forge-time-input__extension'], styles['forge-time-input__extension--start']]}>
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
            className={styles['forge-time-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              className={[
                styles['forge-time-input__value'],
                {
                  [styles['forge-time-input__value--placeholder']]: !value,
                },
              ]}
            >
              {value || placeholder}
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-time-input__icon']}
            >
              🕒
            </span>
          </button>
          {hasSlot('end') ? (
            <span className={[styles['forge-time-input__extension'], styles['forge-time-input__extension--end']]}>
              <Slot name="end" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Time'} picker`}
          className={styles['forge-time-input__popover']}
          role="dialog"
        >
          <div className={styles['forge-time-input__columns']}>
            {column('HH', HOURS, localH, setHour)}
            <span className={styles['forge-time-input__sep']}>:</span>
            {column('MM', MINUTES, localM, setMinute)}
            {showSeconds ? <span className={styles['forge-time-input__sep']}>:</span> : undefined}
            {showSeconds ? column('SS', SECONDS, localS, setSecond) : undefined}
          </div>
          <div className={styles['forge-time-input__footer']}>
            <button
              className={styles['forge-time-input__done-btn']}
              type="button"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </ForgeDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-time-input__error']}
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
          className={styles['forge-time-input__hint']}
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
