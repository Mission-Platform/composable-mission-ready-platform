<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import BaseDialogHeader from './BaseDialogHeader.vue'
  import BaseDialogBody from './BaseDialogBody.vue'
  import BaseDialogFooter from './BaseDialogFooter.vue'
  import { useRouterClose } from '../../composables/useRouterClose'

  const props = withDefaults(
    defineProps<{
      open?: boolean
      title?: string
      closeOnBackdrop?: boolean
      closeOnRouteChange?: boolean
    }>(),
    {
      open: false,
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
    messages: { en: { close: 'Close' } },
  })

  const dialogRef = ref<HTMLDialogElement | null>(null)

  watch(
    () => props.open,
    (value) => {
      if (!dialogRef.value) return
      if (value) {
        dialogRef.value.showModal()
      } else {
        dialogRef.value.close()
      }
    },
    { immediate: true, flush: 'post' },
  )

  function handleClose() {
    emit('update:open', false)
    emit('close')
  }

  function handleBackdropClick(event: MouseEvent) {
    if (!props.closeOnBackdrop) return
    const rect = dialogRef.value?.getBoundingClientRect()
    if (!rect) return
    const { clientX: x, clientY: y } = event
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      handleClose()
    }
  }

  useRouterClose(() => {
    if (props.closeOnRouteChange) handleClose()
  })
</script>

<template>
  <dialog
    ref="dialogRef"
    class="base-dialog"
    @close="handleClose"
    @click="handleBackdropClick"
  >
    <div class="base-dialog__panel" @click.stop>
      <BaseDialogHeader
        v-if="title || $slots.header"
        :title="title"
        :close-label="t('close')"
        @close="handleClose"
      >
        <template v-if="$slots.header" #default>
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
</template>

<style scoped lang="scss">
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
