<script lang="ts" setup>
  /**
   * `BaseRangeInput` — a dual-thumb min/max range selector for the Mission
   * Platform UI.
   *
   * Lets the user pick a lower and upper bound within a continuous (or stepped)
   * range by dragging either thumb or using the keyboard. The selection is
   * controlled via `modelValue` (`v-model`) as a `[min, max]` tuple; the two
   * values are kept ordered and never cross, with an optional `minDistance`
   * enforced between them.
   *
   * Accessibility:
   * - Each thumb exposes `role="slider"` with `aria-valuemin`/`aria-valuemax`
   *   reflecting the bounds it is allowed to move within, plus `aria-valuenow`
   *   and an optional `aria-valuetext`.
   * - Supports Arrow keys (± step), Page Up/Down (± 10 steps), and Home/End.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, ref } from 'vue';

  /** Size token controlling track / thumb dimensions. */
  export type RangeInputSize = 'sm' | 'md' | 'lg';

  /** The selected `[lower, upper]` bounds. */
  export type RangeValue = [number, number];

  /** Identifies which thumb is being manipulated. */
  type Thumb = 'min' | 'max';

  const props = withDefaults(
    defineProps<{
      /** Current `[lower, upper]` selection (`v-model`). */
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
    }>(),
    {
      modelValue: () => [0, 100],
      min: 0,
      max: 100,
      step: 1,
      minDistance: 0,
      disabled: false,
      showValue: false,
      size: 'md',
      ariaLabelMin: undefined,
      ariaLabelMax: undefined,
      formatValue: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: RangeValue];
    /** Emitted when the user finishes changing a value (pointer up / key up). */
    change: [value: RangeValue];
  }>();

  const track = ref<HTMLElement | null>(null);
  const dragging = ref<Thumb | null>(null);

  const lower = computed(() => clamp(Math.min(props.modelValue[0], props.modelValue[1])));
  const upper = computed(() => clamp(Math.max(props.modelValue[0], props.modelValue[1])));

  const lowerPercent = computed(() => toPercent(lower.value));
  const upperPercent = computed(() => toPercent(upper.value));

  const displayLower = computed(() => format(lower.value));
  const displayUpper = computed(() => format(upper.value));

  function format(value: number): string {
    return props.formatValue ? props.formatValue(value) : String(value);
  }

  function clamp(value: number): number {
    return Math.min(props.max, Math.max(props.min, value));
  }

  function toPercent(value: number): number {
    const span = props.max - props.min;
    if (span <= 0) return 0;
    return ((value - props.min) / span) * 100;
  }

  function roundToStep(value: number): number {
    if (props.step <= 0) return clamp(value);
    const steps = Math.round((value - props.min) / props.step);
    return clamp(props.min + steps * props.step);
  }

  function setThumb(thumb: Thumb, rawValue: number, withChange = false): void {
    const value = roundToStep(rawValue);
    let next: RangeValue;
    if (thumb === 'min') {
      next = [Math.min(value, upper.value - props.minDistance), upper.value];
    } else {
      next = [lower.value, Math.max(value, lower.value + props.minDistance)];
    }
    next = [clamp(next[0]), clamp(next[1])];
    if (next[0] !== props.modelValue[0] || next[1] !== props.modelValue[1]) {
      emit('update:modelValue', next);
    }
    if (withChange) emit('change', next);
  }

  function valueFromClientX(clientX: number): number {
    const element = track.value;
    if (!element) return lower.value;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return lower.value;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return props.min + ratio * (props.max - props.min);
  }

  /** Picks the thumb closest to the pointer (favouring the lower thumb on ties). */
  function nearestThumb(value: number): Thumb {
    return Math.abs(value - lower.value) <= Math.abs(value - upper.value) ? 'min' : 'max';
  }

  function onTrackPointerDown(event: PointerEvent): void {
    if (props.disabled) return;
    const value = valueFromClientX(event.clientX);
    const thumb = nearestThumb(value);
    dragging.value = thumb;
    setThumb(thumb, value);
  }

  function onThumbPointerDown(thumb: Thumb, event: PointerEvent): void {
    if (props.disabled) return;
    dragging.value = thumb;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragging.value || props.disabled) return;
    setThumb(dragging.value, valueFromClientX(event.clientX));
  }

  function onPointerUp(): void {
    if (!dragging.value) return;
    dragging.value = null;
    emit('change', [lower.value, upper.value]);
  }

  function onKeydown(thumb: Thumb, event: KeyboardEvent): void {
    if (props.disabled) return;
    const big = props.step * 10;
    const current = thumb === 'min' ? lower.value : upper.value;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + props.step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - props.step;
        break;
      case 'PageUp':
        next = current + big;
        break;
      case 'PageDown':
        next = current - big;
        break;
      case 'Home':
        next = props.min;
        break;
      case 'End':
        next = props.max;
        break;
      default:
        return;
    }
    event.preventDefault();
    setThumb(thumb, next, true);
  }
