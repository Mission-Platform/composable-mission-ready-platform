import { ForgeTypography } from '@mission-platform/components';
import { type ClassValue, h, type MpElement, useId } from '@mission-platform/forge';
import { ForgeIconCheck, ForgeIconError } from '@mission-platform/icons';

import { ForgeSelect, type SelectOption } from '../forge-select';

import styles from './forge-phone-input.module.scss';
import { dialCode, exampleNumber, formatAsYouType, isValid, listCountries, type PhoneCountry, toE164 } from './phone';

/** Size token (canonical `2xs … 2xl` scale). */
export type PhoneInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The payload emitted by {@link PhoneInputProperties.onChange}. */
export interface PhoneChange {
  /** The national text as displayed in the field (the controlled `modelValue`). */
  national: string;
  /** The canonical E.164 form (`+…`), or `''` when the input is not yet parseable. */
  e164: string;
  /** Whether the current input is a valid number for the selected country. */
  valid: boolean;
  /** The selected ISO 3166-1 alpha-2 region code, e.g. `US`. */
  country: string;
}

export interface PhoneInputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * The national-format phone text (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /**
   * The selected ISO 3166-1 alpha-2 region (controlled via `country` + `onUpdateCountry`). Defaults to `'US'`.
   * @model onUpdateCountry
   */
  country?: string;
  /** Override the country picker's option list. Defaults to every region `@mission-platform/phone-number` supports. */
  countries?: PhoneCountry[];
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message shown below the field (replaces the hint). */
  error?: string;
  /** Placeholder shown when empty. Defaults to a national-format example for the country. */
  placeholder?: string;
  /** Field size. Defaults to `'md'`. */
  size?: PhoneInputSize;
  /** Disable the control. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Native form-field `name`; a hidden input submits the canonical E.164 value under it. */
  name?: string;
  /** Accessible label for the country picker. Defaults to `'Country'`. */
  countryLabel?: string;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next national text (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the next region when the country picker changes. */
  onUpdateCountry?: (country: string) => void;
  /** Fired alongside the updates with the parsed result (`national`, `e164`, `valid`, `country`). */
  onChange?: (change: PhoneChange) => void;
}

/**
 * `ForgePhoneInput` — an international phone-number field authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * A country picker — the searchable {@link ForgeSelect} listing flag + name +
 * dial code, so a region can be found by typing — sits beside a
 * `type="tel"` field. As the user types, the input is formatted as-you-type for
 * the selected country (`@mission-platform/components`'s framework-agnostic
 * `phone.ts` helper, built on **`@mission-platform/phone-number`**), and the canonical
 * E.164 form + validity are derived each render. The national text is controlled
 * via `modelValue`/`onUpdateModelValue` and the region via `country`/
 * `onUpdateCountry`; `onChange` reports the full parsed result and a hidden
 * `name` input submits the E.164 value. It owns its styling through the
 * co-located CSS Module `forge-phone-input.module.scss`.
 *
 * The `@mission-platform/phone-number` integration lives in the co-located, framework-
 * agnostic `phone.ts` helper (no neutral/JSX imports), so the two-stage compiler
 * copies it verbatim onto both the React and Vue builds and the library is
 * bundled by each framework's own toolchain. Substitutions from a typical Vue
 * SFC: the `useId` composable maps straight to the framework-native `useId`
 * hook; the validity marker is the write-once `@mission-platform/icons`
 * `ForgeIconCheck`/`ForgeIconError`; and `v-model` + emits become the
 * `onUpdateModelValue`/`onUpdateCountry`/`onChange` callback props.
 */
export function ForgePhoneInput(properties: Readonly<PhoneInputProperties>): MpElement {
  const {
    modelValue = '',
    country = 'US',
    label,
    labelHidden = false,
    hint,
    error,
    placeholder,
    size = 'md',
    disabled = false,
    required = false,
    name,
    countryLabel = 'Country',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const countryList = properties.countries ?? listCountries();
  const dial = dialCode(country);
  const canonicalE164 = toE164(modelValue, country) ?? '';
  const valid = isValid(modelValue, country);
  const hasValue = modelValue.length > 0;
  const placeholderText = placeholder ?? exampleNumber(country);

  const emitChange = (national: string, region: string): void => {
    properties.onUpdateModelValue?.(national);
    properties.onChange?.({
      national,
      e164: toE164(national, region) ?? '',
      valid: isValid(national, region),
      country: region,
    });
  };

  const handleInput = (event: Event): void => {
    emitChange(formatAsYouType((event.target as HTMLInputElement).value, country), country);
  };

  const handleCountryChange = (next: string | number): void => {
    const nextCountry = String(next);
    properties.onUpdateCountry?.(nextCountry);
    emitChange(formatAsYouType(modelValue, nextCountry), nextCountry);
  };

  const countryOptions: SelectOption[] = countryList.map((option) => ({
    value: option.region,
    label: `${option.flag} ${option.name} (+${option.dialCode})`,
  }));

  return (
    <div
      aria-disabled={disabled ? 'true' : undefined}
      className={[
        styles['forge-phone-input'],
        styles[`forge-phone-input--${size}`],
        {
          [styles['forge-phone-input--error']]: !!error,
          [styles['forge-phone-input--disabled']]: disabled,
          [styles['forge-phone-input--valid']]: valid,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          className={[
            styles['forge-phone-input__label'],
            {
              [styles['forge-phone-input__label--hidden']]: labelHidden,
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
              className={styles['forge-phone-input__required']}
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      <div className={styles['forge-phone-input__wrapper']}>
        <div className={styles['forge-phone-input__country']}>
          <ForgeSelect
            disabled={disabled}
            label={countryLabel}
            labelHidden={true}
            modelValue={country}
            options={countryOptions}
            placeholder={countryLabel}
            size={size}
            onUpdateModelValue={handleCountryChange}
          />
        </div>
        <span
          aria-hidden="true"
          className={styles['forge-phone-input__dial']}
        >
          +{dial}
        </span>
        <input
          id={resolvedId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          autocomplete="tel-national"
          className={styles['forge-phone-input__field']}
          disabled={disabled}
          inputmode="tel"
          placeholder={placeholderText}
          required={required}
          type="tel"
          value={modelValue}
          onInput={handleInput}
        />
        {hasValue ? (
          <span
            className={styles['forge-phone-input__status']}
            role="img"
            aria-label={valid ? 'Valid number' : 'Invalid number'}
          >
            {valid ? <ForgeIconCheck size="xs" /> : <ForgeIconError size="xs" />}
          </span>
        ) : undefined}
      </div>
      {name ? (
        <input
          name={name}
          type="hidden"
          value={canonicalE164}
        />
      ) : undefined}
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-phone-input__error']}
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
          className={styles['forge-phone-input__hint']}
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
