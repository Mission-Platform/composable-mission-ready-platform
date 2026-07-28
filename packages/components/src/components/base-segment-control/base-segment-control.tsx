import { classNames, h, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './base-segment-control.module.scss';

/** Size token controlling segment dimensions — canonical 2xs → 2xl scale. */
export type SegmentControlSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single selectable segment. */
export interface SegmentOption {
  /** Display label. */
  label: string;
  /** Value emitted when the segment is selected. */
  value: string | number;
  /** Disable this individual segment. */
  disabled?: boolean;
}

export interface SegmentControlProperties extends MpProperties {
  /**
   * Selected value (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string | number;
  /** The selectable segments. */
  options: SegmentOption[];
  /** Segment size. Defaults to `'md'`. */
  size?: SegmentControlSize;
  /** Disable the whole control. */
  disabled?: boolean;
  /** Stretch segments to fill the available width equally. */
  fullWidth?: boolean;
  /** Accessible label for the group. */
  ariaLabel?: string;
  /** Fired when the selected value changes (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string | number) => void;
  /** Fired when the selected value changes via user interaction. */
  onChange?: (value: string | number) => void;
}

/**
 * `BaseSegmentControl` — segmented control (single-select switcher) authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It presents a small set of mutually exclusive options as a joined row of
 * segments. The selected value is **controlled** via `modelValue`. It exposes
 * `role="radiogroup"`/`role="radio"`, implements roving `tabindex` plus
 * arrow-key navigation (Left/Up, Right/Down, Home/End), and owns its styling
 * through the co-located CSS Module `base-segment-control.module.scss`.
 *
 * The original Vue SFC collected per-segment template refs into an array; the
 * neutral version keeps a single container ref and locates the segment buttons
 * with `querySelectorAll` for focus management (the cross-framework hooks model
 * single element refs, not ref arrays). The `v-model` + `change` emit become the
 * established `onUpdateModelValue`/`onChange` callback props.
 */
export function BaseSegmentControl(properties: Readonly<SegmentControlProperties>): MpElement {
  const { modelValue, options, size = 'md', disabled = false, fullWidth = false, ariaLabel } = properties;

  const containerReference = useRef<HTMLElement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === modelValue);
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);

  const isSelected = (option: SegmentOption): boolean => option.value === modelValue;

  const isFocusable = (option: SegmentOption, index: number): boolean => {
    if (option.disabled) {
      return false;
    }
    return selectedIndex === -1 ? index === firstEnabledIndex : index === selectedIndex;
  };

  const select = (option: SegmentOption): void => {
    if (disabled || option.disabled || option.value === modelValue) {
      return;
    }
    properties.onUpdateModelValue?.(option.value);
    properties.onChange?.(option.value);
  };

  const focusIndex = (index: number): void => {
    const segments = containerReference.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    segments?.[index]?.focus();
  };

  const moveFocus = (from: number, direction: 1 | -1): void => {
    const count = options.length;
    let next = from;
    for (let step = 0; step < count; step += 1) {
      next = (next + direction + count) % count;
      if (!options[next]?.disabled) {
        select(options[next]);
        focusIndex(next);
        return;
      }
    }
  };

  const onKeydown = (event: KeyboardEvent, index: number): void => {
    if (disabled) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        moveFocus(index, 1);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        moveFocus(index, -1);
        break;
      }
      case 'Home': {
        event.preventDefault();
        if (firstEnabledIndex !== -1) {
          select(options[firstEnabledIndex]);
          focusIndex(firstEnabledIndex);
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        for (let index_ = options.length - 1; index_ >= 0; index_ -= 1) {
          if (!options[index_].disabled) {
            select(options[index_]);
            focusIndex(index_);
            break;
          }
        }
        break;
      }
      default: {
        break;
      }
    }
  };

  const containerClass = classNames(styles['base-segment-control'], styles[`base-segment-control--${size}`], {
    [styles['base-segment-control--full-width']]: fullWidth,
    [styles['base-segment-control--disabled']]: disabled,
  });

  return (
    <div
      ref={containerReference}
      aria-label={ariaLabel}
      className={containerClass}
      role="radiogroup"
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          aria-checked={isSelected(option)}
          className={[
            styles['base-segment-control__segment'],
            {
              [styles['base-segment-control__segment--selected']]: isSelected(option),
            },
          ]}
          disabled={disabled || option.disabled}
          tabindex={isFocusable(option, index) ? 0 : -1}
          role="radio"
          type="button"
          onClick={() => select(option)}
          onKeydown={(event: KeyboardEvent) => onKeydown(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
