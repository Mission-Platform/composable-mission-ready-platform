import { ForgeDropdown } from '@mission-platform/float';
import {
  hasSlot,
  Slot,
  useId,
  useState,
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeIconCalendar } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import { type DateRange, formatDateRange } from '../../../utils/date-time/date-time';
import { ForgeCalendar } from '../forge-calendar';

import styles from './forge-date-range-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type DateRangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DateRangeInputStyleProperties {
  readonly 'calendar-popup-padding'?: string;
  readonly 'field-error'?: string;
  readonly 'field-required'?: string;
  readonly 'form-gap-large'?: string;
  readonly 'form-gap-tight'?: string;
  readonly 'input-border-default'?: string;
  readonly 'input-border-focus-visible'?: string;
  readonly 'input-border-invalid'?: string;
  readonly 'input-border-width'?: string;
  readonly 'input-extension-gap'?: string;
  readonly 'input-field-gap'?: string;
  readonly 'input-focus-ring'?: string;
  readonly 'input-focus-ring-invalid'?: string;
  readonly 'input-font-family'?: string;
  readonly 'input-opacity-disabled'?: string;
  readonly 'input-radius'?: string;
  readonly 'input-size-2xl-font-size'?: string;
  readonly 'input-size-2xl-padding-block'?: string;
  readonly 'input-size-2xl-padding-inline'?: string;
  readonly 'input-size-2xs-font-size'?: string;
  readonly 'input-size-2xs-padding-block'?: string;
  readonly 'input-size-2xs-padding-inline'?: string;
  readonly 'input-size-lg-font-size'?: string;
  readonly 'input-size-lg-padding-block'?: string;
  readonly 'input-size-lg-padding-inline'?: string;
  readonly 'input-size-md-font-size'?: string;
  readonly 'input-size-md-padding-block'?: string;
  readonly 'input-size-md-padding-inline'?: string;
  readonly 'input-size-sm-font-size'?: string;
  readonly 'input-size-sm-padding-block'?: string;
  readonly 'input-size-sm-padding-inline'?: string;
  readonly 'input-size-xl-font-size'?: string;
  readonly 'input-size-xl-padding-block'?: string;
  readonly 'input-size-xl-padding-inline'?: string;
  readonly 'input-size-xs-font-size'?: string;
  readonly 'input-size-xs-padding-block'?: string;
  readonly 'input-size-xs-padding-inline'?: string;
  readonly 'input-surface-default'?: string;
  readonly 'input-surface-disabled'?: string;
  readonly 'input-text-default'?: string;
  readonly 'input-text-placeholder'?: string;
  readonly 'input-text-secondary'?: string;
  readonly 'input-transition-duration'?: string;
  readonly 'input-transition-easing'?: string;
  readonly 'spacing-4'?: string;
}

export type DateRangeInputStyle = CSSStyleProperties & {
  readonly '--forge-date-range-input-calendar-popup-padding'?: string | undefined;
  readonly '--forge-date-range-input-field-error'?: string | undefined;
  readonly '--forge-date-range-input-field-required'?: string | undefined;
  readonly '--forge-date-range-input-form-gap-large'?: string | undefined;
  readonly '--forge-date-range-input-form-gap-tight'?: string | undefined;
  readonly '--forge-date-range-input-input-border-default'?: string | undefined;
  readonly '--forge-date-range-input-input-border-focus-visible'?: string | undefined;
  readonly '--forge-date-range-input-input-border-invalid'?: string | undefined;
  readonly '--forge-date-range-input-input-border-width'?: string | undefined;
  readonly '--forge-date-range-input-input-extension-gap'?: string | undefined;
  readonly '--forge-date-range-input-input-field-gap'?: string | undefined;
  readonly '--forge-date-range-input-input-focus-ring'?: string | undefined;
  readonly '--forge-date-range-input-input-focus-ring-invalid'?: string | undefined;
  readonly '--forge-date-range-input-input-font-family'?: string | undefined;
  readonly '--forge-date-range-input-input-opacity-disabled'?: string | undefined;
  readonly '--forge-date-range-input-input-radius'?: string | undefined;
  readonly '--forge-date-range-input-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-size-md-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-date-range-input-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-date-range-input-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-date-range-input-input-surface-default'?: string | undefined;
  readonly '--forge-date-range-input-input-surface-disabled'?: string | undefined;
  readonly '--forge-date-range-input-input-text-default'?: string | undefined;
  readonly '--forge-date-range-input-input-text-placeholder'?: string | undefined;
  readonly '--forge-date-range-input-input-text-secondary'?: string | undefined;
  readonly '--forge-date-range-input-input-transition-duration'?: string | undefined;
  readonly '--forge-date-range-input-input-transition-easing'?: string | undefined;
  readonly '--forge-date-range-input-spacing-4'?: string | undefined;
};

