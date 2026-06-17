<script lang="ts" setup>
  /**
   * `BaseSearchInput` — Search input component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { IconClose, IconSearch } from '@mission-platform/icons';
  import { computed, ref } from 'vue';

  import { useId } from '../../composables/use-id';

  export type SearchInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      placeholder?: string;
      size?: SearchInputSize;
      disabled?: boolean;
      loading?: boolean;
      id?: string;
    }>(),
    {
      modelValue: '',
      placeholder: 'Search…',
      size: 'md',
      disabled: false,
      loading: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    search: [value: string];
    clear: [];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  const { id: resolvedId } = useId(props.id);
  const inputRef = ref<HTMLInputElement | null>(null);

  const hasValue = computed(() => props.modelValue.length > 0);

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.value);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      emit('search', props.modelValue);
    } else if (event.key === 'Escape') {
      handleClear();
    }
  }

  function handleClear() {
    emit('update:modelValue', '');
    emit('clear');
    inputRef.value?.focus();
  }
</script>

<template>
  <div :class="['base-search-input', `base-search-input--${size}`, { 'base-search-input--disabled': disabled }]">
    <div class="base-search-input__wrapper">
      <span
        aria-hidden="true"
        class="base-search-input__search-icon"
      >
        <IconSearch
          v-if="!loading"
          size="sm"
        />
        <span
          v-else
          :aria-label="t('loading')"
          class="base-search-input__spinner"
          role="status"
        />
      </span>
      <input
        :id="resolvedId"
        ref="inputRef"
        :aria-busy="loading"
        :disabled="disabled"
        :placeholder="placeholder"
        :value="modelValue"
        class="base-search-input__field"
        type="search"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <button
        v-if="hasValue"
        :aria-label="t('clear')"
        class="base-search-input__clear"
        type="button"
        @click="handleClear"
      >
        <IconClose size="xs" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-search-input {
      display: flex;
      flex-direction: column;

      &__wrapper {
        display: flex;
        align-items: center;
        border: 1px solid var(--mp-color-border-default);
        border-radius: var(--mp-radius-md);
        background-color: var(--mp-color-bg-surface);
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;
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

        /* Remove native search clear button */
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

      /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
      @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
        &--#{$size} {
          .base-search-input__wrapper {
            padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
          }

          .base-search-input__field {
            padding: 0;
            font-size: var(--mp-size-font-#{$size});
          }
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
      to {
        transform: rotate(360deg);
      }
    }
  }
</style>

<i18n lang="yaml">
en:
  clear: Clear search
  loading: Searching…
</i18n>
