<script lang="ts" setup>
  /**
   * `BaseNumberStepper` — Numeric stepper input for the Mission Platform UI.
   *
   * A number field flanked by decrement/increment buttons.  It can be
   * configured as a signed or unsigned **integer**, or as a **float** with a
   * fixed fractional `precision`; the `step` controls how much each button (and
   * the keyboard ↑/↓ arrows) adjusts the value by.  The model value is a
   * `number`, or `null` when the field is empty.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseStack from '../base-stack/base-stack.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type NumberStepperSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      /** The numeric value, or `null`/`''` when empty. */
      modelValue?: number | null | '';
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      placeholder?: string;
      size?: NumberStepperSize;
      /** Inclusive minimum value. */
      min?: number;
      /** Inclusive maximum value. */
      max?: number;
      /** Increment/decrement amount for the buttons and arrow keys. */
      step?: number;
      /** Restrict input to whole numbers. */
      integer?: boolean;
      /** Disallow negative values (clamps the effective minimum to `0`). */
      unsigned?: boolean;
      /** Fractional digits a float value is rounded/displayed to. */
      precision?: number;
      id?: string;
    }>(),
    {
      modelValue: null,
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      placeholder: '',
      size: 'md',
      min: undefined,
      max: undefined,
      step: 1,
      integer: false,
      unsigned: false,
      precision: undefined,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: number | null];
    change: [value: number | null];
  }>();

  const { id: resolvedId } = useId(props.id);

  /** The effective lower bound (0 for unsigned fields without an explicit min). */
  const effectiveMin = computed(() => (props.unsigned ? Math.max(0, props.min ?? 0) : props.min));

  /** The current numeric value, or `null` when empty. */
  const current = computed<number | null>(() => {
    const value = props.modelValue;
    if (value === null || value === undefined || value === '') return null;
    return typeof value === 'number' ? value : Number(value);
  });

  /** The string shown in the input, honouring float `precision`. */
  const display = computed(() => {
    const value = current.value;
    if (value === null || Number.isNaN(value)) return '';
    if (!props.integer && props.precision !== undefined) return value.toFixed(props.precision);
    return String(value);
  });

  /** Round/clamp a raw number to the configured integer/precision/min/max rules. */
  function normalise(value: number): number {
    let next = value;
    if (props.integer) {
      next = Math.trunc(next);
    } else if (props.precision !== undefined) {
      const factor = 10 ** props.precision;
      next = Math.round(next * factor) / factor;
    }
    if (effectiveMin.value !== undefined) next = Math.max(effectiveMin.value, next);
    if (props.max !== undefined) next = Math.min(props.max, next);
    return next;
  }

  function commit(value: number | null) {
    emit('update:modelValue', value);
    emit('change', value);
  }

  function onInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    if (raw.trim() === '') {
      commit(null);
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    commit(normalise(parsed));
  }

  const canDecrement = computed(
    () => !props.disabled && (effectiveMin.value === undefined || (current.value ?? 0) > effectiveMin.value),
  );
  const canIncrement = computed(() => !props.disabled && (props.max === undefined || (current.value ?? 0) < props.max));

  function adjust(direction: 1 | -1) {
    if (props.disabled) return;
    const base = current.value ?? effectiveMin.value ?? 0;
    commit(normalise(base + direction * (props.step ?? 1)));
  }
</script>

<template>
  <BaseStack
    :class="[
      'base-number-stepper',
      `base-number-stepper--${size}`,
      { 'base-number-stepper--error': !!error, 'base-number-stepper--disabled': disabled },
    ]"
    gap="2xs"
  >
    <label
      v-if="label"
      :class="['base-number-stepper__label', { 'base-number-stepper__label--hidden': labelHidden }]"
      :for="resolvedId"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >
        {{ label }}
      </BaseTypography>
      <span
        v-if="required"
        aria-hidden="true"
        class="base-number-stepper__required"
      >
        *
      </span>
    </label>

    <div class="base-number-stepper__wrapper">
      <button
        :disabled="!canDecrement"
        aria-label="Decrease"
        class="base-number-stepper__btn"
        tabindex="-1"
        type="button"
        @click="adjust(-1)"
      >
        −
      </button>
      <input
        :id="resolvedId"
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        :aria-invalid="!!error || undefined"
        :disabled="disabled"
        :max="max"
        :min="effectiveMin"
        :placeholder="placeholder"
        :required="required"
        :step="integer ? 1 : (step ?? undefined)"
        :value="display"
        class="base-number-stepper__field"
        inputmode="decimal"
        type="number"
        @input="onInput"
      />
      <button
        :disabled="!canIncrement"
        aria-label="Increase"
        class="base-number-stepper__btn"
        tabindex="-1"
        type="button"
        @click="adjust(1)"
      >
        +
      </button>
    </div>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-number-stepper__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="base-number-stepper__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </BaseStack>
</template>

<style lang="scss" scoped>
  .base-number-stepper {
    &__label {
      display: flex;
      align-items: center;
      gap: 2px;

      &--hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    }

    &__required {
      color: var(--mp-color-danger-default);
      margin-left: 2px;
    }

    &__wrapper {
      display: flex;
      align-items: stretch;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      overflow: hidden;
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      flex-shrink: 0;
      border: none;
      background-color: var(--mp-color-bg-muted);
      color: var(--mp-color-text-primary);
      font-size: var(--mp-font-size-lg);
      line-height: 1;
      cursor: pointer;
      user-select: none;
      transition: background-color 150ms ease;

      &:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }

      &:hover:not(:disabled) {
        background-color: var(--mp-color-border-default);
      }
    }

    &__field {
      flex: 1;
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      text-align: center;
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} .base-number-stepper__field {
        padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
        font-size: var(--mp-size-font-#{$size});
      }
    }

    &--error .base-number-stepper__wrapper {
      border-color: var(--mp-color-danger-default);

      &:focus-within {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-number-stepper__wrapper {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
    }

    &__hint {
      margin: 0;
    }
  }
</style>
