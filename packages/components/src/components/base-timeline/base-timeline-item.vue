<script lang="ts" setup>
  /**
   * `BaseTimelineItem` — a single event within a {@link BaseTimeline}.
   *
   * Each item renders an `<li>` containing a marker (a coloured dot, or a custom
   * node supplied through the `marker` slot) and a content block. The optional
   * `title` and `time` props render a heading and a muted timestamp above the
   * default-slot body; either can be replaced with the matching named slot.
   *
   * The component reads the parent timeline's orientation and alternating rhythm
   * from the injected {@link TimelineContext}, so it requires no configuration to
   * line up correctly. The `variant` prop tints the marker using the shared
   * `--mp-color-*` token families.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, inject } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  import { TimelineContextKey } from './context';

  /** Colour family applied to the marker dot. */
  export type TimelineItemVariant =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'success'
    | 'warning'
    | 'information'
    | 'error'
    | 'critical';

  withDefaults(
    defineProps<{
      /** Heading rendered above the content. Replaceable via the `title` slot. */
      title?: string;
      /** Muted timestamp / label rendered above the title. Replaceable via the `time` slot. */
      time?: string;
      /** Colour family applied to the marker dot. Defaults to `primary`. */
      variant?: TimelineItemVariant;
      /** Render the marker as a hollow ring rather than a filled dot. */
      outlined?: boolean;
    }>(),
    {
      title: undefined,
      time: undefined,
      variant: 'primary',
      outlined: false,
    },
  );

  defineSlots<{
    /** Replaces the default coloured dot with custom marker content (e.g. an icon). */
    marker(props: Record<string, never>): unknown;
    /** Replaces the rendered `time` label. */
    time(props: Record<string, never>): unknown;
    /** Replaces the rendered `title` heading. */
    title(props: Record<string, never>): unknown;
    /** Item body content. */
    default(props: Record<string, never>): unknown;
  }>();

  const timeline = inject(TimelineContextKey, undefined);

  const orientation = computed(() => timeline?.value.orientation ?? 'vertical');
  const isAlternate = computed(() => orientation.value === 'vertical' && timeline?.value.align === 'alternate');
</script>

<template>
  <li
    :class="[
      'base-timeline-item',
      `base-timeline-item--${orientation}`,
      `base-timeline-item--${variant}`,
      { 'base-timeline-item--alternate': isAlternate, 'base-timeline-item--outlined': outlined },
    ]"
  >
    <div class="base-timeline-item__marker">
      <slot name="marker">
        <span class="base-timeline-item__dot" />
      </slot>
    </div>
    <div class="base-timeline-item__content">
      <slot name="time">
        <BaseTypography
          v-if="time"
          as="span"
          class="base-timeline-item__time"
          color="tertiary"
          variant="caption"
        >
          {{ time }}
        </BaseTypography>
      </slot>
      <slot name="title">
        <BaseTypography
          v-if="title"
          as="h3"
          class="base-timeline-item__title"
          color="primary"
          variant="h6"
          weight="semibold"
        >
          {{ title }}
        </BaseTypography>
      </slot>
      <div
        v-if="$slots.default"
        class="base-timeline-item__body"
      >
        <slot />
      </div>
    </div>
  </li>
</template>

<style lang="scss" scoped>
  .base-timeline-item {
    --mp-timeline-item-color: var(--mp-color-primary-default);

    position: relative;
    display: flex;

    @each $family in 'default', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'information', 'error',
      'critical'
    {
      &--#{$family} {
        --mp-timeline-item-color: var(--mp-color-#{$family}-default);
      }
    }

    &__marker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__dot {
      width: var(--mp-timeline-marker-size);
      height: var(--mp-timeline-marker-size);
      border-radius: var(--mp-radius-full, 9999px);
      background-color: var(--mp-timeline-item-color);
      box-shadow: 0 0 0 4px var(--mp-color-bg-surface);
    }

    &--outlined &__dot {
      background-color: var(--mp-color-bg-surface);
      border: var(--mp-timeline-line-thickness) solid var(--mp-timeline-item-color);
    }

    /* ── Vertical ─────────────────────────────────────────────────────────── */
    &--vertical {
      flex-direction: row;
      gap: var(--mp-spacing-4);
      padding-bottom: var(--mp-timeline-gutter);

      .base-timeline-item__marker {
        width: var(--mp-timeline-marker-size);
        flex-direction: column;
      }

      /* Connecting line below the marker. */
      .base-timeline-item__marker::after {
        content: '';
        position: absolute;
        top: var(--mp-timeline-marker-size);
        bottom: calc(var(--mp-timeline-gutter) * -1);
        left: 50%;
        width: var(--mp-timeline-line-thickness);
        transform: translateX(-50%);
        background-color: var(--mp-color-border-default);
      }

      .base-timeline-item__content {
        padding-top: calc((var(--mp-timeline-marker-size) - 1em) / 2);
      }
    }

    /* ── Horizontal ───────────────────────────────────────────────────────── */
    &--horizontal {
      flex-direction: column;
      gap: var(--mp-spacing-3);
      min-width: 12rem;
      padding-right: var(--mp-timeline-gutter);

      .base-timeline-item__marker {
        height: var(--mp-timeline-marker-size);
        width: 100%;
        justify-content: flex-start;
      }

      .base-timeline-item__marker::after {
        content: '';
        position: absolute;
        left: var(--mp-timeline-marker-size);
        right: calc(var(--mp-timeline-gutter) * -1);
        top: 50%;
        height: var(--mp-timeline-line-thickness);
        transform: translateY(-50%);
        background-color: var(--mp-color-border-default);
      }
    }

    &__content {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);
      min-width: 0;
    }

    &__title {
      margin: 0;
    }

    &__body {
      margin-top: var(--mp-spacing-1);
    }

    /* The final item has no following sibling, so hide its connecting line.
       Declared once, after both orientation `::after` rules, to keep selector
       specificity ascending. */
    &:last-child &__marker::after {
      display: none;
    }
  }
</style>
