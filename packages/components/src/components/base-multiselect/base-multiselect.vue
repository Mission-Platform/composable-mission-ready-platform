<script lang="ts" setup>
  /**
   * `BaseMultiselect` — Multiselect component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { IconChevron } from '@mission-platform/icons';
  import { computed, ref } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseDropdown from '../base-dropdown/base-dropdown.vue';
  import BaseTag from '../base-tag/base-tag.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type MultiselectSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  export interface MultiselectOption {
    label: string;
    value: string | number;
    disabled?: boolean;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: (string | number)[];
      options?: MultiselectOption[];
      size?: MultiselectSize;
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
  );

  const emit = defineEmits<{
    'update:modelValue': [value: (string | number)[]];
    change: [value: (string | number)[]];
    blur: [event: FocusEvent];
    focus: [event: FocusEvent];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { id: resolvedId } = useId(props.id);

  const isOpen = ref(false);
  const inputRef = ref<HTMLInputElement | null>(null);
  const searchQuery = ref('');

  const selectedOptions = computed(() => props.options.filter((opt) => props.modelValue.includes(opt.value)));

  const availableOptions = computed(() =>
    props.options.filter((opt) => {
      const notSelected = !props.modelValue.includes(opt.value);
      const matchesSearch = !searchQuery.value || opt.label.toLowerCase().includes(searchQuery.value.toLowerCase());
      return notSelected && matchesSearch;
    }),
  );

  function openDropdown() {
    if (props.disabled) return;
    isOpen.value = true;
    inputRef.value?.focus();
  }

  function closeDropdown() {
    isOpen.value = false;
    searchQuery.value = '';
  }

  function selectOption(option: MultiselectOption) {
    if (option.disabled) return;
    const next = [...props.modelValue, option.value];
    emit('update:modelValue', next);
    emit('change', next);
    searchQuery.value = '';
    inputRef.value?.focus();
  }

  function removeOption(value: string | number) {
    const next = props.modelValue.filter((v) => v !== value);
    emit('update:modelValue', next);
    emit('change', next);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDropdown();
    } else if (event.key === 'Backspace' && !searchQuery.value && selectedOptions.value.length > 0) {
      const last = selectedOptions.value[selectedOptions.value.length - 1];
      removeOption(last.value);
    }
  }

  function handleBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const wrapper = (event.currentTarget as HTMLElement)?.closest('.base-multiselect__wrapper');
    if (wrapper && relatedTarget && wrapper.contains(relatedTarget)) return;
    closeDropdown();
    emit('blur', event);
  }

  function handleFocus(event: FocusEvent) {
    isOpen.value = true;
    emit('focus', event);
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
      :class="['base-multiselect__label', { 'base-multiselect__label--hidden': labelHidden }]"
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
        class="base-multiselect__required"
      >
        *
      </span>
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
          class="base-multiselect__wrapper"
          role="combobox"
          tabindex="0"
          @click="openDropdown"
          @blur.capture="handleBlur"
          @keydown.enter="openDropdown"
          @keydown.space="openDropdown"
        >
          <div class="base-multiselect__control">
            <div class="base-multiselect__tags">
              <BaseTag
                v-for="opt in selectedOptions"
                :key="opt.value"
                :disabled="disabled"
                :label="opt.label"
                :size="size === 'lg' ? 'md' : 'sm'"
                removable
                variant="primary"
                @remove="removeOption(opt.value)"
              />
              <input
                :id="resolvedId"
                ref="inputRef"
                v-model="searchQuery"
                :aria-autocomplete="'list'"
                :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
                :aria-invalid="!!error || undefined"
                :disabled="disabled"
                :placeholder="selectedOptions.length === 0 ? (placeholder ?? t('placeholder')) : undefined"
                :required="required && modelValue.length === 0"
                autocomplete="off"
                class="base-multiselect__input"
                type="text"
                @focus="handleFocus"
                @keydown="handleKeydown"
              />
            </div>
            <span
              aria-hidden="true"
              class="base-multiselect__chevron"
            >
              <IconChevron
                :direction="isOpen ? 'up' : 'down'"
                size="sm"
              />
            </span>
          </div>
        </div>
      </template>

      <li
        v-for="opt in availableOptions"
        :key="opt.value"
        :aria-disabled="opt.disabled || undefined"
        :aria-selected="false"
        :class="['base-multiselect__option', { 'base-multiselect__option--disabled': opt.disabled }]"
        role="option"
        tabindex="-1"
        @mousedown.prevent="selectOption(opt)"
      >
        {{ opt.label }}
      </li>
      <li
        v-if="availableOptions.length === 0"
        aria-disabled="true"
        aria-selected="false"
        class="base-multiselect__empty"
        role="option"
        tabindex="-1"
      >
        {{ searchQuery ? `No results for "${searchQuery}"` : 'No options available' }}
      </li>
    </BaseDropdown>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-multiselect__error"
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
      class="base-multiselect__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-multiselect {
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

      &--disabled {
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }

      &:hover:not(.base-multiselect__option--disabled) {
        background-color: var(--mp-color-bg-muted);
      }
    }

    &__empty {
      @include mp.mp-font-body-sm;

      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      color: var(--mp-color-text-secondary);
      font-style: italic;
    }

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} {
        .base-multiselect__control {
          padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
        }

        .base-multiselect__input {
          font-size: var(--mp-size-font-#{$size});
        }
      }
    }

    /* States */
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

<i18n lang="yaml">
en:
  required: required
  placeholder: Select options…
</i18n>
