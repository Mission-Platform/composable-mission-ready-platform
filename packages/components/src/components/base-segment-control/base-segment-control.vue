<script lang="ts" setup>
  /**
   * `BaseSegmentControl` — Segmented control (single-select switcher) for the
   * Mission Platform UI.
   *
   * Presents a small set of mutually exclusive options as a joined row of
   * segments — ideal for switching views or filters. The selected value is
   * controlled via `modelValue` (`v-model`).
   *
   * Accessibility:
   * - Exposes `role="radiogroup"`; each segment is a `role="radio"` with
   *   `aria-checked`.
   * - Implements roving `tabindex` and arrow-key navigation (Left/Up and
   *   Right/Down, plus Home/End).
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, ref } from 'vue';

  /** Size token controlling segment dimensions. */
  export type SegmentControlSize = 'sm' | 'md' | 'lg';

  /** A single selectable segment. */
  export interface SegmentOption {
    /** Display label. */
    label: string;
    /** Value emitted when the segment is selected. */
    value: string | number;
    /** Disable this individual segment. */
    disabled?: boolean;
  }

  const props = withDefaults(
    defineProps<{
      /** Selected value (`v-model`). */
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
    }>(),
    {
      modelValue: undefined,
      size: 'md',
      disabled: false,
      fullWidth: false,
      ariaLabel: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string | number];
    /** Emitted when the selected value changes. */
    change: [value: string | number];
  }>();

  const buttons = ref<HTMLButtonElement[]>([]);

  const selectedIndex = computed(() => props.options.findIndex((option) => option.value === props.modelValue));

  function isSelected(option: SegmentOption): boolean {
    return option.value === props.modelValue;
  }

  function isFocusable(option: SegmentOption, index: number): boolean {
    if (option.disabled) return false;
    // Roving tabindex: the selected option is focusable; otherwise the first enabled one.
    if (selectedIndex.value >= 0) return index === selectedIndex.value;
    return index === props.options.findIndex((candidate) => !candidate.disabled);
  }

  function select(option: SegmentOption): void {
    if (props.disabled || option.disabled || option.value === props.modelValue) return;
    emit('update:modelValue', option.value);
    emit('change', option.value);
  }

  function focusIndex(index: number): void {
    const target = buttons.value[index];
    target?.focus();
  }

  function moveFocus(from: number, direction: 1 | -1): void {
    const count = props.options.length;
    let next = from;
    for (let step = 0; step < count; step += 1) {
      next = (next + direction + count) % count;
      if (!props.options[next]?.disabled) {
        select(props.options[next]);
        focusIndex(next);
        return;
      }
    }
  }

  function onKeydown(event: KeyboardEvent, index: number): void {
    if (props.disabled) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(index, -1);
        break;
      case 'Home': {
        event.preventDefault();
        const first = props.options.findIndex((option) => !option.disabled);
        if (first >= 0) {
          select(props.options[first]);
          focusIndex(first);
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        for (let index_ = props.options.length - 1; index_ >= 0; index_ -= 1) {
          if (!props.options[index_].disabled) {
            select(props.options[index_]);
            focusIndex(index_);
            break;
          }
        }
        break;
      }
      default:
        break;
    }
  }
</script>

<template>
  <div
    :aria-label="ariaLabel"
    :class="[
      'base-segment-control',
      `base-segment-control--${size}`,
      { 'base-segment-control--full-width': fullWidth, 'base-segment-control--disabled': disabled },
    ]"
    role="radiogroup"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="buttons"
      :aria-checked="isSelected(option)"
      :class="['base-segment-control__segment', { 'base-segment-control__segment--selected': isSelected(option) }]"
      :disabled="disabled || option.disabled"
      :tabindex="isFocusable(option, index) ? 0 : -1"
      role="radio"
      type="button"
      @click="select(option)"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-segment-control {
      display: inline-flex;
      padding: var(--mp-spacing-1);
      background-color: var(--mp-color-bg-sunken);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      gap: var(--mp-spacing-1);

      &--full-width {
        display: flex;
        width: 100%;
      }

      &--disabled {
        opacity: 0.5;
      }

      &__segment {
        flex: 1 1 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        background-color: transparent;
        color: var(--mp-color-text-secondary);
        border: 0;
        border-radius: var(--mp-radius-md);
        font-family: var(--mp-font-family-sans);
        font-weight: var(--mp-font-weight-medium, 500);
        cursor: pointer;
        transition:
          background-color 150ms ease,
          color 150ms ease,
          box-shadow 150ms ease;

        &--selected {
          background-color: var(--mp-color-bg-surface);
          color: var(--mp-color-text-primary);
          box-shadow: var(--mp-shadow-sm);
        }

        &:focus-visible {
          outline: none;
          box-shadow: var(--mp-shadow-focus-primary);
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        &:hover:not(:disabled, .base-segment-control__segment--selected) {
          color: var(--mp-color-text-primary);
        }
      }

      /* Sizes */
      &--sm .base-segment-control__segment {
        padding: var(--mp-size-pad-block-xs) var(--mp-size-pad-inline-sm);
        font-size: var(--mp-size-font-xs);
      }

      &--md .base-segment-control__segment {
        padding: var(--mp-size-pad-block-sm) var(--mp-size-pad-inline-md);
        font-size: var(--mp-size-font-sm);
      }

      &--lg .base-segment-control__segment {
        padding: var(--mp-size-pad-block-md) var(--mp-size-pad-inline-lg);
        font-size: var(--mp-size-font-md);
      }
    }
  }
</style>
