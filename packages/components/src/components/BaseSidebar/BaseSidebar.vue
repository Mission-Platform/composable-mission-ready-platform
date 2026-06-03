<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import BaseSidebarHeader from './BaseSidebarHeader.vue'
  import BaseSidebarBody from './BaseSidebarBody.vue'
  import BaseSidebarFooter from './BaseSidebarFooter.vue'
  import { useRouterClose } from '../../composables/useRouterClose'

  export type SidebarSide = 'left' | 'right'
  export type SidebarSize = 'sm' | 'md' | 'lg' | 'xl'

  const props = withDefaults(
    defineProps<{
      open?: boolean
      side?: SidebarSide
      size?: SidebarSize
      title?: string
      closeOnBackdrop?: boolean
      closeOnRouteChange?: boolean
    }>(),
    {
      open: false,
      side: 'left',
      size: 'md',
      title: undefined,
      closeOnBackdrop: true,
      closeOnRouteChange: true,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { close: 'Close sidebar' } },
  })

  function handleClose() {
    emit('update:open', false)
    emit('close')
  }

  useRouterClose(() => {
    if (props.closeOnRouteChange) handleClose()
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="base-sidebar-fade">
      <div
        v-if="open"
        class="base-sidebar-backdrop"
        aria-hidden="true"
        @click="closeOnBackdrop && handleClose()"
      />
    </Transition>
    <Transition :name="`base-sidebar-slide-${side}`">
      <aside
        v-if="open"
        :class="['base-sidebar', `base-sidebar--${side}`, `base-sidebar--${size}`]"
        :aria-label="title"
      >
        <BaseSidebarHeader
          v-if="title || $slots.header"
          :title="title"
          :close-label="t('close')"
          @close="handleClose"
        >
          <template v-if="$slots.header" #default>
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

<style scoped lang="scss">
  @use '@mission-platform/breakpoints/scss/mixins' as bp;

  .base-sidebar-backdrop {
    position: fixed;
    inset: 0;
    background-color: var(--mp-color-bg-scrim-soft);
    z-index: 400;
  }

  .base-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    z-index: 401;
    background-color: var(--mp-color-bg-surface);
    box-shadow: var(--mp-shadow-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    // On mobile, sidebar always spans full viewport width
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

    // Named width variants: apply fixed widths only on sm+ (tablet/desktop)
    @include bp.bp-up('sm') {
      &--sm { width: 20rem;     } // ~280px
      &--md { width: 25.714rem; } // ~360px
      &--lg { width: 34.286rem; } // ~480px
      &--xl { width: 45.714rem; } // ~640px
    }
  }

  // Transitions
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
