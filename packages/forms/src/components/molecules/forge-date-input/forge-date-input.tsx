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
} from '@mission-platform/forge';
import { ForgeIconCalendar } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import { ForgeCalendar } from '../forge-calendar';

import styles from './forge-date-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type DateInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DateInputStyleProperties {
  readonly 'calendar-popup-padding'?: string;
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
  readonly 'spacing-4'?: string;
}

export type DateInputStyle = CSSStyleProperties & {
  readonly '--forge-date-input-calendar-popup-padding'?: string | undefined;
  readonly '--forge-date-input-field-error'?: string | undefined;
  readonly '--forge-date-input-field-required'?: string | undefined;
  readonly '--forge-date-input-input-border-default'?: string | undefined;
  readonly '--forge-date-input-input-border-focus-visible'?: string | undefined;
  readonly '--forge-date-input-input-border-invalid'?: string | undefined;
  readonly '--forge-date-input-input-border-width'?: string | undefined;
  readonly '--forge-date-input-input-extension-gap'?: string | undefined;
  readonly '--forge-date-input-input-field-gap'?: string | undefined;
  readonly '--forge-date-input-input-focus-ring'?: string | undefined;
  readonly '--forge-date-input-input-focus-ring-invalid'?: string | undefined;
  readonly '--forge-date-input-input-font-family'?: string | undefined;
  readonly '--forge-date-input-input-opacity-disabled'?: string | undefined;
  readonly '--forge-date-input-input-radius'?: string | undefined;
  readonly '--forge-date-input-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-size-md-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-date-input-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-date-input-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-date-input-input-surface-default'?: string | undefined;
  readonly '--forge-date-input-input-surface-disabled'?: string | undefined;
  readonly '--forge-date-input-input-text-default'?: string | undefined;
  readonly '--forge-date-input-input-text-placeholder'?: string | undefined;
  readonly '--forge-date-input-input-text-secondary'?: string | undefined;
  readonly '--forge-date-input-input-transition-duration'?: string | undefined;
  readonly '--forge-date-input-input-transition-easing'?: string | undefined;
  readonly '--forge-date-input-spacing-4'?: string | undefined;
};

function createDateInputStyle(properties: Readonly<DateInputStyleProperties> | undefined): DateInputStyle | undefined {
  return createForgeStyle({
    '--forge-date-input-calendar-popup-padding': properties?.['calendar-popup-padding'],
    '--forge-date-input-field-error': properties?.['field-error'],
    '--forge-date-input-field-required': properties?.['field-required'],
    '--forge-date-input-input-border-default': properties?.['input-border-default'],
    '--forge-date-input-input-border-focus-visible': properties?.['input-border-focus-visible'],
    '--forge-date-input-input-border-invalid': properties?.['input-border-invalid'],
    '--forge-date-input-input-border-width': properties?.['input-border-width'],
    '--forge-date-input-input-extension-gap': properties?.['input-extension-gap'],
    '--forge-date-input-input-field-gap': properties?.['input-field-gap'],
    '--forge-date-input-input-focus-ring': properties?.['input-focus-ring'],
    '--forge-date-input-input-focus-ring-invalid': properties?.['input-focus-ring-invalid'],
    '--forge-date-input-input-font-family': properties?.['input-font-family'],
    '--forge-date-input-input-opacity-disabled': properties?.['input-opacity-disabled'],
    '--forge-date-input-input-radius': properties?.['input-radius'],
    '--forge-date-input-input-size-2xl-font-size': properties?.['input-size-2xl-font-size'],
    '--forge-date-input-input-size-2xl-padding-block': properties?.['input-size-2xl-padding-block'],
    '--forge-date-input-input-size-2xl-padding-inline': properties?.['input-size-2xl-padding-inline'],
    '--forge-date-input-input-size-2xs-font-size': properties?.['input-size-2xs-font-size'],
    '--forge-date-input-input-size-2xs-padding-block': properties?.['input-size-2xs-padding-block'],
    '--forge-date-input-input-size-2xs-padding-inline': properties?.['input-size-2xs-padding-inline'],
    '--forge-date-input-input-size-lg-font-size': properties?.['input-size-lg-font-size'],
    '--forge-date-input-input-size-lg-padding-block': properties?.['input-size-lg-padding-block'],
    '--forge-date-input-input-size-lg-padding-inline': properties?.['input-size-lg-padding-inline'],
    '--forge-date-input-input-size-md-font-size': properties?.['input-size-md-font-size'],
    '--forge-date-input-input-size-md-padding-block': properties?.['input-size-md-padding-block'],
    '--forge-date-input-input-size-md-padding-inline': properties?.['input-size-md-padding-inline'],
    '--forge-date-input-input-size-sm-font-size': properties?.['input-size-sm-font-size'],
    '--forge-date-input-input-size-sm-padding-block': properties?.['input-size-sm-padding-block'],
    '--forge-date-input-input-size-sm-padding-inline': properties?.['input-size-sm-padding-inline'],
    '--forge-date-input-input-size-xl-font-size': properties?.['input-size-xl-font-size'],
    '--forge-date-input-input-size-xl-padding-block': properties?.['input-size-xl-padding-block'],
    '--forge-date-input-input-size-xl-padding-inline': properties?.['input-size-xl-padding-inline'],
    '--forge-date-input-input-size-xs-font-size': properties?.['input-size-xs-font-size'],
    '--forge-date-input-input-size-xs-padding-block': properties?.['input-size-xs-padding-block'],
    '--forge-date-input-input-size-xs-padding-inline': properties?.['input-size-xs-padding-inline'],
    '--forge-date-input-input-surface-default': properties?.['input-surface-default'],
    '--forge-date-input-input-surface-disabled': properties?.['input-surface-disabled'],
    '--forge-date-input-input-text-default': properties?.['input-text-default'],
    '--forge-date-input-input-text-placeholder': properties?.['input-text-placeholder'],
    '--forge-date-input-input-text-secondary': properties?.['input-text-secondary'],
    '--forge-date-input-input-transition-duration': properties?.['input-transition-duration'],
    '--forge-date-input-input-transition-easing': properties?.['input-transition-easing'],
    '--forge-date-input-spacing-4': properties?.['spacing-4'],
  }) as DateInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DateInputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Selected ISO date (`YYYY-MM-DD`), controlled via `modelValue`.
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
  /** Placeholder shown when no date is selected. Defaults to `'YYYY-MM-DD'`. */
  placeholder?: string;
  /** Field size. Defaults to `'md'`. */
  size?: DateInputSize;
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
  /** Fired with the next ISO date (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the next ISO date whenever it changes. */
  onChange?: (value: string) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DateInputStyleProperties>;
}

