import { h, useEffect, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseInput } from '../base-input';
import { BaseSelect } from '../base-select';
import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';

import styles from './base-location-input.module.scss';
import { emptyLocation, formatAxis, parseAxis } from './location';

import type { LocationFormat, LocationValue } from './location';

export type { LocationFormat, LocationValue } from './location';

/** Field size, matching the composed {@link BaseInput} / {@link BaseSelect}. */
export type LocationInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface LocationInputProperties extends MpProperties {
  /** The canonical location value (signed decimal-degree `lat`/`lng`). */
  modelValue?: LocationValue | null;
  /** Visible group legend. */
  label?: string;
  /** Visually hide the legend (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the group. */
  hint?: string;
  /** Error message shown below the group (replaces the hint). */
  error?: string;
  /** Disable the whole control. */
  disabled?: boolean;
  /** Mark the control as required (renders a `*` after the legend). */
  required?: boolean;
  /** Initial entry/serialisation format (defaults to Decimal Degrees). */
  format?: LocationFormat;
  /** Whether to expose the format selector (defaults to `true`). */
  allowFormatChange?: boolean;
  /** Field size. Defaults to `'md'`. */
  size?: LocationInputSize;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next location value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: LocationValue) => void;
  /** Fired with the next location value whenever it changes. */
  onChange?: (value: LocationValue) => void;
}

/** The selectable coordinate formats. */
const FORMAT_OPTIONS: Array<{ label: string; value: LocationFormat }> = [
  { label: 'DD', value: 'dd' },
  { label: 'DM', value: 'dm' },
  { label: 'DMS', value: 'dms' },
];

/** Per-format placeholders that hint at the expected syntax. */
function placeholdersFor(format: LocationFormat): { lat: string; lng: string } {
  switch (format) {
    case 'dms': {
      return { lat: '40°42\'46.0"N', lng: '74°00\'21.5"W' };
    }
    case 'dm': {
      return { lat: "40°42.767'N", lng: "74°00.358'W" };
    }
    default: {
      return { lat: '40.7127753', lng: '-74.0059728' };
    }
  }
}

/**
 * `BaseLocationInput` — a geographic coordinate input authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It captures a latitude/longitude point in one of three representations —
 * Decimal Degrees (DD), Degrees Decimal Minutes (DM), or Degrees Minutes
 * Seconds (DMS) — chosen via the format selector. Whatever variant is used for
 * entry, the canonical {@link LocationValue} model always carries signed
 * decimal-degree `lat`/`lng` rounded to centimetre precision. It composes the
 * already-migrated {@link BaseSelect}, {@link BaseInput}, and
 * {@link BaseTypography} primitives and owns its styling through the co-located
 * CSS Module `base-location-input.module.scss`. The conversion/parsing logic
 * ships with this package as the framework-agnostic, co-located `location.ts`.
 *
 * Substitutions from the original Vue SFC: `useId` becomes the shared
 * `nextFieldId` helper resolved once in a `useRef`; the local text buffers
 * (`latText`/`lngText`) become non-lazy {@link useState} (so the initial render
 * — including SSR — already shows the formatted coordinates) resynced from the
 * model with a {@link useEffect}; and the `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props. The child layout classes are
 * applied to wrapper `<div>`s rather than passed through to the composed
 * components.
 */
export function BaseLocationInput(properties: LocationInputProperties): MpElement {
  const {
    modelValue,
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    format: formatProperty = 'dd',
    allowFormatChange = true,
    size = 'md',
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-location-input'));
  const resolvedId = idReference.current;

  const activeFormat: LocationFormat = modelValue?.format ?? formatProperty;

  const [latText, setLatText] = useState<string>(formatAxis(modelValue?.lat, activeFormat, 'lat'));
  const [lngText, setLngText] = useState<string>(formatAxis(modelValue?.lng, activeFormat, 'lng'));

  // Resync the text buffers whenever the model value or the format changes.
  useEffect(() => {
    setLatText(formatAxis(modelValue?.lat, activeFormat, 'lat'));
    setLngText(formatAxis(modelValue?.lng, activeFormat, 'lng'));
  }, [modelValue, formatProperty]);

  const emitValue = (value: LocationValue): void => {
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const commit = (nextLat: string, nextLng: string): void => {
    emitValue({
      lat: parseAxis(nextLat, activeFormat, 'lat'),
      lng: parseAxis(nextLng, activeFormat, 'lng'),
      format: activeFormat,
    });
  };

  const handleLatInput = (next: string | number): void => {
    const text = String(next);
    setLatText(text);
    commit(text, lngText);
  };

  const handleLngInput = (next: string | number): void => {
    const text = String(next);
    setLngText(text);
    commit(latText, text);
  };

  const handleFormatChange = (next: string | number): void => {
    const base = modelValue ?? emptyLocation();
    emitValue({ lat: base.lat, lng: base.lng, format: next as LocationFormat });
  };

  const placeholders = placeholdersFor(activeFormat);
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  return (
    <fieldset
      classNames={[styles['base-location-input'], {
        [styles['base-location-input--error']]: !!error,
        [styles['base-location-input--disabled']]: disabled,
      }]}
    >
      {label ? (
        <legend
          classNames={[styles['base-location-input__legend'], {
            [styles['base-location-input__legend--hidden']]: labelHidden,
          }]}
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
              classNames={styles['base-location-input__required']}
            >
              *
            </span>
          ) : undefined}
        </legend>
      ) : undefined}

      <div classNames={styles['base-location-input__row']}>
        {allowFormatChange ? (
          <div classNames={styles['base-location-input__format']}>
            <BaseSelect
              disabled={disabled}
              label="Coordinate format"
              labelHidden
              modelValue={activeFormat}
              options={FORMAT_OPTIONS}
              size={size}
              onUpdateModelValue={handleFormatChange}
            />
          </div>
        ) : undefined}
        <div classNames={styles['base-location-input__coord']}>
          <BaseInput
            aria-describedby={describedBy}
            disabled={disabled}
            label="Latitude"
            modelValue={latText}
            placeholder={placeholders.lat}
            required={required}
            size={size}
            onUpdateModelValue={handleLatInput}
          />
        </div>
        <div classNames={styles['base-location-input__coord']}>
          <BaseInput
            disabled={disabled}
            label="Longitude"
            modelValue={lngText}
            placeholder={placeholders.lng}
            required={required}
            size={size}
            onUpdateModelValue={handleLngInput}
          />
        </div>
      </div>

      {error ? (
        <p
          classNames={styles['base-location-input__error']}
          id={`${resolvedId}-error`}
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
          classNames={styles['base-location-input__hint']}
          id={`${resolvedId}-hint`}
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
    </fieldset>
  );
}
