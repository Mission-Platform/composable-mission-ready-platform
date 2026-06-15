<script lang="ts" setup>
  /**
   * `BaseCheckbox` — Checkbox component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { computed, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseStack from '../base-stack/base-stack.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  const props = withDefaults(
    defineProps<{
      modelValue?: boolean | string[];
      value?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      indeterminate?: boolean;
      id?: string;
    }>(),
    {
      modelValue: false,
      value: undefined,
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      indeterminate: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: boolean | string[]];
    change: [event: Event];
  }>();

  const isChecked = computed(() => {
    if (Array.isArray(props.modelValue)) {
      return props.value !== undefined && props.modelValue.includes(props.value);
    }
    return props.modelValue;
  });

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (Array.isArray(props.modelValue) && props.value !== undefined) {
      const next = [...props.modelValue];
      if (target.checked) {
        next.push(props.value);
      } else {
        const idx = next.indexOf(props.value);
        if (idx !== -1) next.splice(idx, 1);
      }
      emit('update:modelValue', next);
    } else {
      emit('update:modelValue', target.checked);
    }
    emit('change', event);
  }

  const { t } = useI18n({ useScope: 'local' });
  const { id: resolvedId } = useId(props.id);

  const checkboxRef = ref<HTMLInputElement | null>(null);

  watch(
    () => props.indeterminate,
    (val) => {
      if (checkboxRef.value) checkboxRef.value.indeterminate = val;
    },
    { immediate: true },
  );
</script>

<template>
  <BaseStack
    :class="['base-checkbox', { 'base-checkbox--error': !!error, 'base-checkbox--disabled': disabled }]"
    gap="2xs"
  >
    <BaseStack
      :for="resolvedId"
      align="center"
      as="label"
      class="base-checkbox__row"
      direction="horizontal"
      gap="xs"
      inline
    >
      <span class="base-checkbox__control-wrapper">
        <input
          :id="resolvedId"
          ref="checkboxRef"
          :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
          :aria-invalid="!!error || undefined"
          :checked="isChecked"
          :disabled="disabled"
          :required="required"
          :value="value"
          class="base-checkbox__input"
          type="checkbox"
          @change="handleChange"
        />
        <span
          aria-hidden="true"
          class="base-checkbox__box"
        >
          <svg
            v-if="indeterminate"
            class="base-checkbox__icon"
            fill="none"
            viewBox="0 0 12 12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6h8"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
            />
          </svg>
          <svg
            v-else
            class="base-checkbox__icon"
            fill="none"
            viewBox="0 0 12 12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </span>
      </span>
      <span
        v-if="label"
        :class="['base-checkbox__label', { 'base-checkbox__label--hidden': labelHidden }]"
      >
        <BaseTypography
          as="span"
          color="primary"
          variant="body-md"
        >
          {{ label }}
        </BaseTypography>
        <span
          v-if="required"
          :title="t('required')"
          aria-hidden="true"
          class="base-checkbox__required"
        >
          *
        </span>
      </span>
    </BaseStack>
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-checkbox__error"
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
      class="base-checkbox__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </BaseStack>
</template>

<style lang="scss" scoped>
  .base-checkbox {
    &__row {
      cursor: pointer;
    }

    &__control-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border: 2px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-sm);
      background-color: var(--mp-color-bg-surface);
      color: transparent;
      transition:
        background-color 150ms ease,
        border-color 150ms ease;
      pointer-events: none;
    }

    &__icon {
      width: 12px;
      height: 12px;
    }

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

    /* States */
    &--error {
      .base-checkbox__box {
        border-color: var(--mp-color-danger-default);
      }
    }

    &__input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;

      &:focus-visible ~ .base-checkbox__box {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:checked ~ .base-checkbox__box,
      &:indeterminate ~ .base-checkbox__box {
        background-color: var(--mp-color-primary-default);
        border-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-checkbox__row {
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
      padding-left: calc(18px + var(--mp-spacing-2));
    }

    &__hint {
      margin: 0;
      padding-left: calc(18px + var(--mp-spacing-2));
    }
  }
</style>

<i18n lang="yaml">
en:
  required: required
</i18n>
