<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { IconChevron } from '@mission-platform/icons'

  import { useId } from '../../composables/useId'
  import BaseDropdown from '../BaseDropdown/BaseDropdown.vue'
  import BaseTag from '../BaseTag/BaseTag.vue'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export type MultiselectSize = 'sm' | 'md' | 'lg'

  export interface MultiselectOption {
    label: string
    value: string | number
    disabled?: boolean
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: (string | number)[]
      options?: MultiselectOption[]
      size?: MultiselectSize
      label?: string
      labelHidden?: boolean
      hint?: string
      error?: string
      placeholder?: string
      disabled?: boolean
      required?: boolean
      id?: string
    }>(),
    {
      modelValue: () => [],
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
  )

  const emit = defineEmits<{
    'update:modelValue': [value: (string | number)[]]
    change: [value: (string | number)[]]
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: {
      en: {
        required: 'required',
        placeholder: 'Select options…',
      },
    },
  })
  const { id: resolvedId } = useId(props.id)

  const isOpen = ref(false)
  const inputRef = ref<HTMLInputElement | null>(null)
  const searchQuery = ref('')

  const selectedOptions = computed(() =>
    props.options.filter((opt) => props.modelValue.includes(opt.value)),
  )

  const availableOptions = computed(() =>
    props.options.filter((opt) => {
      const notSelected = !props.modelValue.includes(opt.value)
      const matchesSearch =
        !searchQuery.value || opt.label.toLowerCase().includes(searchQuery.value.toLowerCase())
      return notSelected && matchesSearch
    }),
  )

  function openDropdown() {
    if (props.disabled) return
    isOpen.value = true
    inputRef.value?.focus()
  }

  function closeDropdown() {
    isOpen.value = false
    searchQuery.value = ''
  }

  function selectOption(option: MultiselectOption) {
    if (option.disabled) return
    const next = [...props.modelValue, option.value]
    emit('update:modelValue', next)
    emit('change', next)
    searchQuery.value = ''
    inputRef.value?.focus()
  }

  function removeOption(value: string | number) {
    const next = props.modelValue.filter((v) => v !== value)
    emit('update:modelValue', next)
    emit('change', next)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDropdown()
    } else if (
      event.key === 'Backspace' &&
      !searchQuery.value &&
      selectedOptions.value.length > 0
    ) {
      const last = selectedOptions.value[selectedOptions.value.length - 1]
      removeOption(last.value)
    }
  }

  function handleBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null
    const wrapper = (event.currentTarget as HTMLElement)?.closest('.base-multiselect__wrapper')
    if (wrapper && relatedTarget && wrapper.contains(relatedTarget)) return
    closeDropdown()
    emit('blur', event)
  }

  function handleFocus(event: FocusEvent) {
    isOpen.value = true
    emit('focus', event)
  }
</script>

