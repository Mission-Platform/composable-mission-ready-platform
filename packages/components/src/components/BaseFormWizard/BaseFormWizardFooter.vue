<script setup lang="ts">
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  defineProps<{
    isFirst: boolean
    isLast: boolean
    backLabel: string
    nextLabel: string
    finishLabel: string
  }>()

  const emit = defineEmits<{
    prev: []
    next: []
  }>()
</script>

<template>
  <footer class="base-form-wizard__footer">
    <slot :prev="() => emit('prev')" :next="() => emit('next')" :is-first="isFirst" :is-last="isLast">
      <button
        v-if="!isFirst"
        type="button"
        class="base-form-wizard__btn base-form-wizard__btn--secondary"
        @click="emit('prev')"
      >
        <BaseTypography variant="body-md" weight="medium" as="span" color="inherit">{{ backLabel }}</BaseTypography>
      </button>
      <button
        type="button"
        class="base-form-wizard__btn base-form-wizard__btn--primary"
        @click="emit('next')"
      >
        <BaseTypography variant="body-md" weight="medium" as="span" color="inherit">{{ isLast ? finishLabel : nextLabel }}</BaseTypography>
      </button>
    </slot>
  </footer>
</template>

<style scoped lang="scss">
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
    transition: background-color 150ms ease, border-color 150ms ease;

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
