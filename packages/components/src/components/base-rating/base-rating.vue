<script lang="ts" setup>
  /**
   * `BaseRating` — Star rating input / display for the Mission Platform UI.
   *
   * Renders a row of stars representing a value from `0` to `max`. Supports
   * whole or half-star precision, an interactive (input) mode and a read-only
   * display mode, hover preview, and full keyboard control.
   *
   * Accessibility:
   * - Interactive ratings expose `role="slider"` with `aria-valuemin`,
   *   `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`, and respond to
   *   arrow / Home / End keys.
   * - Read-only ratings expose `role="img"` with a descriptive `aria-label`.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, ref } from 'vue';

  /** Size token controlling the star dimensions. */
  export type RatingSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** Current rating value (`v-model`). */
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
    }>(),
    {
      modelValue: 0,
      max: 5,
      allowHalf: false,
      readonly: false,
      disabled: false,
      clearable: false,
      size: 'md',
      ariaLabel: 'Rating',
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: number];
    /** Emitted when the value changes via user interaction. */
    change: [value: number];
  }>();

  const hoverValue = ref<number | null>(null);

  const interactive = computed(() => !props.readonly && !props.disabled);
  const step = computed(() => (props.allowHalf ? 0.5 : 1));

  /** The value currently shown (hover preview when interacting, else the model value). */
  const displayValue = computed(() => hoverValue.value ?? props.modelValue);

  const stars = computed(() => Array.from({ length: props.max }, (_, index) => index + 1));

  /** Fill percentage (0–100) for a given 1-based star index. */
  function fillFor(starIndex: number): number {
    const filled = displayValue.value - (starIndex - 1);
    if (filled <= 0) return 0;
    if (filled >= 1) return 100;
    return filled * 100;
  }

  function setValue(value: number): void {
    if (!interactive.value) return;
    const next = props.clearable && value === props.modelValue ? 0 : value;
    if (next === props.modelValue) return;
    emit('update:modelValue', next);
    emit('change', next);
  }

  function onStarClick(starIndex: number, half: boolean): void {
    const value = props.allowHalf && half ? starIndex - 0.5 : starIndex;
    setValue(value);
  }

  function onStarHover(starIndex: number, half: boolean): void {
    if (!interactive.value) return;
    hoverValue.value = props.allowHalf && half ? starIndex - 0.5 : starIndex;
  }

  function clearHover(): void {
    hoverValue.value = null;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!interactive.value) return;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(props.max, props.modelValue + step.value);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(0, props.modelValue - step.value);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = props.max;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== props.modelValue) {
      emit('update:modelValue', next);
      emit('change', next);
    }
  }

  const valueText = computed(() => `${props.modelValue} out of ${props.max}`);
</script>

<template>
  <div
    v-if="interactive"
    :aria-label="ariaLabel"
    :aria-valuemax="max"
    :aria-valuenow="modelValue"
    :aria-valuetext="valueText"
    :class="[`base-rating--${size}`]"
    aria-valuemin="0"
    class="base-rating"
    role="slider"
    tabindex="0"
    @blur="clearHover"
    @keydown="onKeydown"
    @mouseleave="clearHover"
  >
    <span
      v-for="star in stars"
      :key="star"
      class="base-rating__star"
    >
      <svg
        aria-hidden="true"
        class="base-rating__icon base-rating__icon--empty"
        height="1em"
        viewBox="0 0 24 24"
        width="1em"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
          fill="currentColor"
        />
      </svg>
      <span
        :style="{ width: `${fillFor(star)}%` }"
        class="base-rating__fill"
      >
        <svg
          aria-hidden="true"
          class="base-rating__icon base-rating__icon--filled"
          height="1em"
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
            fill="currentColor"
          />
        </svg>
      </span>

      <span
        v-if="allowHalf"
        aria-hidden="true"
        class="base-rating__hit base-rating__hit--half"
        @click="onStarClick(star, true)"
        @mousemove="onStarHover(star, true)"
      />
      <span
        aria-hidden="true"
        class="base-rating__hit base-rating__hit--full"
        @click="onStarClick(star, false)"
        @mousemove="onStarHover(star, false)"
      />
    </span>
  </div>
  <div
    v-else
    :aria-label="`${ariaLabel}: ${valueText}`"
    :class="[`base-rating--${size}`, { 'base-rating--disabled': disabled }]"
    class="base-rating"
    role="img"
  >
    <span
      v-for="star in stars"
      :key="star"
      class="base-rating__star"
    >
      <svg
        aria-hidden="true"
        class="base-rating__icon base-rating__icon--empty"
        height="1em"
        viewBox="0 0 24 24"
        width="1em"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
          fill="currentColor"
        />
      </svg>
      <span
        :style="{ width: `${fillFor(star)}%` }"
        class="base-rating__fill"
      >
        <svg
          aria-hidden="true"
          class="base-rating__icon base-rating__icon--filled"
          height="1em"
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
            fill="currentColor"
          />
        </svg>
      </span>
    </span>
  </div>
</template>

<style lang="scss" scoped>
  .base-rating {
    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-1);
    color: var(--mp-color-warning-default);
    line-height: 1;

    &--sm {
      font-size: 1rem;
    }

    &--md {
      font-size: 1.5rem;
    }

    &--lg {
      font-size: 2rem;
    }

    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: none;
      border-radius: var(--mp-radius-sm);
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &__star {
      position: relative;
      display: inline-flex;
      width: 1em;
      height: 1em;
    }

    &__icon {
      display: block;
      width: 1em;
      height: 1em;

      &--empty {
        color: var(--mp-color-border-default);
      }
    }

    &__fill {
      position: absolute;
      inset: 0;
      overflow: hidden;
      color: var(--mp-color-warning-default);
    }

    &__hit {
      position: absolute;
      inset: 0;
      padding: 0;
      margin: 0;
      background: transparent;
      border: 0;
      cursor: pointer;

      &--half {
        right: 50%;
        z-index: 2;
      }

      &--full {
        z-index: 1;
      }
    }
  }

  .base-rating--readonly .base-rating__hit,
  .base-rating--disabled .base-rating__hit {
    cursor: default;
  }
</style>