<template>
  <div
    :class="[
      'base-multiselect',
      `base-multiselect--${size}`,
      {
        'base-multiselect--error': !!error,
        'base-multiselect--disabled': disabled,
        'base-multiselect--open': isOpen,
      },
    ]"
  >
    <label
      v-if="label"
      :for="resolvedId"
      :class="['base-multiselect__label', { 'base-multiselect__label--hidden': labelHidden }]"
    >
      <BaseTypography variant="label" as="span" color="primary">{{ label }}</BaseTypography>
      <span
        v-if="required"
        class="base-multiselect__required"
        :title="t('required')"
        aria-hidden="true"
        >*</span
      >
    </label>

    <BaseDropdown
      :open="isOpen"
      @update:open="(val) => { if (!val) closeDropdown() }"
      @close="closeDropdown"
    >
      <template #trigger>
        <div
          class="base-multiselect__wrapper"
          role="combobox"
          :aria-expanded="isOpen"
          :aria-haspopup="'listbox'"
          :aria-owns="`${resolvedId}-listbox`"
          @click="openDropdown"
          @blur.capture="handleBlur"
        >
          <div class="base-multiselect__control">
            <div class="base-multiselect__tags">
              <BaseTag
                v-for="opt in selectedOptions"
                :key="opt.value"
                :label="opt.label"
                :size="size === 'lg' ? 'md' : 'sm'"
                variant="primary"
                :disabled="disabled"
                @remove="removeOption(opt.value)"
              />
              <input
                :id="resolvedId"
                ref="inputRef"
                v-model="searchQuery"
                type="text"
                class="base-multiselect__input"
                :placeholder="
                  selectedOptions.length === 0 ? (placeholder ?? t('placeholder')) : undefined
                "
                :disabled="disabled"
                :required="required && modelValue.length === 0"
                :aria-invalid="!!error || undefined"
                :aria-describedby="
                  error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined
                "
                :aria-autocomplete="'list'"
                autocomplete="off"
                @focus="handleFocus"
                @keydown="handleKeydown"
              />
            </div>
            <span class="base-multiselect__chevron" aria-hidden="true">
              <IconChevron size="sm" :direction="isOpen ? 'up' : 'down'" />
            </span>
          </div>
        </div>
      </template>

      <li
        v-for="opt in availableOptions"
        :key="opt.value"
        :class="[
          'base-multiselect__option',
          { 'base-multiselect__option--disabled': opt.disabled },
        ]"
        role="option"
        :aria-selected="false"
        :aria-disabled="opt.disabled || undefined"
        @mousedown.prevent="selectOption(opt)"
      >
        {{ opt.label }}
      </li>
      <li
        v-if="availableOptions.length === 0"
        class="base-multiselect__empty"
        role="option"
        aria-selected="false"
        aria-disabled="true"
      >
        {{ searchQuery ? `No results for "${searchQuery}"` : 'No options available' }}
      </li>
    </BaseDropdown>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      variant="caption"
      as="p"
      color="inherit"
      class="base-multiselect__error"
      role="alert"
      >{{ error }}</BaseTypography
    >
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      variant="caption"
      as="p"
      color="secondary"
      class="base-multiselect__hint"
      >{{ hint }}</BaseTypography
    >
  </div>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-multiselect {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__label {
      // typography handled by BaseTypography

      &--hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    }

    &__required {
      color: var(--mp-color-danger-default);
      margin-left: 2px;
    }

    &__wrapper {
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;
      cursor: text;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__control {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
    }

    &__tags {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--mp-spacing-1);
      min-width: 0;
    }

    &__input {
      @include mp.mp-font-body-md;

      flex: 1;
      min-width: 80px;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mp-color-text-primary);

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    &__chevron {
      display: flex;
      align-items: center;
      color: var(--mp-color-text-secondary);
      pointer-events: none;
      flex-shrink: 0;
    }


    &__option {
      @include mp.mp-font-body-sm;

      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      color: var(--mp-color-text-primary);
      cursor: pointer;

      &:hover:not(.base-multiselect__option--disabled) {
        background-color: var(--mp-color-bg-muted);
      }

      &--disabled {
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }
    }

    &__empty {
      @include mp.mp-font-body-sm;

      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      color: var(--mp-color-text-secondary);
      font-style: italic;
    }

    // Sizes
    &--sm {
      .base-multiselect__control {
        padding: var(--mp-spacing-1) var(--mp-spacing-2);
      }

      .base-multiselect__input {
        @include mp.mp-font-body-sm;
      }
    }

    &--md {
      .base-multiselect__control {
        padding: var(--mp-spacing-2) var(--mp-spacing-3);
      }

      .base-multiselect__input {
        @include mp.mp-font-body-md;
      }
    }

    &--lg {
      .base-multiselect__control {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);
      }

      .base-multiselect__input {
        @include mp.mp-font-body-lg;
      }
    }

    // States
    &--error {
      .base-multiselect__wrapper {
        border-color: var(--mp-color-danger-default);

        &:focus-within {
          box-shadow: var(--mp-shadow-focus-danger);
        }
      }
    }

    &--disabled {
      pointer-events: none;

      .base-multiselect__wrapper {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }

      .base-multiselect__input,
      .base-multiselect__chevron {
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
