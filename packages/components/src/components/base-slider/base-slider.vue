<script lang="ts" setup>
  /**
   * `BaseSlider` — Range slider input for the Mission Platform UI.
   *
   * Lets the user pick a numeric value from a continuous (or stepped) range by
   * dragging a thumb along a track or using the keyboard. The value is
   * controlled via `modelValue` (`v-model`).
   *
   * Accessibility:
   * - The thumb exposes `role="slider"` with `aria-valuemin`, `aria-valuemax`,
   *   `aria-valuenow`, and an optional `aria-valuetext`.
   * - Supports Arrow keys (± step), Page Up/Down (± 10 steps), and Home/End.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, ref } from 'vue';

  /** Size token controlling track / thumb dimensions. */
  export type SliderSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** Current value (`v-model`). */
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
    }>(),
    {
      modelValue: 0,
      min: 0,
      max: 100,
      step: 1,
      disabled: false,
      showValue: false,
      size: 'md',
      ariaLabel: undefined,
      formatValue: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: number];
    /** Emitted when the user finishes changing the value (pointer up / key up). */
    change: [value: number];
  }>();

  const track = ref<HTMLElement | null>(null);
  const dragging = ref(false);

  const clampedValue = computed(() => clamp(props.modelValue));

  const percent = computed(() => {
    const span = props.max - props.min;
    if (span <= 0) return 0;
    return ((clampedValue.value - props.min) / span) * 100;
  });

  const displayValue = computed(() =>
    props.formatValue ? props.formatValue(clampedValue.value) : String(clampedValue.value),
  );

  function clamp(value: number): number {
    return Math.min(props.max, Math.max(props.min, value));
  }

  function roundToStep(value: number): number {
    if (props.step <= 0) return clamp(value);
    const steps = Math.round((value - props.min) / props.step);
    return clamp(props.min + steps * props.step);
  }

  function setValue(value: number, withChange = false): void {
    const next = roundToStep(value);
    if (next !== props.modelValue) {
      emit('update:modelValue', next);
    }
    if (withChange) {
      emit('change', next);
    }
  }

  function valueFromClientX(clientX: number): number {
    const element = track.value;
    if (!element) return clampedValue.value;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return clampedValue.value;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return props.min + ratio * (props.max - props.min);
  }

  function onPointerDown(event: PointerEvent): void {
    if (props.disabled) return;
    dragging.value = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setValue(valueFromClientX(event.clientX));
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragging.value || props.disabled) return;
    setValue(valueFromClientX(event.clientX));
  }

  function onPointerUp(): void {
    if (!dragging.value) return;
    dragging.value = false;
    emit('change', clampedValue.value);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (props.disabled) return;
    const big = props.step * 10;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clampedValue.value + props.step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clampedValue.value - props.step;
        break;
      case 'PageUp':
        next = clampedValue.value + big;
        break;
      case 'PageDown':
        next = clampedValue.value - big;
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
    setValue(next, true);
  }
</script>

<template>
  <div :class="['base-slider', `base-slider--${size}`, { 'base-slider--disabled': disabled }]">
    <div
      ref="track"
      class="base-slider__track"
      @pointercancel="onPointerUp"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <div
        :style="{ width: `${percent}%` }"
        class="base-slider__fill"
      />
      <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
      <div
        :aria-disabled="disabled || undefined"
        :aria-label="ariaLabel"
        :aria-valuemax="max"
        :aria-valuemin="min"
        :aria-valuenow="clampedValue"
        :aria-valuetext="formatValue ? displayValue : undefined"
        :style="{ left: `${percent}%` }"
        :tabindex="disabled ? -1 : 0"
        class="base-slider__thumb"
        role="slider"
        @keydown="onKeydown"
      >
        <span
          v-if="showValue"
          class="base-slider__value"
        >
          {{ displayValue }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-slider {
      --mp-slider-track-height: 0.375rem;
      --mp-slider-thumb-size: 1.125rem;

      display: flex;
      align-items: center;
      width: 100%;
      padding-block: calc(var(--mp-slider-thumb-size) / 2);

      &--sm {
        --mp-slider-track-height: 0.25rem;
        --mp-slider-thumb-size: 0.875rem;
      }

      &--lg {
        --mp-slider-track-height: 0.5rem;
        --mp-slider-thumb-size: 1.5rem;
      }

      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &__track {
        position: relative;
        flex: 1 1 auto;
        height: var(--mp-slider-track-height);
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
        left: 0;
        background-color: var(--mp-color-primary-default);
        border-radius: inherit;
      }

      &__thumb {
        position: absolute;
        top: 50%;
        width: var(--mp-slider-thumb-size);
        height: var(--mp-slider-thumb-size);
        transform: translate(-50%, -50%);
        background-color: var(--mp-color-bg-surface);
        border: 2px solid var(--mp-color-primary-default);
        border-radius: 50%;
        cursor: grab;

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
