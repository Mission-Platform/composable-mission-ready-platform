import { ForgeDropdown } from '@mission-platform/float';
import {
  hasSlot,
  Slot,
  useEffect,
  useId,
  useState,
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import {
  formatTime,
  formatTimeRange,
  HOURS,
  MINUTES,
  pad,
  parseTime,
  SECONDS,
  type TimeRange,
} from '../../../utils/date-time/date-time';

import styles from './forge-time-range-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type TimeRangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The end being edited (`start` or `end`). */
type Endpoint = 'start' | 'end';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TimeRangeInputStyleProperties {
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
  readonly 'time-border-default'?: string;
  readonly 'time-border-focus'?: string;
  readonly 'time-border-focus-width'?: string;
  readonly 'time-columns-gap'?: string;
  readonly 'time-done-hover-opacity'?: string;
  readonly 'time-done-padding-block'?: string;
  readonly 'time-done-padding-inline'?: string;
  readonly 'time-done-radius'?: string;
  readonly 'time-font-size-header'?: string;
  readonly 'time-font-size-separator'?: string;
  readonly 'time-font-size-unit'?: string;
  readonly 'time-font-weight-medium'?: string;
  readonly 'time-font-weight-selected'?: string;
  readonly 'time-popover-padding'?: string;
  readonly 'time-surface-hover'?: string;
  readonly 'time-surface-selected'?: string;
  readonly 'time-text-default'?: string;
  readonly 'time-text-muted'?: string;
  readonly 'time-text-secondary'?: string;
  readonly 'time-text-selected'?: string;
  readonly 'time-transition-duration'?: string;
  readonly 'time-transition-easing'?: string;
  readonly 'time-unit-padding-block'?: string;
  readonly 'time-unit-padding-inline'?: string;
  readonly 'time-unit-radius'?: string;
}

export type TimeRangeInputStyle = CSSStyleProperties & {
  readonly '--forge-time-range-input-field-error'?: string | undefined;
  readonly '--forge-time-range-input-field-required'?: string | undefined;
  readonly '--forge-time-range-input-form-gap-large'?: string | undefined;
  readonly '--forge-time-range-input-form-gap-tight'?: string | undefined;
  readonly '--forge-time-range-input-input-border-default'?: string | undefined;
  readonly '--forge-time-range-input-input-border-focus-visible'?: string | undefined;
  readonly '--forge-time-range-input-input-border-invalid'?: string | undefined;
  readonly '--forge-time-range-input-input-border-width'?: string | undefined;
  readonly '--forge-time-range-input-input-extension-gap'?: string | undefined;
  readonly '--forge-time-range-input-input-field-gap'?: string | undefined;
  readonly '--forge-time-range-input-input-focus-ring'?: string | undefined;
  readonly '--forge-time-range-input-input-focus-ring-invalid'?: string | undefined;
  readonly '--forge-time-range-input-input-font-family'?: string | undefined;
  readonly '--forge-time-range-input-input-opacity-disabled'?: string | undefined;
  readonly '--forge-time-range-input-input-radius'?: string | undefined;
  readonly '--forge-time-range-input-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-size-md-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-time-range-input-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-input-surface-default'?: string | undefined;
  readonly '--forge-time-range-input-input-surface-disabled'?: string | undefined;
  readonly '--forge-time-range-input-input-text-default'?: string | undefined;
  readonly '--forge-time-range-input-input-text-placeholder'?: string | undefined;
  readonly '--forge-time-range-input-input-text-secondary'?: string | undefined;
  readonly '--forge-time-range-input-input-transition-duration'?: string | undefined;
  readonly '--forge-time-range-input-input-transition-easing'?: string | undefined;
  readonly '--forge-time-range-input-time-border-default'?: string | undefined;
  readonly '--forge-time-range-input-time-border-focus'?: string | undefined;
  readonly '--forge-time-range-input-time-border-focus-width'?: string | undefined;
  readonly '--forge-time-range-input-time-columns-gap'?: string | undefined;
  readonly '--forge-time-range-input-time-done-hover-opacity'?: string | undefined;
  readonly '--forge-time-range-input-time-done-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-time-done-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-time-done-radius'?: string | undefined;
  readonly '--forge-time-range-input-time-font-size-header'?: string | undefined;
  readonly '--forge-time-range-input-time-font-size-separator'?: string | undefined;
  readonly '--forge-time-range-input-time-font-size-unit'?: string | undefined;
  readonly '--forge-time-range-input-time-font-weight-medium'?: string | undefined;
  readonly '--forge-time-range-input-time-font-weight-selected'?: string | undefined;
  readonly '--forge-time-range-input-time-popover-padding'?: string | undefined;
  readonly '--forge-time-range-input-time-surface-hover'?: string | undefined;
  readonly '--forge-time-range-input-time-surface-selected'?: string | undefined;
  readonly '--forge-time-range-input-time-text-default'?: string | undefined;
  readonly '--forge-time-range-input-time-text-muted'?: string | undefined;
  readonly '--forge-time-range-input-time-text-secondary'?: string | undefined;
  readonly '--forge-time-range-input-time-text-selected'?: string | undefined;
  readonly '--forge-time-range-input-time-transition-duration'?: string | undefined;
  readonly '--forge-time-range-input-time-transition-easing'?: string | undefined;
  readonly '--forge-time-range-input-time-unit-padding-block'?: string | undefined;
  readonly '--forge-time-range-input-time-unit-padding-inline'?: string | undefined;
  readonly '--forge-time-range-input-time-unit-radius'?: string | undefined;
};

function createTimeRangeInputStyle(
  properties: Readonly<TimeRangeInputStyleProperties> | undefined,
): TimeRangeInputStyle | undefined {
  return createForgeStyle({
    '--forge-time-range-input-field-error': properties?.['field-error'],
    '--forge-time-range-input-field-required': properties?.['field-required'],
    '--forge-time-range-input-form-gap-large': properties?.['form-gap-large'],
    '--forge-time-range-input-form-gap-tight': properties?.['form-gap-tight'],
    '--forge-time-range-input-input-border-default': properties?.['input-border-default'],
    '--forge-time-range-input-input-border-focus-visible': properties?.['input-border-focus-visible'],
    '--forge-time-range-input-input-border-invalid': properties?.['input-border-invalid'],
    '--forge-time-range-input-input-border-width': properties?.['input-border-width'],
    '--forge-time-range-input-input-extension-gap': properties?.['input-extension-gap'],
    '--forge-time-range-input-input-field-gap': properties?.['input-field-gap'],
    '--forge-time-range-input-input-focus-ring': properties?.['input-focus-ring'],
    '--forge-time-range-input-input-focus-ring-invalid': properties?.['input-focus-ring-invalid'],
    '--forge-time-range-input-input-font-family': properties?.['input-font-family'],
    '--forge-time-range-input-input-opacity-disabled': properties?.['input-opacity-disabled'],
    '--forge-time-range-input-input-radius': properties?.['input-radius'],
    '--forge-time-range-input-input-size-2xl-font-size': properties?.['input-size-2xl-font-size'],
    '--forge-time-range-input-input-size-2xl-padding-block': properties?.['input-size-2xl-padding-block'],
    '--forge-time-range-input-input-size-2xl-padding-inline': properties?.['input-size-2xl-padding-inline'],
    '--forge-time-range-input-input-size-2xs-font-size': properties?.['input-size-2xs-font-size'],
    '--forge-time-range-input-input-size-2xs-padding-block': properties?.['input-size-2xs-padding-block'],
    '--forge-time-range-input-input-size-2xs-padding-inline': properties?.['input-size-2xs-padding-inline'],
    '--forge-time-range-input-input-size-lg-font-size': properties?.['input-size-lg-font-size'],
    '--forge-time-range-input-input-size-lg-padding-block': properties?.['input-size-lg-padding-block'],
    '--forge-time-range-input-input-size-lg-padding-inline': properties?.['input-size-lg-padding-inline'],
    '--forge-time-range-input-input-size-md-font-size': properties?.['input-size-md-font-size'],
    '--forge-time-range-input-input-size-md-padding-block': properties?.['input-size-md-padding-block'],
    '--forge-time-range-input-input-size-md-padding-inline': properties?.['input-size-md-padding-inline'],
    '--forge-time-range-input-input-size-sm-font-size': properties?.['input-size-sm-font-size'],
    '--forge-time-range-input-input-size-sm-padding-block': properties?.['input-size-sm-padding-block'],
    '--forge-time-range-input-input-size-sm-padding-inline': properties?.['input-size-sm-padding-inline'],
    '--forge-time-range-input-input-size-xl-font-size': properties?.['input-size-xl-font-size'],
    '--forge-time-range-input-input-size-xl-padding-block': properties?.['input-size-xl-padding-block'],
    '--forge-time-range-input-input-size-xl-padding-inline': properties?.['input-size-xl-padding-inline'],
    '--forge-time-range-input-input-size-xs-font-size': properties?.['input-size-xs-font-size'],
    '--forge-time-range-input-input-size-xs-padding-block': properties?.['input-size-xs-padding-block'],
    '--forge-time-range-input-input-size-xs-padding-inline': properties?.['input-size-xs-padding-inline'],
    '--forge-time-range-input-input-surface-default': properties?.['input-surface-default'],
    '--forge-time-range-input-input-surface-disabled': properties?.['input-surface-disabled'],
    '--forge-time-range-input-input-text-default': properties?.['input-text-default'],
    '--forge-time-range-input-input-text-placeholder': properties?.['input-text-placeholder'],
    '--forge-time-range-input-input-text-secondary': properties?.['input-text-secondary'],
    '--forge-time-range-input-input-transition-duration': properties?.['input-transition-duration'],
    '--forge-time-range-input-input-transition-easing': properties?.['input-transition-easing'],
    '--forge-time-range-input-time-border-default': properties?.['time-border-default'],
    '--forge-time-range-input-time-border-focus': properties?.['time-border-focus'],
    '--forge-time-range-input-time-border-focus-width': properties?.['time-border-focus-width'],
    '--forge-time-range-input-time-columns-gap': properties?.['time-columns-gap'],
    '--forge-time-range-input-time-done-hover-opacity': properties?.['time-done-hover-opacity'],
    '--forge-time-range-input-time-done-padding-block': properties?.['time-done-padding-block'],
    '--forge-time-range-input-time-done-padding-inline': properties?.['time-done-padding-inline'],
    '--forge-time-range-input-time-done-radius': properties?.['time-done-radius'],
    '--forge-time-range-input-time-font-size-header': properties?.['time-font-size-header'],
    '--forge-time-range-input-time-font-size-separator': properties?.['time-font-size-separator'],
    '--forge-time-range-input-time-font-size-unit': properties?.['time-font-size-unit'],
    '--forge-time-range-input-time-font-weight-medium': properties?.['time-font-weight-medium'],
    '--forge-time-range-input-time-font-weight-selected': properties?.['time-font-weight-selected'],
    '--forge-time-range-input-time-popover-padding': properties?.['time-popover-padding'],
    '--forge-time-range-input-time-surface-hover': properties?.['time-surface-hover'],
    '--forge-time-range-input-time-surface-selected': properties?.['time-surface-selected'],
    '--forge-time-range-input-time-text-default': properties?.['time-text-default'],
    '--forge-time-range-input-time-text-muted': properties?.['time-text-muted'],
    '--forge-time-range-input-time-text-secondary': properties?.['time-text-secondary'],
    '--forge-time-range-input-time-text-selected': properties?.['time-text-selected'],
    '--forge-time-range-input-time-transition-duration': properties?.['time-transition-duration'],
    '--forge-time-range-input-time-transition-easing': properties?.['time-transition-easing'],
    '--forge-time-range-input-time-unit-padding-block': properties?.['time-unit-padding-block'],
    '--forge-time-range-input-time-unit-padding-inline': properties?.['time-unit-padding-inline'],
    '--forge-time-range-input-time-unit-radius': properties?.['time-unit-radius'],
  }) as TimeRangeInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface TimeRangeInputProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * Selected `{ start, end }` time range, controlled via `modelValue`.
   * @model onUpdateModelValue
   */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TimeRangeInputStyleProperties>;
}

/**
 * `ForgeTimeRangeInput` — a time-range picker authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * A trigger button shows the `start → end` summary and opens a teleported
 * popover with two sets of scrollable hour/minute(/second) lists (one per
 * endpoint). It owns its styling through the co-located CSS Module
 * `forge-time-range-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link ForgeDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * inline parse/format logic is
 * delegated to the co-located framework-agnostic `date-time.ts`; the local
 * `ref`s become {@link useState} resynced from `modelValue` via a
 * {@link useEffect}; the `useId` composable maps to the framework-native `useId` hook; the `start`/
 * `end` SFC slots become the `startContent`/`endContent` named slots (`<Slot>`,
 * presence detected with the framework-neutral {@link hasSlot} helper; the
 * `start`/`end` names are reserved for the range endpoints); and the `v-model` +
 * `change` emits become the `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeTimeRangeInput(properties: Readonly<TimeRangeInputProperties>): MpElement {
  const style = createTimeRangeInputStyle(properties.properties);

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

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
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
    <div className={styles['forge-time-range-input__col']}>
      <div className={styles['forge-time-range-input__col-header']}>{header}</div>
      <div className={styles['forge-time-range-input__scroll']}>
        {units.map((unit) => (
          <button
            key={unit}
            className={[
              styles['forge-time-range-input__unit-btn'],
              {
                [styles['forge-time-range-input__unit-btn--active']]: active === unit,
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

  const group = (title: string, endpoint: Endpoint): MpChild => {
    const hour = endpoint === 'start' ? startH : endH;
    const minute = endpoint === 'start' ? startM : endM;
    const second = endpoint === 'start' ? startS : endS;
    const update = endpoint === 'start' ? updateStart : updateEnd;
    return (
      <div className={styles['forge-time-range-input__group']}>
        <ForgeTypography
          as="span"
          color="secondary"
          variant="caption"
        >
          {title}
        </ForgeTypography>
        <div className={styles['forge-time-range-input__columns']}>
          {column('HH', HOURS, hour, (unit) => update(unit, minute, second))}
          <span className={styles['forge-time-range-input__sep']}>:</span>
          {column('MM', MINUTES, minute, (unit) => update(hour, unit, second))}
          {showSeconds ? <span className={styles['forge-time-range-input__sep']}>:</span> : undefined}
          {showSeconds ? column('SS', SECONDS, second, (unit) => update(hour, minute, unit)) : undefined}
        </div>
      </div>
    );
  };

  return (
    <div
      className={[
        styles['forge-time-range-input'],
        styles[`forge-time-range-input--${size}`],
        {
          [styles['forge-time-range-input--error']]: !!error,
          [styles['forge-time-range-input--disabled']]: disabled,
        },
        properties.className,
      ]}
      style={style}
    >
      {label ? (
        <label
          className={[
            styles['forge-time-range-input__label'],
            {
              [styles['forge-time-range-input__label--hidden']]: labelHidden,
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
              className={styles['forge-time-range-input__required']}
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
          className={styles['forge-time-range-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('startContent') ? (
            <span
              className={[
                styles['forge-time-range-input__extension'],
                styles['forge-time-range-input__extension--start'],
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
            aria-label={label ?? 'Time range picker'}
            className={styles['forge-time-range-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              className={[
                styles['forge-time-range-input__value'],
                {
                  [styles['forge-time-range-input__value--placeholder']]: !summary,
                },
              ]}
            >
              {summary || placeholder}
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-time-range-input__icon']}
            >
              🕒
            </span>
          </button>
          {hasSlot('endContent') ? (
            <span
              className={[
                styles['forge-time-range-input__extension'],
                styles['forge-time-range-input__extension--end'],
              ]}
            >
              <Slot name="endContent" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Time'} range picker`}
          className={styles['forge-time-range-input__popover']}
          role="dialog"
        >
          <div className={styles['forge-time-range-input__groups']}>
            {group('Start', 'start')}
            {group('End', 'end')}
          </div>
          <div className={styles['forge-time-range-input__footer']}>
            <button
              className={styles['forge-time-range-input__done-btn']}
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
          className={styles['forge-time-range-input__error']}
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
          className={styles['forge-time-range-input__hint']}
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
