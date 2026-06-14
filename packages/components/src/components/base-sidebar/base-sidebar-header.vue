<script lang="ts" setup>
  /**
   * `BaseSidebarHeader` — Sidebar header component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconClose } from '@mission-platform/icons';

  import BaseIconButton from '../base-icon-button/base-icon-button.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  withDefaults(
    defineProps<{
      title?: string;
      closeLabel: string;
      /** Hide the close button (e.g. for an inline, fixed-open sidebar). */
      hideClose?: boolean;
    }>(),
    {
      title: undefined,
      hideClose: false,
    },
  );

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
    <BaseIconButton
      v-if="!hideClose"
      :label="closeLabel"
      class="base-sidebar__close"
      size="sm"
      @click="emit('close')"
    >
      <IconClose size="md" />
    </BaseIconButton>
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
</style>
