<script lang="ts" setup>
  /**
   * `BaseTextarea` — Textarea component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type TextareaSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      rows?: number;
      size?: TextareaSize;
      resize?: TextareaResize;
      placeholder?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      id?: string;
    }>(),
    {
      modelValue: '',
      rows: 4,
      size: 'md',
      resize: 'vertical',
      placeholder: '',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [event: Event];
    blur: [event: FocusEvent];
    focus: [event: FocusEvent];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { id: resolvedId } = useId(props.id);

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    emit('update:modelValue', target.value);
  }
</script>

<template>
  <div
    :class="[
      'base-textarea',
      `base-textarea--${size}`,
      { 'base-textarea--error': !!error, 'base-textarea--disabled': disabled },
    ]"
  >
    <label
      v-if="label"
      :class="['base-textarea__label', { 'base-textarea__label--hidden': labelHidden }]"
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
        class="base-textarea__required"
      >
        *
      </span>
    </label>
    <textarea
      :id="resolvedId"
      :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
      :aria-invalid="!!error || undefined"
      :disabled="disabled"
      :placeholder="placeholder"
      :required="required"
      :rows="rows"
      :style="{ resize }"
      :value="modelValue"
      class="base-textarea__field"
      @blur="emit('blur', $event)"
      @change="emit('change', $event)"
      @focus="emit('focus', $event)"
      @input="handleInput"
    />
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-textarea__error"
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
      class="base-textarea__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  .base-textarea {
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

    &__field {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);
      outline: none;
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }

      &:focus {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} .base-textarea__field {
        padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
        font-size: var(--mp-size-font-#{$size});
      }
    }

    /* States */
    &--error {
      .base-textarea__field {
        border-color: var(--mp-color-danger-default);

        &:focus {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-textarea__field {
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
