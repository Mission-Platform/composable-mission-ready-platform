import { useRef, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

import { beginPointerDrag, clamp } from '../../../utils/pointer-drag/pointer-drag';

import styles from './forge-slider.module.scss';

/** Size token controlling the track / thumb dimensions — canonical 2xs → 2xl scale. */
export type SliderSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SliderStyleProperties {
  readonly 'checkable-border-selected'?: string;
  readonly 'checkable-border-width-default'?: string;
  readonly 'checkable-circle-radius'?: string;
  readonly 'checkable-focus-ring'?: string;
  readonly 'checkable-font-family'?: string;
  readonly 'checkable-opacity-disabled'?: string;
  readonly 'checkable-size-2xl-thumb-size'?: string;
  readonly 'checkable-size-2xl-track-height'?: string;
  readonly 'checkable-size-2xs-thumb-size'?: string;
  readonly 'checkable-size-2xs-track-height'?: string;
  readonly 'checkable-size-lg-thumb-size'?: string;
  readonly 'checkable-size-lg-track-height'?: string;
  readonly 'checkable-size-md-thumb-size'?: string;
  readonly 'checkable-size-md-track-height'?: string;
  readonly 'checkable-size-sm-thumb-size'?: string;
  readonly 'checkable-size-sm-track-height'?: string;
  readonly 'checkable-size-xl-thumb-size'?: string;
  readonly 'checkable-size-xl-track-height'?: string;
  readonly 'checkable-size-xs-thumb-size'?: string;
  readonly 'checkable-size-xs-track-height'?: string;
  readonly 'checkable-thumb-default'?: string;
  readonly 'checkable-track-inactive'?: string;
  readonly 'checkable-track-selected'?: string;
  readonly 'checkable-value-background'?: string;
  readonly 'checkable-value-font-size'?: string;
  readonly 'checkable-value-offset'?: string;
  readonly 'checkable-value-padding-block'?: string;
  readonly 'checkable-value-padding-inline'?: string;
  readonly 'checkable-value-radius'?: string;
  readonly 'checkable-value-text'?: string;
  readonly 'thumb-size'?: string;
  readonly 'track-height'?: string;
}

export type SliderStyle = CSSStyleProperties & {
  readonly '--forge-slider-checkable-border-selected'?: string | undefined;
  readonly '--forge-slider-checkable-border-width-default'?: string | undefined;
  readonly '--forge-slider-checkable-circle-radius'?: string | undefined;
  readonly '--forge-slider-checkable-focus-ring'?: string | undefined;
  readonly '--forge-slider-checkable-font-family'?: string | undefined;
  readonly '--forge-slider-checkable-opacity-disabled'?: string | undefined;
  readonly '--forge-slider-checkable-size-2xl-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-2xl-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-size-2xs-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-2xs-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-size-lg-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-lg-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-size-md-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-md-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-size-sm-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-sm-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-size-xl-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-xl-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-size-xs-thumb-size'?: string | undefined;
  readonly '--forge-slider-checkable-size-xs-track-height'?: string | undefined;
  readonly '--forge-slider-checkable-thumb-default'?: string | undefined;
  readonly '--forge-slider-checkable-track-inactive'?: string | undefined;
  readonly '--forge-slider-checkable-track-selected'?: string | undefined;
  readonly '--forge-slider-checkable-value-background'?: string | undefined;
  readonly '--forge-slider-checkable-value-font-size'?: string | undefined;
  readonly '--forge-slider-checkable-value-offset'?: string | undefined;
  readonly '--forge-slider-checkable-value-padding-block'?: string | undefined;
  readonly '--forge-slider-checkable-value-padding-inline'?: string | undefined;
  readonly '--forge-slider-checkable-value-radius'?: string | undefined;
  readonly '--forge-slider-checkable-value-text'?: string | undefined;
  readonly '--forge-slider-thumb-size'?: string | undefined;
  readonly '--forge-slider-track-height'?: string | undefined;
};

function createSliderStyle(properties: Readonly<SliderStyleProperties> | undefined): SliderStyle | undefined {
  return createForgeStyle({
    '--forge-slider-checkable-border-selected': properties?.['checkable-border-selected'],
    '--forge-slider-checkable-border-width-default': properties?.['checkable-border-width-default'],
    '--forge-slider-checkable-circle-radius': properties?.['checkable-circle-radius'],
    '--forge-slider-checkable-focus-ring': properties?.['checkable-focus-ring'],
    '--forge-slider-checkable-font-family': properties?.['checkable-font-family'],
    '--forge-slider-checkable-opacity-disabled': properties?.['checkable-opacity-disabled'],
    '--forge-slider-checkable-size-2xl-thumb-size': properties?.['checkable-size-2xl-thumb-size'],
    '--forge-slider-checkable-size-2xl-track-height': properties?.['checkable-size-2xl-track-height'],
    '--forge-slider-checkable-size-2xs-thumb-size': properties?.['checkable-size-2xs-thumb-size'],
    '--forge-slider-checkable-size-2xs-track-height': properties?.['checkable-size-2xs-track-height'],
    '--forge-slider-checkable-size-lg-thumb-size': properties?.['checkable-size-lg-thumb-size'],
    '--forge-slider-checkable-size-lg-track-height': properties?.['checkable-size-lg-track-height'],
    '--forge-slider-checkable-size-md-thumb-size': properties?.['checkable-size-md-thumb-size'],
    '--forge-slider-checkable-size-md-track-height': properties?.['checkable-size-md-track-height'],
    '--forge-slider-checkable-size-sm-thumb-size': properties?.['checkable-size-sm-thumb-size'],
    '--forge-slider-checkable-size-sm-track-height': properties?.['checkable-size-sm-track-height'],
    '--forge-slider-checkable-size-xl-thumb-size': properties?.['checkable-size-xl-thumb-size'],
    '--forge-slider-checkable-size-xl-track-height': properties?.['checkable-size-xl-track-height'],
    '--forge-slider-checkable-size-xs-thumb-size': properties?.['checkable-size-xs-thumb-size'],
    '--forge-slider-checkable-size-xs-track-height': properties?.['checkable-size-xs-track-height'],
    '--forge-slider-checkable-thumb-default': properties?.['checkable-thumb-default'],
    '--forge-slider-checkable-track-inactive': properties?.['checkable-track-inactive'],
    '--forge-slider-checkable-track-selected': properties?.['checkable-track-selected'],
    '--forge-slider-checkable-value-background': properties?.['checkable-value-background'],
    '--forge-slider-checkable-value-font-size': properties?.['checkable-value-font-size'],
    '--forge-slider-checkable-value-offset': properties?.['checkable-value-offset'],
    '--forge-slider-checkable-value-padding-block': properties?.['checkable-value-padding-block'],
    '--forge-slider-checkable-value-padding-inline': properties?.['checkable-value-padding-inline'],
    '--forge-slider-checkable-value-radius': properties?.['checkable-value-radius'],
    '--forge-slider-checkable-value-text': properties?.['checkable-value-text'],
    '--forge-slider-thumb-size': properties?.['thumb-size'],
    '--forge-slider-track-height': properties?.['track-height'],
  }) as SliderStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SliderProperties {
  /**
   * Current value (controlled via `modelValue` + `onUpdateModelValue`). Defaults to `0`.
   * @model onUpdateModelValue
   */
  modelValue?: number;
  /** Minimum value. Defaults to `0`. */
  min?: number;
  /** Maximum value. Defaults to `100`. */
  max?: number;
  /** Step increment. Defaults to `1`. */
  step?: number;
  /** Disable interaction. */
  disabled?: boolean;
  /** Show the current value above the thumb. */
  showValue?: boolean;
  /** Track / thumb size. Defaults to `'md'`. */
  size?: SliderSize;
  /** Accessible label for the slider. */
  ariaLabel?: string;
  /** Formats the value for display and `aria-valuetext`. */
  formatValue?: (value: number) => string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: number) => void;
  /** Fired when the user finishes changing the value (native `change`). */
  onChange?: (value: number) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SliderStyleProperties>;
}

/**
 * `ForgeSlider` — range slider authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Lets the user pick a numeric value from a continuous (or stepped) range by
 * dragging a thumb along a track or using the keyboard, mirroring the original
 * `@mission-platform/components` SFC: the thumb exposes `role="slider"` with
 * `aria-valuemin`/`aria-valuemax`/`aria-valuenow` (and an optional
 * `aria-valuetext`), and supports Arrow keys (± step), Page Up/Down (± 10
 * steps), and Home/End. It owns its styling through the co-located CSS Module
 * `forge-slider.module.scss`.
 *
 * The pointer drag — `pointerdown` on the track, then `pointermove`/`pointerup`
 * tracked on `window` — is shared with the other interaction components via the
 * co-located `pointer-drag` helper; the original Composition-API `ref`s become
 * `useRef`s and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeSlider(properties: Readonly<SliderProperties>): MpElement {
  const style = createSliderStyle(properties.properties);

  const {
    modelValue = 0,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    showValue = false,
    size = 'md',
    ariaLabel,
    formatValue,
  } = properties;

  const clampedValue = clamp(modelValue, min, max);
  const trackReference = useRef<HTMLElement | null>(null);
  // The most recent committed value, so the drag-end `change` emit reports the
  // final value rather than the stale one captured when the gesture started.
  const latestValueReference = useRef<number>(clamp(modelValue, min, max));

  latestValueReference.current = clamp(modelValue, min, max);

  const span = max - min;
  const percent = span <= 0 ? 0 : ((clampedValue - min) / span) * 100;
  const displayValue = formatValue ? formatValue(clampedValue) : String(clampedValue);

  const roundToStep = (value: number): number => {
    if (step <= 0) {
      return clamp(value, min, max);
    }
    const steps = Math.round((value - min) / step);
    return clamp(min + steps * step, min, max);
  };

  const setValue = (value: number, withChange = false): void => {
    const next = roundToStep(value);
    latestValueReference.current = next;
    if (next !== modelValue) {
      properties.onUpdateModelValue?.(next);
    }
    if (withChange) {
      properties.onChange?.(next);
    }
  };

  const valueFromClientX = (clientX: number): number => {
    const element = trackReference.current;
    if (!element) {
      return clampedValue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) {
      return clampedValue;
    }
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + ratio * (max - min);
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (disabled) {
      return;
    }
    setValue(valueFromClientX(event.clientX));
    beginPointerDrag({
      onMove: (move) => setValue(valueFromClientX(move.clientX)),
      onEnd: () => properties.onChange?.(latestValueReference.current),
    });
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (disabled) {
      return;
    }
    const big = step * 10;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp': {
        next = clampedValue + step;
        break;
      }
      case 'ArrowLeft':
      case 'ArrowDown': {
        next = clampedValue - step;
        break;
      }
      case 'PageUp': {
        next = clampedValue + big;
        break;
      }
      case 'PageDown': {
        next = clampedValue - big;
        break;
      }
      case 'Home': {
        next = min;
        break;
      }
      case 'End': {
        next = max;
        break;
      }
      default: {
        return;
      }
    }
    event.preventDefault();
    setValue(next, true);
  };

  return (
    <div
      className={[
        styles['forge-slider'],
        styles[`forge-slider--${size}`],
        {
          [styles['forge-slider--disabled']]: disabled,
        },
      ]}
      style={style}
    >
      <div
        ref={trackReference}
        className={styles['forge-slider__track']}
        onPointerdown={handlePointerDown}
      >
        <div
          className={styles['forge-slider__fill']}
          style={{ width: `${percent}%` }}
        />
        <div
          aria-disabled={disabled || undefined}
          aria-label={ariaLabel}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={clampedValue}
          aria-valuetext={formatValue ? displayValue : undefined}
          className={styles['forge-slider__thumb']}
          role="slider"
          style={{ left: `${percent}%` }}
          tabindex={disabled ? -1 : 0}
          onKeydown={handleKeydown}
        >
          {showValue ? <span className={styles['forge-slider__value']}>{displayValue}</span> : undefined}
        </div>
      </div>
    </div>
  );
}
