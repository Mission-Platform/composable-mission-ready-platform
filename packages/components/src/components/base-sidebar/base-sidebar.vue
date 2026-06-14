<script lang="ts" setup>
  /**
   * `BaseSidebar` — Sidebar component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { type BreakpointKey, useBreakpoints } from '@mission-platform/breakpoints';
  import { useI18n } from '@mission-platform/i18n';
  import { computed, onBeforeUnmount, ref } from 'vue';

  import { useRouterClose } from '../../composables/use-router-close';
  import { useZIndex } from '../../composables/use-z-index';

  import BaseSidebarBody from './base-sidebar-body.vue';
  import BaseSidebarFooter from './base-sidebar-footer.vue';
  import BaseSidebarHeader from './base-sidebar-header.vue';
  import { type SidebarSize, SIDEBAR_SIZE_REM } from './constants';

  export type SidebarSide = 'left' | 'right';
  export type { SidebarSize } from './constants';
  /**
   * Controls whether the sidebar can be resized by dragging its inner edge:
   *
   * - `false` (default) — fixed width, no resize handle.
   * - `true` — resizable, up to the full viewport width.
   * - a {@link SidebarSize} (`2xs` … `2xl`, conventionally `lg`) — resizable up
   *   to that size's fixed maximum width.
   * - a `number` — resizable up to that many `rem`.
   */
  export type SidebarDraggable = boolean | SidebarSize | number;

  /**
   * - `overlay` — the default floating drawer: teleported to `<body>`, backed by
   *   a scrim, slides in/out and is gated by `open`.
   * - `inline` — a responsive column: above `inlineBreakpoint` it renders in
   *   normal document flow as a static, always-open ("fixed open") panel with no
   *   backdrop or teleport; below it, it falls back to the `overlay` behaviour
   *   so it becomes a toggleable drawer on smaller screens.
   */
  export type SidebarVariant = 'overlay' | 'inline';

  const props = withDefaults(
    defineProps<{
      open?: boolean;
      side?: SidebarSide;
      size?: SidebarSize;
      title?: string;
      closeOnBackdrop?: boolean;
      closeOnRouteChange?: boolean;
      /** Display behaviour — `overlay` drawer (default) or responsive `inline` column. */
      variant?: SidebarVariant;
      /**
       * Viewport breakpoint at and above which an `inline` sidebar renders as a
       * static, fixed-open column.  Below it the sidebar reverts to the overlay
       * drawer behaviour.  Ignored when `variant` is `overlay`.
       */
      inlineBreakpoint?: BreakpointKey;
      /**
       * Whether the sidebar is resizable by dragging its inner edge, and what
       * upper bound the width is clamped to. See {@link SidebarDraggable}.
       */
      draggable?: SidebarDraggable;
    }>(),
    {
      open: false,
      side: 'left',
      size: 'md',
      title: undefined,
      closeOnBackdrop: true,
      closeOnRouteChange: true,
      variant: 'overlay',
      inlineBreakpoint: 'md',
      draggable: false,
    },
  );

  const emit = defineEmits<{
    'update:open': [value: boolean];
    close: [];
    /** Emitted while dragging the resize handle, with the new width in `rem`. */
    resize: [width: number];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { zIndex } = useZIndex('popover');
  const { isAbove } = useBreakpoints();

  /**
   * `true` when the sidebar should render as a static, fixed-open inline column
   * — i.e. the `inline` variant on a viewport at or above `inlineBreakpoint`.
   * In this mode the panel ignores `open`, drops the backdrop/teleport/slide and
   * never auto-closes on route change.
   */
  const isInline = computed(() => props.variant === 'inline' && isAbove(props.inlineBreakpoint));

  /** Whether the panel (`<aside>`) should be rendered at all. */
  const isVisible = computed(() => isInline.value || props.open);

  // ─── Resize (draggable) support ─────────────────────────────────────────────
  const rootRef = ref<HTMLElement | null>(null);
  /** The current dragged width in `rem`, or `null` before the first drag. */
  const resizedWidthRem = ref<number | null>(null);

  /** The smallest width (in `rem`) a resize may shrink the sidebar to. */
  const MIN_WIDTH_REM = 12;

  /** Whether resizing is enabled at all (any truthy `draggable` value). */
  const isDraggable = computed(() => props.draggable !== false);

  /** The resolved maximum width (in `rem`) a drag is clamped to. */
  const maxWidthRem = computed(() => {
    const value = props.draggable;
    if (value === true) return rootFontSize() > 0 ? viewportWidthPx() / rootFontSize() : 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return SIDEBAR_SIZE_REM[value];
    return SIDEBAR_SIZE_REM[props.size];
  });

  /**
   * Whether the resize handle is currently interactive — only when draggable,
   * visible, and rendered at a fixed (non-mobile-full-width) width.
   */
  const canResize = computed(() => {
    if (!isDraggable.value || !isVisible.value) return false;
    return props.variant === 'inline' ? isInline.value : isAbove('sm');
  });

  /** Inline width/max-width style applied while resizable. */
  const resizeStyle = computed<Record<string, string> | undefined>(() => {
    if (!canResize.value) return undefined;
    const style: Record<string, string> = {
      maxWidth: props.draggable === true ? '100vw' : `${maxWidthRem.value}rem`,
    };
    if (resizedWidthRem.value != undefined) style.width = `${Math.round(resizedWidthRem.value * 1000) / 1000}rem`;
    return style;
  });

  /** Combined root `<aside>` style — stacking context plus any resize width. */
  const rootStyle = computed(() => ({
    ...(isInline.value ? {} : { zIndex: zIndex + 1 }),
    ...resizeStyle.value,
  }));

  function viewportWidthPx(): number {
    return globalThis.window === undefined ? 0 : globalThis.window.innerWidth;
  }

  function rootFontSize(): number {
    if (globalThis.document === undefined) return 16;
    const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(size) && size > 0 ? size : 16;
  }

  function maxWidthPx(): number {
    return props.draggable === true ? viewportWidthPx() : maxWidthRem.value * rootFontSize();
  }

  function minWidthPx(): number {
    return Math.min(MIN_WIDTH_REM * rootFontSize(), maxWidthPx());
  }

  let startX = 0;
  let startWidthPx = 0;

  function onResizeStart(event: PointerEvent) {
    if (!canResize.value) return;
    event.preventDefault();
    startX = event.clientX;
    startWidthPx = rootRef.value?.getBoundingClientRect().width ?? SIDEBAR_SIZE_REM[props.size] * rootFontSize();
    globalThis.window.addEventListener('pointermove', onResizeMove);
    globalThis.window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(event: PointerEvent) {
    const delta = event.clientX - startX;
    const direction = props.side === 'left' ? 1 : -1;
    const widthPx = Math.min(maxWidthPx(), Math.max(minWidthPx(), startWidthPx + direction * delta));
    resizedWidthRem.value = widthPx / rootFontSize();
    emit('resize', resizedWidthRem.value);
  }

  function onResizeEnd() {
    globalThis.window.removeEventListener('pointermove', onResizeMove);
    globalThis.window.removeEventListener('pointerup', onResizeEnd);
  }

  onBeforeUnmount(onResizeEnd);

  function handleClose() {
    emit('update:open', false);
    emit('close');
  }

  useRouterClose(() => {
    if (props.closeOnRouteChange && !isInline.value) handleClose();
  });
</script>

<template>
  <Teleport
    :disabled="isInline"
    to="body"
  >
    <Transition name="base-sidebar-fade">
      <div
        v-if="open && !isInline"
        :style="{ zIndex }"
        aria-hidden="true"
        class="base-sidebar-backdrop"
        @click="closeOnBackdrop && handleClose()"
      />
    </Transition>
    <Transition :name="isInline ? '' : `base-sidebar-slide-${side}`">
      <aside
        v-if="isVisible"
        ref="rootRef"
        :aria-label="title"
        :class="[
          'base-sidebar',
          `base-sidebar--${side}`,
          `base-sidebar--${size}`,
          { 'base-sidebar--inline': isInline, 'base-sidebar--draggable': canResize },
        ]"
        :style="rootStyle"
      >
        <BaseSidebarHeader
          v-if="title || $slots.header"
          :close-label="t('close')"
          :hide-close="isInline"
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
        <div
          v-if="canResize"
          :class="['base-sidebar__resize-handle', `base-sidebar__resize-handle--${side}`]"
          aria-hidden="true"
          role="separator"
          @pointerdown="onResizeStart"
        />
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

    /* Named width variants: apply fixed widths only on sm+ (tablet/desktop).
       Canonical 2xs → 2xl scale. */
    @include bp.bp-up('sm') {
      @each $size,
        $width
          in ('2xs': 14rem, 'xs': 17rem, 'sm': 20rem, 'md': 25.714rem, 'lg': 34.286rem, 'xl': 45.714rem, '2xl': 57rem)
      {
        &--#{$size} {
          width: $width;
        }
      }
    }

    /* Inline, fixed-open variant: the sidebar leaves the fixed overlay layer and
       flows in place as a static column that fills its container.  Used by
       layout primitives (e.g. a three-column form builder) to render the
       start/end panels inline on larger screens. */
    &--inline {
      // `relative` (rather than `static`) so the absolutely-positioned resize
      // handle anchors to the column while it still flows in place.
      position: relative;
      inset: auto;
      width: 100%;
      max-width: 100%;
      height: 100%;
      box-shadow: none;
    }

    /* Resize handle: a thin grab strip on the sidebar's inner edge. */
    &__resize-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 1;
      width: var(--mp-spacing-2);
      cursor: ew-resize;
      touch-action: none;
      background-color: transparent;
      transition: background-color 150ms ease;

      &--left {
        right: 0;
      }

      &--right {
        left: 0;
      }

      &:hover,
      &:active {
        background-color: var(--mp-color-border-strong);
      }
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
