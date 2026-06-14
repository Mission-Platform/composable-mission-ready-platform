<script lang="ts" setup>
  /**
   * `BaseDateTimeRangeInput` — Date time range input component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { IconCalendar, IconChevron, IconGlobe } from '@mission-platform/icons';
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import { useZIndex } from '../../composables/use-z-index';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type DateTimeRangeInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  export type TimezoneMode = 'browser' | 'utc';

  export interface DateTimeRange {
    start: string; // ISO-like: "YYYY-MM-DD HH:MM" or "YYYY-MM-DDThh:mm:ssZ"
    end: string;
    timezone: TimezoneMode;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: DateTimeRange;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      size?: DateTimeRangeInputSize;
      showSeconds?: boolean;
      /** Earliest selectable date (`YYYY-MM-DD`); earlier days are disabled. */
      min?: string;
      /** Latest selectable date (`YYYY-MM-DD`); later days are disabled. */
      max?: string;
      id?: string;
    }>(),
    {
      modelValue: () => ({ start: '', end: '', timezone: 'browser' }),
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      size: 'md',
      showSeconds: false,
      min: undefined,
      max: undefined,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: DateTimeRange];
    change: [value: DateTimeRange];
  }>();

  const { id: resolvedId } = useId(props.id);
  const { zIndex } = useZIndex('inputPopover');

  const open = ref(false);
  const popoverRef = ref<HTMLElement | null>(null);
  const triggerRef = ref<HTMLElement | null>(null);

  const { floatingStyles } = useFloating(triggerRef, popoverRef, {
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  // ── Timezone toggle ──────────────────────────────────────────────────────
  const timezone = ref<TimezoneMode>(props.modelValue?.timezone ?? 'browser');

  const browserTimezoneLabel = computed(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Local';
    }
  });

  // ── Date range state ─────────────────────────────────────────────────────
  const leftYear = ref(new Date().getFullYear());
  const leftMonth = ref(new Date().getMonth());
  const rightYear = computed(() => (leftMonth.value === 11 ? leftYear.value + 1 : leftYear.value));
  const rightMonth = computed(() => (leftMonth.value === 11 ? 0 : leftMonth.value + 1));

  const hoverDate = ref<string | null>(null);
  const selectingPhase = ref<'start-date' | 'start-time' | 'end-date' | 'end-time'>('start-date');

  const startDate = ref('');
  const endDate = ref('');

  // ── Time state ───────────────────────────────────────────────────────────
  const startH = ref(0);
  const startM = ref(0);
  const startS = ref(0);
  const endH = ref(0);
  const endM = ref(0);
  const endS = ref(0);

  function parseDateTime(val: string) {
    if (!val) return { date: '', h: 0, m: 0, s: 0 };
    const [datePart, timePart] = val.includes('T') ? val.split('T') : val.split(' ');
    const parts = (timePart ?? '').replace('Z', '').split(':');
    return {
      date: datePart ?? '',
      h: parts[0] ? parseInt(parts[0], 10) : 0,
      m: parts[1] ? parseInt(parts[1], 10) : 0,
      s: parts[2] ? parseInt(parts[2], 10) : 0,
    };
  }

  watch(
    () => props.modelValue,
    (val) => {
      if (val?.timezone) timezone.value = val.timezone;
      if (val?.start) {
        const p = parseDateTime(val.start);
        startDate.value = p.date;
        startH.value = p.h;
        startM.value = p.m;
        startS.value = p.s;
      }
      if (val?.end) {
        const p = parseDateTime(val.end);
        endDate.value = p.date;
        endH.value = p.h;
        endM.value = p.m;
        endS.value = p.s;
      }
    },
    { immediate: true },
  );

  function pad(n: number) {
    return String(n).padStart(2, '0');
  }

  function formatDateTime(date: string, h: number, m: number, s: number) {
    if (!date) return '';
    const time = props.showSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;
    return `${date} ${time}`;
  }

  function emitValue() {
    const val: DateTimeRange = {
      start: formatDateTime(startDate.value, startH.value, startM.value, startS.value),
      end: formatDateTime(endDate.value, endH.value, endM.value, endS.value),
      timezone: timezone.value,
    };
    emit('update:modelValue', val);
    emit('change', val);
  }

  function clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val));
  }

  function setStartH(n: number) {
    startH.value = clamp(n, 0, 23);
    emitValue();
  }
  function setStartM(n: number) {
    startM.value = clamp(n, 0, 59);
    emitValue();
  }
  function setStartS(n: number) {
    startS.value = clamp(n, 0, 59);
    emitValue();
  }
  function setEndH(n: number) {
    endH.value = clamp(n, 0, 23);
    emitValue();
  }
  function setEndM(n: number) {
    endM.value = clamp(n, 0, 59);
    emitValue();
  }
  function setEndS(n: number) {
    endS.value = clamp(n, 0, 59);
    emitValue();
  }

  function toggleTimezone() {
    timezone.value = timezone.value === 'browser' ? 'utc' : 'browser';
    emitValue();
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  // ── Calendar helpers ─────────────────────────────────────────────────────
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

  function parseDate(val: string): Date | null {
    if (!val) return null;
    const d = new Date(val + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  const minDate = computed(() => (props.min ? parseDate(props.min) : null));
  const maxDate = computed(() => (props.max ? parseDate(props.max) : null));

  function buildDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; date: string | null; disabled: boolean }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null, disabled: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      let disabled = false;
      if (minDate.value && dateObj < minDate.value) disabled = true;
      if (maxDate.value && dateObj > maxDate.value) disabled = true;
      cells.push({
        day: d,
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        disabled,
      });
    }
    return cells;
  }

  const leftDays = computed(() => buildDays(leftYear.value, leftMonth.value));
  const rightDays = computed(() => buildDays(rightYear.value, rightMonth.value));

  function effectiveEndDate() {
    return endDate.value || hoverDate.value || null;
  }

  function isRangeStart(date: string | null) {
    if (!date || !startDate.value) return false;
    const e = effectiveEndDate();
    return e ? (startDate.value <= e ? date === startDate.value : date === e) : date === startDate.value;
  }

  function isRangeEnd(date: string | null) {
    if (!date || !startDate.value) return false;
    const e = effectiveEndDate();
    if (!e) return false;
    return startDate.value <= e ? date === e : date === startDate.value;
  }

  function isInRange(date: string | null) {
    if (!date || !startDate.value) return false;
    const e = effectiveEndDate();
    if (!e) return false;
    const [lo, hi] = startDate.value <= e ? [startDate.value, e] : [e, startDate.value];
    return date > lo && date < hi;
  }

  function isToday(date: string | null) {
    if (!date) return false;
    const t = new Date();
    return (
      date === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    );
  }

  function handleDayClick(date: string | null, disabled = false) {
    if (!date || disabled) return;
    if (selectingPhase.value === 'start-date' || endDate.value) {
      startDate.value = date;
      endDate.value = '';
      selectingPhase.value = 'end-date';
    } else {
      const s = startDate.value;
      const [lo, hi] = s <= date ? [s, date] : [date, s];
      startDate.value = lo;
      endDate.value = hi;
      selectingPhase.value = 'start-time';
      emitValue();
    }
  }

  function prevMonth() {
    if (leftMonth.value === 0) {
      leftYear.value--;
      leftMonth.value = 11;
    } else leftMonth.value--;
  }

  function nextMonth() {
    if (leftMonth.value === 11) {
      leftYear.value++;
      leftMonth.value = 0;
    } else leftMonth.value++;
  }

  // ── Open/close ────────────────────────────────────────────────────────────
  function toggleOpen() {
    if (props.disabled) return;
    if (!open.value) {
      selectingPhase.value = 'start-date';
      hoverDate.value = null;
      const d = parseDate(startDate.value);
      if (d) {
        leftYear.value = d.getFullYear();
        leftMonth.value = d.getMonth();
      }
    }
    open.value = !open.value;
  }

  function onClickOutside(e: MouseEvent) {
    const t = e.target as Node;
    if (popoverRef.value && !popoverRef.value.contains(t) && triggerRef.value && !triggerRef.value.contains(t))
      open.value = false;
  }

  onMounted(() => document.addEventListener('mousedown', onClickOutside));
  onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));

  // ── Display ───────────────────────────────────────────────────────────────
  const displayValue = computed(() => {
    const s = props.modelValue?.start;
    const e = props.modelValue?.end;
    const tz = props.modelValue?.timezone ?? 'browser';
    const tzLabel = tz === 'utc' ? 'UTC' : browserTimezoneLabel.value;
    if (s && e) return `${s}  →  ${e}  (${tzLabel})`;
    if (s) return `${s}  →  …  (${tzLabel})`;
    return '';
  });

  const leftLabel = computed(() => `${MONTHS[leftMonth.value]} ${leftYear.value}`);
  const rightLabel = computed(() => `${MONTHS[rightMonth.value]} ${rightYear.value}`);

  const phaseLabel = computed(() => {
    switch (selectingPhase.value) {
      case 'start-date':
        return 'Select start date';
      case 'end-date':
        return 'Select end date';
      case 'start-time':
        return 'Set start time';
      case 'end-time':
        return 'Set end time';
      default:
        return '';
    }
  });

  const showCalendar = computed(() => selectingPhase.value === 'start-date' || selectingPhase.value === 'end-date');
  const showStartTime = computed(() => selectingPhase.value === 'start-time');
  const showEndTime = computed(() => selectingPhase.value === 'end-time');
