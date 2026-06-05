<script lang="ts" setup>
  import { useI18n } from '@mission-platform/i18n';
  import { ref, watch } from 'vue';

  import { useRouterClose } from '../../composables/use-router-close';
  import { useZIndex } from '../../composables/use-z-index';

  import BaseDialogBody from './base-dialog-body.vue';
  import BaseDialogFooter from './base-dialog-footer.vue';
  import BaseDialogHeader from './base-dialog-header.vue';

  const props = withDefaults(
    defineProps<{
      open?: boolean;
      title?: string;
      closeOnBackdrop?: boolean;
      closeOnRouteChange?: boolean;
    }>(),
    {
      open: false,
      title: undefined,
      closeOnBackdrop: true,
      closeOnRouteChange: true,
    },
  );

  const emit = defineEmits<{
    'update:open': [value: boolean];
    close: [];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { zIndex } = useZIndex('modal');

  const dialogRef = ref<HTMLDialogElement | undefined>(undefined);

  watch(
    () => props.open,
    (value) => {
      if (!dialogRef.value) return;
      if (value) {
        dialogRef.value.showModal();
      } else {
        dialogRef.value.close();
      }
    },
    { immediate: true, flush: 'post' },
  );

  function handleClose() {
    emit('update:open', false);
    emit('close');
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') handleClose();
  }

  useRouterClose(() => {
    if (props.closeOnRouteChange) handleClose();
  });
</script>

<template>
  <Teleport to="body">
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <dialog
      ref="dialogRef"
      :style="{ zIndex }"
      class="base-dialog"
      @close="handleClose"
      @keydown="handleBackdropKeydown"
      @click.self="props.closeOnBackdrop && handleClose()"
    >
      <div class="base-dialog__panel">
        <BaseDialogHeader
          v-if="title || $slots.header"
          :close-label="t('close')"
          :title="title"
          @close="handleClose"
        >
          <template
            v-if="$slots.header"
            #default
          >
            <slot name="header" />
          </template>
        </BaseDialogHeader>
        <BaseDialogBody>
          <slot />
        </BaseDialogBody>
        <BaseDialogFooter v-if="$slots.footer">
          <slot name="footer" />
        </BaseDialogFooter>
      </div>
    </dialog>
  </Teleport>
</template>

<style lang="scss" scoped>
  .base-dialog {
    padding: 0;
    border: none;
    border-radius: var(--mp-radius-xl);
    background: var(--mp-color-bg-surface);
    box-shadow: var(--mp-shadow-xl);
    max-width: min(560px, calc(100vw - 2rem));
    width: 100%;

    &::backdrop {
      background-color: var(--mp-color-bg-scrim);
    }

    &[open] {
      display: flex;
    }

    &__panel {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
  }
</style>

<i18n lang="yaml">
en:
  close: Close
</i18n>
