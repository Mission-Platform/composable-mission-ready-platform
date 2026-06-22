import { h, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './base-rating.module.scss';

/** Size token controlling the star dimensions — canonical 2xs → 2xl scale. */
export type RatingSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface RatingProperties extends MpProperties {
  /** Current rating value (controlled via `modelValue` + `onUpdateModelValue`). */
  modelValue?: number;
  /** Maximum number of stars. Defaults to `5`. */
  max?: number;
  /** Allow half-star precision. */
  allowHalf?: boolean;
  /** Display-only — not interactive, no focus, no hover. */
  readonly?: boolean;
  /** Disable interaction and dim the control. */
  disabled?: boolean;
  /** Clicking the current value again resets it to `0`. */
  clearable?: boolean;
  /** Star size. Defaults to `'md'`. */
  size?: RatingSize;
  /** Accessible label. Defaults to `'Rating'`. */
  ariaLabel?: string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: number) => void;
  /** Fired when the value changes via user interaction. */
  onChange?: (value: number) => void;
}

/**
 * `BaseRating` — star rating input/display authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Renders a row of stars representing a value from `0` to `max`, with optional
 * half-star precision, a read-only display mode, hover preview, and keyboard
 * control (`role="slider"` when interactive, `role="img"` when read-only). It
 * owns its styling through the co-located CSS Module `base-rating.module.scss`.
 *
 * Substitutions from the original Vue SFC: the inline star SVGs become a `★`
 * text glyph (the empty layer tinted via CSS, the fill layer clipped by width);
 * the hover preview uses the neutral `useState` hook; and the `v-model` +
 * `change` emit become the `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseRating(properties: RatingProperties): MpElement {
  const {
    modelValue = 0,
    max = 5,
    allowHalf = false,
    readonly = false,
    disabled = false,
    clearable = false,
    size = 'md',
    ariaLabel = 'Rating',
  } = properties;

  // `-1` is the "no hover" sentinel (hover values are always >= 0.5), avoiding a
  // nullable state value.
  const [hoverValue, setHoverValue] = useState(-1);

  const interactive = !readonly && !disabled;
  const step = allowHalf ? 0.5 : 1;
  const displayValue = hoverValue >= 0 ? hoverValue : modelValue;
  const stars = Array.from({ length: max }, (_, index) => index + 1);
  const valueText = `${modelValue} out of ${max}`;

  const fillFor = (starIndex: number): number => {
    const filled = displayValue - (starIndex - 1);
    if (filled <= 0) {
      return 0;
    }
    if (filled >= 1) {
      return 100;
    }
    return filled * 100;
  };

  const setValue = (value: number): void => {
    if (!interactive) {
      return;
    }
    const next = clearable && value === modelValue ? 0 : value;
    if (next === modelValue) {
      return;
    }
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
  };

  const onStarClick = (starIndex: number, half: boolean): void => {
    setValue(allowHalf && half ? starIndex - 0.5 : starIndex);
  };

  const onStarHover = (starIndex: number, half: boolean): void => {
    if (!interactive) {
      return;
    }
    setHoverValue(allowHalf && half ? starIndex - 0.5 : starIndex);
  };

  const clearHover = (): void => setHoverValue(-1);

  const onKeydown = (event: KeyboardEvent): void => {
    if (!interactive) {
      return;
    }
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp': {
        next = Math.min(max, modelValue + step);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowDown': {
        next = Math.max(0, modelValue - step);
        break;
      }
      case 'Home': {
        next = 0;
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
    if (next !== modelValue) {
      properties.onUpdateModelValue?.(next);
      properties.onChange?.(next);
    }
  };

  const starItems = stars.map((star) => (
    <span
      key={star}
      classNames={styles['base-rating__star']}
    >
      <span classNames={[styles['base-rating__icon'], styles['base-rating__icon--empty']]}>★</span>
      <span
        classNames={styles['base-rating__fill']}
        style={{ width: `${fillFor(star)}%` }}
      >
        <span classNames={[styles['base-rating__icon'], styles['base-rating__icon--filled']]}>★</span>
      </span>
      {interactive && allowHalf ? (
        <span
          aria-hidden="true"
          classNames={[styles['base-rating__hit'], styles['base-rating__hit--half']]}
          onClick={() => onStarClick(star, true)}
          onMousemove={() => onStarHover(star, true)}
        />
      ) : undefined}
      {interactive ? (
        <span
          aria-hidden="true"
          classNames={[styles['base-rating__hit'], styles['base-rating__hit--full']]}
          onClick={() => onStarClick(star, false)}
          onMousemove={() => onStarHover(star, false)}
        />
      ) : undefined}
    </span>
  ));

  return interactive ? (
    <div
      aria-label={ariaLabel}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={modelValue}
      aria-valuetext={valueText}
      classNames={[styles['base-rating'], styles[`base-rating--${size}`]]}
      role="slider"
      tabindex={0}
      onBlur={clearHover}
      onKeydown={onKeydown}
      onMouseleave={clearHover}
    >
      {starItems}
    </div>
  ) : (
    <div
      aria-label={`${ariaLabel}: ${valueText}`}
      classNames={[styles['base-rating'], styles[`base-rating--${size}`], {
        [styles['base-rating--disabled']]: disabled,
      }]}
      role="img"
    >
      {starItems}
    </div>
  );
}
