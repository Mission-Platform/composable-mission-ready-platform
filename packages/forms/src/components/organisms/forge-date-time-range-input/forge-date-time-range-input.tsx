import { ForgeDropdown } from '@mission-platform/float';
import {
  type ClassValue,
  hasSlot,
  type MpChild,
  type MpElement,
  Slot,
  useId,
  useState,
} from '@mission-platform/forge';
import { ForgeIconCalendar, ForgeIconGlobe } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import {
  browserTimezoneLabel,
  type DateTimeRange,
  formatDateTime,
  HOURS,
  MINUTES,
  pad,
  parseDateTime,
  SECONDS,
  type TimezoneMode,
} from '../../../utils/date-time/date-time';
import { ForgeCalendar } from '../../molecules/forge-calendar';
import { ForgeFormWizard } from '../forge-form-wizard';

import styles from './forge-date-time-range-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type DateTimeRangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The endpoint being edited (`start` or `end`). */
type Endpoint = 'start' | 'end';

export interface DateTimeRangeInputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Selected `{ start, end, timezone }` range, controlled via `modelValue`.
   * @model onUpdateModelValue
   */
  modelValue?: DateTimeRange;
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
  size?: DateTimeRangeInputSize;
  /** Include a seconds column (and `:SS` in each value). Defaults to `false`. */
  showSeconds?: boolean;
  /** Earliest selectable ISO date (`YYYY-MM-DD`). */
  min?: string;
  /** Latest selectable ISO date (`YYYY-MM-DD`). */
  max?: string;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (the `startContent` named slot). */
  startContent?: MpChild;
  /** Trailing extension content (the `endContent` named slot). */
  endContent?: MpChild;
  /** Fired with the next range (the controlled `v-model` update). */
  onUpdateModelValue?: (value: DateTimeRange) => void;
  /** Fired with the next range whenever it changes. */
  onChange?: (value: DateTimeRange) => void;
}

