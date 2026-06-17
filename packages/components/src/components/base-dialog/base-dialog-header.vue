<script lang="ts" setup>
  /**
   * `BaseDialogHeader` — Dialog header component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconClose } from '@mission-platform/icons';

  import BaseIconButton from '../base-icon-button/base-icon-button.vue';
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
    <BaseIconButton
      :label="closeLabel"
      class="base-dialog__close"
      size="sm"
      @click="emit('close')"
    >
      <IconClose size="md" />
    </BaseIconButton>
  </header>
</template>

<style lang="scss" scoped>
  @layer mp.components {
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
  }
</style>
