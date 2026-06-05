<script lang="ts" setup>
  import { computed, ref } from 'vue';

  import BaseSchedulerEvent from './base-scheduler-event.vue';

  import type { SchedulerEventSlot, VEvent } from './types';

  const props = defineProps<{
    /** ISO date strings for each visible column (YYYY-MM-DD). */
    days: string[];
    /** All visible events, keyed by ISO date. */
    eventsByDay: Record<string, VEvent[]>;
    /** Callback to produce a human-readable duration for an event. */
    formatDuration: (event: VEvent) => string;
  }>();

  const emit = defineEmits<{
    /** User clicked on an empty time slot — emit ISO datetime string. */
    'slot-click': [datetime: string];
    /** User clicked on an event. */
    'event-click': [event: VEvent];
    /** User began dragging an event. */
    'event-drag-start': [uid: string, offsetY: number];
    /** User began resizing an event. */
    'event-resize-start': [uid: string, startY: number];
  }>();

  // ─── Constants ─────────────────────────────────────────────────────────────

  /** Height in pixels of a single hour row. */
  const HOUR_HEIGHT = 60;
  /** Total scrollable height for the 24-hour grid (px). */
  const GRID_HEIGHT = HOUR_HEIGHT * 24;

  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function formatHour(h: number): string {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  }

  function dateToMinutes(iso: string): number {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }

  /**
   * Lay out events for a single day using a simple column-based collision
   * algorithm: each event is placed in the leftmost column it doesn't overlap.
   */
  function layoutDay(events: VEvent[]): SchedulerEventSlot[] {
    const sorted = [...events].sort((a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime());

    const columns: VEvent[][] = [];

    for (const ev of sorted) {
      const evStart = new Date(ev.dtstart).getTime();

      let placed = false;
      for (const col of columns) {
        const last = col.at(-1)!;
        if (new Date(last.dtend).getTime() <= evStart) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([ev]);
    }

    // Second pass: determine totalColumns for each event's time window
    return sorted.map((ev) => {
      const evStart = new Date(ev.dtstart).getTime();
      const evEnd = new Date(ev.dtend).getTime();

      const evColumns = columns.filter((col) =>
        col.some((e) => {
          const s = new Date(e.dtstart).getTime();
          const en = new Date(e.dtend).getTime();
          return s < evEnd && en > evStart;
        }),
      );

      const colIndex = columns.findIndex((col) => col.includes(ev));

      return {
        event: ev,
        column: colIndex,
        totalColumns: evColumns.length,
      };
    });
  }

  // ─── Per-day layouts ───────────────────────────────────────────────────────

  const layouts = computed(() => {
    return Object.fromEntries(props.days.map((day) => [day, layoutDay(props.eventsByDay[day] ?? [])]));
  });

  // ─── Positioning ──────────────────────────────────────────────────────────

  function slotTop(ev: VEvent): string {
    const minutes = dateToMinutes(ev.dtstart);
    return `${(minutes / 60) * HOUR_HEIGHT}px`;
  }

  function slotHeight(ev: VEvent): string {
    const startMs = new Date(ev.dtstart).getTime();
    const endMs = new Date(ev.dtend).getTime();
    const minutes = Math.max((endMs - startMs) / 60_000, 15);
    return `${(minutes / 60) * HOUR_HEIGHT}px`;
  }

  // ─── Slot click ────────────────────────────────────────────────────────────

  function onColumnClick(e: MouseEvent, day: string) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const totalMinutes = Math.round((relativeY / HOUR_HEIGHT) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const datetime = `${day}T${pad(hours)}:${pad(mins)}:00`;
    emit('slot-click', datetime);
  }

  function onColumnKeydown(e: KeyboardEvent, day: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const datetime = `${day}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
      emit('slot-click', datetime);
    }
  }

  // ─── Today highlight ───────────────────────────────────────────────────────

  const todayIso = new Date().toISOString().slice(0, 10);

  // ─── Current time indicator ────────────────────────────────────────────────

  const nowMinutes = ref(new Date().getHours() * 60 + new Date().getMinutes());
  const nowTop = computed(() => `${(nowMinutes.value / 60) * HOUR_HEIGHT}px`);

  // Refresh every minute
  setInterval(() => {
    nowMinutes.value = new Date().getHours() * 60 + new Date().getMinutes();
  }, 60_000);
</script>

<template>
  <div class="base-scheduler-time-grid">
    <!-- Column headers (day labels) -->
    <div class="base-scheduler-time-grid__header">
      <div class="base-scheduler-time-grid__gutter-spacer" />
      <div
        v-for="day in days"
        :key="day"
        :class="[
          'base-scheduler-time-grid__day-header',
          { 'base-scheduler-time-grid__day-header--today': day === todayIso },
        ]"
      >
        <span class="base-scheduler-time-grid__day-name">
          {{ new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }) }}
        </span>
        <span class="base-scheduler-time-grid__day-number">
          {{ new Date(day + 'T00:00:00').getDate() }}
        </span>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="base-scheduler-time-grid__scroll-area">
      <!-- Hour gutter -->
      <div class="base-scheduler-time-grid__gutter">
        <div
          v-for="h in HOURS"
          :key="h"
          class="base-scheduler-time-grid__hour-label"
          :style="{ height: `${HOUR_HEIGHT}px` }"
        >
          <span>{{ formatHour(h) }}</span>
        </div>
      </div>

      <!-- Day columns -->
      <div
        class="base-scheduler-time-grid__columns"
        :style="{ height: `${GRID_HEIGHT}px` }"
      >
        <div
          v-for="day in days"
          :key="day"
          :class="['base-scheduler-time-grid__column', { 'base-scheduler-time-grid__column--today': day === todayIso }]"
          :data-scheduler-day="day"
        >
          <!-- Hour grid lines -->
          <div
            v-for="h in HOURS"
            :key="h"
            class="base-scheduler-time-grid__hour-row"
            :style="{ height: `${HOUR_HEIGHT}px` }"
          />

          <!-- Events -->
          <BaseSchedulerEvent
            v-for="slot in layouts[day]"
            :key="slot.event.uid"
            :event="slot.event"
            :duration="formatDuration(slot.event)"
            :top="slotTop(slot.event)"
            :height="slotHeight(slot.event)"
            :width-fraction="1 / slot.totalColumns"
            :left-fraction="slot.column / slot.totalColumns"
            @click="emit('event-click', $event)"
            @drag-start="(uid, oy) => emit('event-drag-start', uid, oy)"
            @resize-start="(uid, sy) => emit('event-resize-start', uid, sy)"
          />

          <!-- Current time indicator (only on today's column) -->
          <div
            v-if="day === todayIso"
            class="base-scheduler-time-grid__now-line"
            :style="{ top: nowTop }"
            aria-hidden="true"
          />

          <!-- Slot-click target: sits behind events, provides accessible button for adding events -->
          <button
            class="base-scheduler-time-grid__slot-btn"
            :aria-label="`Add event on ${new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`"
            @click="onColumnClick($event, day)"
            @keydown="onColumnKeydown($event, day)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  $gutter-width: 52px;

  .base-scheduler-time-grid {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    // ── Header ────────────────────────────────────────────────────────────────

    &__header {
      display: flex;
      border-bottom: 1px solid var(--mp-color-border-default);
      background: var(--mp-color-bg-surface);
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    &__gutter-spacer {
      width: $gutter-width;
      flex-shrink: 0;
    }

    &__day-header {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--mp-spacing-2) var(--mp-spacing-1);
      gap: var(--mp-spacing-1);

      &--today .base-scheduler-time-grid__day-number {
        background: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        border-radius: var(--mp-radius-full);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    &__day-name {
      @include mp.mp-font-caption;

      color: var(--mp-color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    &__day-number {
      @include mp.mp-font-body-md;

      font-weight: 600;
    }

    // ── Scrollable area ───────────────────────────────────────────────────────

    &__scroll-area {
      display: flex;
      flex: 1;
      overflow: hidden auto;
    }

    // ── Hour gutter ───────────────────────────────────────────────────────────

    &__gutter {
      width: $gutter-width;
      flex-shrink: 0;
    }

    &__hour-label {
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding-right: var(--mp-spacing-2);
      padding-top: 2px;

      span {
        @include mp.mp-font-caption;

        color: var(--mp-color-text-secondary);
        white-space: nowrap;
      }
    }

    // ── Columns ────────────────────────────────────────────────────────────────

    &__columns {
      display: flex;
      flex: 1;
      position: relative;
    }

    &__column {
      flex: 1;
      position: relative;
      border-left: 1px solid var(--mp-color-border-default);
      cursor: cell;

      &--today {
        background-color: var(--mp-color-primary-50, rgb(244 240 255 / 30%));
      }
    }

    &__slot-btn {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      cursor: cell;
      z-index: 0;

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: -2px;
      }
    }

    // ── Hour rows (grid lines) ────────────────────────────────────────────────

    &__hour-row {
      border-bottom: 1px solid var(--mp-color-border-muted, var(--mp-color-border-default));

      &:nth-child(2n) {
        border-bottom-style: dashed;
        opacity: 0.5;
      }
    }

    // ── Current time indicator ─────────────────────────────────────────────────

    &__now-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--mp-color-danger-500, #ef4444);
      z-index: 5;
      pointer-events: none;

      &::before {
        content: '';
        position: absolute;
        left: -4px;
        top: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--mp-color-danger-500, #ef4444);
      }
    }
  }
</style>
