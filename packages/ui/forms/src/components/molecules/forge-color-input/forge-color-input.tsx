import {
  useEffect,
  useId,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-color-input.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type ColorInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Matches a 6-digit `#rrggbb` hex colour. */
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ColorInputStyleProperties {
  readonly 'border-default'?: string;
  readonly 'border-focus'?: string;
  readonly 'border-invalid'?: string;
  readonly 'border-width'?: string;
  readonly 'disabled-opacity'?: string;
  readonly 'focus-ring'?: string;
  readonly 'focus-ring-invalid'?: string;
  readonly 'font-family'?: string;
  readonly 'form-text-invalid'?: string;
  readonly 'gap-inline'?: string;
  readonly 'gap-stack'?: string;
  readonly 'hover-opacity'?: string;
  readonly 'letter-spacing'?: string;
  readonly radius?: string;
  readonly 'size-2xl-font-size'?: string;
  readonly 'size-2xl-padding-block'?: string;
  readonly 'size-2xl-padding-inline'?: string;
  readonly 'size-2xl-swatch'?: string;
  readonly 'size-2xs-font-size'?: string;
  readonly 'size-2xs-padding-block'?: string;
  readonly 'size-2xs-padding-inline'?: string;
  readonly 'size-2xs-swatch'?: string;
  readonly 'size-lg-font-size'?: string;
  readonly 'size-lg-padding-block'?: string;
  readonly 'size-lg-padding-inline'?: string;
  readonly 'size-lg-swatch'?: string;
  readonly 'size-md-font-size'?: string;
  readonly 'size-md-padding-block'?: string;
  readonly 'size-md-padding-inline'?: string;
  readonly 'size-md-swatch'?: string;
  readonly 'size-sm-font-size'?: string;
  readonly 'size-sm-padding-block'?: string;
  readonly 'size-sm-padding-inline'?: string;
  readonly 'size-sm-swatch'?: string;
  readonly 'size-xl-font-size'?: string;
  readonly 'size-xl-padding-block'?: string;
  readonly 'size-xl-padding-inline'?: string;
  readonly 'size-xl-swatch'?: string;
  readonly 'size-xs-font-size'?: string;
  readonly 'size-xs-padding-block'?: string;
  readonly 'size-xs-padding-inline'?: string;
  readonly 'size-xs-swatch'?: string;
  readonly 'surface-default'?: string;
  readonly 'surface-disabled'?: string;
  readonly 'text-default'?: string;
  readonly 'text-error'?: string;
  readonly 'text-placeholder'?: string;
  readonly 'transition-duration'?: string;
  readonly 'transition-easing'?: string;
}

export type ColorInputStyle = CSSStyleProperties & {
  readonly '--forge-color-input-border-default'?: string | undefined;
  readonly '--forge-color-input-border-focus'?: string | undefined;
  readonly '--forge-color-input-border-invalid'?: string | undefined;
  readonly '--forge-color-input-border-width'?: string | undefined;
  readonly '--forge-color-input-disabled-opacity'?: string | undefined;
  readonly '--forge-color-input-focus-ring'?: string | undefined;
  readonly '--forge-color-input-focus-ring-invalid'?: string | undefined;
  readonly '--forge-color-input-font-family'?: string | undefined;
  readonly '--forge-color-input-form-text-invalid'?: string | undefined;
  readonly '--forge-color-input-gap-inline'?: string | undefined;
  readonly '--forge-color-input-gap-stack'?: string | undefined;
  readonly '--forge-color-input-hover-opacity'?: string | undefined;
  readonly '--forge-color-input-letter-spacing'?: string | undefined;
  readonly '--forge-color-input-radius'?: string | undefined;
  readonly '--forge-color-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-color-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-2xl-swatch'?: string | undefined;
  readonly '--forge-color-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-color-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-2xs-swatch'?: string | undefined;
  readonly '--forge-color-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-color-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-lg-swatch'?: string | undefined;
  readonly '--forge-color-input-size-md-font-size'?: string | undefined;
  readonly '--forge-color-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-md-swatch'?: string | undefined;
  readonly '--forge-color-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-color-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-sm-swatch'?: string | undefined;
  readonly '--forge-color-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-color-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-xl-swatch'?: string | undefined;
  readonly '--forge-color-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-color-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-color-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-color-input-size-xs-swatch'?: string | undefined;
  readonly '--forge-color-input-surface-default'?: string | undefined;
  readonly '--forge-color-input-surface-disabled'?: string | undefined;
  readonly '--forge-color-input-text-default'?: string | undefined;
  readonly '--forge-color-input-text-error'?: string | undefined;
  readonly '--forge-color-input-text-placeholder'?: string | undefined;
  readonly '--forge-color-input-transition-duration'?: string | undefined;
  readonly '--forge-color-input-transition-easing'?: string | undefined;
};

function createColorInputStyle(
  properties: Readonly<ColorInputStyleProperties> | undefined,
): ColorInputStyle | undefined {
  return createForgeStyle({
    '--forge-color-input-border-default': properties?.['border-default'],
    '--forge-color-input-border-focus': properties?.['border-focus'],
    '--forge-color-input-border-invalid': properties?.['border-invalid'],
    '--forge-color-input-border-width': properties?.['border-width'],
    '--forge-color-input-disabled-opacity': properties?.['disabled-opacity'],
    '--forge-color-input-focus-ring': properties?.['focus-ring'],
    '--forge-color-input-focus-ring-invalid': properties?.['focus-ring-invalid'],
    '--forge-color-input-font-family': properties?.['font-family'],
    '--forge-color-input-form-text-invalid': properties?.['form-text-invalid'],
    '--forge-color-input-gap-inline': properties?.['gap-inline'],
    '--forge-color-input-gap-stack': properties?.['gap-stack'],
    '--forge-color-input-hover-opacity': properties?.['hover-opacity'],
    '--forge-color-input-letter-spacing': properties?.['letter-spacing'],
    '--forge-color-input-radius': properties?.['radius'],
    '--forge-color-input-size-2xl-font-size': properties?.['size-2xl-font-size'],
    '--forge-color-input-size-2xl-padding-block': properties?.['size-2xl-padding-block'],
    '--forge-color-input-size-2xl-padding-inline': properties?.['size-2xl-padding-inline'],
    '--forge-color-input-size-2xl-swatch': properties?.['size-2xl-swatch'],
    '--forge-color-input-size-2xs-font-size': properties?.['size-2xs-font-size'],
    '--forge-color-input-size-2xs-padding-block': properties?.['size-2xs-padding-block'],
    '--forge-color-input-size-2xs-padding-inline': properties?.['size-2xs-padding-inline'],
    '--forge-color-input-size-2xs-swatch': properties?.['size-2xs-swatch'],
    '--forge-color-input-size-lg-font-size': properties?.['size-lg-font-size'],
    '--forge-color-input-size-lg-padding-block': properties?.['size-lg-padding-block'],
    '--forge-color-input-size-lg-padding-inline': properties?.['size-lg-padding-inline'],
    '--forge-color-input-size-lg-swatch': properties?.['size-lg-swatch'],
    '--forge-color-input-size-md-font-size': properties?.['size-md-font-size'],
    '--forge-color-input-size-md-padding-block': properties?.['size-md-padding-block'],
    '--forge-color-input-size-md-padding-inline': properties?.['size-md-padding-inline'],
    '--forge-color-input-size-md-swatch': properties?.['size-md-swatch'],
    '--forge-color-input-size-sm-font-size': properties?.['size-sm-font-size'],
    '--forge-color-input-size-sm-padding-block': properties?.['size-sm-padding-block'],
    '--forge-color-input-size-sm-padding-inline': properties?.['size-sm-padding-inline'],
    '--forge-color-input-size-sm-swatch': properties?.['size-sm-swatch'],
    '--forge-color-input-size-xl-font-size': properties?.['size-xl-font-size'],
    '--forge-color-input-size-xl-padding-block': properties?.['size-xl-padding-block'],
    '--forge-color-input-size-xl-padding-inline': properties?.['size-xl-padding-inline'],
    '--forge-color-input-size-xl-swatch': properties?.['size-xl-swatch'],
    '--forge-color-input-size-xs-font-size': properties?.['size-xs-font-size'],
    '--forge-color-input-size-xs-padding-block': properties?.['size-xs-padding-block'],
    '--forge-color-input-size-xs-padding-inline': properties?.['size-xs-padding-inline'],
    '--forge-color-input-size-xs-swatch': properties?.['size-xs-swatch'],
    '--forge-color-input-surface-default': properties?.['surface-default'],
    '--forge-color-input-surface-disabled': properties?.['surface-disabled'],
    '--forge-color-input-text-default': properties?.['text-default'],
    '--forge-color-input-text-error': properties?.['text-error'],
    '--forge-color-input-text-placeholder': properties?.['text-placeholder'],
    '--forge-color-input-transition-duration': properties?.['transition-duration'],
    '--forge-color-input-transition-easing': properties?.['transition-easing'],
  }) as ColorInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ColorInputProperties {
  /**
   * Colour value (controlled via `modelValue` + `onUpdateModelValue`). Defaults to `'#000000'`.
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
  size?: ColorInputSize;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the committed value (the native `change`). */
  onChange?: (value: string) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ColorInputStyleProperties>;
}

/**
 * `ForgeColorInput` — colour picker authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Pairs a native `<input type="color">` (presented as a swatch) with a hex text
 * field. The colour is controlled via `modelValue`; the swatch and the hex
 * field stay in sync, and only valid `#rrggbb` values are propagated. It owns
 * its styling through the co-located CSS Module `forge-color-input.module.scss`
 * and composes the neutral {@link ForgeTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the local hex `ref`
 * becomes a {@link useState} kept in sync with external `modelValue` changes via
 * a {@link useEffect}; and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeColorInput(properties: Readonly<ColorInputProperties>): MpElement {
  const style = createColorInputStyle(properties.properties);

  const {
    modelValue = '#000000',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    size = 'md',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [hexText, setHexText] = useState<string>(modelValue);

  // Keep the hex text field in sync when the model changes externally.
  useEffect(() => {
    setHexText(modelValue);
  }, [modelValue]);

  const handleColorInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    setHexText(value);
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const handleTextInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    setHexText(value);
    if (HEX_PATTERN.test(value)) {
      properties.onUpdateModelValue?.(value);
      properties.onChange?.(value);
    }
  };

  const handleTextChange = (event: Event): void => {
    let value = (event.target as HTMLInputElement).value.trim();
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    if (HEX_PATTERN.test(value)) {
      setHexText(value);
      properties.onUpdateModelValue?.(value);
      properties.onChange?.(value);
    } else {
      setHexText(modelValue);
    }
  };

  return (
    <div
      className={[
        styles['forge-color-input'],
        styles[`forge-color-input--${size}`],
        {
          [styles['forge-color-input--error']]: !!error,
          [styles['forge-color-input--disabled']]: disabled,
        },
      ]}
      style={style}
    >
      {label ? (
        <label
          className={[
            styles['forge-color-input__label'],
            {
              [styles['forge-color-input__label--hidden']]: labelHidden,
            },
          ]}
          for={`${resolvedId}-text`}
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
              className={styles['forge-color-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <div className={styles['forge-color-input__wrapper']}>
        <label
          aria-label="Open colour picker"
          className={styles['forge-color-input__swatch-label']}
          for={resolvedId}
          style={{ backgroundColor: modelValue }}
        />
        <input
          id={resolvedId}
          className={styles['forge-color-input__picker']}
          disabled={disabled}
          required={required}
          type="color"
          value={modelValue}
          onChange={handleColorInput}
          onInput={handleColorInput}
        />
        <input
          id={`${resolvedId}-text`}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          className={styles['forge-color-input__text']}
          disabled={disabled}
          maxlength={7}
          placeholder="#000000"
          spellcheck={false}
          type="text"
          value={hexText}
          onBlur={handleTextChange}
          onChange={handleTextChange}
          onInput={handleTextInput}
        />
      </div>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-color-input__error']}
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
          className={styles['forge-color-input__hint']}
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