function createDateRangeInputStyle(
  properties: Readonly<DateRangeInputStyleProperties> | undefined,
): DateRangeInputStyle | undefined {
  return createForgeStyle({
    '--forge-date-range-input-calendar-popup-padding': properties?.['calendar-popup-padding'],
    '--forge-date-range-input-field-error': properties?.['field-error'],
    '--forge-date-range-input-field-required': properties?.['field-required'],
    '--forge-date-range-input-form-gap-large': properties?.['form-gap-large'],
    '--forge-date-range-input-form-gap-tight': properties?.['form-gap-tight'],
    '--forge-date-range-input-input-border-default': properties?.['input-border-default'],
    '--forge-date-range-input-input-border-focus-visible': properties?.['input-border-focus-visible'],
    '--forge-date-range-input-input-border-invalid': properties?.['input-border-invalid'],
    '--forge-date-range-input-input-border-width': properties?.['input-border-width'],
    '--forge-date-range-input-input-extension-gap': properties?.['input-extension-gap'],
    '--forge-date-range-input-input-field-gap': properties?.['input-field-gap'],
    '--forge-date-range-input-input-focus-ring': properties?.['input-focus-ring'],
    '--forge-date-range-input-input-focus-ring-invalid': properties?.['input-focus-ring-invalid'],
    '--forge-date-range-input-input-font-family': properties?.['input-font-family'],
    '--forge-date-range-input-input-opacity-disabled': properties?.['input-opacity-disabled'],
    '--forge-date-range-input-input-radius': properties?.['input-radius'],
    '--forge-date-range-input-input-size-2xl-font-size': properties?.['input-size-2xl-font-size'],
    '--forge-date-range-input-input-size-2xl-padding-block': properties?.['input-size-2xl-padding-block'],
    '--forge-date-range-input-input-size-2xl-padding-inline': properties?.['input-size-2xl-padding-inline'],
    '--forge-date-range-input-input-size-2xs-font-size': properties?.['input-size-2xs-font-size'],
    '--forge-date-range-input-input-size-2xs-padding-block': properties?.['input-size-2xs-padding-block'],
    '--forge-date-range-input-input-size-2xs-padding-inline': properties?.['input-size-2xs-padding-inline'],
    '--forge-date-range-input-input-size-lg-font-size': properties?.['input-size-lg-font-size'],
    '--forge-date-range-input-input-size-lg-padding-block': properties?.['input-size-lg-padding-block'],
    '--forge-date-range-input-input-size-lg-padding-inline': properties?.['input-size-lg-padding-inline'],
    '--forge-date-range-input-input-size-md-font-size': properties?.['input-size-md-font-size'],
    '--forge-date-range-input-input-size-md-padding-block': properties?.['input-size-md-padding-block'],
    '--forge-date-range-input-input-size-md-padding-inline': properties?.['input-size-md-padding-inline'],
    '--forge-date-range-input-input-size-sm-font-size': properties?.['input-size-sm-font-size'],
    '--forge-date-range-input-input-size-sm-padding-block': properties?.['input-size-sm-padding-block'],
    '--forge-date-range-input-input-size-sm-padding-inline': properties?.['input-size-sm-padding-inline'],
    '--forge-date-range-input-input-size-xl-font-size': properties?.['input-size-xl-font-size'],
    '--forge-date-range-input-input-size-xl-padding-block': properties?.['input-size-xl-padding-block'],
    '--forge-date-range-input-input-size-xl-padding-inline': properties?.['input-size-xl-padding-inline'],
    '--forge-date-range-input-input-size-xs-font-size': properties?.['input-size-xs-font-size'],
    '--forge-date-range-input-input-size-xs-padding-block': properties?.['input-size-xs-padding-block'],
    '--forge-date-range-input-input-size-xs-padding-inline': properties?.['input-size-xs-padding-inline'],
    '--forge-date-range-input-input-surface-default': properties?.['input-surface-default'],
    '--forge-date-range-input-input-surface-disabled': properties?.['input-surface-disabled'],
    '--forge-date-range-input-input-text-default': properties?.['input-text-default'],
    '--forge-date-range-input-input-text-placeholder': properties?.['input-text-placeholder'],
    '--forge-date-range-input-input-text-secondary': properties?.['input-text-secondary'],
    '--forge-date-range-input-input-transition-duration': properties?.['input-transition-duration'],
    '--forge-date-range-input-input-transition-easing': properties?.['input-transition-easing'],
    '--forge-date-range-input-spacing-4': properties?.['spacing-4'],
  }) as DateRangeInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DateRangeInputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Selected `{ start, end }` ISO-date range, controlled via `modelValue`.
   * @model onUpdateModelValue
   */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DateRangeInputStyleProperties>;
}