</script>

<template>
  <div :class="['base-range-input', `base-range-input--${size}`, { 'base-range-input--disabled': disabled }]">
    <div
      ref="track"
      class="base-range-input__track"
      @pointercancel="onPointerUp"
      @pointerdown="onTrackPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <div
        :style="{ left: `${lowerPercent}%`, right: `${100 - upperPercent}%` }"
        class="base-range-input__fill"
      />
      <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
      <div
        :aria-disabled="disabled || undefined"
        :aria-label="ariaLabelMin"
        :aria-valuemax="upper"
        :aria-valuemin="min"
        :aria-valuenow="lower"
        :aria-valuetext="formatValue ? displayLower : undefined"
        :style="{ left: `${lowerPercent}%` }"
        :tabindex="disabled ? -1 : 0"
        class="base-range-input__thumb base-range-input__thumb--min"
        role="slider"
        @keydown="onKeydown('min', $event)"
        @pointercancel="onPointerUp"
        @pointerdown="onThumbPointerDown('min', $event)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      >
        <span
          v-if="showValue"
          class="base-range-input__value"
        >
          {{ displayLower }}
        </span>
      </div>
      <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
      <div
        :aria-disabled="disabled || undefined"
        :aria-label="ariaLabelMax"
        :aria-valuemax="max"
        :aria-valuemin="lower"
        :aria-valuenow="upper"
        :aria-valuetext="formatValue ? displayUpper : undefined"
        :style="{ left: `${upperPercent}%` }"
        :tabindex="disabled ? -1 : 0"
        class="base-range-input__thumb base-range-input__thumb--max"
        role="slider"
        @keydown="onKeydown('max', $event)"
        @pointercancel="onPointerUp"
        @pointerdown="onThumbPointerDown('max', $event)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      >
        <span
          v-if="showValue"
          class="base-range-input__value"
        >
          {{ displayUpper }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-range-input {
      --mp-range-track-height: 0.375rem;
      --mp-range-thumb-size: 1.125rem;

      display: flex;
      align-items: center;
      width: 100%;
      padding-block: calc(var(--mp-range-thumb-size) / 2);

      &--sm {
        --mp-range-track-height: 0.25rem;
        --mp-range-thumb-size: 0.875rem;
      }

      &--lg {
        --mp-range-track-height: 0.5rem;
        --mp-range-thumb-size: 1.5rem;
      }

      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &__track {
        position: relative;
        flex: 1 1 auto;
        height: var(--mp-range-track-height);
        background-color: var(--mp-color-bg-sunken);
        border-radius: var(--mp-radius-pill, 9999px);
        cursor: pointer;
        touch-action: none;
      }

      &--disabled &__track {
        cursor: not-allowed;
      }

      &__fill {
        position: absolute;
        inset-block: 0;
        background-color: var(--mp-color-primary-default);
        border-radius: inherit;
      }

      &__thumb {
        position: absolute;
        top: 50%;
        width: var(--mp-range-thumb-size);
        height: var(--mp-range-thumb-size);
        transform: translate(-50%, -50%);
        background-color: var(--mp-color-bg-surface);
        border: 2px solid var(--mp-color-primary-default);
        border-radius: 50%;
        cursor: grab;
        touch-action: none;

        &:focus-visible {
          outline: none;
          box-shadow: var(--mp-shadow-focus-primary);
        }

        &:active {
          cursor: grabbing;
        }
      }

      &__value {
        position: absolute;
        bottom: calc(100% + var(--mp-spacing-1));
        left: 50%;
        transform: translateX(-50%);
        padding: var(--mp-spacing-1) var(--mp-spacing-2);
        background-color: var(--mp-color-text-primary);
        color: var(--mp-color-bg-surface);
        border-radius: var(--mp-radius-sm);
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-size-font-xs);
        white-space: nowrap;
        pointer-events: none;
      }
    }
  }
</style>
