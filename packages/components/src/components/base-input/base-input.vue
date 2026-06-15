<script lang="ts" setup>
  /**
   * `BaseInput` — Input component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../base-typography/base-typography.vue';

  import type { Autocomplete } from '../base-schema-form';
  import type { AriaAttributes } from 'vue';

  export type InputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
  export type InputAutocapitalize = 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  export type { Autocomplete } from '../base-schema-form/types';

  const props = withDefaults(
    defineProps<
      {
        modelValue?: string | number;
        type?: InputType;
        size?: InputSize;
        placeholder?: string;
        label?: string;
        labelHidden?: boolean;
        hint?: string;
        error?: string;
        disabled?: boolean;
        required?: boolean;
        /** Native `autocomplete` token (e.g. `'email'`, `'name'`, `'off'`). */
        autocomplete?: Autocomplete;
        /** Native `autocapitalize` hint for on-screen keyboards. */
        autocapitalize?: InputAutocapitalize;
        /** Allow multiple comma-separated entries (`type="email"` only). */
        multiple?: boolean;
        /** Step increment (`type="number"`). */
        step?: number | string;
        /** Inclusive minimum (`type="number"`). */
        min?: number | string;
        /** Inclusive maximum (`type="number"`). */
        max?: number | string;
        /** Autocomplete suggestions rendered as a native `<datalist>`. */
        list?: Array<string | number>;
        id?: string;
      } & /* @vue-ignore */ AriaAttributes
    >(),
    {
      modelValue: '',
      type: 'text',
      size: 'md',
      placeholder: '',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      autocomplete: undefined,
      autocapitalize: undefined,
      multiple: false,
      step: undefined,
      min: undefined,
      max: undefined,
      list: undefined,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string | number];
    change: [event: Event];
    blur: [event: FocusEvent];
    focus: [event: FocusEvent];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { id: resolvedId } = useId(props.id);

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', props.type === 'number' ? target.valueAsNumber : target.value);
  }
</script>

<template>
  <div
    :class="['base-input', `base-input--${size}`, { 'base-input--error': !!error, 'base-input--disabled': disabled }]"
  >
    <label
      v-if="label"
      :class="['base-input__label', { 'base-input__label--hidden': labelHidden }]"
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
        :title="t('required')"
        aria-hidden="true"
        class="base-input__required"
      >
        *
      </span>
    </label>
    <div class="base-input__wrapper">
      <!-- Leading extension (e.g. an icon, unit, or button), like the stepper's −/+ controls. -->
      <span
        v-if="$slots.start"
        class="base-input__extension base-input__extension--start"
      >
        <slot name="start" />
      </span>
      <slot name="prefix" />
      <input
        :id="resolvedId"
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        :aria-invalid="!!error || undefined"
        :autocapitalize="autocapitalize"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :list="list && list.length ? `${resolvedId}-list` : undefined"
        :max="max"
        :min="min"
        :multiple="type === 'email' && multiple ? true : undefined"
        :placeholder="placeholder"
        :required="required"
        :step="step"
        :type="type"
        :value="modelValue"
        class="base-input__field"
        @blur="emit('blur', $event)"
        @change="emit('change', $event)"
        @focus="emit('focus', $event)"
        @input="handleInput"
      />
      <datalist
        v-if="list && list.length"
        :id="`${resolvedId}-list`"
      >
        <option
          v-for="option in list"
          :key="String(option)"
          :value="option"
        />
      </datalist>
      <slot name="suffix" />
      <!-- Trailing extension (e.g. an icon, unit, or button). -->
      <span
        v-if="$slots.end"
        class="base-input__extension base-input__extension--end"
      >
        <slot name="end" />
      </span>
    </div>
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-input__error"
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
      class="base-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  .base-input {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__label {
      /* typography handled by BaseTypography */

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

    &__field {
      flex: 1;
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    /* Leading / trailing extension areas (icons, units, or buttons). */
    &__extension {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      color: var(--mp-color-text-secondary);

      &--start {
        margin-inline-start: var(--mp-spacing-2);
      }

      &--end {
        margin-inline-end: var(--mp-spacing-2);
      }
    }

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} {
        .base-input__field {
          padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
          font-size: var(--mp-size-font-#{$size});
        }
      }
    }

    /* States */
    &--error {
      .base-input__wrapper {
        border-color: var(--mp-color-danger-default);

        &:focus-within {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-input__wrapper {
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

<i18n lang="yaml">
en:
  required: required
</i18n>