/**
 * `ForgeDateInput` — a date picker authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A trigger button shows the selected ISO date (or a placeholder) and opens a
 * popover that composes the already-migrated {@link ForgeCalendar} month grid. It
 * owns its styling through the co-located CSS Module `forge-date-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link ForgeDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * inline month grid is delegated to `ForgeCalendar`; the `useId` composable
 * maps to the framework-native `useId` hook; the
 * calendar glyph is the write-once `@mission-platform/icons` `ForgeIconCalendar`
 * (itself compiled to React/Vue); the `start`/`end` regions are authored as
 * named slots (`<Slot>`) with their presence detected through the
 * framework-neutral {@link hasSlot} helper; and the `v-model` + `change` emits
 * become the `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeDateInput(properties: Readonly<DateInputProperties>): MpElement {
  const style = createDateInputStyle(properties.properties);

  const {
    modelValue = '',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    placeholder = 'YYYY-MM-DD',
    size = 'md',
    min,
    max,
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [open, setOpen] = useState<boolean>(false);

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }
    setOpen(!open);
  };

  const handleSelect = (next = ''): void => {
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
    setOpen(false);
  };

  return (
    <div
      aria-disabled={disabled ? 'true' : undefined}
      className={[
        styles['forge-date-input'],
        styles[`forge-date-input--${size}`],
        {
          [styles['forge-date-input--error']]: !!error,
          [styles['forge-date-input--disabled']]: disabled,
        },
        properties.className,
      ]}
      style={style}
    >
      {label ? (
        <label
          className={[
            styles['forge-date-input__label'],
            {
              [styles['forge-date-input__label--hidden']]: labelHidden,
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
              className={styles['forge-date-input__required']}
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
          className={styles['forge-date-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('start') ? (
            <span className={[styles['forge-date-input__extension'], styles['forge-date-input__extension--start']]}>
              <Slot name="start" />
            </span>
          ) : undefined}
          <button
            id={resolvedId}
            aria-describedby={describedBy}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ?? 'Date picker'}
            className={styles['forge-date-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              className={[
                styles['forge-date-input__value'],
                {
                  [styles['forge-date-input__value--placeholder']]: !modelValue,
                },
              ]}
            >
              {modelValue || placeholder}
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-date-input__icon']}
            >
              <ForgeIconCalendar size="sm" />
            </span>
          </button>
          {hasSlot('end') ? (
            <span className={[styles['forge-date-input__extension'], styles['forge-date-input__extension--end']]}>
              <Slot name="end" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Date'} calendar`}
          className={styles['forge-date-input__calendar']}
          role="dialog"
        >
          <ForgeCalendar
            flat
            max={max}
            min={min}
            modelValue={modelValue}
            onUpdateModelValue={handleSelect}
          />
        </div>
      </ForgeDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-date-input__error']}
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
          className={styles['forge-date-input__hint']}
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
