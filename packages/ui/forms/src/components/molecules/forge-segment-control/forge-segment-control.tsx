import {
  classNames,
  useRef,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-segment-control.module.scss';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SegmentControlStyleProperties {
  readonly 'input-focus-ring'?: string;
  readonly 'select-segment-border'?: string;
  readonly 'select-segment-border-width'?: string;
  readonly 'select-segment-disabled-opacity'?: string;
  readonly 'select-segment-font-family'?: string;
  readonly 'select-segment-font-weight'?: string;
  readonly 'select-segment-gap'?: string;
  readonly 'select-segment-padding'?: string;
  readonly 'select-segment-radius-container'?: string;
  readonly 'select-segment-radius-segment'?: string;
  readonly 'select-segment-shadow-selected'?: string;
  readonly 'select-segment-surface-default'?: string;
  readonly 'select-segment-surface-selected'?: string;
  readonly 'select-segment-text-default'?: string;
  readonly 'select-segment-text-hover'?: string;
  readonly 'select-segment-text-selected'?: string;
  readonly 'select-segment-transition-duration'?: string;
  readonly 'select-segment-transition-easing'?: string;
  readonly 'select-size-2xl-font-size'?: string;
  readonly 'select-size-2xl-padding-block'?: string;
  readonly 'select-size-2xl-padding-inline'?: string;
  readonly 'select-size-2xs-font-size'?: string;
  readonly 'select-size-2xs-padding-block'?: string;
  readonly 'select-size-2xs-padding-inline'?: string;
  readonly 'select-size-lg-font-size'?: string;
  readonly 'select-size-lg-padding-block'?: string;
  readonly 'select-size-lg-padding-inline'?: string;
  readonly 'select-size-md-font-size'?: string;
  readonly 'select-size-md-padding-block'?: string;
  readonly 'select-size-md-padding-inline'?: string;
  readonly 'select-size-sm-font-size'?: string;
  readonly 'select-size-sm-padding-block'?: string;
  readonly 'select-size-sm-padding-inline'?: string;
  readonly 'select-size-xl-font-size'?: string;
  readonly 'select-size-xl-padding-block'?: string;
  readonly 'select-size-xl-padding-inline'?: string;
  readonly 'select-size-xs-font-size'?: string;
  readonly 'select-size-xs-padding-block'?: string;
  readonly 'select-size-xs-padding-inline'?: string;
}

export type SegmentControlStyle = CSSStyleProperties & {
  readonly '--forge-segment-control-input-focus-ring'?: string | undefined;
  readonly '--forge-segment-control-select-segment-border'?: string | undefined;
  readonly '--forge-segment-control-select-segment-border-width'?: string | undefined;
  readonly '--forge-segment-control-select-segment-disabled-opacity'?: string | undefined;
  readonly '--forge-segment-control-select-segment-font-family'?: string | undefined;
  readonly '--forge-segment-control-select-segment-font-weight'?: string | undefined;
  readonly '--forge-segment-control-select-segment-gap'?: string | undefined;
  readonly '--forge-segment-control-select-segment-padding'?: string | undefined;
  readonly '--forge-segment-control-select-segment-radius-container'?: string | undefined;
  readonly '--forge-segment-control-select-segment-radius-segment'?: string | undefined;
  readonly '--forge-segment-control-select-segment-shadow-selected'?: string | undefined;
  readonly '--forge-segment-control-select-segment-surface-default'?: string | undefined;
  readonly '--forge-segment-control-select-segment-surface-selected'?: string | undefined;
  readonly '--forge-segment-control-select-segment-text-default'?: string | undefined;
  readonly '--forge-segment-control-select-segment-text-hover'?: string | undefined;
  readonly '--forge-segment-control-select-segment-text-selected'?: string | undefined;
  readonly '--forge-segment-control-select-segment-transition-duration'?: string | undefined;
  readonly '--forge-segment-control-select-segment-transition-easing'?: string | undefined;
  readonly '--forge-segment-control-select-size-2xl-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-segment-control-select-size-2xs-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-segment-control-select-size-lg-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-lg-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-segment-control-select-size-md-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-md-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-md-padding-inline'?: string | undefined;
  readonly '--forge-segment-control-select-size-sm-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-sm-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-segment-control-select-size-xl-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-xl-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-segment-control-select-size-xs-font-size'?: string | undefined;
  readonly '--forge-segment-control-select-size-xs-padding-block'?: string | undefined;
  readonly '--forge-segment-control-select-size-xs-padding-inline'?: string | undefined;
};

