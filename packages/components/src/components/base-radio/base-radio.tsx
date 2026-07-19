import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-radio.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type RadioSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface RadioProperties extends MpProperties {
  /**
   * The currently selected value of the group (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string | number;
  /** This radio's own value. Selected when it equals `modelValue`. */
  value: string | number;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Disable the control. */
  disabled?: boolean;
  /** Field size. Defaults to `'md'`. */
  size?: RadioSize;
  /** Explicit id forwarded to the native `<input>`. */
  id?: string;
  /** Fired with this radio's `value` when selected (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string | number) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
}

/**
 * `BaseRadio` — radio control authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * A single radio is selected when its `value` equals the group's `modelValue`.
 * It owns its styling through the co-located CSS Module `base-radio.module.scss`
 * (the selected dot is a pure CSS `::after`) and composes the neutral
 * {@link BaseTypography} for the label text; any default-slot content renders
 * after the label.
 *
 * The original Vue SFC's `v-model` + `change` emit become the established
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseRadio(properties: Readonly<RadioProperties>): MpElement {
  const { modelValue, value, label, labelHidden = false, disabled = false, size = 'md' } = properties;

  const isChecked = modelValue === value;

  const handleChange = (event: Event): void => {
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(event);
  };

  return (
    <label
      classNames={[
        styles['base-radio'],
        sizeStyles[`base-size--${size}`],
        {
          [styles['base-radio--checked']]: isChecked,
          [styles['base-radio--disabled']]: disabled,
        },
      ]}
    >
      <span classNames={styles['base-radio__control-wrapper']}>
        <input
          id={properties.id}
          checked={isChecked}
          classNames={styles['base-radio__input']}
          disabled={disabled}
          type="radio"
          value={value}
          onChange={handleChange}
        />
        <span
          aria-hidden="true"
          classNames={styles['base-radio__circle']}
        />
      </span>
      {label ? (
        <span
          classNames={[
            styles['base-radio__label'],
            {
              [styles['base-radio__label--hidden']]: labelHidden,
            },
          ]}
        >
          <BaseTypography
            as="span"
            color="primary"
            variant="body-md"
          >
            {label}
          </BaseTypography>
        </span>
      ) : undefined}
      {properties.children ? <span classNames={styles['base-radio__slot']}>{properties.children}</span> : undefined}
    </label>
  );
}
