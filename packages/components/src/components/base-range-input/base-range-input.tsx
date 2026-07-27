import { h, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { beginPointerDrag, clamp } from '../pointer-drag';

import styles from './base-range-input.module.scss';

/** Size token controlling track / thumb dimensions — canonical 2xs → 2xl scale. */
export type RangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The selected `[lower, upper]` bounds. */
export type RangeValue = [number, number];

/** Identifies which thumb is being manipulated. */
type Thumb = 'min' | 'max';

export interface RangeInputProperties extends MpProperties {
  /**
   * Current `[lower, upper]` selection (controlled via `modelValue`). Defaults to `[0, 100]`.
   * @model onUpdateModelValue
   */
  modelValue?: RangeValue;
  /** Minimum selectable value. Defaults to `0`. */
  min?: number;
  /** Maximum selectable value. Defaults to `100`. */
  max?: number;
  /** Step increment. Defaults to `1`. */
  step?: number;
  /** Minimum gap enforced between the two thumbs. Defaults to `0`. */
  minDistance?: number;
  /** Disable interaction. */
  disabled?: boolean;
  /** Show the current values above the thumbs. */
  showValue?: boolean;
  /** Track / thumb size. Defaults to `'md'`. */
  size?: RangeInputSize;
  /** Accessible label for the lower thumb. */
  ariaLabelMin?: string;
  /** Accessible label for the upper thumb. */
  ariaLabelMax?: string;
  /** Formats a value for display and `aria-valuetext`. */
  formatValue?: (value: number) => string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: RangeValue) => void;
  /** Fired when the user finishes changing a value (native `change`). */
  onChange?: (value: RangeValue) => void;
}

/**
 * `BaseRangeInput` — a dual-thumb min/max range selector authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Lets the user pick a lower and upper bound within a continuous (or stepped)
 * range by dragging either thumb or using the keyboard, mirroring the original
 * `@mission-platform/components` SFC: the selection is controlled via
 * `modelValue` as a `[lower, upper]` tuple, the two values are kept ordered and
 * never cross (with an optional `minDistance`), and each thumb exposes
 * `role="slider"` with `aria-valuemin`/`aria-valuemax` reflecting the bounds it
 * may move within. It owns its styling through the co-located CSS Module
 * `base-range-input.module.scss`.
 *
 * The pointer drag — `pointerdown` on a thumb (or the track, which grabs the
 * nearest thumb), then `pointermove`/`pointerup` tracked on `window` — is shared
 * with the other interaction components via the co-located `pointer-drag`
 * helper; the original Composition-API `ref`s become `useRef`s and the
 * `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback
 * props.
 */
