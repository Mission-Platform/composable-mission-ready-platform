<script setup lang="ts">
  import { onBeforeUnmount, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { IconArrow, IconExternalLink } from '@mission-platform/icons'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  const props = withDefaults(
    defineProps<{
      title?: string
      width?: number
      height?: number
    }>(),
    {
      title: undefined,
      width: 800,
      height: 600,
    },
  )

  const emit = defineEmits<{
    open: []
    close: []
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: {
      en: {
        popout: 'Pop out',
        popin: 'Pop back in',
      },
    },
  })

  const isPopped = ref(false)
  const popoutWindow = ref<Window | null>(null)
  const popoutContainer = ref<HTMLElement | null>(null)
  let closePoller: ReturnType<typeof setInterval> | null = null

  function copyStyles(sourceDoc: Document, targetDoc: Document) {
    Array.from(sourceDoc.querySelectorAll('link[rel="stylesheet"], style')).forEach((el) => {
      targetDoc.head.appendChild(el.cloneNode(true))
    })
  }

  function openPopout() {
    const features = `width=${props.width},height=${props.height},resizable=yes,scrollbars=yes`
    const win = window.open('', '_blank', features)
    if (!win) return

    win.document.title = props.title ?? document.title
    win.document.body.style.margin = '0'

    const container = win.document.createElement('div')
    container.setAttribute('id', 'mp-popout-root')
    container.style.height = '100%'
    win.document.body.appendChild(container)

    copyStyles(document, win.document)

    popoutWindow.value = win
    popoutContainer.value = container
    isPopped.value = true
    emit('open')

    // Detect external close (user clicks the X on the popout window)
    closePoller = setInterval(() => {
      if (win.closed) {
        clearPollerAndReset()
        emit('close')
      }
    }, 250)

    win.addEventListener('beforeunload', () => {
      clearPollerAndReset()
      emit('close')
    })
  }

  function clearPollerAndReset() {
    if (closePoller) {
      clearInterval(closePoller)
      closePoller = null
    }
    popoutWindow.value = null
    popoutContainer.value = null
    isPopped.value = false
  }

  function closePopout() {
    if (popoutWindow.value && !popoutWindow.value.closed) {
      popoutWindow.value.close()
    }
    clearPollerAndReset()
    emit('close')
  }

  onBeforeUnmount(() => {
    if (closePoller) clearInterval(closePoller)
    if (popoutWindow.value && !popoutWindow.value.closed) {
      popoutWindow.value.close()
    }
  })

  defineExpose({ openPopout, closePopout, isPopped })
</script>

<template>
  <div class="base-window-popout">
    <!-- Inline content shown when not popped out -->
    <div v-if="!isPopped" class="base-window-popout__inline">
      <slot />
    </div>

    <!-- Placeholder shown in the host page while content is in the popout -->
    <output v-else class="base-window-popout__placeholder" aria-live="polite">
      <slot name="placeholder">
        <BaseTypography variant="body-sm" as="p" color="secondary" class="base-window-popout__placeholder-text">
          <slot name="placeholder-text">Content is open in a separate window.</slot>
        </BaseTypography>
      </slot>
    </output>

    <!-- Teleport slot content into the new window when popped -->
    <Teleport v-if="isPopped && popoutContainer" :to="popoutContainer">
      <slot />
    </Teleport>

    <!-- Toggle button (shown unless consumer suppresses it via the controls slot) -->
    <div class="base-window-popout__controls">
      <slot name="controls" :is-popped="isPopped" :open="openPopout" :close="closePopout">
        <button
          type="button"
          class="base-window-popout__toggle"
          :aria-pressed="isPopped"
          @click="isPopped ? closePopout() : openPopout()"
        >
          <!-- Pop-out icon -->
          <IconExternalLink v-if="!isPopped" size="sm" />
          <!-- Pop-in icon -->
          <IconArrow v-else size="sm" direction="left" />
          <BaseTypography variant="body-sm" as="span" color="inherit" class="base-window-popout__toggle-label">
            {{ isPopped ? t('popin') : t('popout') }}
          </BaseTypography>
        </button>
      </slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .base-window-popout {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-2);

    &__inline {
      width: 100%;
    }

    &__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--mp-spacing-6);
      border: 2px dashed var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      background-color: var(--mp-color-bg-muted);
      min-height: 80px;
    }

    &__placeholder-text {
      margin: 0;
      // typography handled by BaseTypography
    }

    &__controls {
      display: flex;
      justify-content: flex-end;
    }

    &__toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--mp-spacing-1);
      padding: var(--mp-spacing-1) var(--mp-spacing-3);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background: var(--mp-color-bg-surface);
      cursor: pointer;
      transition:
        background-color 150ms ease,
        color 150ms ease,
        border-color 150ms ease;

      &:hover {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-primary);
        border-color: var(--mp-color-border-strong);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }

      &[aria-pressed='true'] {
        background-color: var(--mp-color-primary-muted);
        color: var(--mp-color-primary-text);
        border-color: var(--mp-color-primary-default);
      }
    }

    &__toggle-label {
      // typography handled by BaseTypography
    }
  }
</style>
