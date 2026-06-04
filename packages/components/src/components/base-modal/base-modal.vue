<script lang="ts" setup>
  import { useI18n } from '@mission-platform/i18n';
  import { watch } from 'vue';

  import { useRouterClose } from '../../composables/use-router-close';

  import BaseModalBody from './base-modal-body.vue';
  import BaseModalFooter from './base-modal-footer.vue';
  import BaseModalHeader from './base-modal-header.vue';

  export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

  const props = withDefaults(
    defineProps<{
      open?: boolean;
      title?: string;
      size?: ModalSize;
      closeOnBackdrop?: boolean;
      closeOnEsc?: boolean;
      closeOnRouteChange?: boolean;
    }>(),
    {
      open: false,
      title: undefined,
      size: 'md',
      closeOnBackdrop: true,
      closeOnEsc: true,
      closeOnRouteChange: true,
    },
  );

  const emit = defineEmits<{
    'update:open': [value: boolean];
    close: [];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  watch(
    () => props.open,
    (open) => {
      document.body.style.overflow = open ? 'hidden' : '';
    },
  );

  function handleClose() {
    emit('update:open', false);
    emit('close');
  }

  function handleBackdropClick() {
    if (props.closeOnBackdrop) handleClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (props.closeOnEsc && event.key === 'Escape') handleClose();
  }

  useRouterClose(() => {
    if (props.closeOnRouteChange) handleClose();
  });
</script>

<template>
  <Teleport to="body">
    <Transition name="base-modal-fade">
      <div
        v-if="open"
        class="base-modal-overlay"
        role="presentation"
        @keydown="handleKeydown"
        @click.self="handleBackdropClick"
      >
        <Transition name="base-modal-scale">
          <dialog
            v-if="open"
            :aria-label="title"
            :class="['base-modal', `base-modal--${size}`]"
            @click.stop
          >
            <BaseModalHeader
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
            </BaseModalHeader>
            <BaseModalBody>
              <slot />
            </BaseModalBody>
            <BaseModalFooter v-if="$slots.footer">
              <slot name="footer" />
            </BaseModalFooter>
          </dialog>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/breakpoints/scss/mixins' as bp;

  .base-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    background-color: var(--mp-color-bg-scrim);
    display: flex;

    /* On mobile: slide modal up from bottom, full-width */
    align-items: flex-end;
    justify-content: center;
    padding: 0;

    @include bp.bp-up('sm') {
      align-items: center;
      padding: var(--mp-spacing-4);
    }
  }

  .base-modal {
    position: static;
    margin: 0;
    border: none;
    background-color: var(--mp-color-bg-surface);

    /* Mobile: square bottom corners, rounded top corners only */
    border-radius: var(--mp-radius-xl) var(--mp-radius-xl) 0 0;
    box-shadow: var(--mp-shadow-2xl);
    display: flex;
    flex-direction: column;

    /* Mobile: take up to 90% of viewport height, full width */
    max-height: 90vh;
    overflow: hidden;
    width: 100%;

    @include bp.bp-up('sm') {
      /* Tablet+: centred dialog, rounded all corners */
      border-radius: var(--mp-radius-xl);
      max-height: calc(100vh - var(--mp-spacing-8));
    }

    /* Size variants only apply on sm+ (tablet/desktop); on mobile always full-width */
    @include bp.bp-up('sm') {
      &--sm {
        max-width: var(--mp-size-width-sm);
      }

      &--md {
        max-width: var(--mp-size-width-md);
      }

      &--lg {
        max-width: 51.429rem;
      } /* ~720px */
      &--xl {
        max-width: 68.571rem;
      } /* ~960px */
      &--full {
        max-width: calc(100vw - var(--mp-spacing-8));
        max-height: calc(100vh - var(--mp-spacing-8));
      }
    }
  }

  /* Transitions */
  .base-modal-fade-enter-active,
  .base-modal-fade-leave-active {
    transition: opacity 200ms ease;
  }

  .base-modal-fade-enter-from,
  .base-modal-fade-leave-to {
    opacity: 0;
  }

  .base-modal-scale-enter-active,
  .base-modal-scale-leave-active {
    transition:
      transform 200ms ease,
      opacity 200ms ease;
  }

  .base-modal-scale-enter-from,
  .base-modal-scale-leave-to {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
</style>

<i18n lang="yaml">
en:
  close: Close
</i18n>
