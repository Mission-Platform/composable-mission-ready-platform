<script lang="ts" setup>
  /**
   * `BaseDrawer` — Drawer (sliding panel) component for the Mission Platform UI.
   *
   * A drawer slides in from one edge of the viewport. Use `placement` to anchor
   * it to the inline `start`/`end` edges (a full-height vertical panel, sized by
   * width) or the `top`/`bottom` edges (a full-width horizontal panel, sized by
   * height).
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

  import BaseDrawerBody from './base-drawer-body.vue';
  import BaseDrawerFooter from './base-drawer-footer.vue';
  import BaseDrawerHeader from './base-drawer-header.vue';
  import { type DrawerSize, DRAWER_SIZE_REM } from './constants';

  /**
   * Which viewport edge the drawer is anchored to:
   *
   * - `start` / `end` — the inline edges (left/right in LTR): a full-height
   *   vertical panel whose `size` controls its width.
   * - `top` / `bottom` — the block edges: a full-width horizontal panel whose
   *   `size` controls its height.
   */
  export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';
  export type { DrawerSize } from './constants';
  /**
   * Controls whether the drawer can be resized by dragging its inner edge:
   *
   * - `false` (default) — fixed size, no resize handle.
   * - `true` — resizable, up to the full viewport size on the relevant axis.
   * - a {@link DrawerSize} (`2xs` … `2xl`, conventionally `lg`) — resizable up
   *   to that size's fixed maximum.
   * - a `number` — resizable up to that many `rem`.
   */
  export type DrawerDraggable = boolean | DrawerSize | number;

  /**
   * - `overlay` — the default floating drawer: teleported to `<body>`, backed by
   *   a scrim, slides in/out and is gated by `open`.
   * - `inline` — a responsive panel: above `inlineBreakpoint` it renders in
   *   normal document flow as a static, always-open ("fixed open") panel with no
   *   backdrop or teleport; below it, it falls back to the `overlay` behaviour
   *   so it becomes a toggleable drawer on smaller screens.
   */
  export type DrawerVariant = 'overlay' | 'inline';

  const props = withDefaults(
    defineProps<{
      open?: boolean;
      /** Which viewport edge the drawer is anchored to. See {@link DrawerPlacement}. */
      placement?: DrawerPlacement;
      size?: DrawerSize;
      title?: string;
      closeOnBackdrop?: boolean;
      closeOnRouteChange?: boolean;
      /** Display behaviour — `overlay` drawer (default) or responsive `inline` panel. */
      variant?: DrawerVariant;
      /**
       * Viewport breakpoint at and above which an `inline` drawer renders as a
       * static, fixed-open panel.  Below it the drawer reverts to the overlay
       * behaviour.  Ignored when `variant` is `overlay`.
       */
      inlineBreakpoint?: BreakpointKey;
      /**
       * Whether the drawer is resizable by dragging its inner edge, and what
       * upper bound the size is clamped to. See {@link DrawerDraggable}.
       */
      draggable?: DrawerDraggable;
    }>(),
    {
      open: false,
      placement: 'start',
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
    /** Emitted while dragging the resize handle, with the new size in `rem`. */
    resize: [size: number];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const { zIndex } = useZIndex('popover');
  const { isAbove } = useBreakpoints();

  /**
   * Whether the drawer is anchored to an inline edge (`start`/`end`) and thus
   * laid out as a full-height vertical panel sized by width. The `top`/`bottom`
   * placements are the vertical counterpart, sized by height.
   */
  const isHorizontal = computed(() => props.placement === 'start' || props.placement === 'end');

  /**
   * `true` when the drawer should render as a static, fixed-open inline panel
   * — i.e. the `inline` variant on a viewport at or above `inlineBreakpoint`.
   * In this mode the panel ignores `open`, drops the backdrop/teleport/slide and
   * never auto-closes on route change.
   */
  const isInline = computed(() => props.variant === 'inline' && isAbove(props.inlineBreakpoint));

  /** Whether the panel (`<aside>`) should be rendered at all. */
  const isVisible = computed(() => isInline.value || props.open);

  // ─── Resize (draggable) support ─────────────────────────────────────────────
  const rootRef = ref<HTMLElement | null>(null);
  /** The current dragged size in `rem`, or `null` before the first drag. */
  const resizedSizeRem = ref<number | null>(null);

  /** The smallest size (in `rem`) a resize may shrink the drawer to. */
  const MIN_SIZE_REM = 12;

  /** Whether resizing is enabled at all (any truthy `draggable` value). */
  const isDraggable = computed(() => props.draggable !== false);

  /** The resolved maximum size (in `rem`) a drag is clamped to. */
  const maxSizeRem = computed(() => {
    const value = props.draggable;
    if (value === true) {
      const px = isHorizontal.value ? viewportWidthPx() : viewportHeightPx();
      return rootFontSize() > 0 ? px / rootFontSize() : 0;
    }
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return DRAWER_SIZE_REM[value];
    return DRAWER_SIZE_REM[props.size];
  });

  /**
   * Whether the resize handle is currently interactive — only when draggable,
   * visible, and rendered at a fixed (non-mobile-full) size.
   */
  const canResize = computed(() => {
    if (!isDraggable.value || !isVisible.value) return false;
    if (props.variant === 'inline') return isInline.value;
    // Horizontal overlays span the full width on mobile (< sm), so there is
    // nothing to resize there; vertical overlays use the named size at every
    // breakpoint and stay resizable.
    return isHorizontal.value ? isAbove('sm') : true;
  });

  /** Inline size/max-size style applied while resizable. */
  const resizeStyle = computed<Record<string, string> | undefined>(() => {
    if (!canResize.value) return undefined;
    const style: Record<string, string> = {};
    const dimension = resizedSizeRem.value == undefined ? undefined : `${Math.round(resizedSizeRem.value * 1000) / 1000}rem`;
    if (isHorizontal.value) {
      style.maxWidth = props.draggable === true ? '100vw' : `${maxSizeRem.value}rem`;
      if (dimension != undefined) style.width = dimension;
    } else {
      style.maxHeight = props.draggable === true ? '100vh' : `${maxSizeRem.value}rem`;
      if (dimension != undefined) style.height = dimension;
    }
    return style;
  });

  /** Combined root `<aside>` style — stacking context plus any resize size. */
  const rootStyle = computed(() => ({
    ...(isInline.value ? {} : { zIndex: zIndex + 1 }),
    ...resizeStyle.value,
  }));

  function viewportWidthPx(): number {
    return globalThis.window === undefined ? 0 : globalThis.window.innerWidth;
  }

  function viewportHeightPx(): number {
    return globalThis.window === undefined ? 0 : globalThis.window.innerHeight;
  }

  function rootFontSize(): number {
    if (globalThis.document === undefined) return 16;
    const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(size) && size > 0 ? size : 16;
  }

  function maxSizePx(): number {
    if (props.draggable === true) return isHorizontal.value ? viewportWidthPx() : viewportHeightPx();
    return maxSizeRem.value * rootFontSize();
  }

  function minSizePx(): number {
    return Math.min(MIN_SIZE_REM * rootFontSize(), maxSizePx());
  }

  let startCoord = 0;
  let startSizePx = 0;

  function onResizeStart(event: PointerEvent) {
    if (!canResize.value) return;
    event.preventDefault();
    startCoord = isHorizontal.value ? event.clientX : event.clientY;
    const rect = rootRef.value?.getBoundingClientRect();
    const fallback = DRAWER_SIZE_REM[props.size] * rootFontSize();
    startSizePx = rect ? (isHorizontal.value ? rect.width : rect.height) : fallback;
    globalThis.window.addEventListener('pointermove', onResizeMove);
    globalThis.window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(event: PointerEvent) {
    const coord = isHorizontal.value ? event.clientX : event.clientY;
    const delta = coord - startCoord;
    // `start`/`top` grow as the pointer moves away from their anchored edge
    // (right / down); `end`/`bottom` grow in the opposite direction.
    const direction = props.placement === 'start' || props.placement === 'top' ? 1 : -1;
    const sizePx = Math.min(maxSizePx(), Math.max(minSizePx(), startSizePx + direction * delta));
    resizedSizeRem.value = sizePx / rootFontSize();
    emit('resize', resizedSizeRem.value);
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
    <Transition name="base-drawer-fade">
      <div
        v-if="open && !isInline"
        :style="{ zIndex }"
        aria-hidden="true"
        class="base-drawer-backdrop"
        @click="closeOnBackdrop && handleClose()"
      />
    </Transition>
    <Transition :name="isInline ? '' : `base-drawer-slide-${placement}`">
      <aside
        v-if="isVisible"
        ref="rootRef"
        :aria-label="title"
        :class="[
          'base-drawer',
          `base-drawer--${placement}`,
          `base-drawer--${size}`,
          { 'base-drawer--inline': isInline, 'base-drawer--draggable': canResize },
        ]"
        :style="rootStyle"
      >
        <BaseDrawerHeader
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
        </BaseDrawerHeader>
        <BaseDrawerBody>
          <slot />
        </BaseDrawerBody>
        <BaseDrawerFooter v-if="$slots.footer">
          <slot name="footer" />
        </BaseDrawerFooter>
        <div
          v-if="canResize"
          :class="['base-drawer__resize-handle', `base-drawer__resize-handle--${placement}`]"
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

  /* Canonical 2xs → 2xl size scale, shared by width (start/end) and height
     (top/bottom) placements. Mirrors `DRAWER_SIZE_REM` in `constants.ts`. */
  $drawer-sizes: (
    '2xs': 14rem,
    'xs': 17rem,
    'sm': 20rem,
    'md': 25.714rem,
    'lg': 34.286rem,
    'xl': 45.714rem,
    '2xl': 57rem,
  );

  .base-drawer-backdrop {
    position: fixed;
    inset: 0;
    background-color: var(--mp-color-bg-scrim-soft);
  }

  .base-drawer {
    position: fixed;
    background-color: var(--mp-color-bg-surface);
    box-shadow: var(--mp-shadow-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    /* Horizontal placements (start/end): a full-height vertical panel.
       On mobile it always spans the full viewport width. */
    &--start,
    &--end {
      top: 0;
      bottom: 0;
      width: 100vw;
      max-width: 100vw;
    }

    &--start {
      inset-inline-start: 0;
      border-inline-end: 1px solid var(--mp-color-border-default);
    }

    &--end {
      inset-inline-end: 0;
      border-inline-start: 1px solid var(--mp-color-border-default);
    }

    /* Vertical placements (top/bottom): a full-width horizontal panel sized by
       height. */
    &--top,
    &--bottom {
      left: 0;
      right: 0;
      width: 100vw;
      max-width: 100vw;
      max-height: 100vh;
    }

    &--top {
      top: 0;
      border-bottom: 1px solid var(--mp-color-border-default);
    }

    &--bottom {
      bottom: 0;
      border-top: 1px solid var(--mp-color-border-default);
    }

    /* Named width variants for start/end: apply fixed widths only on sm+
       (tablet/desktop); below that they span the full viewport width. */
    @include bp.bp-up('sm') {
      @each $size, $width in $drawer-sizes {
        &--start.base-drawer--#{$size},
        &--end.base-drawer--#{$size} {
          width: $width;
        }
      }
    }

    /* Named height variants for top/bottom: applied at every breakpoint. */
    @each $size, $height in $drawer-sizes {
      &--top.base-drawer--#{$size},
      &--bottom.base-drawer--#{$size} {
        height: $height;
      }
    }

    /* Inline, fixed-open variant: the drawer leaves the fixed overlay layer and
       flows in place as a static panel that fills its container.  Used by
       layout primitives (e.g. a three-column form builder) to render the
       start/end panels inline on larger screens. */
    &--inline {
      // `relative` (rather than `static`) so the absolutely-positioned resize
      // handle anchors to the panel while it still flows in place.
      position: relative;
      inset: auto;
      width: 100%;
      max-width: 100%;
      height: 100%;
      box-shadow: none;
    }

    /* Resize handle: a thin grab strip on the drawer's inner edge. */
    &__resize-handle {
      position: absolute;
      z-index: 1;
      touch-action: none;
      background-color: transparent;
      transition: background-color 150ms ease;

      &--start,
      &--end {
        top: 0;
        bottom: 0;
        width: var(--mp-spacing-2);
        cursor: ew-resize;
      }

      &--start {
        right: 0;
      }

      &--end {
        left: 0;
      }

      &--top,
      &--bottom {
        left: 0;
        right: 0;
        height: var(--mp-spacing-2);
        cursor: ns-resize;
      }

      &--top {
        bottom: 0;
      }

      &--bottom {
        top: 0;
      }

      &:hover,
      &:active {
        background-color: var(--mp-color-border-strong);
      }
    }
  }

  /* Transitions */
  .base-drawer-fade-enter-active,
  .base-drawer-fade-leave-active {
    transition: opacity 250ms ease;
  }

  .base-drawer-fade-enter-from,
  .base-drawer-fade-leave-to {
    opacity: 0;
  }

  .base-drawer-slide-start-enter-active,
  .base-drawer-slide-start-leave-active,
  .base-drawer-slide-end-enter-active,
  .base-drawer-slide-end-leave-active,
  .base-drawer-slide-top-enter-active,
  .base-drawer-slide-top-leave-active,
  .base-drawer-slide-bottom-enter-active,
  .base-drawer-slide-bottom-leave-active {
    transition: transform 250ms ease;
  }

  .base-drawer-slide-start-enter-from,
  .base-drawer-slide-start-leave-to {
    transform: translateX(-100%);
  }

  .base-drawer-slide-end-enter-from,
  .base-drawer-slide-end-leave-to {
    transform: translateX(100%);
  }

  .base-drawer-slide-top-enter-from,
  .base-drawer-slide-top-leave-to {
    transform: translateY(-100%);
  }

  .base-drawer-slide-bottom-enter-from,
  .base-drawer-slide-bottom-leave-to {
    transform: translateY(100%);
  }
</style>

<i18n lang="yaml">
en:
  close: Close drawer
</i18n>
