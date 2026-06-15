<script lang="ts" setup>
  /**
   * `BaseTimeline` — an ordered, chronological list of events for the Mission
   * Platform UI.
   *
   * It renders an `<ol>` and arranges its `BaseTimelineItem` children along a
   * connecting line. The `orientation` prop switches between a stacked vertical
   * timeline (default) and a horizontal one; `align` controls how vertical items
   * are laid out relative to the line (`start` keeps every item on one side,
   * `alternate` zig-zags items left/right of a centred line).
   *
   * Shared layout state is provided to the children via `provide`/`inject` under
   * the {@link TimelineContextKey} key, so a `BaseTimelineItem` automatically
   * matches the orientation and alternating rhythm of its parent.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, provide } from 'vue';

  import { type TimelineContext, TimelineContextKey } from './context';

  /** Orientation of the timeline's connecting line. */
  export type TimelineOrientation = 'vertical' | 'horizontal';

  /** How vertical timeline items are positioned relative to the line. */
  export type TimelineAlign = 'start' | 'alternate';

  const props = withDefaults(
    defineProps<{
      /** Lay the timeline out vertically (default) or horizontally. */
      orientation?: TimelineOrientation;
      /**
       * Vertical-only: keep every item on the same side of the line (`start`)
       * or zig-zag them on alternating sides of a centred line (`alternate`).
       */
      align?: TimelineAlign;
    }>(),
    {
      orientation: 'vertical',
      align: 'start',
    },
  );

  /**
   * Default slot — place `BaseTimelineItem` components here.
   * @slot default
   */
  defineSlots<{
    default(props: Record<string, never>): unknown;
  }>();

  const context = computed<TimelineContext>(() => ({
    orientation: props.orientation,
    align: props.align,
  }));

  provide(TimelineContextKey, context);
</script>

<template>
  <ol
    :class="[
      'base-timeline',
      `base-timeline--${orientation}`,
      { 'base-timeline--alternate': orientation === 'vertical' && align === 'alternate' },
    ]"
  >
    <slot />
  </ol>
</template>

<style lang="scss" scoped>
  .base-timeline {
    --mp-timeline-marker-size: 0.875rem;
    --mp-timeline-line-thickness: 2px;
    --mp-timeline-gutter: var(--mp-spacing-6);

    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;

    &--vertical {
      display: flex;
      flex-direction: column;
    }

    &--horizontal {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
    }
  }
</style>
