<script lang="ts" setup>
  /**
   * `BaseSidebarHeader` — Sidebar header component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconClose } from '@mission-platform/icons';

  import BaseTypography from '../base-typography/base-typography.vue';

  defineProps<{
    title?: string;
    closeLabel: string;
  }>();

  const emit = defineEmits<{
    close: [];
  }>();
</script>

<template>
  <header class="base-sidebar__header">
    <slot>
      <BaseTypography
        v-if="title"
        as="h2"
        class="base-sidebar__title"
        color="primary"
        variant="h5"
      >
        {{ title }}
      </BaseTypography>
    </slot>
    <button
      :aria-label="closeLabel"
      class="base-sidebar__close"
      type="button"
      @click="emit('close')"
    >
      <IconClose size="md" />
    </button>
  </header>
</template>

<style lang="scss" scoped>
  .base-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--mp-spacing-4) var(--mp-spacing-6);
    border-bottom: 1px solid var(--mp-color-border-default);
    flex-shrink: 0;
    gap: var(--mp-spacing-4);
  }

  .base-sidebar__title {
    margin: 0;
  }

  .base-sidebar__close {
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
