import {
  useId,
  createForgeStyle,
  type ClassValue,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-switch.module.scss';

/** Size token controlling the track/thumb dimensions (canonical `2xs … 2xl` scale). */
export type SwitchSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SwitchStyleProperties {
  readonly 'checkable-border-focus-visible'?: string;
  readonly 'checkable-border-invalid'?: string;
  readonly 'checkable-border-width-focus'?: string;
  readonly 'checkable-border-width-invalid'?: string;
  readonly 'checkable-circle-radius'?: string;
  readonly 'checkable-gap-inline'?: string;
  readonly 'checkable-gap-stack'?: string;
  readonly 'checkable-opacity-disabled'?: string;
  readonly 'checkable-shadow'?: string;
  readonly 'checkable-size-2xl-switch-height'?: string;
  readonly 'checkable-size-2xl-switch-padding'?: string;
  readonly 'checkable-size-2xl-switch-thumb-size'?: string;
  readonly 'checkable-size-2xl-switch-translate'?: string;
  readonly 'checkable-size-2xl-switch-width'?: string;
  readonly 'checkable-size-2xs-switch-height'?: string;
  readonly 'checkable-size-2xs-switch-padding'?: string;
  readonly 'checkable-size-2xs-switch-thumb-size'?: string;
  readonly 'checkable-size-2xs-switch-translate'?: string;
  readonly 'checkable-size-2xs-switch-width'?: string;
  readonly 'checkable-size-lg-switch-height'?: string;
  readonly 'checkable-size-lg-switch-padding'?: string;
  readonly 'checkable-size-lg-switch-thumb-size'?: string;
  readonly 'checkable-size-lg-switch-translate'?: string;
  readonly 'checkable-size-lg-switch-width'?: string;
  readonly 'checkable-size-md-switch-height'?: string;
  readonly 'checkable-size-md-switch-padding'?: string;
  readonly 'checkable-size-md-switch-thumb-size'?: string;
  readonly 'checkable-size-md-switch-translate'?: string;
  readonly 'checkable-size-md-switch-width'?: string;
  readonly 'checkable-size-sm-switch-height'?: string;
  readonly 'checkable-size-sm-switch-padding'?: string;
  readonly 'checkable-size-sm-switch-thumb-size'?: string;
  readonly 'checkable-size-sm-switch-translate'?: string;
  readonly 'checkable-size-sm-switch-width'?: string;
  readonly 'checkable-size-xl-switch-height'?: string;
  readonly 'checkable-size-xl-switch-padding'?: string;
  readonly 'checkable-size-xl-switch-thumb-size'?: string;
  readonly 'checkable-size-xl-switch-translate'?: string;
  readonly 'checkable-size-xl-switch-width'?: string;
  readonly 'checkable-size-xs-switch-height'?: string;
  readonly 'checkable-size-xs-switch-padding'?: string;
  readonly 'checkable-size-xs-switch-thumb-size'?: string;
  readonly 'checkable-size-xs-switch-translate'?: string;
  readonly 'checkable-size-xs-switch-width'?: string;
  readonly 'checkable-thumb-on-track'?: string;
  readonly 'checkable-track-selected'?: string;
  readonly 'checkable-track-unselected'?: string;
  readonly 'checkable-transition-easing'?: string;
  readonly 'checkable-transition-switch-duration'?: string;
  readonly 'field-error'?: string;
}

export type SwitchStyle = CSSStyleProperties & {
  readonly '--forge-switch-checkable-border-focus-visible'?: string | undefined;
  readonly '--forge-switch-checkable-border-invalid'?: string | undefined;
  readonly '--forge-switch-checkable-border-width-focus'?: string | undefined;
  readonly '--forge-switch-checkable-border-width-invalid'?: string | undefined;
  readonly '--forge-switch-checkable-circle-radius'?: string | undefined;
  readonly '--forge-switch-checkable-gap-inline'?: string | undefined;
  readonly '--forge-switch-checkable-gap-stack'?: string | undefined;
  readonly '--forge-switch-checkable-opacity-disabled'?: string | undefined;
  readonly '--forge-switch-checkable-shadow'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xl-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xl-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xl-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xl-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xl-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xs-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xs-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xs-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xs-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-2xs-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-size-lg-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-lg-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-lg-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-lg-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-lg-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-size-md-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-md-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-md-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-md-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-md-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-size-sm-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-sm-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-sm-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-sm-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-sm-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-size-xl-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-xl-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-xl-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-xl-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-xl-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-size-xs-switch-height'?: string | undefined;
  readonly '--forge-switch-checkable-size-xs-switch-padding'?: string | undefined;
  readonly '--forge-switch-checkable-size-xs-switch-thumb-size'?: string | undefined;
  readonly '--forge-switch-checkable-size-xs-switch-translate'?: string | undefined;
  readonly '--forge-switch-checkable-size-xs-switch-width'?: string | undefined;
  readonly '--forge-switch-checkable-thumb-on-track'?: string | undefined;
  readonly '--forge-switch-checkable-track-selected'?: string | undefined;
  readonly '--forge-switch-checkable-track-unselected'?: string | undefined;
  readonly '--forge-switch-checkable-transition-easing'?: string | undefined;
  readonly '--forge-switch-checkable-transition-switch-duration'?: string | undefined;
  readonly '--forge-switch-field-error'?: string | undefined;
};

function createSwitchStyle(properties: Readonly<SwitchStyleProperties> | undefined): SwitchStyle | undefined {
  return createForgeStyle({
    '--forge-switch-checkable-border-focus-visible': properties?.['checkable-border-focus-visible'],
    '--forge-switch-checkable-border-invalid': properties?.['checkable-border-invalid'],
    '--forge-switch-checkable-border-width-focus': properties?.['checkable-border-width-focus'],
    '--forge-switch-checkable-border-width-invalid': properties?.['checkable-border-width-invalid'],
    '--forge-switch-checkable-circle-radius': properties?.['checkable-circle-radius'],
    '--forge-switch-checkable-gap-inline': properties?.['checkable-gap-inline'],
    '--forge-switch-checkable-gap-stack': properties?.['checkable-gap-stack'],
    '--forge-switch-checkable-opacity-disabled': properties?.['checkable-opacity-disabled'],
    '--forge-switch-checkable-shadow': properties?.['checkable-shadow'],
    '--forge-switch-checkable-size-2xl-switch-height': properties?.['checkable-size-2xl-switch-height'],
    '--forge-switch-checkable-size-2xl-switch-padding': properties?.['checkable-size-2xl-switch-padding'],
    '--forge-switch-checkable-size-2xl-switch-thumb-size': properties?.['checkable-size-2xl-switch-thumb-size'],
    '--forge-switch-checkable-size-2xl-switch-translate': properties?.['checkable-size-2xl-switch-translate'],
    '--forge-switch-checkable-size-2xl-switch-width': properties?.['checkable-size-2xl-switch-width'],
    '--forge-switch-checkable-size-2xs-switch-height': properties?.['checkable-size-2xs-switch-height'],
    '--forge-switch-checkable-size-2xs-switch-padding': properties?.['checkable-size-2xs-switch-padding'],
    '--forge-switch-checkable-size-2xs-switch-thumb-size': properties?.['checkable-size-2xs-switch-thumb-size'],
    '--forge-switch-checkable-size-2xs-switch-translate': properties?.['checkable-size-2xs-switch-translate'],
    '--forge-switch-checkable-size-2xs-switch-width': properties?.['checkable-size-2xs-switch-width'],
    '--forge-switch-checkable-size-lg-switch-height': properties?.['checkable-size-lg-switch-height'],
    '--forge-switch-checkable-size-lg-switch-padding': properties?.['checkable-size-lg-switch-padding'],
    '--forge-switch-checkable-size-lg-switch-thumb-size': properties?.['checkable-size-lg-switch-thumb-size'],
    '--forge-switch-checkable-size-lg-switch-translate': properties?.['checkable-size-lg-switch-translate'],
    '--forge-switch-checkable-size-lg-switch-width': properties?.['checkable-size-lg-switch-width'],
    '--forge-switch-checkable-size-md-switch-height': properties?.['checkable-size-md-switch-height'],
    '--forge-switch-checkable-size-md-switch-padding': properties?.['checkable-size-md-switch-padding'],
    '--forge-switch-checkable-size-md-switch-thumb-size': properties?.['checkable-size-md-switch-thumb-size'],
    '--forge-switch-checkable-size-md-switch-translate': properties?.['checkable-size-md-switch-translate'],
    '--forge-switch-checkable-size-md-switch-width': properties?.['checkable-size-md-switch-width'],
    '--forge-switch-checkable-size-sm-switch-height': properties?.['checkable-size-sm-switch-height'],
    '--forge-switch-checkable-size-sm-switch-padding': properties?.['checkable-size-sm-switch-padding'],
    '--forge-switch-checkable-size-sm-switch-thumb-size': properties?.['checkable-size-sm-switch-thumb-size'],
    '--forge-switch-checkable-size-sm-switch-translate': properties?.['checkable-size-sm-switch-translate'],
    '--forge-switch-checkable-size-sm-switch-width': properties?.['checkable-size-sm-switch-width'],
    '--forge-switch-checkable-size-xl-switch-height': properties?.['checkable-size-xl-switch-height'],
    '--forge-switch-checkable-size-xl-switch-padding': properties?.['checkable-size-xl-switch-padding'],
    '--forge-switch-checkable-size-xl-switch-thumb-size': properties?.['checkable-size-xl-switch-thumb-size'],
    '--forge-switch-checkable-size-xl-switch-translate': properties?.['checkable-size-xl-switch-translate'],
    '--forge-switch-checkable-size-xl-switch-width': properties?.['checkable-size-xl-switch-width'],
    '--forge-switch-checkable-size-xs-switch-height': properties?.['checkable-size-xs-switch-height'],
    '--forge-switch-checkable-size-xs-switch-padding': properties?.['checkable-size-xs-switch-padding'],
    '--forge-switch-checkable-size-xs-switch-thumb-size': properties?.['checkable-size-xs-switch-thumb-size'],
    '--forge-switch-checkable-size-xs-switch-translate': properties?.['checkable-size-xs-switch-translate'],
    '--forge-switch-checkable-size-xs-switch-width': properties?.['checkable-size-xs-switch-width'],
    '--forge-switch-checkable-thumb-on-track': properties?.['checkable-thumb-on-track'],
    '--forge-switch-checkable-track-selected': properties?.['checkable-track-selected'],
    '--forge-switch-checkable-track-unselected': properties?.['checkable-track-unselected'],
    '--forge-switch-checkable-transition-easing': properties?.['checkable-transition-easing'],
    '--forge-switch-checkable-transition-switch-duration': properties?.['checkable-transition-switch-duration'],
    '--forge-switch-field-error': properties?.['field-error'],
  }) as SwitchStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SwitchStyleProperties>;
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
  const style = createSwitchStyle(properties.properties);

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
      style={style}
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