/**
 * `ForgeDateRangeInput` — a date-range picker authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * A trigger button shows the `start → end` summary and opens a teleported
 * popover with two {@link ForgeCalendar} grids: the start grid is capped at the
 * current `end` (and `max`), the end grid floored at the current `start` (and
 * `min`), so the range stays ordered. Once a start is chosen but the end is
 * still open, the day under the cursor is fed back to both calendars as
 * `previewEnd` so the tentative range is highlighted as you hover. It owns its
 * styling through the co-located CSS Module `forge-date-range-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link ForgeDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * bespoke hover-driven
 * dual-month range grid is substituted with **two composed `ForgeCalendar`s**
 * with ordering enforced via `min`/`max`; the `useId` composable maps to the
 * framework-native `useId` hook; the calendar glyph is the write-once `@mission-platform/icons`
 * `ForgeIconCalendar`; the `start`/`end` regions are authored as named slots
 * (`<Slot>`) with their presence detected through the framework-neutral
 * {@link hasSlot} helper; and the `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeDateRangeInput(properties: Readonly<DateRangeInputProperties>): MpElement {
  const style = createDateRangeInputStyle(properties.properties);

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

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
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

  const handleStart = (next = ''): void => {
    const nextEnd = modelValue.end && modelValue.end < next ? next : modelValue.end;
    emitRange({ start: next, end: nextEnd });
  };

  const handleEnd = (value: string | undefined): void => {
    emitRange({ start: modelValue.start, end: value ?? '' });
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
      className={[
        styles['forge-date-range-input'],
        styles[`forge-date-range-input--${size}`],
        {
          [styles['forge-date-range-input--error']]: !!error,
          [styles['forge-date-range-input--disabled']]: disabled,
        },
        properties.className,
      ]}
      style={style}
    >
      {label ? (
        <label
          className={[
            styles['forge-date-range-input__label'],
            {
              [styles['forge-date-range-input__label--hidden']]: labelHidden,
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
              className={styles['forge-date-range-input__required']}
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
        onUpdateOpen={(next: boolean) => {
          setOpen(next);
          if (!next) {
            setHovered(undefined);
          }
        }}
      >
        <div
          className={styles['forge-date-range-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('start') ? (
            <span
              className={[
                styles['forge-date-range-input__extension'],
                styles['forge-date-range-input__extension--start'],
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
            className={styles['forge-date-range-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              className={[
                styles['forge-date-range-input__value'],
                {
                  [styles['forge-date-range-input__value--placeholder']]: !summary,
                },
              ]}
            >
              {summary || 'YYYY-MM-DD → YYYY-MM-DD'}
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-date-range-input__icon']}
            >
              <ForgeIconCalendar size="sm" />
            </span>
          </button>
          {hasSlot('end') ? (
            <span
              className={[
                styles['forge-date-range-input__extension'],
                styles['forge-date-range-input__extension--end'],
              ]}
            >
              <Slot name="end" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Date'} range calendar`}
          className={styles['forge-date-range-input__calendar']}
          role="dialog"
        >
          <div className={styles['forge-date-range-input__panes']}>
            <div className={styles['forge-date-range-input__pane']}>
              <ForgeTypography
                as="span"
                color="secondary"
                variant="caption"
              >
                Start
              </ForgeTypography>
              <ForgeCalendar
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
            <div className={styles['forge-date-range-input__pane']}>
              <ForgeTypography
                as="span"
                color="secondary"
                variant="caption"
              >
                End
              </ForgeTypography>
              <ForgeCalendar
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
      </ForgeDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-date-range-input__error']}
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
          className={styles['forge-date-range-input__hint']}
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
