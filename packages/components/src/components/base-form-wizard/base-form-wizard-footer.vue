<script lang="ts" setup>
  /**
   * `BaseFormWizardFooter` — Form wizard footer component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';

  defineProps<{
    isFirst: boolean;
    isLast: boolean;
    backLabel: string;
    nextLabel: string;
    finishLabel: string;
  }>();

  const emit = defineEmits<{
    prev: [];
    next: [];
  }>();
</script>

<template>
  <footer class="base-form-wizard__footer">
    <slot
      :is-first="isFirst"
      :is-last="isLast"
      :next="() => emit('next')"
      :prev="() => emit('prev')"
    >
      <button
        v-if="!isFirst"
        class="base-form-wizard__btn base-form-wizard__btn--secondary"
        type="button"
        @click="emit('prev')"
      >
        <BaseTypography
          as="span"
          color="inherit"
          variant="body-md"
          weight="medium"
        >
          {{ backLabel }}
        </BaseTypography>
      </button>
      <button
        class="base-form-wizard__btn base-form-wizard__btn--primary"
        type="button"
        @click="emit('next')"
      >
        <BaseTypography
          as="span"
          color="inherit"
          variant="body-md"
          weight="medium"
        >
          {{ isLast ? finishLabel : nextLabel }}
        </BaseTypography>
      </button>
    </slot>
  </footer>
</template>

<style lang="scss" scoped>
  .base-form-wizard__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--mp-spacing-3);
    padding-top: var(--mp-spacing-4);
    border-top: 1px solid var(--mp-color-border-default);
  }

  .base-form-wizard__btn {
    display: inline-flex;
    align-items: center;
    padding: var(--mp-spacing-2) var(--mp-spacing-4);
    font-family: var(--mp-font-family-sans);
    border: 1px solid transparent;
    border-radius: var(--mp-radius-md);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;

    &--primary {
      background-color: var(--mp-color-primary-default);
      color: var(--mp-color-text-on-primary);

      &:hover {
        background-color: var(--mp-color-primary-hover);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &--secondary {
      background-color: var(--mp-color-bg-surface);
      border-color: var(--mp-color-border-default);
      color: var(--mp-color-text-primary);

      &:hover {
        background-color: var(--mp-color-bg-muted);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }
  }
</style>
