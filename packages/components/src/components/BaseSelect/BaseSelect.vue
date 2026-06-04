<script lang="ts" setup>
  import { useI18n } from '@mission-platform/i18n';
  import { IconChevron } from '@mission-platform/icons';
  import { computed, ref } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseDropdown from '../BaseDropdown/BaseDropdown.vue';
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  export type SelectSize = 'sm' | 'md' | 'lg';

  export interface SelectOption {
    label: string;
    value: string | number;
    disabled?: boolean;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: string | number;
      options?: SelectOption[];
      size?: SelectSize;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      placeholder?: string;
      disabled?: boolean;
      required?: boolean;
      id?: string;
    }>(),
    {
      modelValue: '',
      options: () => [],
      size: 'md',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      placeholder: undefined,
      disabled: false,
      required: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string | number];
    change: [value: string | number];
    blur: [event: FocusEvent];
    focus: [event: FocusEvent];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { id: resolvedId } = useId(props.id);

  const isOpen = ref(false);
  const triggerRef = ref<HTMLButtonElement | null>(null);

  const selectedOption = computed(() => props.options.find((opt) => opt.value === props.modelValue) ?? null);

  const displayLabel = computed(() => (selectedOption.value ? selectedOption.value.label : (props.placeholder ?? '')));

  const hasPlaceholder = computed(() => !selectedOption.value);

  function openDropdown() {
    if (props.disabled) return;
    isOpen.value = true;
    emit('focus', new FocusEvent('focus'));
  }

  function closeDropdown() {
    isOpen.value = false;
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) return;
    emit('update:modelValue', option.value);
    emit('change', option.value);
    closeDropdown();
    triggerRef.value?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      isOpen.value ? closeDropdown() : openDropdown();
    } else if (event.key === 'Escape') {
      closeDropdown();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen.value) {
        openDropdown();
      } else {
        selectAdjacentOption(1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectAdjacentOption(-1);
    }
  }

  function selectAdjacentOption(direction: 1 | -1) {
    const enabledOptions = props.options.filter((opt) => !opt.disabled);
    if (enabledOptions.length === 0) return;
    const currentIndex = enabledOptions.findIndex((opt) => opt.value === props.modelValue);
    const nextIndex = Math.max(0, Math.min(enabledOptions.length - 1, currentIndex + direction));
    const next = enabledOptions[nextIndex];
    if (next) {
      emit('update:modelValue', next.value);
      emit('change', next.value);
    }
  }

  function handleBlur(event: FocusEvent) {
    emit('blur', event);
  }
</script>

<template>
  <div
    :class="[
      'base-select',
      `base-select--${size}`,
      {
        'base-select--error': !!error,
        'base-select--disabled': disabled,
        'base-select--open': isOpen,
      },
    ]"
  >
    <label
      v-if="label"
      :id="`${resolvedId}-label`"
      :class="['base-select__label', { 'base-select__label--hidden': labelHidden }]"
      :for="resolvedId"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >{{ label }}</BaseTypography>
      <span
        v-if="required"
        :title="t('required')"
        aria-hidden="true"
        class="base-select__required"
      >*</span>
    </label>
    <BaseDropdown
      :open="isOpen"
      @close="closeDropdown"
      @update:open="
        (val) => {
          if (!val) closeDropdown();
        }
      "
    >
      <template #trigger>
        <div
          :aria-controls="`${resolvedId}-listbox`"
          :aria-expanded="isOpen"
          :aria-haspopup="'listbox'"
          :aria-labelledby="label ? `${resolvedId}-label` : undefined"
          :aria-required="required || undefined"
          class="base-select__wrapper"
          role="combobox"
        >
          <button
            :id="resolvedId"
            ref="triggerRef"
            :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
            :aria-invalid="!!error || undefined"
            :class="['base-select__field', { 'base-select__field--placeholder': hasPlaceholder }]"
            :disabled="disabled"
            type="button"
            @blur="handleBlur"
            @click="isOpen ? closeDropdown() : openDropdown()"
            @keydown="handleKeydown"
          >
            {{ displayLabel }}
          </button>
          <span
            aria-hidden="true"
            class="base-select__chevron"
          >
            <IconChevron
              :direction="isOpen ? 'up' : 'down'"
              size="sm"
            />
          </span>
        </div>
      </template>

      <ul
        :id="`${resolvedId}-listbox`"
        :aria-labelledby="label ? `${resolvedId}-label` : undefined"
        class="base-select__listbox"
        role="listbox"
      >
        <li
          v-for="opt in options"
          :key="opt.value"
          :aria-disabled="opt.disabled || undefined"
          :aria-selected="opt.value === modelValue"
          :class="[
            'base-select__option',
            {
              'base-select__option--selected': opt.value === modelValue,
              'base-select__option--disabled': opt.disabled,
            },
          ]"
          role="option"
          tabindex="-1"
          @mousedown.prevent="selectOption(opt)"
        >
          {{ opt.label }}
        </li>
        <li
          v-if="options.length === 0"
          aria-disabled="true"
          aria-selected="false"
          class="base-select__empty"
          role="option"
          tabindex="-1"
        >
          No options available
        </li>
      </ul>
    </BaseDropdown>
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-select__error"
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
      class="base-select__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  .base-select {
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
      cursor: pointer;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__field {
      flex: 1;
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);
      cursor: pointer;
      text-align: left;

      &--placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    &__chevron {
      display: flex;
      align-items: center;
      pointer-events: none;
      color: var(--mp-color-text-secondary);
      flex-shrink: 0;
    }

    &__listbox {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    &__option {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      font-size: var(--mp-font-size-sm);
      color: var(--mp-color-text-primary);
      cursor: pointer;

      &--selected {
        font-weight: var(--mp-font-weight-medium);
      }

      &--disabled {
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }

      &:hover:not(.base-select__option--disabled) {
        background-color: var(--mp-color-bg-muted);
      }
    }

    &__empty {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      font-size: var(--mp-font-size-sm);
      color: var(--mp-color-text-secondary);
      font-style: italic;
    }

    /* Sizes */
    &--sm {
      .base-select__field {
        padding: var(--mp-spacing-1) var(--mp-spacing-2);
        font-size: var(--mp-font-size-sm);
      }

      .base-select__chevron {
        padding-right: var(--mp-spacing-2);
      }
    }

    &--md {
      .base-select__field {
        padding: var(--mp-spacing-2) var(--mp-spacing-3);
        font-size: var(--mp-font-size-md);
      }

      .base-select__chevron {
        padding-right: var(--mp-spacing-3);
      }
    }

    &--lg {
      .base-select__field {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);
        font-size: var(--mp-font-size-lg);
      }

      .base-select__chevron {
        padding-right: var(--mp-spacing-4);
      }
    }

    /* States */
    &--error {
      .base-select__wrapper {
        border-color: var(--mp-color-danger-default);

        &:focus-within {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      pointer-events: none;

      .base-select__wrapper {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }

      .base-select__field {
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }

      .base-select__chevron {
        color: var(--mp-color-text-disabled);
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