</script>

<template>
  <div :class="['base-dtr', `base-dtr--${size}`, { 'base-dtr--error': !!error, 'base-dtr--disabled': disabled }]">
    <label
      v-if="label"
      :class="['base-dtr__label', { 'base-dtr__label--hidden': labelHidden }]"
      :for="resolvedId"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >
        {{ label }}
      </BaseTypography>
      <span
        v-if="required"
        aria-hidden="true"
        class="base-dtr__required"
      >
        *
      </span>
    </label>

    <div class="base-dtr__wrapper">
      <!-- Leading extension (e.g. an icon, unit, or button). -->
      <span
        v-if="$slots.start"
        class="base-dtr__extension base-dtr__extension--start"
      >
        <slot name="start" />
      </span>
      <button
        :id="resolvedId"
        ref="triggerRef"
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        :aria-expanded="open"
        :aria-haspopup="'dialog'"
        :aria-invalid="!!error || undefined"
        :aria-label="label ?? 'Date-time range picker'"
        class="base-dtr__trigger"
        type="button"
        @click="toggleOpen"
        @keydown.escape="open = false"
      >
        <span :class="['base-dtr__value', { 'base-dtr__value--placeholder': !displayValue }]">
          {{ displayValue || 'YYYY-MM-DD HH:MM  →  YYYY-MM-DD HH:MM' }}
        </span>
        <span
          aria-hidden="true"
          class="base-dtr__icon"
        >
          <IconCalendar size="sm" />
        </span>
      </button>
      <!-- Trailing extension (e.g. an icon, unit, or button). -->
      <span
        v-if="$slots.end"
        class="base-dtr__extension base-dtr__extension--end"
      >
        <slot name="end" />
      </span>
    </div>

    <Teleport to="body">
      <div
        v-show="open"
        ref="popoverRef"
        :aria-label="`${label ?? 'Date-time range'} picker`"
        :style="{ ...floatingStyles, zIndex }"
        class="base-dtr__popover"
        role="dialog"
      >
        <!-- ── Timezone toggle ──────────────────────────────────────────── -->
        <div class="base-dtr__tz-row">
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            Timezone:
          </BaseTypography>
          <div
            aria-label="Timezone selection"
            class="base-dtr__tz-toggle"
            role="group"
          >
            <button
              :class="['base-dtr__tz-btn', { 'base-dtr__tz-btn--active': timezone === 'browser' }]"
              type="button"
              @click.stop="timezone !== 'browser' && toggleTimezone()"
            >
              <IconGlobe size="xs" />
              {{ browserTimezoneLabel }}
            </button>
            <button
              :class="['base-dtr__tz-btn', { 'base-dtr__tz-btn--active': timezone === 'utc' }]"
              type="button"
              @click.stop="timezone !== 'utc' && toggleTimezone()"
            >
              UTC
            </button>
          </div>
        </div>

        <!-- ── Phase hint ──────────────────────────────────────────────── -->
        <div class="base-dtr__phase-hint">
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {{ phaseLabel }}
          </BaseTypography>
        </div>

        <!-- ── Calendar panels ─────────────────────────────────────────── -->
        <template v-if="showCalendar">
          <div class="base-dtr__cal-panels">
            <!-- Left -->
            <div class="base-dtr__cal-panel">
              <div class="base-dtr__cal-header">
                <button
                  aria-label="Previous month"
                  class="base-dtr__nav-btn"
                  type="button"
                  @click.stop="prevMonth"
                >
                  <IconChevron
                    direction="left"
                    size="xs"
                  />
                </button>
                <BaseTypography
                  as="span"
                  color="primary"
                  variant="label"
                >
                  {{ leftLabel }}
                </BaseTypography>
                <span style="width: 28px" />
              </div>
              <div class="base-dtr__cal-grid">
                <span
                  v-for="d in DAYS"
                  :key="`ld-${d}`"
                  class="base-dtr__weekday"
                >
                  {{ d }}
                </span>
                <button
                  v-for="(cell, i) in leftDays"
                  :key="`l-${i}`"
                  :class="[
                    'base-dtr__day',
                    {
                      'base-dtr__day--empty': !cell.day,
                      'base-dtr__day--range-start': isRangeStart(cell.date),
                      'base-dtr__day--range-end': isRangeEnd(cell.date),
                      'base-dtr__day--in-range': isInRange(cell.date),
                      'base-dtr__day--today': isToday(cell.date) && !isRangeStart(cell.date) && !isRangeEnd(cell.date),
                      'base-dtr__day--disabled': cell.disabled,
                    },
                  ]"
                  :disabled="!cell.day || cell.disabled"
                  type="button"
                  @focusin="hoverDate = cell.date"
                  @focusout="hoverDate = null"
                  @mouseenter="hoverDate = cell.date"
                  @mouseleave="hoverDate = null"
                  @click.stop="handleDayClick(cell.date, cell.disabled)"
                >
                  {{ cell.day ?? '' }}
                </button>
              </div>
            </div>

            <div class="base-dtr__cal-sep" />

            <!-- Right -->
            <div class="base-dtr__cal-panel">
              <div class="base-dtr__cal-header">
                <span style="width: 28px" />
                <BaseTypography
                  as="span"
                  color="primary"
                  variant="label"
                >
                  {{ rightLabel }}
                </BaseTypography>
                <button
                  aria-label="Next month"
                  class="base-dtr__nav-btn"
                  type="button"
                  @click.stop="nextMonth"
                >
                  <IconChevron
                    direction="right"
                    size="xs"
                  />
                </button>
              </div>
              <div class="base-dtr__cal-grid">
                <span
                  v-for="d in DAYS"
                  :key="`rd-${d}`"
                  class="base-dtr__weekday"
                >
                  {{ d }}
                </span>
                <button
                  v-for="(cell, i) in rightDays"
                  :key="`r-${i}`"
                  :class="[
                    'base-dtr__day',
                    {
                      'base-dtr__day--empty': !cell.day,
                      'base-dtr__day--range-start': isRangeStart(cell.date),
                      'base-dtr__day--range-end': isRangeEnd(cell.date),
                      'base-dtr__day--in-range': isInRange(cell.date),
                      'base-dtr__day--today': isToday(cell.date) && !isRangeStart(cell.date) && !isRangeEnd(cell.date),
                      'base-dtr__day--disabled': cell.disabled,
                    },
                  ]"
                  :disabled="!cell.day || cell.disabled"
                  type="button"
                  @focusin="hoverDate = cell.date"
                  @focusout="hoverDate = null"
                  @mouseenter="hoverDate = cell.date"
                  @mouseleave="hoverDate = null"
                  @click.stop="handleDayClick(cell.date, cell.disabled)"
                >
                  {{ cell.day ?? '' }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Start time picker ────────────────────────────────────────── -->
        <template v-if="showStartTime">
          <div class="base-dtr__time-section">
            <BaseTypography
              as="div"
              class="base-dtr__time-date-label"
              color="primary"
              variant="label"
            >
              {{ startDate }} — Start time
            </BaseTypography>
            <div class="base-dtr__time-columns">
              <div class="base-dtr__time-col">
                <div class="base-dtr__time-col-header">HH</div>
                <div class="base-dtr__time-scroll">
                  <button
                    v-for="h in hours"
                    :key="`sh-${h}`"
                    :class="['base-dtr__unit-btn', { 'base-dtr__unit-btn--active': startH === h }]"
                    type="button"
                    @click.stop="setStartH(h)"
                  >
                    {{ pad(h) }}
                  </button>
                </div>
              </div>
              <span class="base-dtr__time-sep">:</span>
              <div class="base-dtr__time-col">
                <div class="base-dtr__time-col-header">MM</div>
                <div class="base-dtr__time-scroll">
                  <button
                    v-for="m in minutes"
                    :key="`sm-${m}`"
                    :class="['base-dtr__unit-btn', { 'base-dtr__unit-btn--active': startM === m }]"
                    type="button"
                    @click.stop="setStartM(m)"
                  >
                    {{ pad(m) }}
                  </button>
                </div>
              </div>
              <template v-if="showSeconds">
                <span class="base-dtr__time-sep">:</span>
                <div class="base-dtr__time-col">
                  <div class="base-dtr__time-col-header">SS</div>
                  <div class="base-dtr__time-scroll">
                    <button
                      v-for="s in seconds"
                      :key="`ss-${s}`"
                      :class="['base-dtr__unit-btn', { 'base-dtr__unit-btn--active': startS === s }]"
                      type="button"
                      @click.stop="setStartS(s)"
                    >
                      {{ pad(s) }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
            <div class="base-dtr__time-footer">
              <button
                class="base-dtr__next-btn"
                type="button"
                @click.stop="selectingPhase = 'end-time'"
              >
                Next: End time →
              </button>
            </div>
          </div>
        </template>

        <!-- ── End time picker ──────────────────────────────────────────── -->
        <template v-if="showEndTime">
          <div class="base-dtr__time-section">
            <BaseTypography
              as="div"
              class="base-dtr__time-date-label"
              color="primary"
              variant="label"
            >
              {{ endDate }} — End time
            </BaseTypography>
            <div class="base-dtr__time-columns">
              <div class="base-dtr__time-col">
                <div class="base-dtr__time-col-header">HH</div>
                <div class="base-dtr__time-scroll">
                  <button
                    v-for="h in hours"
                    :key="`eh-${h}`"
                    :class="['base-dtr__unit-btn', { 'base-dtr__unit-btn--active': endH === h }]"
                    type="button"
                    @click.stop="setEndH(h)"
                  >
                    {{ pad(h) }}
                  </button>
                </div>
              </div>
              <span class="base-dtr__time-sep">:</span>
              <div class="base-dtr__time-col">
                <div class="base-dtr__time-col-header">MM</div>
                <div class="base-dtr__time-scroll">
                  <button
                    v-for="m in minutes"
                    :key="`em-${m}`"
                    :class="['base-dtr__unit-btn', { 'base-dtr__unit-btn--active': endM === m }]"
                    type="button"
                    @click.stop="setEndM(m)"
                  >
                    {{ pad(m) }}
                  </button>
                </div>
              </div>
              <template v-if="showSeconds">
                <span class="base-dtr__time-sep">:</span>
                <div class="base-dtr__time-col">
                  <div class="base-dtr__time-col-header">SS</div>
                  <div class="base-dtr__time-scroll">
                    <button
                      v-for="s in seconds"
                      :key="`es-${s}`"
                      :class="['base-dtr__unit-btn', { 'base-dtr__unit-btn--active': endS === s }]"
                      type="button"
                      @click.stop="setEndS(s)"
                    >
                      {{ pad(s) }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
            <div class="base-dtr__time-footer">
              <button
                class="base-dtr__back-btn"
                type="button"
                @click.stop="selectingPhase = 'start-time'"
              >
                ← Back
              </button>
              <button
                class="base-dtr__done-btn"
                type="button"
                @click.stop="
                  emitValue();
                  open = false;
                "
              >
                Done
              </button>
            </div>
          </div>
        </template>
      </div>
    </Teleport>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-dtr__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="base-dtr__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-dtr {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
    position: relative;

    &__label {
      display: flex;
      align-items: center;
      gap: 2px;

      &--hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    }

    &__required {
      color: var(--mp-color-danger-default);
      margin-left: 2px;
    }

    &__wrapper {
      display: flex;
      align-items: center;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__trigger {
      display: flex;
      flex: 1;
      min-width: 0;
      align-items: center;
      justify-content: space-between;
      appearance: none;
      width: 100%;
      text-align: left;
      border: none;
      background: transparent;
      cursor: pointer;
      user-select: none;

      &:focus {
        outline: none;
      }
    }

    /* Leading / trailing extension areas (icons, units, or buttons). */
    &__extension {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      color: var(--mp-color-text-secondary);

      &--start {
        margin-inline-start: var(--mp-spacing-2);
      }

      &--end {
        margin-inline-end: var(--mp-spacing-2);
      }
    }

    &__value {
      @include mp.mp-font-body-md;

      color: var(--mp-color-text-primary);

      &--placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    &__icon {
      color: var(--mp-color-text-secondary);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} .base-dtr__trigger {
        padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});

        .base-dtr__value {
          font-size: var(--mp-size-font-#{$size});
        }
      }
    }

    &--error .base-dtr__wrapper {
      border-color: var(--mp-color-danger-default);

      &:focus-within {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-dtr__wrapper {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
    }

    &__hint {
      margin: 0;
    }

    /* Popover */
    &__popover {
      position: fixed;
      margin: 0;
      background: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      box-shadow: var(--mp-shadow-lg);
      padding: var(--mp-spacing-3);
      min-width: 560px;
    }

    /* Timezone toggle */
    &__tz-row {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      margin-bottom: var(--mp-spacing-2);
      padding-bottom: var(--mp-spacing-2);
      border-bottom: 1px solid var(--mp-color-border-default);
    }

    &__tz-toggle {
      display: flex;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      overflow: hidden;
    }

    &__tz-btn {
      @include mp.mp-font-caption;

      display: flex;
      align-items: center;
      gap: var(--mp-spacing-1);
      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--mp-color-text-secondary);
      transition:
        background-color 150ms ease,
        color 150ms ease;

      &--active {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-medium);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:hover:not(&--active) {
        background-color: var(--mp-color-bg-muted);
      }
    }

    &__phase-hint {
      text-align: center;
      margin-bottom: var(--mp-spacing-2);
    }

    /* Calendar */
    &__cal-panels {
      display: flex;
      gap: var(--mp-spacing-4);
    }

    &__cal-panel {
      min-width: 252px;
    }

    &__cal-sep {
      width: 1px;
      background: var(--mp-color-border-default);
      align-self: stretch;
    }

    &__cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--mp-spacing-2);
    }

    &__nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-secondary);
      transition: background-color 150ms ease;

      &:hover {
        background-color: var(--mp-color-bg-muted);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }

    &__cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    &__weekday {
      @include mp.mp-font-caption;

      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      font-weight: var(--mp-font-weight-medium);
      color: var(--mp-color-text-tertiary);
    }

    &__day {
      @include mp.mp-font-body-sm;

      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
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

      &--disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
      }

      &--range-start,
      &--range-end {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-semibold);
      }

      &--range-start {
        border-radius: var(--mp-radius-sm) 0 0 var(--mp-radius-sm);
      }

      &--range-end {
        border-radius: 0 var(--mp-radius-sm) var(--mp-radius-sm) 0;
      }

      &--in-range {
        background-color: color-mix(in srgb, var(--mp-color-primary-default) 12%, transparent);
        color: var(--mp-color-primary-default);
        border-radius: 0;
      }

      &--today {
        background-color: color-mix(in srgb, var(--mp-color-primary-default) 8%, transparent);
        color: var(--mp-color-primary-default);
        font-weight: var(--mp-font-weight-semibold);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:hover:not(:disabled, .base-dtr__day--range-start, .base-dtr__day--range-end) {
        background-color: var(--mp-color-bg-muted);
      }
    }

    /* Time picker sections */
    &__time-section {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
    }

    &__time-date-label {
      margin-bottom: var(--mp-spacing-1);
    }

    &__time-columns {
      display: flex;
      align-items: flex-start;
      gap: var(--mp-spacing-1);
    }

    &__time-sep {
      font-size: var(--mp-font-size-md);
      color: var(--mp-color-text-secondary);
      padding-top: 28px;
      line-height: 1;
    }

    &__time-col {
      display: flex;
      flex-direction: column;
      min-width: 52px;
    }

    &__time-col-header {
      @include mp.mp-font-caption;

      font-weight: var(--mp-font-weight-medium);
      color: var(--mp-color-text-tertiary);
      text-align: center;
      margin-bottom: var(--mp-spacing-1);
      padding-bottom: var(--mp-spacing-1);
      border-bottom: 1px solid var(--mp-color-border-default);
    }

    &__time-scroll {
      max-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1px;
      scrollbar-width: thin;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--mp-color-border-default);
        border-radius: 2px;
      }
    }

    &__unit-btn {
      @include mp.mp-font-body-sm;

      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-primary);
      text-align: center;
      transition:
        background-color 150ms ease,
        color 150ms ease;
      width: 100%;

      &--active {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-semibold);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:hover:not(&--active) {
        background-color: var(--mp-color-bg-muted);
      }
    }

    &__time-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--mp-spacing-2);
      margin-top: var(--mp-spacing-2);
      padding-top: var(--mp-spacing-2);
      border-top: 1px solid var(--mp-color-border-default);
    }

    &__next-btn,
    &__back-btn {
      @include mp.mp-font-label;

      padding: var(--mp-spacing-1) var(--mp-spacing-3);
      border: 1px solid var(--mp-color-border-default);
      background: transparent;
      border-radius: var(--mp-radius-md);
      cursor: pointer;
      color: var(--mp-color-text-primary);
      transition: background-color 150ms ease;

      &:hover {
        background-color: var(--mp-color-bg-muted);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }

    &__next-btn {
      background-color: var(--mp-color-primary-default);
      border-color: transparent;
      color: var(--mp-color-text-on-primary);

      &:hover {
        opacity: 0.9;
        background-color: var(--mp-color-primary-default);
      }
    }

    &__done-btn {
      @include mp.mp-font-label;

      padding: var(--mp-spacing-1) var(--mp-spacing-3);
      border: none;
      background-color: var(--mp-color-primary-default);
      color: var(--mp-color-text-on-primary);
      border-radius: var(--mp-radius-md);
      cursor: pointer;
      transition: opacity 150ms ease;

      &:hover {
        opacity: 0.9;
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }
  }
</style>
