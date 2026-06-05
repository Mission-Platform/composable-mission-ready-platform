<script lang="ts" setup>
  import { computed, ref } from 'vue';

  import type { VEvent } from './types';

  const props = withDefaults(
    defineProps<{
      /** The RFC 5545 event to render. */
      event: VEvent;
      /** Human-readable duration string, e.g. "1h 30m". */
      duration: string;
      /** Fraction of the column width this event occupies (0 < value ≤ 1). */
      widthFraction?: number;
      /** Left offset as a fraction of the column (0 ≤ value < 1). */
      leftFraction?: number;
      /** Top position as a CSS string (e.g. "120px"). */
      top?: string;
      /** Height as a CSS string (e.g. "60px"). */
      height?: string;
      /** Whether the event can be dragged to a new time slot. */
      draggable?: boolean;
      /** Whether the event can be resized via a bottom handle. */
      resizable?: boolean;
    }>(),
    {
      widthFraction: 1,
      leftFraction: 0,
      top: '0px',
      height: '60px',
      draggable: true,
      resizable: true,
    },
  );

  const emit = defineEmits<{
    /** Emitted when the event drag starts; payload is the pointer offset in px within the event. */
    'drag-start': [uid: string, offsetY: number];
    /** Emitted when the resize handle drag starts. */
    'resize-start': [uid: string, startY: number];
    /** Emitted when the user clicks the event body (not a drag). */
    click: [event: VEvent];
  }>();

  // ── Drag detection ─────────────────────────────────────────────────────────

  const isDragging = ref(false);
  const dragStartY = ref(0);

  function onPointerDown(e: PointerEvent) {
    if (!props.draggable) return;
    isDragging.value = true;
    dragStartY.value = e.clientY;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    emit('drag-start', props.event.uid, e.clientY - rect.top);
    e.preventDefault();
  }

  function onPointerUp() {
    isDragging.value = false;
  }

  // ── Resize handle ──────────────────────────────────────────────────────────

  function onResizePointerDown(e: PointerEvent) {
    if (!props.resizable) return;
    emit('resize-start', props.event.uid, e.clientY);
    e.stopPropagation();
    e.preventDefault();
  }

  // ── Computed styles ────────────────────────────────────────────────────────

  const style = computed(() => ({
    top: props.top,
    height: props.height,
    left: `calc(${props.leftFraction * 100}% + 1px)`,
    width: `calc(${props.widthFraction * 100}% - 2px)`,
    backgroundColor: props.event.color ?? 'var(--mp-color-primary-default)',
    cursor: props.draggable ? 'grab' : 'default',
  }));

  const isCancelled = computed(() => props.event.status === 'CANCELLED');
  const isTentative = computed(() => props.event.status === 'TENTATIVE');
  const title = computed(() => props.event.summary ?? '(no title)');
</script>

<template>
  <div
    :class="[
      'base-scheduler-event',
      {
        'base-scheduler-event--cancelled': isCancelled,
        'base-scheduler-event--tentative': isTentative,
        'base-scheduler-event--dragging': isDragging,
      },
    ]"
    :style="style"
    role="button"
    :aria-label="title"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @click="emit('click', event)"
    @keydown.enter="emit('click', event)"
  >
    <div class="base-scheduler-event__body">
      <span class="base-scheduler-event__title">{{ title }}</span>
      <span
        v-if="event.location"
        class="base-scheduler-event__location"
      >
        {{ event.location }}
      </span>
      <span class="base-scheduler-event__duration">{{ duration }}</span>
    </div>

    <!-- Resize handle -->
    <div
      v-if="resizable"
      class="base-scheduler-event__resize-handle"
      aria-hidden="true"
      @pointerdown="onResizePointerDown"
    />
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-scheduler-event {
    position: absolute;
    border-radius: var(--mp-radius-sm);
    overflow: hidden;
    color: var(--mp-color-text-on-primary);
    display: flex;
    flex-direction: column;
    padding: var(--mp-spacing-1) var(--mp-spacing-2);
    user-select: none;
    z-index: 1;
    box-shadow: var(--mp-shadow-sm);
    transition:
      opacity 0.15s ease,
      box-shadow 0.15s ease;

    &:focus-visible {
      outline: 2px solid var(--mp-color-border-focus);
      outline-offset: 1px;
    }

    &--tentative {
      opacity: 0.7;
      border: 2px dashed rgb(255 255 255 / 60%);
    }

    &--cancelled {
      opacity: 0.4;
      text-decoration: line-through;
    }

    &--dragging {
      opacity: 0.8;
      box-shadow: var(--mp-shadow-lg);
      cursor: grabbing;
      z-index: 100;
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-height: 0;
      overflow: hidden;
      flex: 1;
    }

    &__title {
      @include mp.mp-font-body-sm;

      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__location,
    &__duration {
      @include mp.mp-font-caption;

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.85;
    }

    &__resize-handle {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      cursor: ns-resize;
      background: linear-gradient(to bottom, transparent, rgb(0 0 0 / 20%));
      border-radius: 0 0 var(--mp-radius-sm) var(--mp-radius-sm);

      &:hover {
        background: linear-gradient(to bottom, transparent, rgb(0 0 0 / 35%));
      }
    }
  }
</style>
