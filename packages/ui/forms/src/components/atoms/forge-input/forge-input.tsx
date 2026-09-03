import {
  hasSlot,
  Slot,
  useId,
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-input.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type InputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Supported native input types. */
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
/** Native `autocapitalize` hint for on-screen keyboards. */
export type InputAutocapitalize = 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface InputStyleProperties {
  readonly 'border-default'?: string;
  readonly 'border-focus-visible'?: string;
  readonly 'border-invalid'?: string;
  readonly 'border-width'?: string;
  readonly 'extension-gap'?: string;
  readonly 'field-gap'?: string;
  readonly 'field-required'?: string;
  readonly 'focus-ring'?: string;
  readonly 'focus-ring-invalid'?: string;
  readonly 'font-family'?: string;
  readonly 'line-height'?: string;
  readonly 'opacity-disabled'?: string;
  readonly radius?: string;
  readonly 'size-2xl-font-size'?: string;
  readonly 'size-2xl-padding-block'?: string;
  readonly 'size-2xl-padding-inline'?: string;
  readonly 'size-2xs-font-size'?: string;
  readonly 'size-2xs-padding-block'?: string;
  readonly 'size-2xs-padding-inline'?: string;
  readonly 'size-lg-font-size'?: string;
  readonly 'size-lg-padding-block'?: string;
  readonly 'size-lg-padding-inline'?: string;
  readonly 'size-md-font-size'?: string;
  readonly 'size-md-padding-block'?: string;
  readonly 'size-md-padding-inline'?: string;
  readonly 'size-sm-font-size'?: string;
  readonly 'size-sm-padding-block'?: string;
  readonly 'size-sm-padding-inline'?: string;
  readonly 'size-xl-font-size'?: string;
  readonly 'size-xl-padding-block'?: string;
  readonly 'size-xl-padding-inline'?: string;
  readonly 'size-xs-font-size'?: string;
  readonly 'size-xs-padding-block'?: string;
  readonly 'size-xs-padding-inline'?: string;
  readonly 'surface-default'?: string;
  readonly 'surface-disabled'?: string;
  readonly 'text-default'?: string;
  readonly 'text-invalid'?: string;
  readonly 'text-placeholder'?: string;
  readonly 'text-secondary'?: string;
  readonly 'transition-duration'?: string;
  readonly 'transition-easing'?: string;
}

export type InputStyle = CSSStyleProperties & {
  readonly '--forge-input-border-default'?: string | undefined;
  readonly '--forge-input-border-focus-visible'?: string | undefined;
  readonly '--forge-input-border-invalid'?: string | undefined;
  readonly '--forge-input-border-width'?: string | undefined;
  readonly '--forge-input-extension-gap'?: string | undefined;
  readonly '--forge-input-field-gap'?: string | undefined;
  readonly '--forge-input-field-required'?: string | undefined;
  readonly '--forge-input-focus-ring'?: string | undefined;
  readonly '--forge-input-focus-ring-invalid'?: string | undefined;
  readonly '--forge-input-font-family'?: string | undefined;
  readonly '--forge-input-line-height'?: string | undefined;
  readonly '--forge-input-opacity-disabled'?: string | undefined;
  readonly '--forge-input-radius'?: string | undefined;
  readonly '--forge-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-input-size-md-font-size'?: string | undefined;
  readonly '--forge-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-input-surface-default'?: string | undefined;
  readonly '--forge-input-surface-disabled'?: string | undefined;
  readonly '--forge-input-text-default'?: string | undefined;
  readonly '--forge-input-text-invalid'?: string | undefined;
  readonly '--forge-input-text-placeholder'?: string | undefined;
  readonly '--forge-input-text-secondary'?: string | undefined;
  readonly '--forge-input-transition-duration'?: string | undefined;
  readonly '--forge-input-transition-easing'?: string | undefined;
};

function createInputStyle(properties: Readonly<InputStyleProperties> | undefined): InputStyle | undefined {
  return createForgeStyle({
    '--forge-input-border-default': properties?.['border-default'],
    '--forge-input-border-focus-visible': properties?.['border-focus-visible'],
    '--forge-input-border-invalid': properties?.['border-invalid'],
    '--forge-input-border-width': properties?.['border-width'],
    '--forge-input-extension-gap': properties?.['extension-gap'],
    '--forge-input-field-gap': properties?.['field-gap'],
    '--forge-input-field-required': properties?.['field-required'],
    '--forge-input-focus-ring': properties?.['focus-ring'],
    '--forge-input-focus-ring-invalid': properties?.['focus-ring-invalid'],
    '--forge-input-font-family': properties?.['font-family'],
    '--forge-input-line-height': properties?.['line-height'],
    '--forge-input-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-input-radius': properties?.['radius'],
    '--forge-input-size-2xl-font-size': properties?.['size-2xl-font-size'],
    '--forge-input-size-2xl-padding-block': properties?.['size-2xl-padding-block'],
    '--forge-input-size-2xl-padding-inline': properties?.['size-2xl-padding-inline'],
    '--forge-input-size-2xs-font-size': properties?.['size-2xs-font-size'],
    '--forge-input-size-2xs-padding-block': properties?.['size-2xs-padding-block'],
    '--forge-input-size-2xs-padding-inline': properties?.['size-2xs-padding-inline'],
    '--forge-input-size-lg-font-size': properties?.['size-lg-font-size'],
    '--forge-input-size-lg-padding-block': properties?.['size-lg-padding-block'],
    '--forge-input-size-lg-padding-inline': properties?.['size-lg-padding-inline'],
    '--forge-input-size-md-font-size': properties?.['size-md-font-size'],
    '--forge-input-size-md-padding-block': properties?.['size-md-padding-block'],
    '--forge-input-size-md-padding-inline': properties?.['size-md-padding-inline'],
    '--forge-input-size-sm-font-size': properties?.['size-sm-font-size'],
    '--forge-input-size-sm-padding-block': properties?.['size-sm-padding-block'],
    '--forge-input-size-sm-padding-inline': properties?.['size-sm-padding-inline'],
    '--forge-input-size-xl-font-size': properties?.['size-xl-font-size'],
    '--forge-input-size-xl-padding-block': properties?.['size-xl-padding-block'],
    '--forge-input-size-xl-padding-inline': properties?.['size-xl-padding-inline'],
    '--forge-input-size-xs-font-size': properties?.['size-xs-font-size'],
    '--forge-input-size-xs-padding-block': properties?.['size-xs-padding-block'],
    '--forge-input-size-xs-padding-inline': properties?.['size-xs-padding-inline'],
    '--forge-input-surface-default': properties?.['surface-default'],
    '--forge-input-surface-disabled': properties?.['surface-disabled'],
    '--forge-input-text-default': properties?.['text-default'],
    '--forge-input-text-invalid': properties?.['text-invalid'],
    '--forge-input-text-placeholder': properties?.['text-placeholder'],
    '--forge-input-text-secondary': properties?.['text-secondary'],
    '--forge-input-transition-duration': properties?.['transition-duration'],
    '--forge-input-transition-easing': properties?.['transition-easing'],
  }) as InputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface InputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Field value (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string | number;
  /** Native input type. Defaults to `'text'`. */
  type?: InputType;
  /** Field size. Defaults to `'md'`. */
  size?: InputSize;
  /** Placeholder text. */
  placeholder?: string;
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
  /** Native `autocomplete` token (e.g. `'email'`, `'name'`, `'off'`). */
  autocomplete?: string;
  /** Native `autocapitalize` hint. */
  autocapitalize?: InputAutocapitalize;
  /** Allow multiple comma-separated entries (`type="email"` only). */
  multiple?: boolean;
  /** Step increment (`type="number"`). */
  step?: number | string;
  /** Inclusive minimum (`type="number"`). */
  min?: number | string;
  /** Inclusive maximum (`type="number"`). */
  max?: number | string;
  /** Autocomplete suggestions rendered as a native `<datalist>`. */
  list?: Array<string | number>;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (icon, unit, or button) — the `start` named slot. */
  start?: MpChild;
  /** Content placed before the field — the `prefix` named slot. */
  prefix?: MpChild;
  /** Content placed after the field — the `suffix` named slot. */
  suffix?: MpChild;
  /** Trailing extension content (icon, unit, or button) — the `end` named slot. */
  end?: MpChild;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string | number) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
  /** Fired with the native `blur` event. */
  onBlur?: (event: FocusEvent) => void;
  /** Fired with the native `focus` event. */
  onFocus?: (event: FocusEvent) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<InputStyleProperties>;
}

/**
 * `ForgeInput` — text field authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Supports the canonical `2xs … 2xl` size scale, a label/hint/error trio, an
 * optional `<datalist>` (from `list`), and leading/trailing extension content.
 * It owns its styling through the co-located CSS Module `forge-input.module.scss`
 * and composes the neutral {@link ForgeTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the `start`/`prefix`/
 * `suffix`/`end` regions are authored as named slots (`<Slot>`), with their
 * presence detected through the framework-neutral {@link hasSlot} helper; and
 * the `v-model` + `change`/`blur`/`focus` emits become the
 * `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props.
 */
export function ForgeInput(properties: Readonly<InputProperties>): MpElement {
  const style = createInputStyle(properties.properties);

  const {
    modelValue = '',
    type = 'text',
    size = 'md',
    placeholder = '',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    autocomplete,
    autocapitalize,
    multiple = false,
    step,
    min,
    max,
    list,
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;
  const hasList = Array.isArray(list) && list.length > 0;

  const handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    properties.onUpdateModelValue?.(type === 'number' ? target.valueAsNumber : target.value);
  };

  return (
    <div
      className={[
        styles['forge-input'],
        styles[`forge-input--${size}`],
        {
          [styles['forge-input--error']]: !!error,
          [styles['forge-input--disabled']]: disabled,
        },
        properties.className,
      ]}
      style={style}
    >
      {label ? (
        <label
          className={[
            styles['forge-input__label'],
            {
              [styles['forge-input__label--hidden']]: labelHidden,
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
              className={styles['forge-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      <div className={styles['forge-input__wrapper']}>
        {hasSlot('start') ? (
          <span className={[styles['forge-input__extension'], styles['forge-input__extension--start']]}>
            <Slot name="start" />
          </span>
        ) : undefined}
        <Slot name="prefix" />
        <input
          id={resolvedId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          autocapitalize={autocapitalize}
          autocomplete={autocomplete}
          className={styles['forge-input__field']}
          disabled={disabled}
          list={hasList ? `${resolvedId}-list` : undefined}
          max={max}
          min={min}
          multiple={type === 'email' && multiple ? true : undefined}
          placeholder={placeholder}
          required={required}
          step={step}
          type={type}
          value={modelValue}
          onBlur={(event: FocusEvent) => properties.onBlur?.(event)}
          onChange={(event: Event) => properties.onChange?.(event)}
          onFocus={(event: FocusEvent) => properties.onFocus?.(event)}
          onInput={handleInput}
        />
        {hasList ? (
          <datalist id={`${resolvedId}-list`}>
            {list.map((option) => (
              <option
                key={String(option)}
                value={option}
              />
            ))}
          </datalist>
        ) : undefined}
        <Slot name="suffix" />
        {hasSlot('end') ? (
          <span className={[styles['forge-input__extension'], styles['forge-input__extension--end']]}>
            <Slot name="end" />
          </span>
        ) : undefined}
      </div>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-input__error']}
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
          className={styles['forge-input__hint']}
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
