<script lang="ts" setup>
  import { computed } from 'vue';

  import BaseButton from '../base-button/base-button.vue';

  import type { VEvent } from './types';

  const props = withDefaults(
    defineProps<{
      /** JS Date — any day within the target month. */
      anchor: Date;
      /** Full event list (unfiltered). */
      events: VEvent[];
      /** Produce a human-readable duration string for an event. */
      formatDuration: (event: VEvent) => string;
      /**
       * Day the week starts on.
       * 0 = Sunday (default), 1 = Monday, …, 6 = Saturday.
       */
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }>(),
    { weekStartsOn: 0 },
  );

  const emit = defineEmits<{
    /** User clicked on an empty date cell. */
    'day-click': [date: Date];
    /** User clicked on an event pill. */
    'event-click': [event: VEvent];
    /** User wants to drill down into a specific day (e.g. "+3 more" click). */
    'drill-down': [date: Date];
  }>();

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseDate(iso: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(iso);
  }

  const ALL_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /** Weekday header labels rotated to start on the configured day. */
  const weekdayHeaders = computed(() => [
    ...ALL_WEEKDAYS.slice(props.weekStartsOn),
    ...ALL_WEEKDAYS.slice(0, props.weekStartsOn),
  ]);

  // ─── Month grid ────────────────────────────────────────────────────────────

  interface MonthCell {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: VEvent[];
  }

  const today = startOfDay(new Date());

  const grid = computed((): MonthCell[][] => {
    const a = props.anchor;
    const firstOfMonth = new Date(a.getFullYear(), a.getMonth(), 1);
    // Compute offset from the first of the month back to the configured week-start day
    const dow = firstOfMonth.getDay(); // 0=Sun…6=Sat
    const startOffset = (dow - props.weekStartsOn + 7) % 7;
    const gridStart = addDays(firstOfMonth, -startOffset);

    // Always render 6 rows × 7 cols = 42 cells for a stable layout
    const cells: MonthCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i);
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);

      const eventsOnDay = props.events.filter((e) => {
        if (e.status === 'CANCELLED') return false;
        const s = parseDate(e.dtstart);
        const en = parseDate(e.dtend);
        return s < dayEnd && en > dayStart;
      });

      cells.push({
        date,
        isCurrentMonth: date.getMonth() === a.getMonth(),
        isToday: date.getTime() === today.getTime(),
        events: eventsOnDay,
      });
    }

    // Group into weeks
    const weeks: MonthCell[][] = [];
    for (let i = 0; i < 42; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  // ─── Month/year label ──────────────────────────────────────────────────────

  const monthLabel = computed(() => props.anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));

  // ─── Event display limit per cell ─────────────────────────────────────────

  const MAX_VISIBLE = 3;
</script>

<template>
  <div
    class="base-scheduler-month-view"
    role="grid"
    :aria-label="monthLabel"
  >
    <!-- Weekday headers -->
    <div
      class="base-scheduler-month-view__weekdays"
      role="row"
    >
      <div
        v-for="wd in weekdayHeaders"
        :key="wd"
        class="base-scheduler-month-view__weekday"
        role="columnheader"
      >
        {{ wd }}
      </div>
    </div>

    <!-- Week rows -->
    <div
      v-for="(week, wi) in grid"
      :key="wi"
      class="base-scheduler-month-view__week"
      role="row"
    >
      <div
        v-for="cell in week"
        :key="isoDate(cell.date)"
        :class="[
          'base-scheduler-month-view__cell',
          {
            'base-scheduler-month-view__cell--other-month': !cell.isCurrentMonth,
            'base-scheduler-month-view__cell--today': cell.isToday,
          },
        ]"
        role="gridcell"
        :aria-label="cell.date.toLocaleDateString()"
        tabindex="0"
        @click="emit('day-click', cell.date)"
        @keydown.enter="emit('day-click', cell.date)"
      >
        <!-- Day number -->
        <span class="base-scheduler-month-view__day-number">
          {{ cell.date.getDate() }}
        </span>

        <!-- Event pills -->
        <div class="base-scheduler-month-view__events">
          <BaseButton
            v-for="ev in cell.events.slice(0, MAX_VISIBLE)"
            :key="ev.uid"
            variant="ghost"
            size="sm"
            class="base-scheduler-month-view__event-pill"
            :style="{ backgroundColor: ev.color ?? 'var(--mp-color-primary-default)' }"
            :title="`${ev.summary ?? '(no title)'} · ${formatDuration(ev)}`"
            @click.stop="emit('event-click', ev)"
          >
            {{ ev.summary ?? '(no title)' }}
          </BaseButton>

          <!-- Overflow -->
          <BaseButton
            v-if="cell.events.length > MAX_VISIBLE"
            variant="ghost"
            size="sm"
            class="base-scheduler-month-view__overflow"
            @click.stop="emit('drill-down', cell.date)"
          >
            +{{ cell.events.length - MAX_VISIBLE }} more
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-scheduler-month-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    // ── Weekday header row ────────────────────────────────────────────────────

    &__weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid var(--mp-color-border-default);
      background: var(--mp-color-bg-surface);
      flex-shrink: 0;
    }

    &__weekday {
      @include mp.mp-font-caption;

      text-align: center;
      padding: var(--mp-spacing-2) 0;
      color: var(--mp-color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    // ── Week rows ─────────────────────────────────────────────────────────────

    &__week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      flex: 1;
      min-height: 0;
    }

    // ── Day cells ─────────────────────────────────────────────────────────────

    &__cell {
      border-right: 1px solid var(--mp-color-border-default);
      border-bottom: 1px solid var(--mp-color-border-default);
      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
      transition: background 0.1s ease;

      &--other-month {
        opacity: 0.4;
      }

      &:last-child {
        border-right: none;
      }

      &:hover {
        background: var(--mp-color-bg-muted);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: -2px;
      }

      &--today .base-scheduler-month-view__day-number {
        background: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        border-radius: var(--mp-radius-full);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    // ── Day number ────────────────────────────────────────────────────────────

    &__day-number {
      @include mp.mp-font-caption;

      font-weight: 600;
      align-self: flex-start;
      line-height: 24px;
    }

    // ── Events inside a cell ──────────────────────────────────────────────────

    &__events {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
      min-height: 0;
    }

    // The event pill overrides BaseButton to show the event colour as background
    &__event-pill {
      @include mp.mp-font-caption;

      display: block;
      width: 100%;
      justify-content: flex-start;
      border-radius: var(--mp-radius-xs, 2px);
      padding: 1px var(--mp-spacing-1);
      color: var(--mp-color-text-on-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      // Inline style sets backgroundColor; override BaseButton ghost defaults
      &.base-button--ghost {
        color: var(--mp-color-text-on-primary);

        &:hover {
          filter: brightness(0.9);
          background: inherit; // keep the event colour on hover
        }
      }
    }

    &__overflow {
      @include mp.mp-font-caption;

      justify-content: flex-start;
      padding: 0 var(--mp-spacing-1);
      color: var(--mp-color-text-secondary);

      &.base-button--ghost:hover {
        background: transparent;
        color: var(--mp-color-text-primary);
      }
    }
  }
</style>