function createSegmentControlStyle(
  properties: Readonly<SegmentControlStyleProperties> | undefined,
): SegmentControlStyle | undefined {
  return createForgeStyle({
    '--forge-segment-control-input-focus-ring': properties?.['input-focus-ring'],
    '--forge-segment-control-select-segment-border': properties?.['select-segment-border'],
    '--forge-segment-control-select-segment-border-width': properties?.['select-segment-border-width'],
    '--forge-segment-control-select-segment-disabled-opacity': properties?.['select-segment-disabled-opacity'],
    '--forge-segment-control-select-segment-font-family': properties?.['select-segment-font-family'],
    '--forge-segment-control-select-segment-font-weight': properties?.['select-segment-font-weight'],
    '--forge-segment-control-select-segment-gap': properties?.['select-segment-gap'],
    '--forge-segment-control-select-segment-padding': properties?.['select-segment-padding'],
    '--forge-segment-control-select-segment-radius-container': properties?.['select-segment-radius-container'],
    '--forge-segment-control-select-segment-radius-segment': properties?.['select-segment-radius-segment'],
    '--forge-segment-control-select-segment-shadow-selected': properties?.['select-segment-shadow-selected'],
    '--forge-segment-control-select-segment-surface-default': properties?.['select-segment-surface-default'],
    '--forge-segment-control-select-segment-surface-selected': properties?.['select-segment-surface-selected'],
    '--forge-segment-control-select-segment-text-default': properties?.['select-segment-text-default'],
    '--forge-segment-control-select-segment-text-hover': properties?.['select-segment-text-hover'],
    '--forge-segment-control-select-segment-text-selected': properties?.['select-segment-text-selected'],
    '--forge-segment-control-select-segment-transition-duration': properties?.['select-segment-transition-duration'],
    '--forge-segment-control-select-segment-transition-easing': properties?.['select-segment-transition-easing'],
    '--forge-segment-control-select-size-2xl-font-size': properties?.['select-size-2xl-font-size'],
    '--forge-segment-control-select-size-2xl-padding-block': properties?.['select-size-2xl-padding-block'],
    '--forge-segment-control-select-size-2xl-padding-inline': properties?.['select-size-2xl-padding-inline'],
    '--forge-segment-control-select-size-2xs-font-size': properties?.['select-size-2xs-font-size'],
    '--forge-segment-control-select-size-2xs-padding-block': properties?.['select-size-2xs-padding-block'],
    '--forge-segment-control-select-size-2xs-padding-inline': properties?.['select-size-2xs-padding-inline'],
    '--forge-segment-control-select-size-lg-font-size': properties?.['select-size-lg-font-size'],
    '--forge-segment-control-select-size-lg-padding-block': properties?.['select-size-lg-padding-block'],
    '--forge-segment-control-select-size-lg-padding-inline': properties?.['select-size-lg-padding-inline'],
    '--forge-segment-control-select-size-md-font-size': properties?.['select-size-md-font-size'],
    '--forge-segment-control-select-size-md-padding-block': properties?.['select-size-md-padding-block'],
    '--forge-segment-control-select-size-md-padding-inline': properties?.['select-size-md-padding-inline'],
    '--forge-segment-control-select-size-sm-font-size': properties?.['select-size-sm-font-size'],
    '--forge-segment-control-select-size-sm-padding-block': properties?.['select-size-sm-padding-block'],
    '--forge-segment-control-select-size-sm-padding-inline': properties?.['select-size-sm-padding-inline'],
    '--forge-segment-control-select-size-xl-font-size': properties?.['select-size-xl-font-size'],
    '--forge-segment-control-select-size-xl-padding-block': properties?.['select-size-xl-padding-block'],
    '--forge-segment-control-select-size-xl-padding-inline': properties?.['select-size-xl-padding-inline'],
    '--forge-segment-control-select-size-xs-font-size': properties?.['select-size-xs-font-size'],
    '--forge-segment-control-select-size-xs-padding-block': properties?.['select-size-xs-padding-block'],
    '--forge-segment-control-select-size-xs-padding-inline': properties?.['select-size-xs-padding-inline'],
  }) as SegmentControlStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SegmentControlProperties {
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SegmentControlStyleProperties>;
}

/**
 * `ForgeSegmentControl` — segmented control (single-select switcher) authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It presents a small set of mutually exclusive options as a joined row of
 * segments. The selected value is **controlled** via `modelValue`. It exposes
 * `role="radiogroup"`/`role="radio"`, implements roving `tabindex` plus
 * arrow-key navigation (Left/Up, Right/Down, Home/End), and owns its styling
 * through the co-located CSS Module `forge-segment-control.module.scss`.
 *
 * The original Vue SFC collected per-segment template refs into an array; the
 * neutral version keeps a single container ref and locates the segment buttons
 * with `querySelectorAll` for focus management (the cross-framework hooks model
 * single element refs, not ref arrays). The `v-model` + `change` emit become the
 * established `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeSegmentControl(properties: Readonly<SegmentControlProperties>): MpElement {
  const style = createSegmentControlStyle(properties.properties);

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

  const containerClass = classNames(styles['forge-segment-control'], styles[`forge-segment-control--${size}`], {
    [styles['forge-segment-control--full-width']]: fullWidth,
    [styles['forge-segment-control--disabled']]: disabled,
  });

  return (
    <div
      ref={containerReference}
      aria-label={ariaLabel}
      className={containerClass}
      role="radiogroup"
      style={style}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          aria-checked={isSelected(option)}
          className={[
            styles['forge-segment-control__segment'],
            {
              [styles['forge-segment-control__segment--selected']]: isSelected(option),
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