/**
 * `ForgeDateTimeRangeInput` — a date-time-range picker authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * A trigger button shows the `start → end (timezone)` summary and opens a
 * popover with a browser/UTC toggle above a two-step {@link ForgeFormWizard}
 * (**Date**, then **Time**): the **Date** step picks the range's start/end dates
 * on two {@link ForgeCalendar}s, and the **Time** step picks the start/end times
 * on scrollable hour/minute(/second) lists; the wizard's Finish button closes
 * the popover. It owns its styling through the co-located CSS Module
 * `forge-date-time-range-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link ForgeDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * bespoke hover-driven
 * dual-month grid is substituted with **composed `ForgeCalendar`s** per endpoint;
 * the inline parse/format/timezone logic is delegated to the co-located
 * framework-agnostic `date-time.ts`; the `useId` composable maps to the
 * framework-native `useId` hook; the calendar/timezone glyphs are the write-once
 * `@mission-platform/icons` `ForgeIconCalendar`/`ForgeIconGlobe`; the `start`/`end` SFC
 * slots become the `startContent`/`endContent` named slots (`<Slot>`, presence
 * detected with the framework-neutral {@link hasSlot} helper); and the `v-model`
 * + `change` emits become the `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeDateTimeRangeInput(properties: Readonly<DateTimeRangeInputProperties>): MpElement {
  const {
    modelValue = { start: '', end: '', timezone: 'browser' },
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    size = 'md',
    showSeconds = false,
    min,
    max,
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [open, setOpen] = useState<boolean>(false);
  // The active wizard step: 0 = Date step, 1 = Time step.
  const [step, setStep] = useState<number>(0);

  const timezone: TimezoneMode = modelValue.timezone ?? 'browser';
  const startParts = parseDateTime(modelValue.start);
  const endParts = parseDateTime(modelValue.end);

  const emitRange = (next: DateTimeRange): void => {
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
  };

  const composeEndpoint = (endpoint: Endpoint, date: string, h: number, m: number, s: number): DateTimeRange => {
    const value = formatDateTime(date, { h, m, s }, showSeconds);
    return endpoint === 'start'
      ? { start: value, end: modelValue.end, timezone }
      : { start: modelValue.start, end: value, timezone };
  };

  const setDate =
    (endpoint: Endpoint) =>
    (date: string | undefined): void => {
      const parts = endpoint === 'start' ? startParts : endParts;
      emitRange(composeEndpoint(endpoint, date ?? '', parts.h, parts.m, parts.s));
    };

  const setTimeUnit = (endpoint: Endpoint, unit: 'h' | 'm' | 's', value: number): void => {
    const parts = endpoint === 'start' ? startParts : endParts;
    const next = { ...parts, [unit]: value };
    emitRange(composeEndpoint(endpoint, parts.date, next.h, next.m, next.s));
  };

  const setTimezone = (mode: TimezoneMode): void => {
    emitRange({ start: modelValue.start, end: modelValue.end, timezone: mode });
  };

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }
    if (!open) {
      setStep(0);
    }
    setOpen(!open);
  };

  // The wizard's Finish button closes the popover and resets to the first step.
  const closeWizard = (): void => {
    setOpen(false);
    setStep(0);
  };

  const tzLabel = timezone === 'utc' ? 'UTC' : browserTimezoneLabel();
  const summary =
    modelValue.start || modelValue.end ? `${modelValue.start || '…'} → ${modelValue.end || '…'} (${tzLabel})` : '';

  const column = (
    header: string,
    units: readonly number[],
    active: number,
    onPick: (unit: number) => void,
  ): MpChild => (
    <div className={styles['forge-date-time-range-input__col']}>
      <div className={styles['forge-date-time-range-input__col-header']}>{header}</div>
      <div className={styles['forge-date-time-range-input__scroll']}>
        {units.map((unit) => (
          <button
            key={unit}
            className={[
              styles['forge-date-time-range-input__unit-btn'],
              {
                [styles['forge-date-time-range-input__unit-btn--active']]: active === unit,
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

  // The Date step's calendar for one endpoint, ordered so the start can't pass
  // the end (and vice versa) and the picked range is highlighted across both.
  const dateCalendar = (endpoint: Endpoint): MpChild => {
    const parts = endpoint === 'start' ? startParts : endParts;
    return (
      <ForgeCalendar
        flat
        max={endpoint === 'start' ? endParts.date || max : max}
        min={endpoint === 'end' ? startParts.date || min : min}
        modelValue={parts.date}
        rangeEnd={endParts.date}
        rangeStart={startParts.date}
        onUpdateModelValue={setDate(endpoint)}
      />
    );
  };

  // The Time step's hour/minute(/second) columns for one endpoint.
  const timeColumns = (endpoint: Endpoint): MpChild => {
    const parts = endpoint === 'start' ? startParts : endParts;
    return (
      <div className={styles['forge-date-time-range-input__columns']}>
        {column('HH', HOURS, parts.h, (unit) => setTimeUnit(endpoint, 'h', unit))}
        <span className={styles['forge-date-time-range-input__sep']}>:</span>
        {column('MM', MINUTES, parts.m, (unit) => setTimeUnit(endpoint, 'm', unit))}
        {showSeconds ? <span className={styles['forge-date-time-range-input__sep']}>:</span> : undefined}
        {showSeconds ? column('SS', SECONDS, parts.s, (unit) => setTimeUnit(endpoint, 's', unit)) : undefined}
      </div>
    );
  };

  // A captioned (`Start`/`End`) endpoint column shared by both wizard steps.
  const endpointPane = (title: string, child: MpChild): MpChild => (
    <div className={styles['forge-date-time-range-input__pane']}>
      <ForgeTypography
        as="span"
        color="secondary"
        variant="caption"
      >
        {title}
      </ForgeTypography>
      {child}
    </div>
  );

  // Wizard step 1 — pick the start and end dates.
  const datePane = (): MpChild => (
    <div className={styles['forge-date-time-range-input__panes']}>
      {endpointPane('Start', dateCalendar('start'))}
      {endpointPane('End', dateCalendar('end'))}
    </div>
  );

  // Wizard step 2 — pick the start and end times.
  const timePane = (): MpChild => (
    <div className={styles['forge-date-time-range-input__panes']}>
      {endpointPane('Start', timeColumns('start'))}
      {endpointPane('End', timeColumns('end'))}
    </div>
  );

  return (
    <div
      className={[
        styles['forge-date-time-range-input'],
        styles[`forge-date-time-range-input--${size}`],
        {
          [styles['forge-date-time-range-input--error']]: !!error,
          [styles['forge-date-time-range-input--disabled']]: disabled,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          className={[
            styles['forge-date-time-range-input__label'],
            {
              [styles['forge-date-time-range-input__label--hidden']]: labelHidden,
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
              className={styles['forge-date-time-range-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <ForgeDropdown
        matchTriggerWidth={false}
        maxHeight="min(92vh, 720px)"
        open={open}
        onUpdateOpen={(next: boolean) => setOpen(next)}
      >
        <div
          className={styles['forge-date-time-range-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('startContent') ? (
            <span
              className={[
                styles['forge-date-time-range-input__extension'],
                styles['forge-date-time-range-input__extension--start'],
              ]}
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
            aria-label={label ?? 'Date and time range picker'}
            className={styles['forge-date-time-range-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              className={[
                styles['forge-date-time-range-input__value'],
                {
                  [styles['forge-date-time-range-input__value--placeholder']]: !summary,
                },
              ]}
            >
              {summary || 'YYYY-MM-DD HH:MM → YYYY-MM-DD HH:MM'}
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-date-time-range-input__icon']}
            >
              <ForgeIconCalendar size="sm" />
            </span>
          </button>
          {hasSlot('endContent') ? (
            <span
              className={[
                styles['forge-date-time-range-input__extension'],
                styles['forge-date-time-range-input__extension--end'],
              ]}
            >
              <Slot name="endContent" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Date and time'} range picker`}
          className={styles['forge-date-time-range-input__popover']}
          role="dialog"
        >
          <div
            className={styles['forge-date-time-range-input__tz']}
            role="group"
          >
            <button
              aria-pressed={timezone === 'browser'}
              className={[
                styles['forge-date-time-range-input__tz-btn'],
                {
                  [styles['forge-date-time-range-input__tz-btn--active']]: timezone === 'browser',
                },
              ]}
              type="button"
              onClick={() => setTimezone('browser')}
            >
              <ForgeIconGlobe size="xs" /> {browserTimezoneLabel()}
            </button>
            <button
              aria-pressed={timezone === 'utc'}
              className={[
                styles['forge-date-time-range-input__tz-btn'],
                {
                  [styles['forge-date-time-range-input__tz-btn--active']]: timezone === 'utc',
                },
              ]}
              type="button"
              onClick={() => setTimezone('utc')}
            >
              UTC
            </button>
          </div>
          <ForgeFormWizard
            finishLabel="Done"
            modelValue={step}
            steps={[
              { id: 'date', title: 'Date', content: datePane },
              { id: 'time', title: 'Time', content: timePane },
            ]}
            onComplete={closeWizard}
            onUpdateModelValue={(index: number) => setStep(index)}
          />
        </div>
      </ForgeDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-date-time-range-input__error']}
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
          className={styles['forge-date-time-range-input__hint']}
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
