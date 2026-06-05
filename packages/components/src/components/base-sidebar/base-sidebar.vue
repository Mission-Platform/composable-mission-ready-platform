<script lang="ts" setup>
  import { useI18n } from '@mission-platform/i18n';

  import { useRouterClose } from '../../composables/use-router-close';
  import { useZIndex } from '../../composables/use-z-index';

  import BaseSidebarBody from './base-sidebar-body.vue';
  import BaseSidebarFooter from './base-sidebar-footer.vue';
  import BaseSidebarHeader from './base-sidebar-header.vue';

  export type SidebarSide = 'left' | 'right';
  export type SidebarSize = 'sm' | 'md' | 'lg' | 'xl';

  const props = withDefaults(
    defineProps<{
      open?: boolean;
      side?: SidebarSide;
      size?: SidebarSize;
      title?: string;
      closeOnBackdrop?: boolean;
      closeOnRouteChange?: boolean;
    }>(),
    {
      open: false,
      side: 'left',
      size: 'md',
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
  const { zIndex } = useZIndex('popover');

  function handleClose() {
    emit('update:open', false);
    emit('close');
  }

  useRouterClose(() => {
    if (props.closeOnRouteChange) handleClose();
  });
</script>

<template>
  <Teleport to="body">
    <Transition name="base-sidebar-fade">
      <div
        v-if="open"
        :style="{ zIndex }"
        aria-hidden="true"
        class="base-sidebar-backdrop"
        @click="closeOnBackdrop && handleClose()"
      />
    </Transition>
    <Transition :name="`base-sidebar-slide-${side}`">
      <aside
        v-if="open"
        :aria-label="title"
        :class="['base-sidebar', `base-sidebar--${side}`, `base-sidebar--${size}`]"
        :style="{ zIndex: zIndex + 1 }"
      >
        <BaseSidebarHeader
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
        </BaseSidebarHeader>
        <BaseSidebarBody>
          <slot />
        </BaseSidebarBody>
        <BaseSidebarFooter v-if="$slots.footer">
          <slot name="footer" />
        </BaseSidebarFooter>
      </aside>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/breakpoints/scss/mixins' as bp;

  .base-sidebar-backdrop {
    position: fixed;
    inset: 0;
    background-color: var(--mp-color-bg-scrim-soft);
  }

  .base-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    background-color: var(--mp-color-bg-surface);
    box-shadow: var(--mp-shadow-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    /* On mobile, sidebar always spans full viewport width */
    width: 100vw;
    max-width: 100vw;

    &--left {
      left: 0;
      border-right: 1px solid var(--mp-color-border-default);
    }

    &--right {
      right: 0;
      border-left: 1px solid var(--mp-color-border-default);
    }

    /* Named width variants: apply fixed widths only on sm+ (tablet/desktop) */
    @include bp.bp-up('sm') {
      &--sm {
        width: 20rem;
      } /* ~280px */
      &--md {
        width: 25.714rem;
      } /* ~360px */
      &--lg {
        width: 34.286rem;
      } /* ~480px */
      &--xl {
        width: 45.714rem;
      } /* ~640px */
    }
  }

  /* Transitions */
  .base-sidebar-fade-enter-active,
  .base-sidebar-fade-leave-active {
    transition: opacity 250ms ease;
  }

  .base-sidebar-fade-enter-from,
  .base-sidebar-fade-leave-to {
    opacity: 0;
  }

  .base-sidebar-slide-left-enter-active,
  .base-sidebar-slide-left-leave-active,
  .base-sidebar-slide-right-enter-active,
  .base-sidebar-slide-right-leave-active {
    transition: transform 250ms ease;
  }

  .base-sidebar-slide-left-enter-from,
  .base-sidebar-slide-left-leave-to {
    transform: translateX(-100%);
  }

  .base-sidebar-slide-right-enter-from,
  .base-sidebar-slide-right-leave-to {
    transform: translateX(100%);
  }
</style>

<i18n lang="yaml">
en:
  close: Close sidebar
</i18n>
