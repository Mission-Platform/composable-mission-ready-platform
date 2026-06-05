<script lang="ts" setup>
  import { computed, ref } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type ColorInputSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      size?: ColorInputSize;
      id?: string;
    }>(),
    {
      modelValue: '#000000',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      size: 'md',
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [value: string];
  }>();

  const { id: resolvedId } = useId(props.id);

  // ── Hex text field sync ──────────────────────────────────────────────────
  const hexText = ref(props.modelValue ?? '#000000');

  // Keep hexText in sync when the model changes externally
  const displayValue = computed(() => props.modelValue ?? '#000000');

  function onColorInput(event: Event) {
    const target = event.target as HTMLInputElement;
    hexText.value = target.value;
    emit('update:modelValue', target.value);
  }

  function onTextInput(event: Event) {
    const target = event.target as HTMLInputElement;
    hexText.value = target.value;

    // Only propagate valid 6-digit hex colours
    if (/^#[0-9a-fA-F]{6}$/.test(target.value)) {
      emit('update:modelValue', target.value);
      emit('change', target.value);
    }
  }

  function onTextChange(event: Event) {
    const target = event.target as HTMLInputElement;
    let value = target.value.trim();
    if (!value.startsWith('#')) value = `#${value}`;
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      hexText.value = value;
      emit('update:modelValue', value);
      emit('change', value);
    } else {
      // Reset to last valid model value
      hexText.value = props.modelValue ?? '#000000';
    }
  }
</script>

<template>
  <div
    :class="[
      'base-color-input',
      `base-color-input--${size}`,
      {
        'base-color-input--error': !!error,
        'base-color-input--disabled': disabled,
      },
    ]"
  >
    <label
      v-if="label"
      :class="['base-color-input__label', { 'base-color-input__label--hidden': labelHidden }]"
      :for="`${resolvedId}-text`"
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
        class="base-color-input__required"
        title="required"
      >
        *
      </span>
    </label>

    <div class="base-color-input__wrapper">
      <!-- Native colour picker — visually a swatch button -->
      <label
        :for="resolvedId"
        class="base-color-input__swatch-label"
        :style="{ backgroundColor: displayValue }"
        aria-label="Open colour picker"
      />
      <input
        :id="resolvedId"
        :disabled="disabled"
        :required="required"
        :value="displayValue"
        class="base-color-input__picker"
        type="color"
        @change="onColorInput"
        @input="onColorInput"
      />

      <!-- Hex text field -->
      <input
        :id="`${resolvedId}-text`"
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        :aria-invalid="!!error || undefined"
        :disabled="disabled"
        :value="hexText"
        class="base-color-input__text"
        maxlength="7"
        placeholder="#000000"
        spellcheck="false"
        type="text"
        @blur="onTextChange"
        @change="onTextChange"
        @input="onTextInput"
      />
    </div>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-color-input__error"
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
      class="base-color-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  .base-color-input {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__label {
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
      align-items: center;
      gap: var(--mp-spacing-2);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    // ── Swatch ───────────────────────────────────────────────────────────────
    &__picker {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    &__swatch-label {
      display: block;
      flex-shrink: 0;
      border-radius: calc(var(--mp-radius-md) - 2px) 0 0 calc(var(--mp-radius-md) - 2px);
      border-right: 1px solid var(--mp-color-border-default);
      cursor: pointer;
      transition: opacity 150ms ease;

      &:hover {
        opacity: 0.85;
      }
    }

    // ── Text field ───────────────────────────────────────────────────────────
    &__text {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-mono);
      letter-spacing: 0.05em;

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    // ── Sizes ────────────────────────────────────────────────────────────────
    &--sm {
      .base-color-input__swatch-label {
        width: 28px;
        height: 28px;
      }

      .base-color-input__text {
        padding: var(--mp-spacing-1) var(--mp-spacing-2);
        font-size: var(--mp-font-size-sm);
      }
    }

    &--md {
      .base-color-input__swatch-label {
        width: 36px;
        height: 36px;
      }

      .base-color-input__text {
        padding: var(--mp-spacing-2) var(--mp-spacing-3);
        font-size: var(--mp-font-size-md);
      }
    }

    &--lg {
      .base-color-input__swatch-label {
        width: 44px;
        height: 44px;
      }

      .base-color-input__text {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);
        font-size: var(--mp-font-size-lg);
      }
    }

    // ── States ───────────────────────────────────────────────────────────────
    &--error {
      .base-color-input__wrapper {
        border-color: var(--mp-color-danger-default);

        &:focus-within {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-color-input__wrapper {
        background-color: var(--mp-color-bg-muted);
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
