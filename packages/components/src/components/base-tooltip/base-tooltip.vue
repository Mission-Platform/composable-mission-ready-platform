<script lang="ts" setup>
  /**
   * `BaseTooltip` displays a short, contextual hint anchored to its trigger element.
   *
   * Positioning is powered by [Floating UI](https://floating-ui.com/) (`offset`, `flip`, `shift`, `arrow`)
   * with auto-update, so the tooltip stays glued to the trigger across scroll/resize and flips to the
   * opposite side when there isn't enough room. The tooltip uses a portal-free `Transition` with
   * fade in/out and is rendered via the `tooltip` z-index layer.
   *
   * Accessibility:
   * - The trigger receives `aria-describedby` pointing at the tooltip while visible.
   * - The tooltip has `role="tooltip"`.
   * - Opens on `mouseenter` / `focusin`, hides on `mouseleave` / `focusout`.
   *
   * @example
   * ```html
   * <BaseTooltip content="Save changes" placement="top">
   *   <BaseButton>Save</BaseButton>
   * </BaseTooltip>
   * ```
   */
  import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { ref } from 'vue';

  import { useId } from '../../composables/use-id';
  import { useZIndex } from '../../composables/use-z-index';
  import BaseTypography from '../base-typography/base-typography.vue';

  /** Preferred placement of the tooltip relative to its trigger. Floating UI may flip it if there isn't room. */
  export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

  const props = withDefaults(
    defineProps<{
      /** Text content of the tooltip. Plain text only — pass complex content via the default slot of a different component. */
      content: string;
      /** Preferred placement. Floating UI may flip to the opposite side if there isn't enough space. Defaults to `'top'`. */
      placement?: TooltipPlacement;
      /** When `true`, the tooltip is suppressed entirely and never shown. */
      disabled?: boolean;
      /** Hover-open delay in milliseconds. Focus-open is always immediate. Defaults to `0`. */
      delay?: number;
    }>(),
    {
      placement: 'top',
      disabled: false,
      delay: 0,
    },
  );

  /**
   * Default slot — the trigger element the tooltip is anchored to (e.g. a button or icon).
   * @slot default
   */
  defineSlots<{
    default(props: Record<string, never>): unknown;
  }>();

  const { id: tooltipId } = useId(undefined);
  const { zIndex } = useZIndex('tooltip');
  const visible = ref(false);
  let showTimer: ReturnType<typeof setTimeout> | undefined;

  // Floating UI refs
  const referenceEl = ref<HTMLElement | undefined>(undefined);
  const floatingEl = ref<HTMLElement | undefined>(undefined);
  const arrowEl = ref<HTMLElement | undefined>(undefined);

  const {
    floatingStyles,
    middlewareData,
    placement: actualPlacement,
  } = useFloating(referenceEl, floatingEl, {
    placement: props.placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 4 }), arrow({ element: arrowEl })],
  });

  function show(delayMs: number) {
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      visible.value = true;
    }, delayMs);
  }

  function hide() {
    if (showTimer) clearTimeout(showTimer);
    visible.value = false;
  }

  // Compute arrow position based on Floating UI middleware data
  function getArrowStyle() {
    const arrowData = middlewareData.value.arrow;
    if (!arrowData) return {};
    const { x, y } = arrowData;
    const side = actualPlacement.value.split('-')[0];
    const staticSide: Record<string, string> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    return {
      left: x != null ? `${x}px` : '',
      top: y != null ? `${y}px` : '',
      [staticSide[side]]: '-4px',
    };
  }
</script>

<template>
  <span
    class="base-tooltip-wrapper"
    role="presentation"
    @focusin="!disabled && show(0)"
    @focusout="hide"
    @mouseenter="!disabled && show(delay)"
    @mouseleave="hide"
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
        :style="{ ...floatingStyles, zIndex }"
        role="tooltip"
      >
        <BaseTypography
          as="span"
          color="inherit"
          variant="caption"
        >
          {{ content }}
        </BaseTypography>
        <span
          ref="arrowEl"
          :style="getArrowStyle()"
          aria-hidden="true"
          class="base-tooltip__arrow"
        />
      </span>
    </Transition>
  </span>
</template>

<style lang="scss" scoped>
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
