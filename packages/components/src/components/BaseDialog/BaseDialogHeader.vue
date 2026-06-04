<script lang="ts" setup>
  import { IconClose } from '@mission-platform/icons';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  defineProps<{
    title?: string;
    closeLabel: string;
  }>();

  const emit = defineEmits<{
    close: [];
  }>();
</script>

<template>
  <header class="base-dialog__header">
    <slot>
      <BaseTypography
        v-if="title"
        as="h2"
        class="base-dialog__title"
        color="primary"
        variant="h5"
      >
        {{ title }}
      </BaseTypography>
    </slot>
    <button
      :aria-label="closeLabel"
      class="base-dialog__close"
      type="button"
      @click="emit('close')"
    >
      <IconClose size="md" />
    </button>
  </header>
</template>

<style lang="scss" scoped>
  .base-dialog__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--mp-spacing-4) var(--mp-spacing-6);
    border-bottom: 1px solid var(--mp-color-border-default);
    gap: var(--mp-spacing-4);
  }

  .base-dialog__title {
    margin: 0;
  }

  .base-dialog__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--mp-spacing-1);
    border: none;
    border-radius: var(--mp-radius-sm);
    background: transparent;
    cursor: pointer;
    color: var(--mp-color-text-secondary);
    flex-shrink: 0;
    line-height: 1;

    &:hover {
      background-color: var(--mp-color-bg-muted);
      color: var(--mp-color-text-primary);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }
  }
</style>
