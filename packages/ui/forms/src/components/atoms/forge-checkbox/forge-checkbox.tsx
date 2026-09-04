import {
  useEffect,
  useId,
  useRef,
  createForgeStyle,
  type ClassValue,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeIconCheck, ForgeIconMinus } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-checkbox.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type CheckboxSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CheckboxStyleProperties {
  readonly 'checkable-border-default'?: string;
  readonly 'checkable-border-focus-visible'?: string;
  readonly 'checkable-border-invalid'?: string;
  readonly 'checkable-border-selected'?: string;
  readonly 'checkable-border-width-default'?: string;
  readonly 'checkable-border-width-focus'?: string;
  readonly 'checkable-control-size'?: string;
  readonly 'checkable-gap-inline'?: string;
  readonly 'checkable-gap-stack'?: string;
  readonly 'checkable-glyph-font-size'?: string;
  readonly 'checkable-glyph-font-weight'?: string;
  readonly 'checkable-radius'?: string;
  readonly 'checkable-thumb-on-track'?: string;
  readonly 'checkable-track-default'?: string;
  readonly 'checkable-track-selected'?: string;
  readonly 'checkable-transition-duration'?: string;
  readonly 'checkable-transition-easing'?: string;
  readonly 'feedback-opacity-disabled'?: string;
  readonly 'field-error'?: string;
  readonly 'field-required'?: string;
}

export type CheckboxStyle = CSSStyleProperties & {
  readonly '--forge-checkbox-checkable-border-default'?: string | undefined;
  readonly '--forge-checkbox-checkable-border-focus-visible'?: string | undefined;
  readonly '--forge-checkbox-checkable-border-invalid'?: string | undefined;
  readonly '--forge-checkbox-checkable-border-selected'?: string | undefined;
  readonly '--forge-checkbox-checkable-border-width-default'?: string | undefined;
  readonly '--forge-checkbox-checkable-border-width-focus'?: string | undefined;
  readonly '--forge-checkbox-checkable-control-size'?: string | undefined;
  readonly '--forge-checkbox-checkable-gap-inline'?: string | undefined;
  readonly '--forge-checkbox-checkable-gap-stack'?: string | undefined;
  readonly '--forge-checkbox-checkable-glyph-font-size'?: string | undefined;
  readonly '--forge-checkbox-checkable-glyph-font-weight'?: string | undefined;
  readonly '--forge-checkbox-checkable-radius'?: string | undefined;
  readonly '--forge-checkbox-checkable-thumb-on-track'?: string | undefined;
  readonly '--forge-checkbox-checkable-track-default'?: string | undefined;
  readonly '--forge-checkbox-checkable-track-selected'?: string | undefined;
  readonly '--forge-checkbox-checkable-transition-duration'?: string | undefined;
  readonly '--forge-checkbox-checkable-transition-easing'?: string | undefined;
  readonly '--forge-checkbox-feedback-opacity-disabled'?: string | undefined;
  readonly '--forge-checkbox-field-error'?: string | undefined;
  readonly '--forge-checkbox-field-required'?: string | undefined;
};

function createCheckboxStyle(properties: Readonly<CheckboxStyleProperties> | undefined): CheckboxStyle | undefined {
  return createForgeStyle({
    '--forge-checkbox-checkable-border-default': properties?.['checkable-border-default'],
    '--forge-checkbox-checkable-border-focus-visible': properties?.['checkable-border-focus-visible'],
    '--forge-checkbox-checkable-border-invalid': properties?.['checkable-border-invalid'],
    '--forge-checkbox-checkable-border-selected': properties?.['checkable-border-selected'],
    '--forge-checkbox-checkable-border-width-default': properties?.['checkable-border-width-default'],
    '--forge-checkbox-checkable-border-width-focus': properties?.['checkable-border-width-focus'],
    '--forge-checkbox-checkable-control-size': properties?.['checkable-control-size'],
    '--forge-checkbox-checkable-gap-inline': properties?.['checkable-gap-inline'],
    '--forge-checkbox-checkable-gap-stack': properties?.['checkable-gap-stack'],
    '--forge-checkbox-checkable-glyph-font-size': properties?.['checkable-glyph-font-size'],
    '--forge-checkbox-checkable-glyph-font-weight': properties?.['checkable-glyph-font-weight'],
    '--forge-checkbox-checkable-radius': properties?.['checkable-radius'],
    '--forge-checkbox-checkable-thumb-on-track': properties?.['checkable-thumb-on-track'],
    '--forge-checkbox-checkable-track-default': properties?.['checkable-track-default'],
    '--forge-checkbox-checkable-track-selected': properties?.['checkable-track-selected'],
    '--forge-checkbox-checkable-transition-duration': properties?.['checkable-transition-duration'],
    '--forge-checkbox-checkable-transition-easing': properties?.['checkable-transition-easing'],
    '--forge-checkbox-feedback-opacity-disabled': properties?.['feedback-opacity-disabled'],
    '--forge-checkbox-field-error': properties?.['field-error'],
    '--forge-checkbox-field-required': properties?.['field-required'],
  }) as CheckboxStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CheckboxProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * Checked state. A `boolean` for a standalone checkbox, or a `string[]` of
   * selected `value`s when the checkbox participates in a group. Controlled via
   * `modelValue` + `onUpdateModelValue`. Defaults to `false`.
   * @model onUpdateModelValue
   */
  modelValue?: boolean | string[];
  /** This checkbox's value, used when `modelValue` is a `string[]` group. */
  value?: string;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the control. */
  hint?: string;
  /** Error message shown below the control (replaces the hint). */
  error?: string;
  /** Disable the control. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Render the mixed/indeterminate state. */
  indeterminate?: boolean;
  /** Field size. Defaults to `'md'`. */
  size?: CheckboxSize;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next checked value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: boolean | string[]) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CheckboxStyleProperties>;
}

