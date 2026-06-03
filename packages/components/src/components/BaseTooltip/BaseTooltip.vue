<script setup lang="ts">
  import { ref } from 'vue'
  import { useFloating, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/vue'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  import { useId } from '../../composables/useId'

  export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

  const props = withDefaults(
    defineProps<{
      content: string
      placement?: TooltipPlacement
      disabled?: boolean
      delay?: number
    }>(),
    {
      placement: 'top',
      disabled: false,
      delay: 0,
    },
  )

  const { id: tooltipId } = useId(undefined)
  const visible = ref(false)
  let showTimer: ReturnType<typeof setTimeout> | null = null

  // Floating UI refs
  const referenceEl = ref<HTMLElement | null>(null)
  const floatingEl = ref<HTMLElement | null>(null)
  const arrowEl = ref<HTMLElement | null>(null)

  const { floatingStyles, middlewareData, placement: actualPlacement } = useFloating(referenceEl, floatingEl, {
    placement: props.placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 4 }),
      arrow({ element: arrowEl }),
    ],
  })

  function show(delay: number) {
    if (showTimer) clearTimeout(showTimer)
    showTimer = setTimeout(() => {
      visible.value = true
    }, delay)
  }

  function hide() {
    if (showTimer) clearTimeout(showTimer)
    visible.value = false
  }

  // Compute arrow position based on Floating UI middleware data
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
</script>

<template>
  <span
    class="base-tooltip-wrapper"
    @mouseenter="!disabled && show(delay)"
    @mouseleave="hide"
    @focusin="!disabled && show(0)"
    @focusout="hide"
  >
    <span
      ref="referenceEl"
      :aria-describedby="visible && !disabled ? tooltipId : undefined"
      class="base-tooltip-trigger"
    >
      <slot />
    </span>
    <Transition name="base-tooltip-fade">
      <span
        v-if="visible && !disabled"
        :id="tooltipId"
        ref="floatingEl"
        :class="['base-tooltip', `base-tooltip--${actualPlacement.split('-')[0]}`]"
        role="tooltip"
        :style="floatingStyles"
      >
        <BaseTypography variant="caption" as="span" color="inherit">{{ content }}</BaseTypography>
        <span
          ref="arrowEl"
          class="base-tooltip__arrow"
          :style="getArrowStyle()"
          aria-hidden="true"
        />
      </span>
    </Transition>
  </span>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-tooltip-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .base-tooltip-trigger {
    display: inline-flex;
    align-items: center;
  }

  .base-tooltip {
    @include mp.mp-font-caption;

    z-index: 600;
    padding: var(--mp-spacing-1) var(--mp-spacing-3);
    background-color: var(--mp-color-text-primary);
    color: var(--mp-color-text-inverse);
    border-radius: var(--mp-radius-sm);
    pointer-events: none;
    max-width: 240px;

    &__arrow {
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: var(--mp-color-text-primary);
      transform: rotate(45deg);
    }
  }

  .base-tooltip-fade-enter-active,
  .base-tooltip-fade-leave-active {
    transition: opacity 150ms ease;
  }

  .base-tooltip-fade-enter-from,
  .base-tooltip-fade-leave-to {
    opacity: 0;
  }
</style>
