import { h, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';

import styles from './base-switch.module.scss';

/** Size token controlling the track/thumb dimensions (canonical `2xs … 2xl` scale). */
export type SwitchSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SwitchProperties extends MpProperties {
  /** On/off state (controlled via `modelValue` + `onUpdateModelValue`). Defaults to `false`. */
  modelValue?: boolean;
  /** Visible label text. */
  label?: string;
  /** Accessible label used when no visible `label` is provided. */
  ariaLabel?: string;
  /** Helper text shown below the control. */
  hint?: string;
  /** Error message shown below the control (replaces the hint). */
  error?: string;
  /** Track/thumb size. Defaults to `'md'`. */
  size?: SwitchSize;
  /** Disable the control. */
  disabled?: boolean;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next on/off value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: boolean) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
}

/**
 * `BaseSwitch` — toggle switch authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * A `role="switch"` checkbox styled as a sliding track/thumb across the
 * canonical `2xs … 2xl` size scale. It owns its styling through the co-located
 * CSS Module `base-switch.module.scss` and composes the neutral
 * {@link BaseTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable becomes the
 * shared `nextFieldId` helper resolved once in a `useRef`, and the `v-model` +
 * `change` emit become the established `onUpdateModelValue`/`onChange` callback
 * props.
 */
export function BaseSwitch(properties: SwitchProperties): MpElement {
  const { modelValue = false, label, ariaLabel, hint, error, size = 'md', disabled = false } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-switch'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const handleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    properties.onUpdateModelValue?.(target.checked);
    properties.onChange?.(event);
  };

  return (
    <div
      classNames={[styles['base-switch'], styles[`base-switch--${size}`], {
        [styles['base-switch--error']]: !!error,
        [styles['base-switch--disabled']]: disabled,
      }]}
    >
      <label classNames={styles['base-switch__row']}>
        <span classNames={styles['base-switch__track-wrapper']}>
          <input
            id={resolvedId}
            aria-checked={modelValue}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ? undefined : ariaLabel}
            checked={modelValue}
            classNames={styles['base-switch__input']}
            disabled={disabled}
            role="switch"
            type="checkbox"
            onChange={handleChange}
          />
          <span
            aria-hidden="true"
            classNames={styles['base-switch__track']}
          >
            <span classNames={styles['base-switch__thumb']} />
          </span>
        </span>
        {label ? (
          <span classNames={styles['base-switch__label']}>
            <BaseTypography
              as="span"
              color="primary"
              variant="body-md"
            >
              {label}
            </BaseTypography>
          </span>
        ) : undefined}
      </label>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['base-switch__error']}
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
          id={`${resolvedId}-hint`}
          classNames={styles['base-switch__hint']}
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
    </div>
  );
}
