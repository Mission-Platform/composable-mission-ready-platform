import { h, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { beginPointerDrag, clamp } from '../pointer-drag';

import styles from './base-slider.module.scss';

/** Size token controlling the track / thumb dimensions — canonical 2xs → 2xl scale. */
export type SliderSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SliderProperties extends MpProperties {
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
}

/**
 * `BaseSlider` — range slider authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * Lets the user pick a numeric value from a continuous (or stepped) range by
 * dragging a thumb along a track or using the keyboard, mirroring the original
 * `@mission-platform/components` SFC: the thumb exposes `role="slider"` with
 * `aria-valuemin`/`aria-valuemax`/`aria-valuenow` (and an optional
 * `aria-valuetext`), and supports Arrow keys (± step), Page Up/Down (± 10
 * steps), and Home/End. It owns its styling through the co-located CSS Module
 * `base-slider.module.scss`.
 *
 * The pointer drag — `pointerdown` on the track, then `pointermove`/`pointerup`
 * tracked on `window` — is shared with the other interaction components via the
 * co-located `pointer-drag` helper; the original Composition-API `ref`s become
 * `useRef`s and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseSlider(properties: Readonly<SliderProperties>): MpElement {
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

  const trackReference = useRef<HTMLElement | null>(null);
  // The most recent committed value, so the drag-end `change` emit reports the
  // final value rather than the stale one captured when the gesture started.
  const latestValueReference = useRef<number>(clamp(modelValue, min, max));

  const clampedValue = clamp(modelValue, min, max);
  latestValueReference.current = clampedValue;

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
      classNames={[
        styles['base-slider'],
        styles[`base-slider--${size}`],
        {
          [styles['base-slider--disabled']]: disabled,
        },
      ]}
    >
      <div
        ref={trackReference}
        classNames={styles['base-slider__track']}
        onPointerdown={handlePointerDown}
      >
        <div
          classNames={styles['base-slider__fill']}
          style={{ width: `${percent}%` }}
        />
        <div
          aria-disabled={disabled || undefined}
          aria-label={ariaLabel}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={clampedValue}
          aria-valuetext={formatValue ? displayValue : undefined}
          classNames={styles['base-slider__thumb']}
          role="slider"
          style={{ left: `${percent}%` }}
          tabindex={disabled ? -1 : 0}
          onKeydown={handleKeydown}
        >
          {showValue ? <span classNames={styles['base-slider__value']}>{displayValue}</span> : undefined}
        </div>
      </div>
    </div>
  );
}
