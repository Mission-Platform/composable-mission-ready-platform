import { type ClassValue, h, type MpElement, useId } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-switch.module.scss';

/** Size token controlling the track/thumb dimensions (canonical `2xs … 2xl` scale). */
export type SwitchSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SwitchProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * On/off state (controlled via `modelValue` + `onUpdateModelValue`). Defaults to `false`.
   * @model onUpdateModelValue
   */
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
 * `ForgeSwitch` — toggle switch authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A `role="switch"` checkbox styled as a sliding track/thumb across the
 * canonical `2xs … 2xl` size scale. It owns its styling through the co-located
 * CSS Module `forge-switch.module.scss` and composes the neutral
 * {@link ForgeTypography} for the label/hint/error text.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook, and the `v-model` +
 * `change` emit become the established `onUpdateModelValue`/`onChange` callback
 * props.
 */
export function ForgeSwitch(properties: Readonly<SwitchProperties>): MpElement {
  const { modelValue = false, label, ariaLabel, hint, error, size = 'md', disabled = false } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const handleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    properties.onUpdateModelValue?.(target.checked);
    properties.onChange?.(event);
  };

  return (
    <div
      className={[
        styles['forge-switch'],
        styles[`forge-switch--${size}`],
        {
          [styles['forge-switch--error']]: !!error,
          [styles['forge-switch--disabled']]: disabled,
        },
        properties.className,
      ]}
    >
      <label className={styles['forge-switch__row']}>
        <span className={styles['forge-switch__track-wrapper']}>
          <input
            id={resolvedId}
            aria-checked={modelValue}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ? undefined : ariaLabel}
            checked={modelValue}
            className={styles['forge-switch__input']}
            disabled={disabled}
            role="switch"
            type="checkbox"
            onChange={handleChange}
          />
          <span
            aria-hidden="true"
            className={styles['forge-switch__track']}
          >
            <span className={styles['forge-switch__thumb']} />
          </span>
        </span>
        {label ? (
          <span className={styles['forge-switch__label']}>
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-md"
            >
              {label}
            </ForgeTypography>
          </span>
        ) : undefined}
      </label>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-switch__error']}
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
          className={styles['forge-switch__hint']}
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
