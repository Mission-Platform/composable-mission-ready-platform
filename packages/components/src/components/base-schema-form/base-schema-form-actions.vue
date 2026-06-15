<script lang="ts" setup>
  /**
   * `BaseSchemaFormActions` — Schema form actions component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseButton from '../base-button/base-button.vue';

  defineProps<{
    resetLabel: string;
    submitLabel: string;
  }>();
</script>

<template>
  <div class="schema-form__actions">
    <slot>
      <BaseButton
        class="schema-form__btn schema-form__btn--reset"
        type="reset"
        variant="secondary"
      >
        {{ resetLabel }}
      </BaseButton>
      <BaseButton
        class="schema-form__btn schema-form__btn--submit"
        type="submit"
        variant="primary"
      >
        {{ submitLabel }}
      </BaseButton>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
  .schema-form__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--mp-spacing-2);
  }
</style>
