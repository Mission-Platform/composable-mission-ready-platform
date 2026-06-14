<script lang="ts" setup>
  /**
   * `BaseVerticalLayout` — a responsive three-column layout primitive.
   *
   * It arranges an optional **start** column, a main **content** column, and an
   * optional **end** column. The start/end columns are powered by
   * {@link BaseSidebar}'s `inline` variant: at and above `breakpoint` they render
   * inline as static, always-open ("fixed open") columns that flank the content;
   * below `breakpoint` they collapse into toggleable overlay sidebars (drawers),
   * leaving the content to span the full width.
   *
   * The `startOpen` / `endOpen` models control the drawers on small screens (they
   * are ignored while a column is inline). The default slot is scoped — it
   * exposes `{ isInline, toggleStart, toggleEnd }` so consumers can render their
   * own drawer-toggle controls (e.g. mobile buttons) without reaching for the
   * models directly.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { type BreakpointKey, useBreakpoints } from '@mission-platform/breakpoints';
  import { computed, ref, useSlots } from 'vue';

  import BaseSidebar, { type SidebarDraggable } from '../base-sidebar/base-sidebar.vue';
  import { type SidebarSize, SIDEBAR_SIZE_REM } from '../base-sidebar/constants';

  const props = withDefaults(
    defineProps<{
      /** Drawer open state of the start column on small screens (`v-model:startOpen`). */
      startOpen?: boolean;
      /** Drawer open state of the end column on small screens (`v-model:endOpen`). */
      endOpen?: boolean;
      /**
       * Viewport breakpoint at and above which the start/end columns render as
       * static, fixed-open inline columns. Below it they become overlay drawers.
       */
      breakpoint?: BreakpointKey;
      /** Accessible label for the start column. */
      startTitle?: string;
      /** Accessible label for the end column. */
      endTitle?: string;
      /**
       * Named {@link SidebarSize} of the inline **start** column. Forwarded to
       * the backing `BaseSidebar`'s `size`, and used to derive the inline grid
       * track width from the canonical size scale.
       */
      startSize?: SidebarSize;
      /**
       * Named {@link SidebarSize} of the inline **end** column. Forwarded to the
       * backing `BaseSidebar`'s `size`, and used to derive the inline grid track
       * width from the canonical size scale.
       */
      endSize?: SidebarSize;
      /** Gap between the columns (any CSS length). */
      gap?: string;
      /**
       * Whether the inline **start** column is resizable by dragging its inner
       * edge, and the upper bound the width is clamped to. Forwarded to the
       * backing `BaseSidebar`'s `draggable` prop. See its `SidebarDraggable` type.
       */
      startDraggable?: SidebarDraggable;
      /**
       * Whether the inline **end** column is resizable by dragging its inner
       * edge, and the upper bound the width is clamped to. Forwarded to the
       * backing `BaseSidebar`'s `draggable` prop. See its `SidebarDraggable` type.
       */
      endDraggable?: SidebarDraggable;
    }>(),
    {
      startOpen: false,
      endOpen: false,
      breakpoint: 'md',
      startTitle: undefined,
      endTitle: undefined,
      startSize: 'md',
      endSize: 'md',
      gap: 'var(--mp-spacing-4)',
      startDraggable: false,
      endDraggable: false,
    },
  );

  const emit = defineEmits<{
    'update:startOpen': [open: boolean];
    'update:endOpen': [open: boolean];
  }>();

  const slots = useSlots();
  const { isAbove } = useBreakpoints();

  /** `true` once the side columns render inline (fixed open) rather than as drawers. */
  const isInline = computed(() => isAbove(props.breakpoint));

  const hasStart = computed(() => Boolean(slots.start));
  const hasEnd = computed(() => Boolean(slots.end));

  // While a column is resized (draggable), the backing sidebar emits its new
  // width in `rem`; we mirror it into the matching grid track so the column and
  // the sidebar stay in lock-step.
  const startWidthOverride = ref<string | null>(null);
  const endWidthOverride = ref<string | null>(null);

  /** The current width of the inline start column track. */
  const startTrackWidth = computed(() => startWidthOverride.value ?? `${SIDEBAR_SIZE_REM[props.startSize]}rem`);
  /** The current width of the inline end column track. */
  const endTrackWidth = computed(() => endWidthOverride.value ?? `${SIDEBAR_SIZE_REM[props.endSize]}rem`);

  /** Grid template — side columns only occupy a track while inline. */
  const gridTemplateColumns = computed(() => {
    const start = isInline.value && hasStart.value ? startTrackWidth.value : undefined;
    const end = isInline.value && hasEnd.value ? endTrackWidth.value : undefined;
    return [start, 'minmax(0, 1fr)', end].filter(Boolean).join(' ');
  });

  function onStartResize(width: number) {
    startWidthOverride.value = `${width}rem`;
  }

  function onEndResize(width: number) {
    endWidthOverride.value = `${width}rem`;
  }

  function setStartOpen(open: boolean) {
    emit('update:startOpen', open);
  }

  function setEndOpen(open: boolean) {
    emit('update:endOpen', open);
  }

  function toggleStart() {
    setStartOpen(!props.startOpen);
  }

  function toggleEnd() {
    setEndOpen(!props.endOpen);
  }
</script>

<template>
  <div
    :class="['vertical-layout', { 'vertical-layout--inline': isInline }]"
    :style="{ gridTemplateColumns, gap }"
  >
    <BaseSidebar
      v-if="hasStart"
      :draggable="startDraggable"
      :inline-breakpoint="breakpoint"
      :open="startOpen"
      :size="startSize"
      :title="startTitle"
      side="left"
      variant="inline"
      @resize="onStartResize"
      @update:open="setStartOpen"
    >
      <template
        v-if="$slots['start-header']"
        #header
      >
        <slot name="start-header" />
      </template>
      <slot name="start" />
      <template
        v-if="$slots['start-footer']"
        #footer
      >
        <slot name="start-footer" />
      </template>
    </BaseSidebar>

    <main class="vertical-layout__content">
      <slot
        :is-inline="isInline"
        :toggle-end="toggleEnd"
        :toggle-start="toggleStart"
      />
    </main>

    <BaseSidebar
      v-if="hasEnd"
      :draggable="endDraggable"
      :inline-breakpoint="breakpoint"
      :open="endOpen"
      :size="endSize"
      :title="endTitle"
      side="right"
      variant="inline"
      @resize="onEndResize"
      @update:open="setEndOpen"
    >
      <template
        v-if="$slots['end-header']"
        #header
      >
        <slot name="end-header" />
      </template>
      <slot name="end" />
      <template
        v-if="$slots['end-footer']"
        #footer
      >
        <slot name="end-footer" />
      </template>
    </BaseSidebar>
  </div>
</template>

<style lang="scss" scoped>
  .vertical-layout {
    display: grid;
    width: 100%;

    /* On small screens the side columns are overlay drawers (removed from flow),
       so the layout collapses to a single content column. */
    grid-template-columns: minmax(0, 1fr);

    &__content {
      min-width: 0;
    }
  }
</style>
