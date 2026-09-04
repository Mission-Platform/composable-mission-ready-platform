import { createForgeStyle, type MpChild, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-radio.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type RadioSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface RadioStyleProperties {
  readonly 'checkable-border-default'?: string;
  readonly 'checkable-border-focus-visible'?: string;
  readonly 'checkable-border-selected'?: string;
  readonly 'checkable-border-width-default'?: string;
  readonly 'checkable-border-width-focus'?: string;
  readonly 'checkable-circle-radius'?: string;
  readonly 'checkable-control-size'?: string;
  readonly 'checkable-gap-inline'?: string;
  readonly 'checkable-indicator-size'?: string;
  readonly 'checkable-opacity-disabled'?: string;
  readonly 'checkable-track-default'?: string;
  readonly 'checkable-track-selected'?: string;
  readonly 'checkable-transition-duration'?: string;
  readonly 'checkable-transition-easing'?: string;
}

export type RadioStyle = CSSStyleProperties & {
  readonly '--forge-radio-checkable-border-default'?: string | undefined;
  readonly '--forge-radio-checkable-border-focus-visible'?: string | undefined;
  readonly '--forge-radio-checkable-border-selected'?: string | undefined;
  readonly '--forge-radio-checkable-border-width-default'?: string | undefined;
  readonly '--forge-radio-checkable-border-width-focus'?: string | undefined;
  readonly '--forge-radio-checkable-circle-radius'?: string | undefined;
  readonly '--forge-radio-checkable-control-size'?: string | undefined;
  readonly '--forge-radio-checkable-gap-inline'?: string | undefined;
  readonly '--forge-radio-checkable-indicator-size'?: string | undefined;
  readonly '--forge-radio-checkable-opacity-disabled'?: string | undefined;
  readonly '--forge-radio-checkable-track-default'?: string | undefined;
  readonly '--forge-radio-checkable-track-selected'?: string | undefined;
  readonly '--forge-radio-checkable-transition-duration'?: string | undefined;
  readonly '--forge-radio-checkable-transition-easing'?: string | undefined;
};

function createRadioStyle(properties: Readonly<RadioStyleProperties> | undefined): RadioStyle | undefined {
  return createForgeStyle({
    '--forge-radio-checkable-border-default': properties?.['checkable-border-default'],
    '--forge-radio-checkable-border-focus-visible': properties?.['checkable-border-focus-visible'],
    '--forge-radio-checkable-border-selected': properties?.['checkable-border-selected'],
    '--forge-radio-checkable-border-width-default': properties?.['checkable-border-width-default'],
    '--forge-radio-checkable-border-width-focus': properties?.['checkable-border-width-focus'],
    '--forge-radio-checkable-circle-radius': properties?.['checkable-circle-radius'],
    '--forge-radio-checkable-control-size': properties?.['checkable-control-size'],
    '--forge-radio-checkable-gap-inline': properties?.['checkable-gap-inline'],
    '--forge-radio-checkable-indicator-size': properties?.['checkable-indicator-size'],
    '--forge-radio-checkable-opacity-disabled': properties?.['checkable-opacity-disabled'],
    '--forge-radio-checkable-track-default': properties?.['checkable-track-default'],
    '--forge-radio-checkable-track-selected': properties?.['checkable-track-selected'],
    '--forge-radio-checkable-transition-duration': properties?.['checkable-transition-duration'],
    '--forge-radio-checkable-transition-easing': properties?.['checkable-transition-easing'],
  }) as RadioStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface RadioProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<RadioStyleProperties>;
}

/**
 * `ForgeRadio` — radio control authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A single radio is selected when its `value` equals the group's `modelValue`.
 * It owns its styling through the co-located CSS Module `forge-radio.module.scss`
 * (the selected dot is a pure CSS `::after`) and composes the neutral
 * {@link ForgeTypography} for the label text; any default-slot content renders
 * after the label.
 *
 * The original Vue SFC's `v-model` + `change` emit become the established
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeRadio(properties: Readonly<RadioProperties>): MpElement {
  const style = createRadioStyle(properties.properties);

  const { modelValue, value, label, labelHidden = false, disabled = false, size = 'md' } = properties;

  const isChecked = modelValue === value;

  const handleChange = (event: Event): void => {
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(event);
  };

  return (
    <label
      className={[
        styles['forge-radio'],
        size ? `forge-size--${size}` : undefined,
        {
          [styles['forge-radio--checked']]: isChecked,
          [styles['forge-radio--disabled']]: disabled,
        },
      ]}
      style={style}
    >
      <span className={styles['forge-radio__control-wrapper']}>
        <input
          id={properties.id}
          checked={isChecked}
          className={styles['forge-radio__input']}
          disabled={disabled}
          type="radio"
          value={value}
          onChange={handleChange}
        />
        <span
          aria-hidden="true"
          className={styles['forge-radio__circle']}
        />
      </span>
      {label ? (
        <span
          className={[
            styles['forge-radio__label'],
            {
              [styles['forge-radio__label--hidden']]: labelHidden,
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
        </span>
      ) : undefined}
      {properties.children ? <span className={styles['forge-radio__slot']}>{properties.children}</span> : undefined}
    </label>
  );
}
