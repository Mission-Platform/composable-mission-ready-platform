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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TimeInputStyleProperties {
  readonly 'field-error'?: string;
  readonly 'field-required'?: string;
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

export type TimeInputStyle = CSSStyleProperties & {
  readonly '--forge-time-input-field-error'?: string | undefined;
  readonly '--forge-time-input-field-required'?: string | undefined;
  readonly '--forge-time-input-input-border-default'?: string | undefined;
  readonly '--forge-time-input-input-border-focus-visible'?: string | undefined;
  readonly '--forge-time-input-input-border-invalid'?: string | undefined;
  readonly '--forge-time-input-input-border-width'?: string | undefined;
  readonly '--forge-time-input-input-extension-gap'?: string | undefined;
  readonly '--forge-time-input-input-field-gap'?: string | undefined;
  readonly '--forge-time-input-input-focus-ring'?: string | undefined;
  readonly '--forge-time-input-input-focus-ring-invalid'?: string | undefined;
  readonly '--forge-time-input-input-font-family'?: string | undefined;
  readonly '--forge-time-input-input-opacity-disabled'?: string | undefined;
  readonly '--forge-time-input-input-radius'?: string | undefined;
  readonly '--forge-time-input-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-size-md-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-time-input-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-time-input-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-time-input-input-surface-default'?: string | undefined;
  readonly '--forge-time-input-input-surface-disabled'?: string | undefined;
  readonly '--forge-time-input-input-text-default'?: string | undefined;
  readonly '--forge-time-input-input-text-placeholder'?: string | undefined;
  readonly '--forge-time-input-input-text-secondary'?: string | undefined;
  readonly '--forge-time-input-input-transition-duration'?: string | undefined;
  readonly '--forge-time-input-input-transition-easing'?: string | undefined;
  readonly '--forge-time-input-time-border-default'?: string | undefined;
  readonly '--forge-time-input-time-border-focus'?: string | undefined;
  readonly '--forge-time-input-time-border-focus-width'?: string | undefined;
  readonly '--forge-time-input-time-columns-gap'?: string | undefined;
  readonly '--forge-time-input-time-done-hover-opacity'?: string | undefined;
  readonly '--forge-time-input-time-done-padding-block'?: string | undefined;
  readonly '--forge-time-input-time-done-padding-inline'?: string | undefined;
  readonly '--forge-time-input-time-done-radius'?: string | undefined;
  readonly '--forge-time-input-time-font-size-header'?: string | undefined;
  readonly '--forge-time-input-time-font-size-separator'?: string | undefined;
  readonly '--forge-time-input-time-font-size-unit'?: string | undefined;
  readonly '--forge-time-input-time-font-weight-medium'?: string | undefined;
  readonly '--forge-time-input-time-font-weight-selected'?: string | undefined;
  readonly '--forge-time-input-time-popover-padding'?: string | undefined;
  readonly '--forge-time-input-time-surface-hover'?: string | undefined;
  readonly '--forge-time-input-time-surface-selected'?: string | undefined;
  readonly '--forge-time-input-time-text-default'?: string | undefined;
  readonly '--forge-time-input-time-text-muted'?: string | undefined;
  readonly '--forge-time-input-time-text-secondary'?: string | undefined;
  readonly '--forge-time-input-time-text-selected'?: string | undefined;
  readonly '--forge-time-input-time-transition-duration'?: string | undefined;
  readonly '--forge-time-input-time-transition-easing'?: string | undefined;
  readonly '--forge-time-input-time-unit-padding-block'?: string | undefined;
  readonly '--forge-time-input-time-unit-padding-inline'?: string | undefined;
  readonly '--forge-time-input-time-unit-radius'?: string | undefined;
};

function createTimeInputStyle(properties: Readonly<TimeInputStyleProperties> | undefined): TimeInputStyle | undefined {
  return createForgeStyle({
    '--forge-time-input-field-error': properties?.['field-error'],
    '--forge-time-input-field-required': properties?.['field-required'],
    '--forge-time-input-input-border-default': properties?.['input-border-default'],
    '--forge-time-input-input-border-focus-visible': properties?.['input-border-focus-visible'],
    '--forge-time-input-input-border-invalid': properties?.['input-border-invalid'],
    '--forge-time-input-input-border-width': properties?.['input-border-width'],
    '--forge-time-input-input-extension-gap': properties?.['input-extension-gap'],
    '--forge-time-input-input-field-gap': properties?.['input-field-gap'],
    '--forge-time-input-input-focus-ring': properties?.['input-focus-ring'],
    '--forge-time-input-input-focus-ring-invalid': properties?.['input-focus-ring-invalid'],
    '--forge-time-input-input-font-family': properties?.['input-font-family'],
    '--forge-time-input-input-opacity-disabled': properties?.['input-opacity-disabled'],
    '--forge-time-input-input-radius': properties?.['input-radius'],
    '--forge-time-input-input-size-2xl-font-size': properties?.['input-size-2xl-font-size'],
    '--forge-time-input-input-size-2xl-padding-block': properties?.['input-size-2xl-padding-block'],
    '--forge-time-input-input-size-2xl-padding-inline': properties?.['input-size-2xl-padding-inline'],
    '--forge-time-input-input-size-2xs-font-size': properties?.['input-size-2xs-font-size'],
    '--forge-time-input-input-size-2xs-padding-block': properties?.['input-size-2xs-padding-block'],
    '--forge-time-input-input-size-2xs-padding-inline': properties?.['input-size-2xs-padding-inline'],
    '--forge-time-input-input-size-lg-font-size': properties?.['input-size-lg-font-size'],
    '--forge-time-input-input-size-lg-padding-block': properties?.['input-size-lg-padding-block'],
    '--forge-time-input-input-size-lg-padding-inline': properties?.['input-size-lg-padding-inline'],
    '--forge-time-input-input-size-md-font-size': properties?.['input-size-md-font-size'],
    '--forge-time-input-input-size-md-padding-block': properties?.['input-size-md-padding-block'],
    '--forge-time-input-input-size-md-padding-inline': properties?.['input-size-md-padding-inline'],
    '--forge-time-input-input-size-sm-font-size': properties?.['input-size-sm-font-size'],
    '--forge-time-input-input-size-sm-padding-block': properties?.['input-size-sm-padding-block'],
    '--forge-time-input-input-size-sm-padding-inline': properties?.['input-size-sm-padding-inline'],
    '--forge-time-input-input-size-xl-font-size': properties?.['input-size-xl-font-size'],
    '--forge-time-input-input-size-xl-padding-block': properties?.['input-size-xl-padding-block'],
    '--forge-time-input-input-size-xl-padding-inline': properties?.['input-size-xl-padding-inline'],
    '--forge-time-input-input-size-xs-font-size': properties?.['input-size-xs-font-size'],
    '--forge-time-input-input-size-xs-padding-block': properties?.['input-size-xs-padding-block'],
    '--forge-time-input-input-size-xs-padding-inline': properties?.['input-size-xs-padding-inline'],
    '--forge-time-input-input-surface-default': properties?.['input-surface-default'],
    '--forge-time-input-input-surface-disabled': properties?.['input-surface-disabled'],
    '--forge-time-input-input-text-default': properties?.['input-text-default'],
    '--forge-time-input-input-text-placeholder': properties?.['input-text-placeholder'],
    '--forge-time-input-input-text-secondary': properties?.['input-text-secondary'],
    '--forge-time-input-input-transition-duration': properties?.['input-transition-duration'],
    '--forge-time-input-input-transition-easing': properties?.['input-transition-easing'],
    '--forge-time-input-time-border-default': properties?.['time-border-default'],
    '--forge-time-input-time-border-focus': properties?.['time-border-focus'],
    '--forge-time-input-time-border-focus-width': properties?.['time-border-focus-width'],
    '--forge-time-input-time-columns-gap': properties?.['time-columns-gap'],
    '--forge-time-input-time-done-hover-opacity': properties?.['time-done-hover-opacity'],
    '--forge-time-input-time-done-padding-block': properties?.['time-done-padding-block'],
    '--forge-time-input-time-done-padding-inline': properties?.['time-done-padding-inline'],
    '--forge-time-input-time-done-radius': properties?.['time-done-radius'],
    '--forge-time-input-time-font-size-header': properties?.['time-font-size-header'],
    '--forge-time-input-time-font-size-separator': properties?.['time-font-size-separator'],
    '--forge-time-input-time-font-size-unit': properties?.['time-font-size-unit'],
    '--forge-time-input-time-font-weight-medium': properties?.['time-font-weight-medium'],
    '--forge-time-input-time-font-weight-selected': properties?.['time-font-weight-selected'],
    '--forge-time-input-time-popover-padding': properties?.['time-popover-padding'],
    '--forge-time-input-time-surface-hover': properties?.['time-surface-hover'],
    '--forge-time-input-time-surface-selected': properties?.['time-surface-selected'],
    '--forge-time-input-time-text-default': properties?.['time-text-default'],
    '--forge-time-input-time-text-muted': properties?.['time-text-muted'],
    '--forge-time-input-time-text-secondary': properties?.['time-text-secondary'],
    '--forge-time-input-time-text-selected': properties?.['time-text-selected'],
    '--forge-time-input-time-transition-duration': properties?.['time-transition-duration'],
    '--forge-time-input-time-transition-easing': properties?.['time-transition-easing'],
    '--forge-time-input-time-unit-padding-block': properties?.['time-unit-padding-block'],
    '--forge-time-input-time-unit-padding-inline': properties?.['time-unit-padding-inline'],
    '--forge-time-input-time-unit-radius': properties?.['time-unit-radius'],
  }) as TimeInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TimeInputStyleProperties>;
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
  const style = createTimeInputStyle(properties.properties);

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
      style={style}
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
