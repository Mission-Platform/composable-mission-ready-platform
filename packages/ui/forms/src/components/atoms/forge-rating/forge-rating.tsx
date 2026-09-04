import { useState, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';
import { ForgeIconStar } from '@mission-platform/icons';

import styles from './forge-rating.module.scss';

/** Size token controlling the star dimensions — canonical 2xs → 2xl scale. */
export type RatingSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface RatingStyleProperties {
  readonly 'checkable-focus-ring'?: string;
  readonly 'checkable-gap-stack'?: string;
  readonly 'checkable-opacity-disabled'?: string;
  readonly 'checkable-radius'?: string;
  readonly 'checkable-rating-empty'?: string;
  readonly 'checkable-rating-filled'?: string;
  readonly 'checkable-size-2xl-rating-font-size'?: string;
  readonly 'checkable-size-2xs-rating-font-size'?: string;
  readonly 'checkable-size-lg-rating-font-size'?: string;
  readonly 'checkable-size-md-rating-font-size'?: string;
  readonly 'checkable-size-sm-rating-font-size'?: string;
  readonly 'checkable-size-xl-rating-font-size'?: string;
  readonly 'checkable-size-xs-rating-font-size'?: string;
}

export type RatingStyle = CSSStyleProperties & {
  readonly '--forge-rating-checkable-focus-ring'?: string | undefined;
  readonly '--forge-rating-checkable-gap-stack'?: string | undefined;
  readonly '--forge-rating-checkable-opacity-disabled'?: string | undefined;
  readonly '--forge-rating-checkable-radius'?: string | undefined;
  readonly '--forge-rating-checkable-rating-empty'?: string | undefined;
  readonly '--forge-rating-checkable-rating-filled'?: string | undefined;
  readonly '--forge-rating-checkable-size-2xl-rating-font-size'?: string | undefined;
  readonly '--forge-rating-checkable-size-2xs-rating-font-size'?: string | undefined;
  readonly '--forge-rating-checkable-size-lg-rating-font-size'?: string | undefined;
  readonly '--forge-rating-checkable-size-md-rating-font-size'?: string | undefined;
  readonly '--forge-rating-checkable-size-sm-rating-font-size'?: string | undefined;
  readonly '--forge-rating-checkable-size-xl-rating-font-size'?: string | undefined;
  readonly '--forge-rating-checkable-size-xs-rating-font-size'?: string | undefined;
};

function createRatingStyle(properties: Readonly<RatingStyleProperties> | undefined): RatingStyle | undefined {
  return createForgeStyle({
    '--forge-rating-checkable-focus-ring': properties?.['checkable-focus-ring'],
    '--forge-rating-checkable-gap-stack': properties?.['checkable-gap-stack'],
    '--forge-rating-checkable-opacity-disabled': properties?.['checkable-opacity-disabled'],
    '--forge-rating-checkable-radius': properties?.['checkable-radius'],
    '--forge-rating-checkable-rating-empty': properties?.['checkable-rating-empty'],
    '--forge-rating-checkable-rating-filled': properties?.['checkable-rating-filled'],
    '--forge-rating-checkable-size-2xl-rating-font-size': properties?.['checkable-size-2xl-rating-font-size'],
    '--forge-rating-checkable-size-2xs-rating-font-size': properties?.['checkable-size-2xs-rating-font-size'],
    '--forge-rating-checkable-size-lg-rating-font-size': properties?.['checkable-size-lg-rating-font-size'],
    '--forge-rating-checkable-size-md-rating-font-size': properties?.['checkable-size-md-rating-font-size'],
    '--forge-rating-checkable-size-sm-rating-font-size': properties?.['checkable-size-sm-rating-font-size'],
    '--forge-rating-checkable-size-xl-rating-font-size': properties?.['checkable-size-xl-rating-font-size'],
    '--forge-rating-checkable-size-xs-rating-font-size': properties?.['checkable-size-xs-rating-font-size'],
  }) as RatingStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface RatingProperties {
  /**
   * Current rating value (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<RatingStyleProperties>;
}

/**
 * `ForgeRating` — star rating input/display authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Renders a row of stars representing a value from `0` to `max`, with optional
 * half-star precision, a read-only display mode, hover preview, and keyboard
 * control (`role="slider"` when interactive, `role="img"` when read-only). It
 * owns its styling through the co-located CSS Module `forge-rating.module.scss`.
 *
 * Substitutions from the original Vue SFC: the stars are the write-once
 * `@mission-platform/icons` `ForgeIconStar` (the empty layer tinted via CSS, the fill
 * layer clipped by width, both scaled to the row's `1em`); the hover preview
 * uses the neutral `useState` hook; and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeRating(properties: Readonly<RatingProperties>): MpElement {
  const style = createRatingStyle(properties.properties);

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
      className={styles['forge-rating__star']}
    >
      <span className={[styles['forge-rating__icon'], styles['forge-rating__icon--empty']]}>
        <ForgeIconStar />
      </span>
      <span
        className={styles['forge-rating__fill']}
        style={{ width: `${fillFor(star)}%` }}
      >
        <span className={[styles['forge-rating__icon'], styles['forge-rating__icon--filled']]}>
          <ForgeIconStar />
        </span>
      </span>
      {interactive && allowHalf ? (
        <span
          aria-hidden="true"
          className={[styles['forge-rating__hit'], styles['forge-rating__hit--half']]}
          onClick={() => onStarClick(star, true)}
          onMousemove={() => onStarHover(star, true)}
        />
      ) : undefined}
      {interactive ? (
        <span
          aria-hidden="true"
          className={[styles['forge-rating__hit'], styles['forge-rating__hit--full']]}
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
      className={[styles['forge-rating'], styles[`forge-rating--${size}`]]}
      role="slider"
      tabindex={0}
      onBlur={clearHover}
      onKeydown={onKeydown}
      onMouseleave={clearHover}
      style={style}
    >
      {starItems}
    </div>
  ) : (
    <div
      aria-label={`${ariaLabel}: ${valueText}`}
      className={[
        styles['forge-rating'],
        styles[`forge-rating--${size}`],
        {
          [styles['forge-rating--disabled']]: disabled,
        },
      ]}
      role="img"
      style={style}
    >
      {starItems}
    </div>
  );
}
