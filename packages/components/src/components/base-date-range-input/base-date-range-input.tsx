import { IconCalendar } from '@mission-platform/icons';
import {
  h,
  hasSlot,
  Slot,
  useRef,
  useState,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { BaseCalendar } from '../base-calendar';
import { BaseDropdown } from '../base-dropdown';
import { BaseTypography } from '../base-typography';
import { formatDateRange, type DateRange } from '../date-time';
import { nextFieldId } from '../field-id';

import styles from './base-date-range-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type DateRangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DateRangeInputProperties extends MpProperties {
  /** Selected `{ start, end }` ISO-date range, controlled via `modelValue`. */
  modelValue?: DateRange;
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
  size?: DateRangeInputSize;
  /** Earliest selectable ISO date (`YYYY-MM-DD`). */
  min?: string;
  /** Latest selectable ISO date (`YYYY-MM-DD`). */
  max?: string;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (the `start` named slot). */
  start?: MpChild;
  /** Trailing extension content (the `end` named slot). */
  end?: MpChild;
  /** Fired with the next range (the controlled `v-model` update). */
  onUpdateModelValue?: (value: DateRange) => void;
  /** Fired with the next range whenever it changes. */
  onChange?: (value: DateRange) => void;
}

/**
 * `BaseDateRangeInput` — a date-range picker authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * A trigger button shows the `start → end` summary and opens a teleported
 * popover with two {@link BaseCalendar} grids: the start grid is capped at the
 * current `end` (and `max`), the end grid floored at the current `start` (and
 * `min`), so the range stays ordered. Once a start is chosen but the end is
 * still open, the day under the cursor is fed back to both calendars as
 * `previewEnd` so the tentative range is highlighted as you hover. It owns its
 * styling through the co-located CSS Module `base-date-range-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link BaseDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * bespoke hover-driven
 * dual-month range grid is substituted with **two composed `BaseCalendar`s**
 * with ordering enforced via `min`/`max`; the `useId` composable becomes
 * `nextFieldId`; the calendar glyph is the write-once `@mission-platform/icons`
 * `IconCalendar`; the `start`/`end` regions are authored as named slots
 * (`<Slot>`) with their presence detected through the framework-neutral
 * {@link hasSlot} helper; and the `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseDateRangeInput(properties: DateRangeInputProperties): MpElement {
  const {
    modelValue = { start: '', end: '' },
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    size = 'md',
    min,
    max,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-date-range-input'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [open, setOpen] = useState<boolean>(false);
  // The day currently under the cursor, used to preview the range from the
  // selected start until a second click commits the end.
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [hovered, setHovered] = useState<string | undefined>(undefined);

  const emitRange = (next: DateRange): void => {
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
  };

  const handleStart = (value: string): void => {
    const nextEnd = modelValue.end && modelValue.end < value ? value : modelValue.end;
    emitRange({ start: value, end: nextEnd });
  };

  const handleEnd = (value: string): void => {
    emitRange({ start: modelValue.start, end: value });
  };

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }
    setOpen(!open);
  };

  // Only preview while a start is set but the end is still open; the hovered day
  // is fed to both calendars so the tentative range shows across the months.
  const previewEnd = modelValue.start && !modelValue.end ? hovered : undefined;

  const summary = formatDateRange(modelValue);

  return (
    <div
      classNames={[
        styles['base-date-range-input'],
        styles[`base-date-range-input--${size}`],
        {
          [styles['base-date-range-input--error']]: !!error,
          [styles['base-date-range-input--disabled']]: disabled,
        },
      ]}
    >
      {label ? (
        <label
          classNames={[
            styles['base-date-range-input__label'],
            {
              [styles['base-date-range-input__label--hidden']]: labelHidden,
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
              classNames={styles['base-date-range-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <BaseDropdown
        matchTriggerWidth={false}
        maxHeight="min(92vh, 720px)"
        open={open}
        onUpdateOpen={(next: boolean) => {
          setOpen(next);
          if (!next) {
            setHovered(undefined);
          }
        }}
      >
        <div
          classNames={styles['base-date-range-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('start') ? (
            <span
              classNames={[
                styles['base-date-range-input__extension'],
                styles['base-date-range-input__extension--start'],
              ]}
            >
              <Slot name="start" />
            </span>
          ) : undefined}
          <button
            id={resolvedId}
            aria-describedby={describedBy}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ?? 'Date range picker'}
            classNames={styles['base-date-range-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              classNames={[
                styles['base-date-range-input__value'],
                {
                  [styles['base-date-range-input__value--placeholder']]: !summary,
                },
              ]}
            >
              {summary || 'YYYY-MM-DD → YYYY-MM-DD'}
            </span>
            <span
              aria-hidden="true"
              classNames={styles['base-date-range-input__icon']}
            >
              <IconCalendar size="sm" />
            </span>
          </button>
          {hasSlot('end') ? (
            <span
              classNames={[styles['base-date-range-input__extension'], styles['base-date-range-input__extension--end']]}
            >
              <Slot name="end" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Date'} range calendar`}
          classNames={styles['base-date-range-input__calendar']}
          role="dialog"
        >
          <div classNames={styles['base-date-range-input__panes']}>
            <div classNames={styles['base-date-range-input__pane']}>
              <BaseTypography
                as="span"
                color="secondary"
                variant="caption"
              >
                Start
              </BaseTypography>
              <BaseCalendar
                flat
                max={modelValue.end || max}
                min={min}
                modelValue={modelValue.start}
                previewEnd={previewEnd}
                rangeEnd={modelValue.end}
                rangeStart={modelValue.start}
                onHoverDate={(value) => setHovered(value)}
                onUpdateModelValue={handleStart}
              />
            </div>
            <div classNames={styles['base-date-range-input__pane']}>
              <BaseTypography
                as="span"
                color="secondary"
                variant="caption"
              >
                End
              </BaseTypography>
              <BaseCalendar
                flat
                max={max}
                min={modelValue.start || min}
                modelValue={modelValue.end}
                previewEnd={previewEnd}
                rangeEnd={modelValue.end}
                rangeStart={modelValue.start}
                onHoverDate={(value) => setHovered(value)}
                onUpdateModelValue={handleEnd}
              />
            </div>
          </div>
        </div>
      </BaseDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['base-date-range-input__error']}
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
          classNames={styles['base-date-range-input__hint']}
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
