<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'

  export type PopoverPlacement =
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end'
    | 'right'
    | 'right-start'
    | 'right-end'

  const props = withDefaults(
    defineProps<{
      open?: boolean
      placement?: PopoverPlacement
      offset?: number
      closeOnOutsideClick?: boolean
      /** Accessible label for the popover dialog (required for screen readers when no visible heading is present) */
      label?: string
    }>(),
    {
      open: false,
      placement: 'bottom-start',
      offset: 6,
      closeOnOutsideClick: true,
      label: undefined,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
  }>()

  // Floating UI refs
  const referenceEl = ref<HTMLElement | null>(null)
  const floatingEl = ref<HTMLElement | null>(null)
  const arrowEl = ref<HTMLElement | null>(null)

  const {
    floatingStyles,
    middlewareData,
    placement: actualPlacement,
  } = useFloating(referenceEl, floatingEl, {
    placement: props.placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(props.offset),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ],
  })

  // Arrow position helper
  function getArrowStyle() {
    const arrowData = middlewareData.value.arrow
    if (!arrowData) return {}
    const { x, y } = arrowData
    const side = actualPlacement.value.split('-')[0]
    const staticSide: Record<string, string> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    }
    return {
      left: x != null ? `${x}px` : '',
      top: y != null ? `${y}px` : '',
      [staticSide[side]]: '-4px',
    }
  }

  // Close on outside click
  function handleOutsideClick(event: MouseEvent) {
    if (!props.closeOnOutsideClick || !props.open) return
    const target = event.target as Node
    if (referenceEl.value?.contains(target) || floatingEl.value?.contains(target)) return
    emit('update:open', false)
    emit('close')
  }

  watch(
    () => props.open,
    (open) => {
      if (open) {
        document.addEventListener('mousedown', handleOutsideClick)
      } else {
        document.removeEventListener('mousedown', handleOutsideClick)
      }
    },
    { immediate: true },
  )
</script>

<template>
  <div class="base-popover-host">
    <!-- Reference / trigger element -->
    <div ref="referenceEl" class="base-popover-trigger">
      <slot name="trigger" />
    </div>

    <!-- Floating panel -->
    <Transition name="base-popover-fade">
      <dialog
        v-if="open"
        ref="floatingEl"
        class="base-popover"
        :data-placement="actualPlacement"
        :style="floatingStyles"
        :aria-label="label"
      >
        <slot />
        <span
          ref="arrowEl"
          class="base-popover__arrow"
          :style="getArrowStyle()"
          aria-hidden="true"
        />
      </dialog>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
  .base-popover-host {
    display: inline-flex;
    align-items: center;
  }

  .base-popover-trigger {
    display: inline-flex;
    align-items: center;
    min-width: 1px;
    min-height: 1px;
  }

  .base-popover {
    z-index: 400;
    margin: 0;
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-lg);
    box-shadow: var(--mp-shadow-lg);
    padding: var(--mp-spacing-1) 0;
    min-width: 160px;

    &__arrow {
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      transform: rotate(45deg);
      pointer-events: none;
    }
  }

  .base-popover-fade-enter-active,
  .base-popover-fade-leave-active {
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }

  .base-popover-fade-enter-from,
  .base-popover-fade-leave-to {
    opacity: 0;
    transform: scale(0.97) translateY(-4px);
  }
</style>
