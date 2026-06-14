<script lang="ts" setup>
  /**
   * `BaseFormWizardFooter` — Form wizard footer component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseButton from '../base-button/base-button.vue';

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
      <BaseButton
        v-if="!isFirst"
        class="base-form-wizard__btn base-form-wizard__btn--secondary"
        type="button"
        variant="secondary"
        @click="emit('prev')"
      >
        {{ backLabel }}
      </BaseButton>
      <BaseButton
        class="base-form-wizard__btn base-form-wizard__btn--primary"
        type="button"
        variant="primary"
        @click="emit('next')"
      >
        {{ isLast ? finishLabel : nextLabel }}
      </BaseButton>
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
</style>