export function BaseRangeInput(properties: Readonly<RangeInputProperties>): MpElement {
  const {
    modelValue = [0, 100],
    min = 0,
    max = 100,
    step = 1,
    minDistance = 0,
    disabled = false,
    showValue = false,
    size = 'md',
    ariaLabelMin,
    ariaLabelMax,
    formatValue,
  } = properties;

  const trackReference = useRef<HTMLElement | null>(null);
  const draggingReference = useRef<Thumb | undefined>(undefined);

  const clampBounds = (value: number): number => clamp(value, min, max);

  const lower = clampBounds(Math.min(modelValue[0], modelValue[1]));
  const upper = clampBounds(Math.max(modelValue[0], modelValue[1]));

  // The most recent committed range, so the drag-end `change` emit reports the
  // final values rather than the stale ones captured when the gesture started.
  const latestRangeReference = useRef<RangeValue>([lower, upper]);
  latestRangeReference.current = [lower, upper];

  const span = max - min;
  const toPercent = (value: number): number => (span <= 0 ? 0 : ((value - min) / span) * 100);
  const lowerPercent = toPercent(lower);
  const upperPercent = toPercent(upper);

  const format = (value: number): string => (formatValue ? formatValue(value) : String(value));
  const displayLower = format(lower);
  const displayUpper = format(upper);

  const roundToStep = (value: number): number => {
    if (step <= 0) {
      return clampBounds(value);
    }
    const steps = Math.round((value - min) / step);
    return clampBounds(min + steps * step);
  };

  const setThumb = (thumb: Thumb, rawValue: number, withChange = false): void => {
    const value = roundToStep(rawValue);
    const next: RangeValue =
      thumb === 'min' ? [Math.min(value, upper - minDistance), upper] : [lower, Math.max(value, lower + minDistance)];
    const clamped: RangeValue = [clampBounds(next[0]), clampBounds(next[1])];
    latestRangeReference.current = clamped;
    if (clamped[0] !== modelValue[0] || clamped[1] !== modelValue[1]) {
      properties.onUpdateModelValue?.(clamped);
    }
    if (withChange) {
      properties.onChange?.(clamped);
    }
  };

  const valueFromClientX = (clientX: number): number => {
    const element = trackReference.current;
    if (!element) {
      return lower;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) {
      return lower;
    }
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + ratio * (max - min);
  };

  /** Picks the thumb closest to the pointer (favouring the lower thumb on ties). */
  const nearestThumb = (value: number): Thumb => (Math.abs(value - lower) <= Math.abs(value - upper) ? 'min' : 'max');

  const startDrag = (thumb: Thumb): void => {
    draggingReference.current = thumb;
    beginPointerDrag({
      onMove: (move) => {
        const active = draggingReference.current;
        if (active) {
          setThumb(active, valueFromClientX(move.clientX));
        }
      },
      onEnd: () => {
        draggingReference.current = undefined;
        properties.onChange?.(latestRangeReference.current);
      },
    });
  };

  const handleTrackPointerDown = (event: PointerEvent): void => {
    if (disabled) {
      return;
    }
    const value = valueFromClientX(event.clientX);
    const thumb = nearestThumb(value);
    setThumb(thumb, value);
    startDrag(thumb);
  };

  const handleThumbPointerDown =
    (thumb: Thumb) =>
    (event: PointerEvent): void => {
      if (disabled) {
        return;
      }
      event.stopPropagation();
      startDrag(thumb);
    };

  const handleKeydown =
    (thumb: Thumb) =>
    (event: KeyboardEvent): void => {
      if (disabled) {
        return;
      }
      const big = step * 10;
      const current = thumb === 'min' ? lower : upper;
      let next: number;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp': {
          next = current + step;
          break;
        }
        case 'ArrowLeft':
        case 'ArrowDown': {
          next = current - step;
          break;
        }
        case 'PageUp': {
          next = current + big;
          break;
        }
        case 'PageDown': {
          next = current - big;
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
      setThumb(thumb, next, true);
    };

  return (
    <div
      className={[
        styles['base-range-input'],
        styles[`base-range-input--${size}`],
        {
          [styles['base-range-input--disabled']]: disabled,
        },
      ]}
    >
      <div
        ref={trackReference}
        className={styles['base-range-input__track']}
        onPointerdown={handleTrackPointerDown}
      >
        <div
          className={styles['base-range-input__fill']}
          style={{ left: `${lowerPercent}%`, right: `${100 - upperPercent}%` }}
        />
        <div
          aria-disabled={disabled || undefined}
          aria-label={ariaLabelMin ?? 'Minimum'}
          aria-valuemax={upper}
          aria-valuemin={min}
          aria-valuenow={lower}
          aria-valuetext={formatValue ? displayLower : undefined}
          className={[styles['base-range-input__thumb'], styles['base-range-input__thumb--min']]}
          role="slider"
          style={{ left: `${lowerPercent}%` }}
          tabindex={disabled ? -1 : 0}
          onKeydown={handleKeydown('min')}
          onPointerdown={handleThumbPointerDown('min')}
        >
          {showValue ? <span className={styles['base-range-input__value']}>{displayLower}</span> : undefined}
        </div>
        <div
          aria-disabled={disabled || undefined}
          aria-label={ariaLabelMax ?? 'Maximum'}
          aria-valuemax={max}
          aria-valuemin={lower}
          aria-valuenow={upper}
          aria-valuetext={formatValue ? displayUpper : undefined}
          className={[styles['base-range-input__thumb'], styles['base-range-input__thumb--max']]}
          role="slider"
          style={{ left: `${upperPercent}%` }}
          tabindex={disabled ? -1 : 0}
          onKeydown={handleKeydown('max')}
          onPointerdown={handleThumbPointerDown('max')}
        >
          {showValue ? <span className={styles['base-range-input__value']}>{displayUpper}</span> : undefined}
        </div>
      </div>
    </div>
  );
}
