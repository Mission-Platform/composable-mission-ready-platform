import { h, useId, type MpChild, type MpElement, type MpProperties } from '@mission-platform/forge';

import { BaseRadio } from '../base-radio';
import { BaseStack } from '../base-stack';
import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-radio-group.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type RadioGroupSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single selectable option within a {@link BaseRadioGroup}. */
export interface RadioOption {
  /** Visible label text. */
  label: string;
  /** The value selected when this option is chosen. */
  value: string | number;
  /** Disable just this option. */
  disabled?: boolean;
}

/** Axis the radios flow along. */
export type RadioGroupDirection = 'vertical' | 'horizontal';

export interface RadioGroupProperties extends MpProperties {
  /**
   * The currently selected value (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string | number;
  /** The selectable options. */
  options?: RadioOption[];
  /** Visible group legend. */
  legend?: string;
  /** Visually hide the legend (kept for assistive tech). */
  legendHidden?: boolean;
  /** Helper text shown below the group. */
  hint?: string;
  /** Error message shown below the group (replaces the hint). */
  error?: string;
  /** Disable the whole group. */
  disabled?: boolean;
  /** Mark the group as required (renders a `*` after the legend). */
  required?: boolean;
  /** Axis the radios flow along. Defaults to `'vertical'`. */
  direction?: RadioGroupDirection;
  /** Field size applied to the group and each radio. Defaults to `'md'`. */
  size?: RadioGroupSize;
  /** Explicit group name; auto-generated when omitted. */
  name?: string;
  /** Fired with the next selected value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string | number) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
}

/**
 * `BaseRadioGroup` — groups several {@link BaseRadio} controls under a shared
 * legend, authored once in the neutral JSX dialect and compiled straight to
 * React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Selection is controlled with the established `modelValue` +
 * `onUpdateModelValue`/`onChange` callback-prop convention; the radios are
 * driven from the `options` array (flattening the SFC's slot-based composition,
 * the same approach the migrated {@link BaseTabs} took). It composes the
 * migrated {@link BaseStack}, {@link BaseRadio}, and {@link BaseTypography}
 * primitives and owns its styling through the co-located CSS Module
 * `base-radio-group.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `useId`/random group name maps
 * to the framework-native `useId` hook; the
 * `useI18n` "required" title becomes a plain string; and the `v-model` + emits
 * become the callback props. Any default-slot content renders after the
 * options.
 */
export function BaseRadioGroup(properties: Readonly<RadioGroupProperties>): MpElement {
  const {
    modelValue,
    options = [],
    legend,
    legendHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    direction = 'vertical',
    size = 'md',
  } = properties;

  const generatedId = useId();
  const groupId = properties.name ?? generatedId;

  const handleUpdate = (value: string | number | undefined): void => {
    if (value !== undefined) {
      properties.onUpdateModelValue?.(value);
    }
  };

  const handleChange = (event: Event): void => {
    properties.onChange?.(event);
  };

  const radios: MpChild[] = options.map((option) => (
    <BaseRadio
      key={option.value}
      id={`${groupId}-${option.value}`}
      disabled={disabled || option.disabled}
      label={option.label}
      modelValue={modelValue}
      size={size}
      value={option.value}
      onChange={handleChange}
      onUpdateModelValue={handleUpdate}
    />
  ));
  if (Array.isArray(properties.children)) {
    radios.push(...(properties.children as readonly MpChild[]));
  } else if (properties.children !== undefined) {
    radios.push(properties.children as MpChild);
  }

  return (
    <fieldset
      className={[
        styles['base-radio-group'],
        sizeStyles[`base-size--${size}`],
        {
          [styles['base-radio-group--error']]: !!error,
          [styles['base-radio-group--disabled']]: disabled,
        },
      ]}
    >
      {legend ? (
        <legend
          className={[
            styles['base-radio-group__legend'],
            {
              [styles['base-radio-group__legend--hidden']]: legendHidden,
            },
          ]}
        >
          <BaseTypography
            as="span"
            color="primary"
            variant="label"
          >
            {legend}
          </BaseTypography>
          {required ? (
            <span
              aria-hidden="true"
              className={styles['base-radio-group__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </legend>
      ) : undefined}
      <BaseStack
        align={direction === 'horizontal' ? 'center' : 'stretch'}
        direction={direction}
        gap={direction === 'horizontal' ? 'md' : '2xs'}
        wrap={direction === 'horizontal'}
      >
        {radios}
      </BaseStack>
      {error ? (
        <p
          className={styles['base-radio-group__error']}
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
        <p className={styles['base-radio-group__hint']}>
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
