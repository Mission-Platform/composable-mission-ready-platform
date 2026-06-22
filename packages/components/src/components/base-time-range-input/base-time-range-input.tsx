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
import { HOURS, MINUTES, SECONDS, formatTime, formatTimeRange, pad, parseTime, type TimeRange } from '../date-time';
import { nextFieldId } from '../field-id';

import styles from './base-time-range-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type TimeRangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The end being edited (`start` or `end`). */
type Endpoint = 'start' | 'end';

export interface TimeRangeInputProperties extends MpProperties {
  /** Selected `{ start, end }` time range, controlled via `modelValue`. */
  modelValue?: TimeRange;
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
  size?: TimeRangeInputSize;
  /** Include a seconds column (and `:SS` in each value). Defaults to `false`. */
  showSeconds?: boolean;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (the `startContent` named slot). */
  startContent?: MpChild;
  /** Trailing extension content (the `endContent` named slot). */
  endContent?: MpChild;
  /** Fired with the next range (the controlled `v-model` update). */
  onUpdateModelValue?: (value: TimeRange) => void;
  /** Fired with the next range whenever it changes. */
  onChange?: (value: TimeRange) => void;
}

/**
 * `BaseTimeRangeInput` — a time-range picker authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * A trigger button shows the `start → end` summary and opens a teleported
 * popover with two sets of scrollable hour/minute(/second) lists (one per
 * endpoint). It owns its styling through the co-located CSS Module
 * `base-time-range-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link BaseDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * inline parse/format logic is
 * delegated to the co-located framework-agnostic `date-time.ts`; the local
 * `ref`s become {@link useState} resynced from `modelValue` via a
 * {@link useEffect}; the `useId` composable becomes `nextFieldId`; the `start`/
 * `end` SFC slots become the `startContent`/`endContent` named slots (`<Slot>`,
 * presence detected with the framework-neutral {@link hasSlot} helper; the
 * `start`/`end` names are reserved for the range endpoints); and the `v-model` +
 * `change` emits become the `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseTimeRangeInput(properties: TimeRangeInputProperties): MpElement {
  const {
    modelValue = { start: '', end: '' },
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    size = 'md',
    showSeconds = false,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-time-range-input'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [open, setOpen] = useState<boolean>(false);

  const initialStart = parseTime(modelValue.start);
  const initialEnd = parseTime(modelValue.end);
  const [startH, setStartH] = useState<number>(initialStart.h);
  const [startM, setStartM] = useState<number>(initialStart.m);
  const [startS, setStartS] = useState<number>(initialStart.s);
  const [endH, setEndH] = useState<number>(initialEnd.h);
  const [endM, setEndM] = useState<number>(initialEnd.m);
  const [endS, setEndS] = useState<number>(initialEnd.s);

  // Resync the local components when the model changes externally.
  useEffect(() => {
    const parsedStart = parseTime(modelValue.start);
    const parsedEnd = parseTime(modelValue.end);
    setStartH(parsedStart.h);
    setStartM(parsedStart.m);
    setStartS(parsedStart.s);
    setEndH(parsedEnd.h);
    setEndM(parsedEnd.m);
    setEndS(parsedEnd.s);
  }, [modelValue]);

  const emitRange = (next: TimeRange): void => {
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
  };

  const updateStart = (h: number, m: number, s: number): void => {
    setStartH(h);
    setStartM(m);
    setStartS(s);
    emitRange({ start: formatTime({ h, m, s }, showSeconds), end: modelValue.end });
  };

  const updateEnd = (h: number, m: number, s: number): void => {
    setEndH(h);
    setEndM(m);
    setEndS(s);
    emitRange({ start: modelValue.start, end: formatTime({ h, m, s }, showSeconds) });
  };

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }
    setOpen(!open);
  };

  const summary = formatTimeRange(modelValue, showSeconds);
  const placeholder = showSeconds ? 'HH:MM:SS → HH:MM:SS' : 'HH:MM → HH:MM';

  const column = (
    header: string,
    units: readonly number[],
    active: number,
    onPick: (unit: number) => void,
  ): MpChild => (
    <div classNames={styles['base-time-range-input__col']}>
      <div classNames={styles['base-time-range-input__col-header']}>{header}</div>
      <div classNames={styles['base-time-range-input__scroll']}>
        {units.map((unit) => (
          <button
            key={unit}
            classNames={[styles['base-time-range-input__unit-btn'], {
              [styles['base-time-range-input__unit-btn--active']]: active === unit,
            }]}
            type="button"
            onClick={() => onPick(unit)}
          >
            {pad(unit)}
          </button>
        ))}
      </div>
    </div>
  );

  const group = (title: string, endpoint: Endpoint): MpChild => {
    const hour = endpoint === 'start' ? startH : endH;
    const minute = endpoint === 'start' ? startM : endM;
    const second = endpoint === 'start' ? startS : endS;
    const update = endpoint === 'start' ? updateStart : updateEnd;
    return (
      <div classNames={styles['base-time-range-input__group']}>
        <BaseTypography
          as="span"
          color="secondary"
          variant="caption"
        >
          {title}
        </BaseTypography>
        <div classNames={styles['base-time-range-input__columns']}>
          {column('HH', HOURS, hour, (unit) => update(unit, minute, second))}
          <span classNames={styles['base-time-range-input__sep']}>:</span>
          {column('MM', MINUTES, minute, (unit) => update(hour, unit, second))}
          {showSeconds ? <span classNames={styles['base-time-range-input__sep']}>:</span> : undefined}
          {showSeconds ? column('SS', SECONDS, second, (unit) => update(hour, minute, unit)) : undefined}
        </div>
      </div>
    );
  };

  return (
    <div
      classNames={[styles['base-time-range-input'], styles[`base-time-range-input--${size}`], {
        [styles['base-time-range-input--error']]: !!error,
        [styles['base-time-range-input--disabled']]: disabled,
      }]}
    >
      {label ? (
        <label
          classNames={[styles['base-time-range-input__label'], {
            [styles['base-time-range-input__label--hidden']]: labelHidden,
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
              classNames={styles['base-time-range-input__required']}
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
          classNames={styles['base-time-range-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('startContent') ? (
            <span
              classNames={[styles['base-time-range-input__extension'],
                styles['base-time-range-input__extension--start']]}
            >
              <Slot name="startContent" />
            </span>
          ) : undefined}
          <button
            id={resolvedId}
            aria-describedby={describedBy}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ?? 'Time range picker'}
            classNames={styles['base-time-range-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              classNames={[styles['base-time-range-input__value'], {
                [styles['base-time-range-input__value--placeholder']]: !summary,
              }]}
            >
              {summary || placeholder}
            </span>
            <span
              aria-hidden="true"
              classNames={styles['base-time-range-input__icon']}
            >
              🕒
            </span>
          </button>
          {hasSlot('endContent') ? (
            <span
              classNames={[styles['base-time-range-input__extension'],
                styles['base-time-range-input__extension--end']]}
            >
              <Slot name="endContent" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Time'} range picker`}
          classNames={styles['base-time-range-input__popover']}
          role="dialog"
        >
          <div classNames={styles['base-time-range-input__groups']}>
            {group('Start', 'start')}
            {group('End', 'end')}
          </div>
          <div classNames={styles['base-time-range-input__footer']}>
            <button
              classNames={styles['base-time-range-input__done-btn']}
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
          classNames={styles['base-time-range-input__error']}
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
          classNames={styles['base-time-range-input__hint']}
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
