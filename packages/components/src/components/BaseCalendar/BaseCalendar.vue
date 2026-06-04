<script lang="ts" setup>
  import { IconChevron } from '@mission-platform/icons';
  import { DateTime } from 'luxon';
  import { computed, ref, watch } from 'vue';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  export type CalendarSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** ISO date string (YYYY-MM-DD) – the selected date. */
      modelValue?: string;
      /** Earliest selectable ISO date (YYYY-MM-DD). */
      min?: string;
      /** Latest selectable ISO date (YYYY-MM-DD). */
      max?: string;
      /** Array of ISO date strings (YYYY-MM-DD) that should be un-selectable. */
      disabledDates?: string[];
      /** Visual size of the calendar. */
      size?: CalendarSize;
      /** IANA timezone string used for rendering (e.g. "America/New_York"). Defaults to the local timezone. */
      timezone?: string;
    }>(),
    {
      modelValue: undefined,
      min: undefined,
      max: undefined,
      disabledDates: () => [],
      size: 'md',
      timezone: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [value: string];
  }>();

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function zone() {
    return props.timezone ?? 'local';
  }

  function parseISO(iso: string): DateTime | null {
    if (!iso) return null;
    const dt = DateTime.fromISO(iso, { zone: zone() });
    return dt.isValid ? dt : null;
  }

  function todayISO(): string {
    return DateTime.now().setZone(zone()).toISODate() ?? '';
  }

  // ── View state ────────────────────────────────────────────────────────────────

  const initialView = (() => {
    const selected = props.modelValue ? parseISO(props.modelValue) : null;
    const base = selected ?? DateTime.now().setZone(zone());
    return base.startOf('month');
  })();

  const viewYear = ref(initialView.year);
  const viewMonth = ref(initialView.month); // 1-12 (Luxon convention)

  const MONTHS = [
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
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // ── Computed constraints ──────────────────────────────────────────────────────

  const minDt = computed(() => (props.min ? parseISO(props.min) : null));
  const maxDt = computed(() => (props.max ? parseISO(props.max) : null));
  const disabledSet = computed(() => new Set(props.disabledDates ?? []));

  // ── Calendar grid ─────────────────────────────────────────────────────────────

  interface CalendarCell {
    day: number | null;
    iso: string | null;
    disabled: boolean;
  }

  const calendarDays = computed((): CalendarCell[] => {
    const firstOfMonth = DateTime.fromObject(
      { year: viewYear.value, month: viewMonth.value, day: 1 },
      { zone: zone() },
    );
    // Sunday-first offset: Luxon weekday is 1(Mon)–7(Sun); JS getDay is 0(Sun)–6(Sat)
    const startOffset = firstOfMonth.toJSDate().getDay(); // 0 = Sunday
    const daysInMonth = firstOfMonth.daysInMonth ?? 30;

    const cells: CalendarCell[] = [];

    // Leading empty cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, iso: null, disabled: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = firstOfMonth.set({ day: d });
      const iso = dt.toISODate() ?? '';
      let disabled = false;
      if (minDt.value && dt < minDt.value.startOf('day')) disabled = true;
      if (maxDt.value && dt > maxDt.value.startOf('day')) disabled = true;
      if (disabledSet.value.has(iso)) disabled = true;
      cells.push({ day: d, iso, disabled });
    }

    return cells;
  });

  // ── Calendar weeks ─────────────────────────────────────────────────────────

  const calendarWeeks = computed((): CalendarCell[][] => {
    const cells = calendarDays.value;
    const weeks: CalendarCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  // ── Navigation ────────────────────────────────────────────────────────────────

  function prevMonth() {
    const prev = DateTime.fromObject({ year: viewYear.value, month: viewMonth.value }, { zone: zone() }).minus({
      months: 1,
    });
    viewYear.value = prev.year;
    viewMonth.value = prev.month;
  }

  function nextMonth() {
    const next = DateTime.fromObject({ year: viewYear.value, month: viewMonth.value }, { zone: zone() }).plus({
      months: 1,
    });
    viewYear.value = next.year;
    viewMonth.value = next.month;
  }

  // ── Selection ─────────────────────────────────────────────────────────────────

  function selectDate(iso: string | null, disabled: boolean) {
    if (!iso || disabled) return;
    emit('update:modelValue', iso);
    emit('change', iso);
  }

  // ── State helpers ─────────────────────────────────────────────────────────────

  const today = todayISO();

  function isSelected(iso: string | null): boolean {
    return !!iso && iso === props.modelValue;
  }

  function isToday(iso: string | null): boolean {
    return !!iso && iso === today;
  }

  // ── Sync view when modelValue changes externally ──────────────────────────────

  watch(
    () => props.modelValue,
    (val) => {
      if (!val) return;
      const dt = parseISO(val);
      if (dt) {
        viewYear.value = dt.year;
        viewMonth.value = dt.month;
      }
    },
  );
</script>

<template>
  <div
    :aria-label="`Calendar, ${MONTHS[viewMonth - 1]} ${viewYear}`"
    :class="['base-calendar', `base-calendar--${size}`]"
    role="application"
  >
    <!-- Month / year navigation -->
    <div class="base-calendar__header">
      <button
        aria-label="Previous month"
        class="base-calendar__nav-btn"
        type="button"
        @click="prevMonth"
      >
        <IconChevron
          direction="left"
          size="xs"
        />
      </button>

      <BaseTypography
        as="span"
        class="base-calendar__month-label"
        color="primary"
        variant="label"
      >
        {{ MONTHS[viewMonth - 1] }} {{ viewYear }}
      </BaseTypography>

      <button
        aria-label="Next month"
        class="base-calendar__nav-btn"
        type="button"
        @click="nextMonth"
      >
        <IconChevron
          direction="right"
          size="xs"
        />
      </button>
    </div>

    <!-- Day grid -->
    <div
      :aria-label="`${MONTHS[viewMonth - 1]} ${viewYear}`"
      class="base-calendar__grid"
      role="grid"
    >
      <!-- Weekday header row -->
      <div
        class="base-calendar__row"
        role="row"
      >
        <span
          v-for="d in DAYS"
          :key="d"
          :aria-label="d"
          class="base-calendar__weekday"
          role="columnheader"
        >
          {{ d }}
        </span>
      </div>

      <!-- Week rows -->
      <div
        v-for="(week, wi) in calendarWeeks"
        :key="wi"
        class="base-calendar__row"
        role="row"
      >
        <button
          v-for="(cell, i) in week"
          :key="i"
          :aria-current="isToday(cell.iso) ? 'date' : undefined"
          :aria-label="cell.iso ?? undefined"
          :aria-selected="isSelected(cell.iso)"
          :class="[
            'base-calendar__day',
            {
              'base-calendar__day--empty': !cell.day,
              'base-calendar__day--selected': isSelected(cell.iso),
              'base-calendar__day--today': isToday(cell.iso) && !isSelected(cell.iso),
              'base-calendar__day--disabled': cell.disabled && !!cell.day,
            },
          ]"
          :disabled="!cell.day || cell.disabled"
          role="gridcell"
          type="button"
          @click="selectDate(cell.iso, cell.disabled)"
        >
          {{ cell.day ?? '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-calendar {
    display: inline-flex;
    flex-direction: column;
    background: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-lg);
    box-shadow: var(--mp-shadow-md);
    user-select: none;

    /* ── Sizes ─────────────────────────────────────────────────────────────────── */

    &--sm {
      padding: var(--mp-spacing-2);
      min-width: 240px;

      .base-calendar__weekday,
      .base-calendar__day {
        height: 28px;

        @include mp.mp-font-caption;
      }
    }

    &--md {
      padding: var(--mp-spacing-3);
      min-width: 280px;

      .base-calendar__weekday,
      .base-calendar__day {
        height: 32px;

        @include mp.mp-font-body-sm;
      }
    }

    &--lg {
      padding: var(--mp-spacing-4);
      min-width: 320px;

      .base-calendar__weekday,
      .base-calendar__day {
        height: 40px;

        @include mp.mp-font-body-md;
      }
    }

    /* ── Header ────────────────────────────────────────────────────────────────── */

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--mp-spacing-2);
    }

    &__month-label {
      flex: 1;
      text-align: center;
    }

    &__nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-secondary);
      transition:
        background-color 150ms ease,
        color 150ms ease;

      &:hover {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }

    /* ── Grid ──────────────────────────────────────────────────────────────────── */

    &__grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    &__row {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: subgrid;
    }

    &__weekday {
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--mp-font-weight-medium);
      color: var(--mp-color-text-tertiary);
    }

    /* ── Day cells ─────────────────────────────────────────────────────────────── */

    &__day {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-primary);
      transition:
        background-color 150ms ease,
        color 150ms ease;

      &--empty {
        pointer-events: none;
      }

      &--selected {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-semibold);
      }

      &--today {
        background-color: color-mix(in srgb, var(--mp-color-primary-default) 12%, transparent);
        color: var(--mp-color-primary-default);
        font-weight: var(--mp-font-weight-semibold);
      }

      &--disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:hover:not(:disabled, .base-calendar__day--selected) {
        background-color: var(--mp-color-bg-muted);
      }
    }
  }
</style>
