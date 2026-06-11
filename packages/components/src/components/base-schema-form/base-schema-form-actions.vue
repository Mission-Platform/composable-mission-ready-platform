<script lang="ts" setup>
  /**
   * `BaseSchemaFormActions` — Schema form actions component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  defineProps<{
    resetLabel: string;
    submitLabel: string;
  }>();
</script>

<template>
  <div class="schema-form__actions">
    <slot>
      <button
        class="schema-form__btn schema-form__btn--reset"
        type="reset"
      >
        {{ resetLabel }}
      </button>
      <button
        class="schema-form__btn schema-form__btn--submit"
        type="submit"
      >
        {{ submitLabel }}
      </button>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .schema-form__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--mp-spacing-2);
  }

  .schema-form__btn {
    @include mp.mp-font('body-md', $weight: 'medium');

    padding: var(--mp-spacing-2) var(--mp-spacing-4);
    border-radius: var(--mp-radius-md);
    border: 1px solid var(--mp-color-border-default);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      border-color 150ms ease;

    &--reset {
      background-color: var(--mp-color-bg-surface);
      color: var(--mp-color-text-secondary);

      &:hover {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-primary);
      }
    }

    &--submit {
      background-color: var(--mp-color-primary-default);
      color: var(--mp-color-text-on-primary);
      border-color: var(--mp-color-primary-default);

      &:hover {
        background-color: var(--mp-color-primary-hover, var(--mp-color-primary-default));
      }
    }
  }
</style>
