<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { IconClose, IconSearch } from '@mission-platform/icons'

  import { useId } from '../../composables/useId'

  export type SearchInputSize = 'sm' | 'md' | 'lg'

  const props = withDefaults(
    defineProps<{
      modelValue?: string
      placeholder?: string
      size?: SearchInputSize
      disabled?: boolean
      loading?: boolean
      id?: string
    }>(),
    {
      modelValue: '',
      placeholder: 'Search…',
      size: 'md',
      disabled: false,
      loading: false,
      id: undefined,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    search: [value: string]
    clear: []
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { clear: 'Clear search', loading: 'Searching…' } },
  })

  const { id: resolvedId } = useId(props.id)
  const inputRef = ref<HTMLInputElement | null>(null)

  const hasValue = computed(() => props.modelValue.length > 0)

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.value)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      emit('search', props.modelValue)
    } else if (event.key === 'Escape') {
      handleClear()
    }
  }

  function handleClear() {
    emit('update:modelValue', '')
    emit('clear')
    inputRef.value?.focus()
  }
</script>

<template>
  <div
    :class="['base-search-input', `base-search-input--${size}`, { 'base-search-input--disabled': disabled }]"
  >
    <div class="base-search-input__wrapper">
      <span class="base-search-input__search-icon" aria-hidden="true">
        <IconSearch v-if="!loading" size="sm" />
        <span v-else class="base-search-input__spinner" role="status" :aria-label="t('loading')" />
      </span>
      <input
        :id="resolvedId"
        ref="inputRef"
        type="search"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-busy="loading"
        class="base-search-input__field"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <button
        v-if="hasValue"
        type="button"
        class="base-search-input__clear"
        :aria-label="t('clear')"
        @click="handleClear"
      >
        <IconClose size="xs" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .base-search-input {
    display: flex;
    flex-direction: column;

    &__wrapper {
      display: flex;
      align-items: center;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      transition: border-color 150ms ease, box-shadow 150ms ease;
      gap: var(--mp-spacing-1);

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__search-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--mp-color-text-tertiary);
    }

    &__field {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mp-color-text-primary);
      font-family: var(--mp-font-family-sans);

      &::placeholder {
        color: var(--mp-color-text-tertiary);
      }

      // Remove native search clear button
      &::-webkit-search-cancel-button {
        display: none;
      }
    }

    &__clear {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--mp-color-text-tertiary);
      border-radius: var(--mp-radius-full);
      flex-shrink: 0;
      line-height: 1;

      &:hover {
        color: var(--mp-color-text-primary);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid currentcolor;
      border-top-color: transparent;
      border-radius: var(--mp-radius-full);
      animation: mp-spin 0.6s linear infinite;
    }

    // Sizes
    &--sm {
      .base-search-input__wrapper {
        padding: var(--mp-spacing-1) var(--mp-spacing-3);
      }

      .base-search-input__field {
        padding: 0;
        font-size: var(--mp-font-size-sm);
      }
    }

    &--md {
      .base-search-input__wrapper {
        padding: var(--mp-spacing-2) var(--mp-spacing-4);
      }

      .base-search-input__field {
        padding: 0;
        font-size: var(--mp-font-size-md);
      }
    }

    &--lg {
      .base-search-input__wrapper {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);
      }

      .base-search-input__field {
        padding: 0;
        font-size: var(--mp-font-size-lg);
      }
    }

    &--disabled {
      pointer-events: none;

      .base-search-input__wrapper {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }

      .base-search-input__field,
      .base-search-input__search-icon,
      .base-search-input__clear {
        color: var(--mp-color-text-disabled);
      }
    }
  }

  @keyframes mp-spin {
    to { transform: rotate(360deg); }
  }
</style>
