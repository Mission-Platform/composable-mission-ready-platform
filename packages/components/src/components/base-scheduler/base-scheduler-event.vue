<script lang="ts" setup>
  /**
   * `BaseSchedulerEvent` — Scheduler event component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
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

  // ── Colour-contrast utilities (WCAG AAA) ───────────────────────────────────

  function hexToRgb(hex: string): [number, number, number] | null {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      return [parseInt(clean[0] + clean[0], 16), parseInt(clean[1] + clean[1], 16), parseInt(clean[2] + clean[2], 16)];
    }
    if (clean.length === 6) {
      return [
        parseInt(clean.substring(0, 2), 16),
        parseInt(clean.substring(2, 4), 16),
        parseInt(clean.substring(4, 6), 16),
      ];
    }
    return null;
  }

  function relativeLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Alpha-blends a hex colour against a solid background (default white)
   * to produce the solid hex equivalent of rendering the colour at `alpha`
   * opacity over that background. This lets us compute accessible text colours
   * against what the eye actually sees, rather than the raw event hex.
   */
  function alphaBlend(hex: string, alpha: number, bgHex: string = '#ffffff'): string {
    const fg = hexToRgb(hex);
    const bg = hexToRgb(bgHex);
    if (!fg || !bg) return hex;
    const r = Math.round(fg[0] * alpha + bg[0] * (1 - alpha));
    const g = Math.round(fg[1] * alpha + bg[1] * (1 - alpha));
    const b = Math.round(fg[2] * alpha + bg[2] * (1 - alpha));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Returns `#1a1a1a` (near-black) or `#ffffff` (white) — whichever achieves
   * the higher contrast ratio against `bgHex`. Falls back to white when the
   * background is a CSS variable (not a parseable hex string).
   */
  function accessibleTextColor(bgHex: string | undefined): string {
    if (!bgHex) return '#ffffff'; // default primary is dark purple → white is fine
    const rgb = hexToRgb(bgHex);
    if (!rgb) return '#ffffff'; // non-hex value (CSS variable) → fall back to white
    const bgL = relativeLuminance(rgb);
    const whiteContrast = contrastRatio(1.0, bgL);
    const blackContrast = contrastRatio(0.0, bgL);
    return blackContrast >= whiteContrast ? '#1a1a1a' : '#ffffff';
  }

  // ── Computed styles ────────────────────────────────────────────────────────

  const isCancelled = computed(() => props.event.status === 'CANCELLED');
  const isTentative = computed(() => props.event.status === 'TENTATIVE');
  const title = computed(() => props.event.summary ?? '(no title)');

  /**
   * The solid-equivalent background colour used for contrast calculation and
   * rendering. For tentative/cancelled events we simulate the old opacity by
   * alpha-blending against white, so the element can stay fully opaque (no
   * element-level opacity that would also fade the text and break WCAG AAA).
   */
  const effectiveBgColor = computed<string>(() => {
    const hex = props.event.color;
    if (!hex) return hex as unknown as string; // CSS variable path — fall through
    if (isCancelled.value) return alphaBlend(hex, 0.4);
    if (isTentative.value) return alphaBlend(hex, 0.7);
    return hex;
  });

  const textColor = computed(() => accessibleTextColor(effectiveBgColor.value ?? props.event.color));

  const style = computed(() => ({
    top: props.top,
    height: props.height,
    left: `calc(${props.leftFraction * 100}% + 1px)`,
    width: `calc(${props.widthFraction * 100}% - 2px)`,
    backgroundColor: effectiveBgColor.value ?? props.event.color ?? 'var(--mp-color-primary-default)',
    color: textColor.value,
    cursor: props.draggable ? 'grab' : 'default',
  }));
</script>

<template>
  <button
    :aria-label="title"
    :class="[
      'base-scheduler-event',
      {
        'base-scheduler-event--cancelled': isCancelled,
        'base-scheduler-event--tentative': isTentative,
        'base-scheduler-event--dragging': isDragging,
      },
    ]"
    :style="style"
    type="button"
    @click="emit('click', event)"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <span class="base-scheduler-event__body">
      <span class="base-scheduler-event__title">{{ title }}</span>
      <span
        v-if="event.location"
        class="base-scheduler-event__location"
      >
        {{ event.location }}
      </span>
      <span class="base-scheduler-event__duration">{{ duration }}</span>
    </span>

    <!-- Resize handle -->
    <span
      v-if="resizable"
      aria-hidden="true"
      class="base-scheduler-event__resize-handle"
      @pointerdown="onResizePointerDown"
    />
  </button>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  @layer mp.components {
    .base-scheduler-event {
      position: absolute;
      border: 0;
      border-radius: var(--mp-radius-sm);
      overflow: hidden;
      color: inherit; /* set dynamically via textColor computed */
      display: flex;
      flex-direction: column;
      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      margin: 0;
      font: inherit;
      text-align: left;
      user-select: none;
      z-index: 1;
      box-shadow: var(--mp-shadow-sm);
      transition: box-shadow 0.15s ease;

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 1px;
      }

      &--tentative {
        // No element-level opacity — text contrast is preserved by alpha-blending
        // the background colour in JS (effectiveBgColor). The dashed border still
        // conveys the tentative status visually.
        border: 2px dashed currentcolor;
      }

      &--cancelled {
        // Background is alpha-blended in JS; line-through conveys cancellation.
        text-decoration: line-through;
      }

      &--dragging {
        // Elevated shadow provides drag feedback without reducing text contrast.
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
  }
</style>
