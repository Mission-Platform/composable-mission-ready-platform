<script lang="ts" setup>
  /**
   * `BaseSchedulerYearView` — Scheduler year view component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import BaseButton from '../base-button/base-button.vue';

  import type { VEvent } from './types';

  const props = withDefaults(
    defineProps<{
      /** JS Date — any day within the target year. */
      anchor: Date;
      /** Full event list (unfiltered). */
      events: VEvent[];
      /**
       * Day the week starts on.
       * 0 = Sunday (default), 1 = Monday, …, 6 = Saturday.
       */
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }>(),
    { weekStartsOn: 0 },
  );

  const emit = defineEmits<{
    /** User clicked on a mini-calendar month — navigate to that month. */
    'month-click': [date: Date];
    /** User clicked on a specific day — drill down to day view. */
    'day-click': [date: Date];
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

  function parseDate(iso: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(iso);
  }

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const today = startOfDay(new Date());

  // ─── Mini-calendar model ────────────────────────────────────────────────

  interface MiniDay {
    date: Date | null; // null = filler cell
    isCurrentMonth: boolean;
    isToday: boolean;
    hasEvent: boolean;
  }

  interface MiniMonth {
    month: number; // 0-11
    year: number;
    label: string;
    days: MiniDay[];
  }

  const year = computed(() => props.anchor.getFullYear());

  /** Single-letter weekday labels rotated to start on the configured day. */
  const ALL_WD_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekdayLetters = computed(() => [
    ...ALL_WD_LETTERS.slice(props.weekStartsOn),
    ...ALL_WD_LETTERS.slice(0, props.weekStartsOn),
  ]);

  const months = computed((): MiniMonth[] => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const firstOfMonth = new Date(year.value, monthIndex, 1);
      const dow = firstOfMonth.getDay(); // 0=Sun…6=Sat
      const startOffset = (dow - props.weekStartsOn + 7) % 7;
      const daysInMonth = new Date(year.value, monthIndex + 1, 0).getDate();

      const days: MiniDay[] = [];

      // Leading fillers
      for (let i = 0; i < startOffset; i++) {
        days.push({ date: null, isCurrentMonth: false, isToday: false, hasEvent: false });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = startOfDay(new Date(year.value, monthIndex, d));
        const dayEnd = addDays(date, 1);

        const hasEvent = props.events.some((e) => {
          if (e.status === 'CANCELLED') return false;
          const s = parseDate(e.dtstart);
          const en = parseDate(e.dtend);
          return s < dayEnd && en > date;
        });

        days.push({
          date,
          isCurrentMonth: true,
          isToday: date.getTime() === today.getTime(),
          hasEvent,
        });
      }

      return {
        month: monthIndex,
        year: year.value,
        label: MONTH_NAMES[monthIndex],
        days,
      };
    });
  });

  const yearLabel = computed(() => String(year.value));
</script>

<template>
  <div
    class="base-scheduler-year-view"
    :aria-label="`Year ${yearLabel}`"
  >
    <div class="base-scheduler-year-view__grid">
      <div
        v-for="month in months"
        :key="month.month"
        class="base-scheduler-year-view__month"
      >
        <!-- Month heading -->
        <BaseButton
          variant="ghost"
          size="sm"
          class="base-scheduler-year-view__month-title"
          @click="emit('month-click', new Date(month.year, month.month, 1))"
        >
          {{ month.label }}
        </BaseButton>

        <!-- Mini weekday row -->
        <div class="base-scheduler-year-view__weekdays">
          <span
            v-for="(wd, wdi) in weekdayLetters"
            :key="wdi"
            class="base-scheduler-year-view__wd"
          >
            {{ wd }}
          </span>
        </div>

        <!-- Day cells -->
        <div class="base-scheduler-year-view__days">
          <button
            v-for="(day, di) in month.days"
            :key="di"
            :class="[
              'base-scheduler-year-view__day',
              {
                'base-scheduler-year-view__day--filler': !day.date,
                'base-scheduler-year-view__day--today': day.isToday,
                'base-scheduler-year-view__day--has-event': day.hasEvent,
              },
            ]"
            :disabled="!day.date"
            type="button"
            :aria-label="day.date?.toLocaleDateString() ?? undefined"
            @click="day.date && emit('day-click', day.date)"
          >
            {{ day.date?.getDate() ?? '' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-scheduler-year-view {
    padding: var(--mp-spacing-4);
    overflow-y: auto;
    height: 100%;

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--mp-spacing-6);
    }

    // ── Mini month ─────────────────────────────────────────────────────────────

    &__month {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);
    }

    &__month-title {
      @include mp.mp-font-body-sm;

      justify-content: flex-start;
      font-weight: 600;
      padding: 0;
      margin-bottom: var(--mp-spacing-1);

      &.base-button--ghost:hover {
        background: transparent;
        color: var(--mp-color-primary-default);
        text-decoration: underline;
      }
    }

    // ── Weekday labels ─────────────────────────────────────────────────────────

    &__weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
    }

    &__wd {
      @include mp.mp-font-caption;

      text-align: center;
      color: var(--mp-color-text-secondary);
      font-weight: 600;
    }

    // ── Day grid ──────────────────────────────────────────────────────────────

    &__days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
    }

    &__day {
      @include mp.mp-font-caption;

      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-full);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &--filler {
        visibility: hidden;
        pointer-events: none;
      }

      &--today {
        background: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: 700;
      }

      &--has-event:not(.base-scheduler-year-view__day--today)::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--mp-color-primary-default);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 1px;
      }

      &:hover:not(:disabled, .base-scheduler-year-view__day--today) {
        background: var(--mp-color-bg-muted);
      }
    }
  }
</style>
