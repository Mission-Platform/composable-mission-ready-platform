<script lang="ts" setup>
  import { IconChevron } from '@mission-platform/icons';
  import { computed, ref } from 'vue';

  import BaseButton from '../base-button/base-button.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseSchedulerEventDialog from './base-scheduler-event-dialog.vue';
  import BaseSchedulerMonthView from './base-scheduler-month-view.vue';
  import BaseSchedulerTimeGrid from './base-scheduler-time-grid.vue';
  import BaseSchedulerYearView from './base-scheduler-year-view.vue';
  import { useScheduler } from './use-scheduler';

  import type { SchedulerView, VEvent } from './types';

  const props = withDefaults(
    defineProps<{
      /** Initial list of RFC 5545 events. */
      modelValue?: VEvent[];
      /** Initially active view. */
      defaultView?: SchedulerView;
      /**
       * Day the week starts on.
       * 0 = Sunday (default / RFC 5545), 1 = Monday, …, 6 = Saturday.
       */
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }>(),
    {
      modelValue: () => [],
      defaultView: 'week',
      weekStartsOn: 0,
    },
  );

  const emit = defineEmits<{
    /** Emitted whenever the event list changes (CRUD or drag/resize). */
    'update:modelValue': [events: VEvent[]];
    /** Emitted when the user clicks an event chip. */
    'event-click': [event: VEvent];
  }>();

  // ─── Scheduler state ───────────────────────────────────────────────────────

  const scheduler = useScheduler(props.modelValue ?? [], props.weekStartsOn);
  scheduler.setView(props.defaultView);

  function syncEmit() {
    emit('update:modelValue', scheduler.events.value);
  }

  // ─── View switcher ────────────────────────────────────────────────────────

  const VIEWS: { id: SchedulerView; label: string }[] = [
    { id: 'day', label: 'Day' },
    { id: 'three-day', label: '3 Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  // ─── Toolbar heading ──────────────────────────────────────────────────────

  const toolbarTitle = computed(() => {
    const a = scheduler.anchor.value;
    const v = scheduler.view.value;

    if (v === 'day') {
      return a.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (v === 'three-day') {
      const end = scheduler.addDays(a, 2);
      const startStr = a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
    if (v === 'week') {
      const start = scheduler.startOfWeek(a);
      const end = scheduler.addDays(start, 6);
      const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
    if (v === 'month') {
      return a.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return String(a.getFullYear());
  });

  // ─── Days array for time-grid views ──────────────────────────────────────

  function isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const gridDays = computed((): string[] => {
    const v = scheduler.view.value;
    const a = scheduler.anchor.value;

    if (v === 'day') return [isoDate(a)];

    if (v === 'three-day') {
      return [0, 1, 2].map((i) => isoDate(scheduler.addDays(a, i)));
    }

    if (v === 'week') {
      const start = scheduler.startOfWeek(a);
      return [0, 1, 2, 3, 4, 5, 6].map((i) => isoDate(scheduler.addDays(start, i)));
    }

    return [];
  });

  // ─── Events keyed by ISO date (for time-grid) ─────────────────────────────

  const eventsByDay = computed((): Record<string, VEvent[]> => {
    const result: Record<string, VEvent[]> = {};
    for (const day of gridDays.value) {
      result[day] = scheduler.eventsForDay(scheduler.parseDate(day));
    }
    return result;
  });

  // ─── Pre-expanded events for month and year views ─────────────────────────

  /**
   * All event occurrences (including recurring) that fall within the current
   * month's display range (the full 6-week grid: from the configured
   * week-start day before the first of the month to 42 days later).
   */
  const expandedMonthEvents = computed((): VEvent[] => {
    const a = scheduler.anchor.value;
    const firstOfMonth = new Date(a.getFullYear(), a.getMonth(), 1);
    // Use the scheduler's startOfWeek so it respects weekStartsOn
    const gridStart = scheduler.startOfWeek(firstOfMonth);
    // 6 rows × 7 columns = 42 days
    const gridEnd = scheduler.addDays(gridStart, 42);
    return scheduler.eventsForRange(gridStart, gridEnd);
  });

  /**
   * All event occurrences (including recurring) that fall within the entire
   * calendar year currently shown by the year view.
   */
  const expandedYearEvents = computed((): VEvent[] => {
    const year = scheduler.anchor.value.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    return scheduler.eventsForRange(yearStart, yearEnd);
  });

  // ─── Drag / drop on time grid ─────────────────────────────────────────────

  const dragging = ref<{ uid: string; offsetY: number } | null>(null);
  const resizing = ref<{ uid: string; startY: number } | null>(null);
  const HOUR_HEIGHT = 60;

  function onEventDragStart(uid: string, offsetY: number) {
    dragging.value = { uid, offsetY };
    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragEnd, { once: true });
  }

  function onDragMove(e: PointerEvent) {
    if (!dragging.value) return;
    e.preventDefault();
  }

  function onDragEnd(e: PointerEvent) {
    if (!dragging.value) return;
    window.removeEventListener('pointermove', onDragMove);

    // Find the column element under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const col = el?.closest('[data-scheduler-day]') as HTMLElement | null;
    if (!col) {
      dragging.value = null;
      return;
    }

    const dayIso = col.dataset.schedulerDay;
    if (!dayIso) {
      dragging.value = null;
      return;
    }

    const rect = col.getBoundingClientRect();
    const relY = e.clientY - rect.top - dragging.value.offsetY;
    const totalMinutes = Math.round(((relY / HOUR_HEIGHT) * 60) / 15) * 15; // snap 15m
    const hours = Math.max(0, Math.min(23, Math.floor(totalMinutes / 60)));
    const mins = Math.max(0, totalMinutes % 60);

    const ev = scheduler.events.value.find((e) => e.uid === dragging.value!.uid);
    if (ev) {
      const oldStart = scheduler.parseDate(ev.dtstart);
      const newStart = new Date(
        scheduler.parseDate(dayIso).getFullYear(),
        scheduler.parseDate(dayIso).getMonth(),
        scheduler.parseDate(dayIso).getDate(),
        hours,
        mins,
      );
      const delta = newStart.getTime() - oldStart.getTime();
      scheduler.moveEvent(dragging.value.uid, delta);
      syncEmit();
    }

    dragging.value = null;
  }

  function onEventResizeStart(uid: string, startY: number) {
    resizing.value = { uid, startY };
    window.addEventListener('pointermove', onResizeMove, { passive: false });
    window.addEventListener('pointerup', onResizeEnd, { once: true });
  }

  function onResizeMove(e: PointerEvent) {
    if (!resizing.value) return;
    e.preventDefault();
    const deltaY = e.clientY - resizing.value.startY;
    const deltaMs = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15 * 60_000;
    if (Math.abs(deltaMs) < 60_000) return;
    scheduler.resizeEvent(resizing.value.uid, deltaMs);
    resizing.value.startY = e.clientY;
    syncEmit();
  }

  function onResizeEnd() {
    window.removeEventListener('pointermove', onResizeMove);
    resizing.value = null;
  }

  // ─── Dialog ────────────────────────────────────────────────────────────────

  const dialogOpen = ref(false);
  const dialogEvent = ref<VEvent | undefined>(undefined);
  const dialogDefaultStart = ref<string | undefined>(undefined);

  function openCreateDialog(datetimeISO?: string) {
    dialogEvent.value = undefined;
    dialogDefaultStart.value = datetimeISO;
    dialogOpen.value = true;
  }

  function openEditDialog(event: VEvent) {
    dialogEvent.value = event;
    dialogDefaultStart.value = undefined;
    dialogOpen.value = true;
    emit('event-click', event);
  }

  function onDialogSave(partial: Omit<VEvent, 'uid' | 'dtstamp'>) {
    if (dialogEvent.value) {
      scheduler.updateEvent(dialogEvent.value.uid, partial);
    } else {
      scheduler.addEvent(partial);
    }
    dialogOpen.value = false;
    syncEmit();
  }

  function onDialogDelete(uid: string) {
    scheduler.removeEvent(uid);
    dialogOpen.value = false;
    syncEmit();
  }

  // ─── Month/year drill-down ────────────────────────────────────────────────

  function onDrillDown(date: Date) {
    scheduler.setView('day', date);
  }

  function onMonthClick(date: Date) {
    scheduler.setView('month', date);
  }
</script>

<template>
  <div class="base-scheduler">
    <!-- ── Toolbar ── -->
    <div class="base-scheduler__toolbar">
      <!-- Today -->
      <BaseButton
        variant="secondary"
        size="sm"
        @click="scheduler.goToToday()"
      >
        Today
      </BaseButton>

      <!-- Prev / Next -->
      <div class="base-scheduler__nav">
        <BaseButton
          variant="ghost"
          size="sm"
          aria-label="Previous"
          @click="scheduler.prev()"
        >
          <IconChevron class="base-scheduler__icon base-scheduler__icon--prev" />
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          aria-label="Next"
          @click="scheduler.next()"
        >
          <IconChevron class="base-scheduler__icon base-scheduler__icon--next" />
        </BaseButton>
      </div>

      <!-- Title -->
      <BaseTypography
        as="h2"
        variant="h5"
        class="base-scheduler__title"
      >
        {{ toolbarTitle }}
      </BaseTypography>

      <!-- Spacer -->
      <div class="base-scheduler__spacer" />

      <!-- New Event -->
      <BaseButton
        variant="primary"
        size="sm"
        @click="openCreateDialog()"
      >
        + New Event
      </BaseButton>

      <!-- View switcher -->
      <div
        class="base-scheduler__view-switcher"
        role="group"
        aria-label="Calendar view"
      >
        <BaseButton
          v-for="v in VIEWS"
          :key="v.id"
          :variant="scheduler.view.value === v.id ? 'primary' : 'ghost'"
          size="sm"
          class="base-scheduler__view-btn"
          @click="scheduler.setView(v.id)"
        >
          {{ v.label }}
        </BaseButton>
      </div>
    </div>

    <!-- ── View content ── -->
    <div class="base-scheduler__body">
      <!-- Day / 3-Day / Week — shared time grid -->
      <BaseSchedulerTimeGrid
        v-if="scheduler.view.value !== 'month' && scheduler.view.value !== 'year'"
        :days="gridDays"
        :events-by-day="eventsByDay"
        :format-duration="scheduler.formatDuration"
        @slot-click="openCreateDialog($event)"
        @event-click="openEditDialog"
        @event-drag-start="onEventDragStart"
        @event-resize-start="onEventResizeStart"
      />

      <!-- Month view -->
      <BaseSchedulerMonthView
        v-else-if="scheduler.view.value === 'month'"
        :anchor="scheduler.anchor.value"
        :events="expandedMonthEvents"
        :format-duration="scheduler.formatDuration"
        :week-starts-on="scheduler.weekStartsOn"
        @day-click="openCreateDialog(isoDate($event) + 'T09:00:00')"
        @event-click="openEditDialog"
        @drill-down="onDrillDown"
      />

      <!-- Year view -->
      <BaseSchedulerYearView
        v-else-if="scheduler.view.value === 'year'"
        :anchor="scheduler.anchor.value"
        :events="expandedYearEvents"
        :week-starts-on="scheduler.weekStartsOn"
        @day-click="onDrillDown"
        @month-click="onMonthClick"
      />
    </div>

    <!-- ── Event dialog ── -->
    <BaseSchedulerEventDialog
      :open="dialogOpen"
      :event="dialogEvent"
      :default-start="dialogDefaultStart"
      @save="onDialogSave"
      @delete="onDialogDelete"
      @close="dialogOpen = false"
    />
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-scheduler {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-lg);
    overflow: hidden;

    // ── Toolbar ───────────────────────────────────────────────────────────────

    &__toolbar {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      padding: var(--mp-spacing-3) var(--mp-spacing-4);
      border-bottom: 1px solid var(--mp-color-border-default);
      background: var(--mp-color-bg-surface);
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    &__title {
      margin: 0;
      white-space: nowrap;
    }

    &__spacer {
      flex: 1;
    }

    // ── Navigation arrows ─────────────────────────────────────────────────────

    &__nav {
      display: flex;
      gap: 2px;
    }

    &__icon {
      width: 16px;
      height: 16px;

      &--prev {
        transform: rotate(90deg);
      }

      &--next {
        transform: rotate(-90deg);
      }
    }

    // ── View switcher ─────────────────────────────────────────────────────────

    &__view-switcher {
      display: flex;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      overflow: hidden;

      // Flatten nested BaseButton borders so they look like a segmented control
      .base-button {
        border-radius: 0;
        border: none;

        &:not(:last-child) {
          border-right: 1px solid var(--mp-color-border-default);
        }
      }
    }

    // ── Body ──────────────────────────────────────────────────────────────────

    &__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  }
</style>