/**
 * `ForgeCheckbox` — checkbox control authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Supports both a standalone boolean and a `string[]` group (toggling its
 * `value` in/out of the array). It owns its styling through the co-located CSS
 * Module `forge-checkbox.module.scss` and composes the neutral {@link ForgeTypography}
 * for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the indeterminate
 * DOM property is set through a `useRef` + `useEffect` pair (the neutral
 * equivalent of the SFC `watch`); the check/indeterminate markers are the
 * write-once `@mission-platform/icons` `ForgeIconCheck`/`ForgeIconMinus`; the `useI18n`
 * "required" title becomes a plain
 * string; and the `v-model` + `change` emit become the established
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeCheckbox(properties: Readonly<CheckboxProperties>): MpElement {
  const style = createCheckboxStyle(properties.properties);

  const {
    modelValue = false,
    value,
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    indeterminate = false,
    size = 'md',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const inputReference = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputReference.current) {
      inputReference.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const selectedValues = Array.isArray(modelValue) ? new Set<string>(modelValue) : undefined;
  const isChecked = selectedValues ? value !== undefined && selectedValues.has(value) : modelValue;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const handleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (Array.isArray(modelValue) && value !== undefined) {
      const next = [...modelValue];
      if (target.checked) {
        next.push(value);
      } else {
        properties.onUpdateModelValue?.(next.filter((selectedValue: string) => selectedValue !== value));
        properties.onChange?.(event);
        return;
      }
      properties.onUpdateModelValue?.(next);
    } else {
      properties.onUpdateModelValue?.(target.checked);
    }
    properties.onChange?.(event);
  };

  return (
    <div
      className={[
        styles['forge-checkbox'],
        size ? `forge-size--${size}` : undefined,
        {
          [styles['forge-checkbox--error']]: !!error,
          [styles['forge-checkbox--disabled']]: disabled,
        },
        properties.className,
      ]}
      style={style}
    >
      <label
        className={styles['forge-checkbox__row']}
        for={resolvedId}
      >
        <span className={styles['forge-checkbox__control-wrapper']}>
          <input
            ref={inputReference}
            id={resolvedId}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            checked={isChecked}
            className={styles['forge-checkbox__input']}
            disabled={disabled}
            required={required}
            type="checkbox"
            value={value}
            onChange={handleChange}
          />
          <span
            aria-hidden="true"
            className={styles['forge-checkbox__box']}
          >
            <span className={styles['forge-checkbox__glyph']}>
              {indeterminate ? <ForgeIconMinus size="2xs" /> : <ForgeIconCheck size="2xs" />}
            </span>
          </span>
        </span>
        {label ? (
          <span
            className={[
              styles['forge-checkbox__label'],
              {
                [styles['forge-checkbox__label--hidden']]: labelHidden,
              },
            ]}
          >
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-md"
            >
              {label}
            </ForgeTypography>
            {required ? (
              <span
                aria-hidden="true"
                className={styles['forge-checkbox__required']}
                title="required"
              >
                *
              </span>
            ) : undefined}
          </span>
        ) : undefined}
      </label>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-checkbox__error']}
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
          className={styles['forge-checkbox__hint']}
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
